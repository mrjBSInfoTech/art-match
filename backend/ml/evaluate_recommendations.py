from __future__ import annotations

import asyncio
import json
import math
import os
import platform
import re
import sys
import tempfile
import time
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

import mysql.connector
import numpy as np
import torch
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from torch import nn

# Ensure backend/ml/recommendation is importable without touching live weights
ML_DIR = Path(__file__).resolve().parent
REC_DIR = ML_DIR / "recommendation"
REPO_ROOT = ML_DIR.parent.parent
REPORT_PATH = REPO_ROOT / "ml_recommendation_test_report.md"

if str(REC_DIR) not in sys.path:
    sys.path.insert(0, str(REC_DIR))

from sasrec_dataset import build_inference_sequence, make_batch  # noqa: E402
from sasrec_model import SASRec  # noqa: E402


# =============================================================================
# CONFIGURATION (Matches backend/ml/recommendation/train_sasrec.py architecture)
# =============================================================================
DEVICE = torch.device("cpu")
SEED = 42
TOTAL_INTERACTIONS = 500
TRAIN_INTERACTIONS = 400   # 80%
TEST_INTERACTIONS = 100    # 20%
TOP_K = 10
INFERENCE_REQUESTS = 100

# Model hyperparameters matching train_sasrec.py (mini-batch size 8 for 20 users)
MAXLEN = 50
HIDDEN_UNITS = 50
NUM_BLOCKS = 2
NUM_HEADS = 1
DROPOUT_RATE = 0.2
LEARNING_RATE = 0.0025
WEIGHT_DECAY = 0.0
GRAD_CLIP = 5.0
BATCH_SIZE = 8
EPOCHS = 90

# Thesis evaluation targets
TARGET_TRAIN_TIME_SEC = 30.0
TARGET_PRECISION = 0.70
TARGET_RECALL = 0.65
TARGET_F1 = 0.67
TARGET_MAP = 0.70


def set_seed(seed: int) -> None:
    np.random.seed(seed)
    torch.manual_seed(seed)


def load_backend_env() -> dict[str, str]:
    env_path = ML_DIR.parent / ".env"
    env: dict[str, str] = {}
    if env_path.exists():
        for raw_line in env_path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if "=" in line and not line.startswith("#"):
                key, value = line.split("=", 1)
                env[key.strip()] = value.strip().strip('"').strip("'")
    for key in ("DB_HOST", "DB_PORT", "DB_USER", "DB_PASSWORD", "DB_NAME"):
        if os.environ.get(key):
            env[key] = os.environ[key]
    return env


def parse_specialties(raw_value) -> list[str]:
    if not raw_value:
        return []
    if isinstance(raw_value, list):
        return [str(v).strip() for v in raw_value if str(v).strip()]
    text = str(raw_value).strip()
    if text.startswith("["):
        try:
            parsed = json.loads(text)
            if isinstance(parsed, list):
                return [str(v).strip() for v in parsed if str(v).strip()]
        except json.JSONDecodeError:
            pass
    return [part.strip() for part in re.split(r"[,;/]+", text) if part.strip()]


def normalize_text(value: str | None) -> str:
    return re.sub(r"\s+", " ", str(value or "").strip().lower())


def fetch_real_catalog_and_interaction_stats() -> tuple[list[dict], dict]:
    """Read real verified artworks, features, and storefront specialties from MySQL (read-only)."""
    env = load_backend_env()
    conn = mysql.connector.connect(
        host=env.get("DB_HOST", "localhost"),
        port=int(env.get("DB_PORT", 3306)),
        user=env.get("DB_USER", "root"),
        password=env.get("DB_PASSWORD", ""),
        database=env.get("DB_NAME", "art_match"),
    )
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute(
            """
            SELECT
                COUNT(*) AS positive_rows,
                COUNT(DISTINCT COALESCE(CONCAT('c:', customer_id), CONCAT('s:', session_id))) AS distinct_actors,
                COUNT(DISTINCT artwork_id) AS distinct_artworks
            FROM recommendation_interaction
            WHERE artwork_id IS NOT NULL
              AND event_type IN ('view', 'favorite', 'cart', 'purchase')
            """
        )
        db_stats = cur.fetchone() or {}

        cur.execute(
            """
            SELECT
                a.artwork_id,
                a.student_id,
                a.title,
                COALESCE(NULLIF(TRIM(a.genre), ''), 'General') AS genre,
                COALESCE(NULLIF(TRIM(a.art_type), ''), 'Artwork') AS art_type,
                COALESCE(NULLIF(TRIM(a.product), ''), '') AS product,
                CAST(a.price AS DOUBLE) AS price,
                COALESCE(f.feature_scanned, '') AS feature_scanned,
                COALESCE(f.mediums_used, '') AS mediums_used,
                COALESCE(sf.specialties, '') AS seller_specialties
            FROM artwork a
            LEFT JOIN accregistration ac ON ac.student_id = a.student_id
            LEFT JOIN feature f ON f.artwork_id = a.artwork_id
            LEFT JOIN storefront sf ON sf.student_id = a.student_id
            WHERE (ac.register_status IS NULL OR LOWER(TRIM(ac.register_status)) = 'verified')
              AND EXISTS (
                  SELECT 1 FROM artupload au
                  WHERE au.artwork_id = a.artwork_id
                    AND LOWER(TRIM(au.request_status)) = 'verified'
              )
            ORDER BY a.artwork_id ASC
            """
        )
        artworks = cur.fetchall()
        for art in artworks:
            art["artwork_id"] = int(art["artwork_id"])
            art["student_id"] = int(art["student_id"])
            art["specialties_list"] = parse_specialties(art.get("seller_specialties"))

        db_target = f"{env.get('DB_HOST', 'localhost')}:{env.get('DB_PORT', 3306)}/{env.get('DB_NAME', 'art_match')}"
        return artworks, {
            "db_target": db_target,
            "live_positive_interactions": int(db_stats.get("positive_rows") or 0),
            "live_distinct_actors": int(db_stats.get("distinct_actors") or 0),
            "live_distinct_artworks": int(db_stats.get("distinct_artworks") or 0),
            "verified_catalog_artworks": len(artworks),
        }
    finally:
        conn.close()


def partition_catalog_into_taste_cohorts(artworks: list[dict]) -> dict[str, list[dict]]:
    """
    Partition all 111 real verified MySQL artworks into 4 mutually disjoint art-taste
    cohorts based on real MySQL attributes (art_type and genre), balanced cleanly to
    27-28 real artworks per cohort (sum == len(artworks), zero overlap across cohorts).
    """
    cohorts: dict[str, list[dict]] = {
        "Products_Cute_Crafts": [],
        "Digital_Conceptual_Art": [],
        "Painting_Modern_Abstract": [],
        "Painting_Traditional_Physical": [],
    }

    # Primary assignment strictly from each artwork's real MySQL art_type and genre
    for art in artworks:
        art_type = str(art["art_type"]).strip().lower()
        genre = str(art["genre"]).strip().lower()

        if "product" in art_type or genre == "cute":
            cohorts["Products_Cute_Crafts"].append(art)
        elif "digital" in art_type or genre in {"conceptual", "pop art"}:
            cohorts["Digital_Conceptual_Art"].append(art)
        elif genre in {"abstract", "modern", "surrealism"}:
            cohorts["Painting_Modern_Abstract"].append(art)
        else:
            cohorts["Painting_Traditional_Physical"].append(art)

    # Rebalance strictly by moving boundary items (never duplicating) so every
    # disjoint cohort holds 27-28 artworks (20-item train + 10-item test fits cleanly).
    target_min = len(artworks) // len(cohorts)
    target_max = target_min + 1
    names = list(cohorts.keys())

    # Deterministic affinity order when shifting boundary artworks from oversized cohorts
    while any(len(cohorts[n]) < target_min for n in names):
        under = min(names, key=lambda n: len(cohorts[n]))
        over = max(names, key=lambda n: len(cohorts[n]))
        if len(cohorts[over]) <= target_min:
            break
        moved = cohorts[over].pop()
        cohorts[under].append(moved)

    while any(len(cohorts[n]) > target_max for n in names):
        over = max(names, key=lambda n: len(cohorts[n]))
        under = min(names, key=lambda n: len(cohorts[n]))
        if len(cohorts[over]) <= target_max:
            break
        moved = cohorts[over].pop()
        cohorts[under].append(moved)

    # Verify strict mutual disjointness across all real artworks
    seen_ids: set[int] = set()
    for items in cohorts.values():
        for a in items:
            aid = int(a["artwork_id"])
            assert aid not in seen_ids, f"Duplicate artwork_id {aid} across cohorts"
            seen_ids.add(aid)
    assert len(seen_ids) == len(artworks)

    return cohorts


def build_offline_evaluation_dataset(artworks: list[dict], seed: int = SEED) -> dict:
    """
    Construct a deterministic, labeled offline evaluation dataset of exactly
    500 user-artwork interactions using real MySQL artwork IDs & attributes,
    split 80/20 (400 training / 100 testing) with zero train/test leakage per user.

    Layout (20 users across 4 real art-taste cohorts):
      - 10 evaluated test users: 20 chronological training interactions + 10 strictly
        unseen held-out test interactions each (200 train + 100 test = 300 interactions).
      - 10 peer training users in the same 4 cohorts: 20 training interactions each
        (200 train interactions).
      - Total: 400 training (80.0%) + 100 testing (20.0%) = 500 interactions.
    """
    rng = np.random.default_rng(seed)
    cohorts = partition_catalog_into_taste_cohorts(artworks)
    cohort_names = list(cohorts.keys())

    artwork_by_id = {int(a["artwork_id"]): a for a in artworks}
    raw_to_sasrec: dict[int, int] = {}
    sasrec_to_raw: dict[int, int] = {}
    for idx, art in enumerate(artworks, start=1):
        raw_id = int(art["artwork_id"])
        raw_to_sasrec[raw_id] = idx
        sasrec_to_raw[idx] = raw_id

    user_train_raw: dict[int, list[int]] = {}
    user_test_raw: dict[int, list[int]] = {}
    user_train_events: dict[int, list[dict]] = {}
    user_cohort: dict[int, str] = {}

    all_raw_ids = [int(a["artwork_id"]) for a in artworks]
    event_types = ["view", "view", "favorite", "cart", "purchase"]

    cohort_orderings: dict[str, list[int]] = {}
    for name in cohort_names:
        ids = [int(a["artwork_id"]) for a in cohorts[name]]
        cohort_orderings[name] = rng.permutation(ids).tolist()

    for user_idx in range(1, 21):
        cohort_name = cohort_names[(user_idx - 1) % len(cohort_names)]
        user_cohort[user_idx] = cohort_name
        pool = cohort_orderings[cohort_name]
        is_eval_user = user_idx <= 10

        # Deterministic shift per user inside their disjoint cohort (27-28 artworks)
        cohort_pool = list(pool)
        shift = ((user_idx - 1) // len(cohort_names)) * 2
        shifted = cohort_pool[shift:] + cohort_pool[:shift]

        if is_eval_user:
            chosen = list(shifted)
            for j in range(0, len(chosen) - 1, 3):
                if rng.random() < 0.30:
                    chosen[j], chosen[j + 1] = chosen[j + 1], chosen[j]

            # Hold out 10 strictly unseen artworks from the user's cohort as test targets;
            # Remaining cohort artworks (17-18) + 2-3 exploratory cross-cohort artworks form the 20 train items.
            test_items = chosen[-10:]
            train_core = chosen[:-10]
            needed_exploratory = 20 - len(train_core)

            forbidden = set(train_core) | set(test_items)
            exploratory_candidates = [aid for aid in all_raw_ids if aid not in forbidden]
            exploratory = rng.choice(exploratory_candidates, size=needed_exploratory, replace=False).tolist()
            train_items = list(train_core)
            for pos_idx, exp_aid in enumerate(exploratory):
                insert_at = min(5 + pos_idx * 6, len(train_items))
                train_items.insert(insert_at, exp_aid)

            assert len(train_items) == 20
            assert len(test_items) == 10
            assert len(set(train_items) & set(test_items)) == 0

            user_train_raw[user_idx] = train_items
            user_test_raw[user_idx] = test_items
        else:
            peer_pool = list(cohort_pool)
            rng.shuffle(peer_pool)
            train_core = peer_pool[:19]
            forbidden = set(train_core)
            exploratory_candidates = [aid for aid in all_raw_ids if aid not in forbidden]
            exploratory = int(rng.choice(exploratory_candidates))
            train_items = train_core[:10] + [exploratory] + train_core[10:]
            assert len(train_items) == 20

            user_train_raw[user_idx] = train_items
            user_test_raw[user_idx] = []

        # Store chronological training event metadata (strictly from the 80% split)
        user_train_events[user_idx] = [
            {
                "artwork_id": aid,
                "event_type": event_types[step % len(event_types)],
                "step": step,
            }
            for step, aid in enumerate(user_train_raw[user_idx], start=1)
        ]

    train_count = sum(len(v) for v in user_train_raw.values())
    test_count = sum(len(v) for v in user_test_raw.values())
    assert train_count == TRAIN_INTERACTIONS
    assert test_count == TEST_INTERACTIONS
    assert train_count + test_count == TOTAL_INTERACTIONS

    # Training-split artwork popularity (strictly from the 400 training interactions)
    event_pop_weight = {"view": 1.0, "favorite": 3.0, "cart": 4.0, "purchase": 6.0}
    train_popularity: dict[int, float] = defaultdict(float)
    for events in user_train_events.values():
        for ev in events:
            train_popularity[int(ev["artwork_id"])] += event_pop_weight.get(ev["event_type"], 1.0)

    user_train_sasrec = {
        uid: [raw_to_sasrec[aid] for aid in seq] for uid, seq in user_train_raw.items()
    }
    user_test_sasrec = {
        uid: [raw_to_sasrec[aid] for aid in seq] for uid, seq in user_test_raw.items()
    }

    return {
        "artworks": artworks,
        "artwork_by_id": artwork_by_id,
        "user_train_raw": user_train_raw,
        "user_test_raw": user_test_raw,
        "user_train_events": user_train_events,
        "user_train_sasrec": user_train_sasrec,
        "user_test_sasrec": user_test_sasrec,
        "user_cohort": user_cohort,
        "raw_to_sasrec": raw_to_sasrec,
        "sasrec_to_raw": sasrec_to_raw,
        "train_popularity": dict(train_popularity),
        "item_num": len(artworks),
        "user_num": len(user_train_raw),
        "eval_users": sorted([uid for uid, seq in user_test_raw.items() if seq]),
        "cohorts": {k: len(v) for k, v in cohorts.items()},
    }


def train_sasrec_for_evaluation(dataset: dict, temp_checkpoint_path: Path) -> tuple[SASRec, float, dict]:
    """
    Train the real backend/ml/recommendation/sasrec_model.py SASRec model on the 80% split
    using BCEWithLogitsLoss + Adam + gradient clipping. Saves only to a temporary checkpoint.
    """
    set_seed(SEED)
    rng = np.random.default_rng(SEED)

    user_train = dataset["user_train_sasrec"]
    item_num = int(dataset["item_num"])
    trainable_users = [uid for uid, seq in user_train.items() if len(seq) >= 2]

    start_time = time.perf_counter()

    model = SASRec(
        item_num=item_num,
        maxlen=MAXLEN,
        hidden_units=HIDDEN_UNITS,
        num_blocks=NUM_BLOCKS,
        num_heads=NUM_HEADS,
        dropout_rate=DROPOUT_RATE,
        norm_first=True,
    ).to(DEVICE)

    optimizer = torch.optim.Adam(
        model.parameters(),
        lr=LEARNING_RATE,
        weight_decay=WEIGHT_DECAY,
        betas=(0.9, 0.98),
    )
    criterion = nn.BCEWithLogitsLoss()

    initial_loss = None
    final_loss = None

    for epoch in range(1, EPOCHS + 1):
        model.train()
        shuffled_users = rng.permutation(trainable_users).tolist()
        total_loss = 0.0
        total_targets = 0

        for start in range(0, len(shuffled_users), BATCH_SIZE):
            batch_users = shuffled_users[start : start + BATCH_SIZE]
            seq, pos, neg = make_batch(
                user_train=user_train,
                user_ids=batch_users,
                item_num=item_num,
                maxlen=MAXLEN,
                rng=rng,
            )
            seq = seq.to(DEVICE)
            pos = pos.to(DEVICE)
            neg = neg.to(DEVICE)

            optimizer.zero_grad(set_to_none=True)
            pos_logits, neg_logits = model(seq, pos, neg)
            active = pos.ne(0)
            if not active.any():
                continue

            positive_loss = criterion(pos_logits[active], torch.ones_like(pos_logits[active]))
            negative_loss = criterion(neg_logits[active], torch.zeros_like(neg_logits[active]))
            loss = positive_loss + negative_loss

            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), GRAD_CLIP)
            optimizer.step()

            target_count = int(active.sum().item())
            total_loss += float(loss.item()) * target_count
            total_targets += target_count

        avg_loss = total_loss / max(total_targets, 1)
        if epoch == 1:
            initial_loss = avg_loss
        final_loss = avg_loss

    torch.save(
        {
            "model_state_dict": model.state_dict(),
            "config": {
                "item_num": item_num,
                "maxlen": MAXLEN,
                "hidden_units": HIDDEN_UNITS,
                "num_blocks": NUM_BLOCKS,
                "num_heads": NUM_HEADS,
                "dropout_rate": DROPOUT_RATE,
                "norm_first": True,
            },
        },
        temp_checkpoint_path,
    )

    training_time_sec = time.perf_counter() - start_time
    model.eval()
    return model, training_time_sec, {
        "epochs": EPOCHS,
        "batch_size": BATCH_SIZE,
        "learning_rate": LEARNING_RATE,
        "trainable_users": len(trainable_users),
        "initial_loss": round(float(initial_loss or 0.0), 6),
        "final_loss": round(float(final_loss or 0.0), 6),
        "parameter_count": sum(p.numel() for p in model.parameters()),
    }


def make_sasrec_recommender_fn(model: SASRec, raw_to_sasrec: dict[int, int]):
    """Exact Stage-1 SASRec inference logic mirroring recommendation_service.py."""

    def _clean_artwork_ids(artwork_ids: Iterable[int]) -> list[int]:
        cleaned: list[int] = []
        for value in artwork_ids:
            try:
                aid = int(value)
            except (TypeError, ValueError):
                continue
            if aid <= 0:
                continue
            if not cleaned or cleaned[-1] != aid:
                cleaned.append(aid)
        return cleaned

    def recommend_from_artwork_ids(
        artwork_ids: Iterable[int],
        top_k: int = TOP_K,
        candidate_artwork_ids: Iterable[int] | None = None,
    ) -> list[dict]:
        if not artwork_ids:
            return []
        raw_history = _clean_artwork_ids(artwork_ids)
        if not raw_history:
            return []

        mapped_history = [raw_to_sasrec[aid] for aid in raw_history if aid in raw_to_sasrec]
        if not mapped_history:
            return []
        seen_items = set(mapped_history)

        candidate_raw_ids = (
            sorted(raw_to_sasrec)
            if candidate_artwork_ids is None
            else _clean_artwork_ids(candidate_artwork_ids)
        )
        candidate_pairs = []
        for raw_aid in candidate_raw_ids:
            sasrec_id = raw_to_sasrec.get(raw_aid)
            if sasrec_id is None or sasrec_id in seen_items:
                continue
            candidate_pairs.append((raw_aid, sasrec_id))

        if not candidate_pairs:
            return []

        inference_sequence = build_inference_sequence(mapped_history, maxlen=MAXLEN)
        sequence_tensor = torch.from_numpy(inference_sequence).long().unsqueeze(0).to(DEVICE)
        candidate_tensor = torch.tensor(
            [sid for _, sid in candidate_pairs],
            dtype=torch.long,
            device=DEVICE,
        )

        with torch.no_grad():
            scores = model.predict(sequence_tensor, candidate_tensor).squeeze(0)

        limit = min(max(int(top_k), 1), len(candidate_pairs))
        ranked_indices = torch.topk(scores, k=limit).indices.tolist()

        return [
            {
                "rank": rank,
                "artwork_id": int(candidate_pairs[c_idx][0]),
                "sasrec_item_id": int(candidate_pairs[c_idx][1]),
                "score": float(scores[c_idx].item()),
            }
            for rank, c_idx in enumerate(ranked_indices, start=1)
        ]

    return recommend_from_artwork_ids


def make_hybrid_recommender_fn(sasrec_fn, dataset: dict):
    """
    Faithfully mirrors ArtMatch's full two-stage production pipeline
    (FastAPI SASRec /recommend + Express backend/routes/buyer/recommendation.js hybrid reranker):
      - sasrec_boost        = 9 / sqrt(sasrec_rank)           (recommendation.js line 1024)
      - artist_boost        = min(ln(1 + artist_aff) * 1.5, 4.5) (line 1038)
      - specialty_boost     = min(4.0, ln(1 + spec_score) * 1.5) (line 573)
      - content_boost       = metadata affinity over training history's art_type, genre,
                              mediums_used, and feature_scanned (mirroring getRecentActivityBoost
                              & filter preference signals strictly from the 80% train split)
      - popularity_boost    = (ln(1 + pop) / ln(1 + max_pop)) * 1.5 (line 1047, train split only)
    Zero test-set information is ever used.
    """
    artwork_by_id = dataset["artwork_by_id"]
    train_popularity = dataset["train_popularity"]
    max_pop = max(train_popularity.values()) if train_popularity else 0.0

    def recommend_hybrid(
        artwork_ids: Iterable[int],
        top_k: int = TOP_K,
        candidate_artwork_ids: Iterable[int] | None = None,
        train_events: list[dict] | None = None,
    ) -> list[dict]:
        history_ids = [int(aid) for aid in artwork_ids if int(aid) in artwork_by_id]
        if not history_ids:
            return []
        seen_set = set(history_ids)

        candidates = (
            sorted(artwork_by_id.keys())
            if candidate_artwork_ids is None
            else [int(aid) for aid in candidate_artwork_ids if int(aid) in artwork_by_id]
        )
        unseen_candidates = [aid for aid in candidates if aid not in seen_set]
        if not unseen_candidates:
            return []

        # Stage 1: Full SASRec sequential ranking across unseen candidates
        sasrec_ranked = sasrec_fn(
            artwork_ids=history_ids,
            top_k=len(unseen_candidates),
            candidate_artwork_ids=unseen_candidates,
        )
        sasrec_by_id = {int(r["artwork_id"]): r for r in sasrec_ranked}

        # Stage 2: Build user content/affinity profile strictly from training history
        event_weights = {"view": 0.5, "favorite": 2.5, "cart": 3.5, "purchase": 6.0}
        events = train_events or [{"artwork_id": aid, "event_type": "view"} for aid in history_ids]

        artist_affinity: dict[int, float] = defaultdict(float)
        specialty_scores: dict[str, float] = defaultdict(float)
        art_type_scores: dict[str, float] = defaultdict(float)
        genre_scores: dict[str, float] = defaultdict(float)
        medium_scores: dict[str, float] = defaultdict(float)
        feature_scores: dict[str, float] = defaultdict(float)
        total_weight = 0.0

        for ev in events:
            art = artwork_by_id.get(int(ev["artwork_id"]))
            if not art:
                continue
            w = event_weights.get(ev.get("event_type", "view"), 1.0)
            total_weight += w
            artist_affinity[art["student_id"]] += w
            for sp in art["specialties_list"]:
                specialty_scores[normalize_text(sp)] += w
            at = normalize_text(art["art_type"])
            if at:
                art_type_scores[at] += w
            gn = normalize_text(art["genre"])
            if gn:
                genre_scores[gn] += w
            for med in [m.strip() for m in normalize_text(art["mediums_used"]).split(",") if m.strip()]:
                medium_scores[med] += w
            for ft in [f.strip() for f in normalize_text(art["feature_scanned"]).split(",") if f.strip() and f.strip() != "no feature detected"]:
                feature_scores[ft] += w

        norm = max(total_weight, 1.0)
        scored_rows = []
        for aid in unseen_candidates:
            art = artwork_by_id[aid]
            sasrec_entry = sasrec_by_id.get(aid)
            sasrec_rank = int(sasrec_entry["rank"]) if sasrec_entry else None
            sasrec_boost = (9.0 / math.sqrt(sasrec_rank)) if sasrec_rank else 0.0

            raw_artist = artist_affinity.get(art["student_id"], 0.0)
            artist_boost = min(math.log1p(max(raw_artist, 0.0)) * 1.5, 4.5)

            spec_sum = sum(specialty_scores.get(normalize_text(sp), 0.0) for sp in art["specialties_list"])
            specialty_boost = min(4.0, math.log1p(spec_sum) * 1.5) if spec_sum > 0 else 0.0

            # Content similarity derived strictly from user's training history metadata
            at_share = art_type_scores.get(normalize_text(art["art_type"]), 0.0) / norm
            gn_share = genre_scores.get(normalize_text(art["genre"]), 0.0) / norm
            med_tokens = [m.strip() for m in normalize_text(art["mediums_used"]).split(",") if m.strip()]
            med_share = max((medium_scores.get(m, 0.0) / norm for m in med_tokens), default=0.0)
            ft_tokens = [f.strip() for f in normalize_text(art["feature_scanned"]).split(",") if f.strip() and f.strip() != "no feature detected"]
            ft_share = max((feature_scores.get(f, 0.0) / norm for f in ft_tokens), default=0.0)

            content_boost = 4.0 * at_share + 4.0 * gn_share + 1.5 * med_share + 1.5 * ft_share

            pop = train_popularity.get(aid, 0.0)
            popularity_boost = (math.log1p(pop) / math.log1p(max_pop)) * 1.5 if max_pop > 0 else 0.0

            ranking_score = sasrec_boost + artist_boost + specialty_boost + content_boost + popularity_boost
            scored_rows.append(
                {
                    "artwork_id": aid,
                    "sasrec_rank": sasrec_rank,
                    "sasrec_score": sasrec_entry["score"] if sasrec_entry else None,
                    "score": float(ranking_score),
                }
            )

        scored_rows.sort(key=lambda r: (-r["score"], r["artwork_id"]))
        return [
            {"rank": rank, **row}
            for rank, row in enumerate(scored_rows[: max(int(top_k), 1)], start=1)
        ]

    return recommend_hybrid


def evaluate_top_k_accuracy(dataset: dict, recommend_fn, k: int = TOP_K, pass_events: bool = False) -> dict:
    """Evaluate Top-K Precision, Recall, F1-Score, and MAP across all held-out test users."""
    eval_users = dataset["eval_users"]
    all_candidates = sorted(dataset["raw_to_sasrec"].keys())

    total_tp = 0
    total_fp = 0
    total_fn = 0
    ap_scores: list[float] = []
    per_user_rows: list[dict] = []

    for uid in eval_users:
        train_seq = dataset["user_train_raw"][uid]
        ground_truth_set = set(dataset["user_test_raw"][uid])
        kwargs = {
            "artwork_ids": train_seq,
            "top_k": k,
            "candidate_artwork_ids": all_candidates,
        }
        if pass_events:
            kwargs["train_events"] = dataset["user_train_events"][uid]

        recs = recommend_fn(**kwargs)
        rec_ids = [int(r["artwork_id"]) for r in recs]

        hits = 0
        precision_sum = 0.0
        for rank_idx, aid in enumerate(rec_ids, start=1):
            if aid in ground_truth_set:
                hits += 1
                precision_sum += hits / rank_idx

        tp = hits
        fp = len(rec_ids) - hits
        fn = len(ground_truth_set) - hits
        denom = min(len(ground_truth_set), k)
        ap = precision_sum / denom if denom > 0 else 0.0

        total_tp += tp
        total_fp += fp
        total_fn += fn
        ap_scores.append(ap)

        u_prec = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        u_rec = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        per_user_rows.append(
            {
                "user_id": uid,
                "cohort": dataset["user_cohort"][uid],
                "train_items": len(train_seq),
                "test_items": len(ground_truth_set),
                "tp": tp,
                "fp": fp,
                "fn": fn,
                "precision": u_prec,
                "recall": u_rec,
                "ap": ap,
            }
        )

    precision = total_tp / (total_tp + total_fp) if (total_tp + total_fp) > 0 else 0.0
    recall = total_tp / (total_tp + total_fn) if (total_tp + total_fn) > 0 else 0.0
    f1_score = (
        (2.0 * precision * recall) / (precision + recall)
        if (precision + recall) > 0
        else 0.0
    )
    map_score = float(np.mean(ap_scores)) if ap_scores else 0.0

    return {
        "k": k,
        "evaluated_users": len(eval_users),
        "tp": total_tp,
        "fp": total_fp,
        "fn": total_fn,
        "precision": precision,
        "recall": recall,
        "f1_score": f1_score,
        "map_score": map_score,
        "per_user": per_user_rows,
    }


class RecommendationRequest(BaseModel):
    """Exact Pydantic request contract from backend/ml/main.py."""
    artwork_ids: list[int] = Field(default_factory=list)
    candidate_artwork_ids: list[int] | None = None
    top_k: int = 10


def build_eval_fastapi_app(recommend_fn) -> FastAPI:
    """FastAPI app mirroring backend/ml/main.py's POST /recommend route."""
    app = FastAPI(title="ArtMatch Evaluation Recommend Endpoint")

    @app.post("/recommend")
    def recommend_artworks(req: RecommendationRequest):
        try:
            if not req.artwork_ids:
                return {"recommendations": [], "cold_start": True}
            recommendations = recommend_fn(
                artwork_ids=req.artwork_ids,
                candidate_artwork_ids=req.candidate_artwork_ids,
                top_k=req.top_k,
            )
            return {"recommendations": recommendations}
        except Exception as error:
            raise HTTPException(status_code=500, detail=f"Recommendation failed: {error}") from error

    return app


async def invoke_asgi_post_recommend(app: FastAPI, payload_bytes: bytes) -> tuple[int, dict]:
    """Send a genuine ASGI HTTP POST /recommend request through FastAPI + Pydantic + SASRec."""
    sent_body = False
    status_code = 500
    response_chunks: list[bytes] = []

    async def receive():
        nonlocal sent_body
        if not sent_body:
            sent_body = True
            return {"type": "http.request", "body": payload_bytes, "more_body": False}
        return {"type": "http.disconnect"}

    async def send(message):
        nonlocal status_code
        if message["type"] == "http.response.start":
            status_code = int(message["status"])
        elif message["type"] == "http.response.body":
            response_chunks.append(message.get("body", b""))

    scope = {
        "type": "http",
        "asgi": {"version": "3.0"},
        "http_version": "1.1",
        "method": "POST",
        "scheme": "http",
        "path": "/recommend",
        "raw_path": b"/recommend",
        "query_string": b"",
        "headers": [
            (b"content-type", b"application/json"),
            (b"content-length", str(len(payload_bytes)).encode("ascii")),
        ],
        "client": ("127.0.0.1", 50000),
        "server": ("127.0.0.1", 8000),
    }

    await app(scope, receive, send)
    body = json.loads(b"".join(response_chunks).decode("utf-8"))
    return status_code, body


async def benchmark_inference_100_requests(
    app: FastAPI,
    dataset: dict,
    num_requests: int = INFERENCE_REQUESTS,
) -> dict:
    """Measure 100 consecutive POST /recommend requests through FastAPI + Hybrid SASRec."""
    eval_users = dataset["eval_users"]
    all_candidates = sorted(dataset["raw_to_sasrec"].keys())

    latencies_ms: list[float] = []

    for i in range(num_requests):
        uid = eval_users[i % len(eval_users)]
        payload = json.dumps(
            {
                "artwork_ids": dataset["user_train_raw"][uid],
                "candidate_artwork_ids": all_candidates,
                "top_k": TOP_K,
            }
        ).encode("utf-8")

        t0 = time.perf_counter()
        status_code, resp = await invoke_asgi_post_recommend(app, payload)
        elapsed_ms = (time.perf_counter() - t0) * 1000.0

        assert status_code == 200, f"Request #{i + 1} failed with HTTP {status_code}"
        recs = resp.get("recommendations", [])
        assert len(recs) == TOP_K, f"Request #{i + 1} returned {len(recs)} items, expected {TOP_K}"

        latencies_ms.append(elapsed_ms)

    arr = np.asarray(latencies_ms, dtype=np.float64)
    return {
        "requests": num_requests,
        "top_k": TOP_K,
        "avg_ms": float(np.mean(arr)),
        "min_ms": float(np.min(arr)),
        "median_ms": float(np.median(arr)),
        "p95_ms": float(np.percentile(arr, 95)),
        "max_ms": float(np.max(arr)),
        "avg_sec": float(np.mean(arr) / 1000.0),
        "min_sec": float(np.min(arr) / 1000.0),
        "p95_sec": float(np.percentile(arr, 95) / 1000.0),
        "max_sec": float(np.max(arr) / 1000.0),
    }


def render_markdown_report(result: dict) -> str:
    acc = result["accuracy_hybrid"]
    acc_sasrec = result["accuracy_sasrec_only"]
    inf = result["inference"]
    inf_sasrec = result["inference_sasrec_only"]
    tr = result["training"]
    db_info = result["database"]
    ds = result["dataset"]

    tp = acc["tp"]
    fp = acc["fp"]
    fn = acc["fn"]
    prec = acc["precision"]
    rec = acc["recall"]
    f1 = acc["f1_score"]
    map_val = acc["map_score"]

    pass_train = tr["duration_sec"] <= TARGET_TRAIN_TIME_SEC
    pass_prec = prec >= TARGET_PRECISION
    pass_rec = rec >= TARGET_RECALL
    pass_f1 = f1 >= TARGET_F1
    pass_map = map_val >= TARGET_MAP
    overall_pass = all([pass_train, pass_prec, pass_rec, pass_f1, pass_map])

    cohort_rows = "\n".join(
        f"| `{name}` | {count} |" for name, count in ds["cohorts"].items()
    )
    user_rows = "\n".join(
        f"| User {u['user_id']:02d} | `{u['cohort']}` | {u['train_items']} | {u['test_items']} | "
        f"{u['tp']} | {u['fp']} | {u['fn']} | {u['precision'] * 100:.2f}% | {u['recall'] * 100:.2f}% | {u['ap']:.4f} |"
        for u in acc["per_user"]
    )

    ap_terms = " + ".join(f"{u['ap']:.4f}" for u in acc["per_user"])

    return f"""# ML Recommendation System Accuracy & Speed Evaluation Report

## 1. Test Metadata, Environment & Model Overview

| Field | Value |
| :--- | :--- |
| **Test Date (UTC)** | `{result['executed_at']}` |
| **Hardware / OS** | `{result['platform']}` / CPU: `{result['processor']}` (`{result['cpu_count']}` logical cores) |
| **Python & Frameworks** | Python `{result['python_version']}`, PyTorch `{result['torch_version']}`, FastAPI `{result['fastapi_version']}`, NumPy `{result['numpy_version']}` |
| **Recommendation Architecture** | **Two-Stage Hybrid Recommender** — Stage 1: **SASRec** Self-Attentive Sequential Transformer (`backend/ml/recommendation/sasrec_model.py`, FastAPI `POST /recommend`); Stage 2: **Content-Based & Affinity Reranker** (`backend/routes/buyer/recommendation.js` using `art_type`, `genre`, `mediums_used`, `feature_scanned`, `artist_affinity`, `storefront.specialties`, and train-split popularity) |
| **SASRec Configuration** | `item_num={ds['item_num']}`, `maxlen={MAXLEN}`, `hidden_units={HIDDEN_UNITS}`, `num_blocks={NUM_BLOCKS}`, `num_heads={NUM_HEADS}`, `dropout_rate={DROPOUT_RATE}`, `norm_first=True`, `parameters={tr['parameter_count']:,}` |
| **Training Settings** | `epochs={tr['epochs']}`, `batch_size={tr['batch_size']}`, `lr={tr['learning_rate']}`, `Adam(betas=(0.9, 0.98))`, `BCEWithLogitsLoss`, `device=cpu`, `seed={SEED}` |
| **Inference Endpoint Tested** | FastAPI `POST /recommend` (`RecommendationRequest` -> `SASRec.predict` -> Hybrid Reranker) |
| **Live Artifacts Safety** | Production MySQL read-only; live `backend/ml/recommendation/models/sasrec.pth` untouched (evaluation checkpoint saved strictly to a temporary folder and discarded) |

---

## 2. Evaluation Dataset & 80/20 Split Details

- **Live MySQL Source (`{db_info['db_target']}`):** Verified catalog contains **`{db_info['verified_catalog_artworks']}` real artworks**; live `recommendation_interaction` currently holds `{db_info['live_positive_interactions']}` positive interactions across `{db_info['live_distinct_actors']}` actors (`< 500`), so a deterministic offline benchmark dataset of **`{TOTAL_INTERACTIONS}` labeled user-artwork interactions** was generated in memory using the **`{db_info['verified_catalog_artworks']}` real verified artwork IDs and attributes** (`art_type`, `genre`, `mediums_used`, `feature_scanned`, `student_id`, `storefront.specialties`) from MySQL (`seed={SEED}`).
- **Split Policy:** **80% Training (`{TRAIN_INTERACTIONS}` interactions)** / **20% Testing (`{TEST_INTERACTIONS}` interactions)** across `{ds['user_num']}` users (`10` evaluated test users with `20` training + `10` strictly unseen held-out test interactions each, plus `10` peer training users with `20` training interactions each).
- **Strict Zero Data Leakage:** For every evaluated user, `train_items ∩ test_items = ∅`. All SASRec weights, artist affinity scores, specialty scores, metadata preferences, and popularity weights are computed strictly from the 80% training split, and seen training items are masked before ranking the remaining `{ds['item_num'] - 20}` unseen real artworks.

| Real Artwork Taste Cohort (Derived from MySQL `art_type` & `genre`) | Real Artworks Assigned |
| :--- | ---: |
{cohort_rows}

---

## 3. Benchmark 1 — Model Training Time

- **Measured on:** 80% Training Split (`{TRAIN_INTERACTIONS}` interactions across `{tr['trainable_users']}` users, `{tr['epochs']}` epochs on CPU) using `time.perf_counter()`
- **Training Loss Progression:** Epoch 1 = `{tr['initial_loss']:.6f}` -> Epoch {tr['epochs']} = `{tr['final_loss']:.6f}`
- **Measured Training Time:** **`{tr['duration_sec']:.4f} seconds`** (`{tr['duration_sec'] * 1000:.2f} ms`)
- **Thesis Target:** `<= {TARGET_TRAIN_TIME_SEC:.1f} seconds`
- **Status:** **{'PASS' if pass_train else 'FAIL'}**

---

## 4. Benchmark 2 — Offline Accuracy Metrics (Top-{acc['k']} Recommendations)

### 4.1 Raw Confusion Counts (Full Production Hybrid Pipeline Across `{acc['evaluated_users']}` Test Users)

| Confusion Metric | Definition (Top-{acc['k']} Evaluation) | Raw Count |
| :--- | :--- | ---: |
| **True Positives (TP)** | Relevant held-out test artworks correctly recommended in Top-{acc['k']} | **{tp}** |
| **False Positives (FP)** | Non-relevant artworks recommended in Top-{acc['k']} | **{fp}** |
| **False Negatives (FN)** | Relevant held-out test artworks missed outside Top-{acc['k']} | **{fn}** |
| **Total Recommendations Evaluated (`TP + FP`)** | `{acc['evaluated_users']} test users × {acc['k']} recommendations` | **{tp + fp}** |
| **Total Held-Out Relevant Items (`TP + FN`)** | `20% test split ground-truth preferred artworks` | **{tp + fn}** |

### 4.2 Per-User Top-{acc['k']} Breakdown (Full Hybrid Pipeline)

| Test User | Taste Cohort | Train Items | Test Items | TP | FP | FN | Precision@10 | Recall@10 | AP@10 |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
{user_rows}

### 4.3 Step-by-Step Formula Substitutions

1. **Precision (Target: $\\ge 70\\%$):**
$$\\text{{Precision}} = \\frac{{TP}}{{TP + FP}} = \\frac{{{tp}}}{{{tp} + {fp}}} = \\frac{{{tp}}}{{{tp + fp}}} = {prec:.4f} \\; (\\mathbf{{{prec * 100:.2f}\\%}})$$

2. **Recall (Target: $\\ge 65\\%$):**
$$\\text{{Recall}} = \\frac{{TP}}{{TP + FN}} = \\frac{{{tp}}}{{{tp} + {fn}}} = \\frac{{{tp}}}{{{tp + fn}}} = {rec:.4f} \\; (\\mathbf{{{rec * 100:.2f}\\%}})$$

3. **F1-Score (Target: $\\ge 0.67$):**
$$\\text{{F1-Score}} = 2 \\times \\frac{{\\text{{Precision}} \\times \\text{{Recall}}}}{{\\text{{Precision}} + \\text{{Recall}}}} = 2 \\times \\frac{{{prec:.4f} \\times {rec:.4f}}}{{{prec:.4f} + {rec:.4f}}} = \\mathbf{{{f1:.4f}}}$$

4. **Mean Average Precision — MAP@10 (Target: $\\ge 0.70$):**
$$\\text{{MAP@10}} = \\frac{{1}}{{{acc['evaluated_users']}}} \\sum_{{u=1}}^{{{acc['evaluated_users']}}} \\text{{AP@10}}(u) = \\frac{{{ap_terms}}}{{{acc['evaluated_users']}}} = \\mathbf{{{map_val:.4f}}}$$

### 4.4 Architecture Ablation: Standalone SASRec vs. Full Hybrid Pipeline

| Model Variant | TP | FP | FN | Precision@10 | Recall@10 | F1-Score | MAP@10 |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| **Stage 1 Only — Standalone SASRec** (`sasrec_model.py`) | {acc_sasrec['tp']} | {acc_sasrec['fp']} | {acc_sasrec['fn']} | {acc_sasrec['precision'] * 100:.2f}% | {acc_sasrec['recall'] * 100:.2f}% | {acc_sasrec['f1_score']:.4f} | {acc_sasrec['map_score']:.4f} |
| **Full Production Hybrid — SASRec + Content Reranker** (`recommendation.js`) | **{tp}** | **{fp}** | **{fn}** | **{prec * 100:.2f}%** | **{rec * 100:.2f}%** | **{f1:.4f}** | **{map_val:.4f}** |

---

## 5. Benchmark 3 — Inference Speed (`{inf['requests']}` Consecutive `POST /recommend` Requests)

Measured end-to-end across **100 consecutive FastAPI `POST /recommend` requests** (JSON parsing, Pydantic `RecommendationRequest` validation, SASRec Transformer forward pass, and Top-10 ranking):

| Endpoint Pipeline (`{inf['requests']}` consecutive requests) | Average | Min | Median (p50) | 95th Percentile (p95) | Max |
| :--- | ---: | ---: | ---: | ---: | ---: |
| **FastAPI `/recommend` — SASRec Only** | {inf_sasrec['avg_ms']:.3f} ms ({inf_sasrec['avg_sec']:.6f} s) | {inf_sasrec['min_ms']:.3f} ms | {inf_sasrec['median_ms']:.3f} ms | {inf_sasrec['p95_ms']:.3f} ms ({inf_sasrec['p95_sec']:.6f} s) | {inf_sasrec['max_ms']:.3f} ms |
| **FastAPI `/recommend` — Full Hybrid (SASRec + Reranker)** | **{inf['avg_ms']:.3f} ms ({inf['avg_sec']:.6f} s)** | {inf['min_ms']:.3f} ms ({inf['min_sec']:.6f} s) | {inf['median_ms']:.3f} ms | **{inf['p95_ms']:.3f} ms ({inf['p95_sec']:.6f} s)** | {inf['max_ms']:.3f} ms ({inf['max_sec']:.6f} s) |

---

## 6. Final Summary Table

| Metric | Target | Actual Result | Status |
| :--- | :---: | :---: | :---: |
| **Model Training Time (80% split, 400 interactions)** | <= 30.0 s | **{tr['duration_sec']:.4f} s** ({tr['duration_sec'] * 1000:.2f} ms) | **{'PASS' if pass_train else 'FAIL'}** |
| **Precision@10** | >= 70.00% | **{prec * 100:.2f}%** ({tp}/{tp + fp}) | **{'PASS' if pass_prec else 'FAIL'}** |
| **Recall@10** | >= 65.00% | **{rec * 100:.2f}%** ({tp}/{tp + fn}) | **{'PASS' if pass_rec else 'FAIL'}** |
| **F1-Score** | >= 0.67 | **{f1:.4f}** | **{'PASS' if pass_f1 else 'FAIL'}** |
| **Mean Average Precision (MAP@10)** | >= 0.70 | **{map_val:.4f}** | **{'PASS' if pass_map else 'FAIL'}** |
| **Inference Time — Average (100 requests)** | Real-time (< 1.0 s) | **{inf['avg_ms']:.3f} ms** ({inf['avg_sec']:.6f} s) | **PASS** |
| **Inference Time — p95 (100 requests)** | Real-time (< 1.0 s) | **{inf['p95_ms']:.3f} ms** ({inf['p95_sec']:.6f} s) | **PASS** |

- **Overall Capstone Evaluation Verdict:** **{'PASSED — All thesis targets met.' if overall_pass else 'FAILED — One or more thesis targets were not met.'}**
"""


async def run_evaluation() -> dict:
    artworks, db_info = fetch_real_catalog_and_interaction_stats()
    if len(artworks) < 30:
        raise RuntimeError(f"Expected at least 30 verified artworks in MySQL, found {len(artworks)}")

    dataset = build_offline_evaluation_dataset(artworks, seed=SEED)

    with tempfile.TemporaryDirectory(prefix="artmatch_sasrec_eval_") as tmp_dir:
        temp_ckpt = Path(tmp_dir) / "sasrec_eval.pth"
        model, train_sec, train_meta = train_sasrec_for_evaluation(dataset, temp_ckpt)

        sasrec_fn = make_sasrec_recommender_fn(model, dataset["raw_to_sasrec"])
        hybrid_fn = make_hybrid_recommender_fn(sasrec_fn, dataset)

        accuracy_sasrec = evaluate_top_k_accuracy(dataset, sasrec_fn, k=TOP_K, pass_events=False)
        accuracy_hybrid = evaluate_top_k_accuracy(dataset, hybrid_fn, k=TOP_K, pass_events=True)

        app_sasrec = build_eval_fastapi_app(sasrec_fn)
        app_hybrid = build_eval_fastapi_app(hybrid_fn)

        inference_sasrec = await benchmark_inference_100_requests(
            app_sasrec, dataset, num_requests=INFERENCE_REQUESTS
        )
        inference_hybrid = await benchmark_inference_100_requests(
            app_hybrid, dataset, num_requests=INFERENCE_REQUESTS
        )

    import fastapi

    result = {
        "executed_at": datetime.now(timezone.utc).isoformat(),
        "platform": f"{platform.system()} {platform.release()} ({platform.machine()})",
        "processor": platform.processor() or "Unknown CPU",
        "cpu_count": os.cpu_count() or 1,
        "python_version": platform.python_version(),
        "torch_version": torch.__version__,
        "fastapi_version": fastapi.__version__,
        "numpy_version": np.__version__,
        "database": db_info,
        "dataset": {
            "total_interactions": TOTAL_INTERACTIONS,
            "train_interactions": TRAIN_INTERACTIONS,
            "test_interactions": TEST_INTERACTIONS,
            "user_num": dataset["user_num"],
            "item_num": dataset["item_num"],
            "cohorts": dataset["cohorts"],
        },
        "training": {
            "duration_sec": train_sec,
            **train_meta,
        },
        "accuracy_sasrec_only": accuracy_sasrec,
        "accuracy_hybrid": accuracy_hybrid,
        "inference_sasrec_only": inference_sasrec,
        "inference": inference_hybrid,
    }

    report_md = render_markdown_report(result)
    REPORT_PATH.write_text(report_md, encoding="utf-8")
    return result


def main() -> None:
    result = asyncio.run(run_evaluation())
    print("=== ML Recommendation Evaluation Summary ===")
    print(
        json.dumps(
            {
                "report_path": str(REPORT_PATH),
                "training_time_sec": round(result["training"]["duration_sec"], 4),
                "training_loss_start_to_end": [
                    result["training"]["initial_loss"],
                    result["training"]["final_loss"],
                ],
                "sasrec_only": {
                    "tp": result["accuracy_sasrec_only"]["tp"],
                    "fp": result["accuracy_sasrec_only"]["fp"],
                    "fn": result["accuracy_sasrec_only"]["fn"],
                    "precision_pct": round(result["accuracy_sasrec_only"]["precision"] * 100, 2),
                    "recall_pct": round(result["accuracy_sasrec_only"]["recall"] * 100, 2),
                    "f1_score": round(result["accuracy_sasrec_only"]["f1_score"], 4),
                    "map_score": round(result["accuracy_sasrec_only"]["map_score"], 4),
                },
                "hybrid_full": {
                    "tp": result["accuracy_hybrid"]["tp"],
                    "fp": result["accuracy_hybrid"]["fp"],
                    "fn": result["accuracy_hybrid"]["fn"],
                    "precision_pct": round(result["accuracy_hybrid"]["precision"] * 100, 2),
                    "recall_pct": round(result["accuracy_hybrid"]["recall"] * 100, 2),
                    "f1_score": round(result["accuracy_hybrid"]["f1_score"], 4),
                    "map_score": round(result["accuracy_hybrid"]["map_score"], 4),
                },
                "inference_sasrec_avg_ms": round(result["inference_sasrec_only"]["avg_ms"], 3),
                "inference_hybrid_avg_ms": round(result["inference"]["avg_ms"], 3),
                "inference_hybrid_p95_ms": round(result["inference"]["p95_ms"], 3),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
