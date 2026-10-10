from __future__ import annotations

import json
from pathlib import Path
from typing import Iterable

import torch

from .sasrec_dataset import build_inference_sequence
from .sasrec_model import SASRec


BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
MODEL_DIR = BASE_DIR / "models"

ITEM_MAP_FILE = DATA_DIR / "item_mapping.json"
CHECKPOINT_FILE = MODEL_DIR / "sasrec.pth"

DEVICE = torch.device("cpu")


def _read_json(path: Path) -> dict:
    if not path.exists():
        raise FileNotFoundError(
            f"Required file not found: {path}"
        )

    return json.loads(
        path.read_text(
            encoding="utf-8",
        )
    )


def _load_checkpoint(path: Path) -> dict:
    if not path.exists():
        raise FileNotFoundError(
            f"SASRec checkpoint not found: {path}"
        )

    try:
        return torch.load(
            path,
            map_location=DEVICE,
            weights_only=False,
        )
    except TypeError:
        return torch.load(
            path,
            map_location=DEVICE,
        )


# --------------------------------------------------
# Load mappings once when the ML service starts.
# --------------------------------------------------

ITEM_MAPPING = _read_json(
    ITEM_MAP_FILE
)

RAW_TO_SASREC = {
    int(raw_id): int(sasrec_id)
    for raw_id, sasrec_id
    in ITEM_MAPPING[
        "raw_to_sasrec"
    ].items()
}

SASREC_TO_RAW = {
    int(sasrec_id): int(raw_id)
    for sasrec_id, raw_id
    in ITEM_MAPPING[
        "sasrec_to_raw"
    ].items()
}


# --------------------------------------------------
# Load the trained model once.
# --------------------------------------------------

CHECKPOINT = _load_checkpoint(
    CHECKPOINT_FILE
)

CONFIG = CHECKPOINT.get(
    "config",
    {},
)

MODEL = SASRec(
    item_num=int(
        CONFIG["item_num"]
    ),

    maxlen=int(
        CONFIG["maxlen"]
    ),

    hidden_units=int(
        CONFIG["hidden_units"]
    ),

    num_blocks=int(
        CONFIG["num_blocks"]
    ),

    num_heads=int(
        CONFIG["num_heads"]
    ),

    dropout_rate=float(
        CONFIG["dropout_rate"]
    ),

    norm_first=bool(
        CONFIG["norm_first"]
    ),
).to(
    DEVICE
)

MODEL.load_state_dict(
    CHECKPOINT[
        "model_state_dict"
    ]
)

MODEL.eval()


def _clean_artwork_ids(
    artwork_ids: Iterable[int],
) -> list[int]:

    cleaned = []

    for value in artwork_ids:

        try:
            artwork_id = int(
                value
            )
        except (
            TypeError,
            ValueError,
        ):
            continue

        if artwork_id <= 0:
            continue

        # Same rule used by our exporter:
        # collapse only adjacent repeats.
        #
        # 28, 28, 28, 31
        #
        # becomes:
        #
        # 28, 31
        #
        # But:
        #
        # 28, 31, 28
        #
        # stays unchanged.
        if (
            not cleaned
            or
            cleaned[-1]
            != artwork_id
        ):
            cleaned.append(
                artwork_id
            )

    return cleaned


def recommend_from_artwork_ids(
    artwork_ids: Iterable[int],
    top_k: int = 5,
    candidate_artwork_ids:
        Iterable[int]
        | None = None,
) -> list[dict]:

    """
    Generate recommendations from LIVE
    ArtMatch artwork IDs.

    Example live history:

        [22, 28, 30, 31, 24, 25]

    The function translates those IDs into
    SASRec item IDs, performs inference,
    then converts recommendations back into
    actual artwork_id values.
    """

    raw_history = (
        _clean_artwork_ids(
            artwork_ids
        )
    )

    # --------------------------------------------------
    # Convert real artwork IDs to trained SASRec IDs.
    # --------------------------------------------------

    mapped_history = [
        RAW_TO_SASREC[
            artwork_id
        ]

        for artwork_id
        in raw_history

        if artwork_id
        in RAW_TO_SASREC
    ]

    # If all history contains artworks that
    # SASRec has never seen during training,
    # the model cannot use it yet.
    if not mapped_history:
        return []

    seen_items = set(
        mapped_history
    )

    # --------------------------------------------------
    # Determine which artworks may be recommended.
    # --------------------------------------------------

    if candidate_artwork_ids is None:

        candidate_raw_ids = sorted(
            RAW_TO_SASREC
        )

    else:

        candidate_raw_ids = (
            _clean_artwork_ids(
                candidate_artwork_ids
            )
        )

    candidate_pairs = []

    for raw_artwork_id in (
        candidate_raw_ids
    ):

        sasrec_item_id = (
            RAW_TO_SASREC.get(
                raw_artwork_id
            )
        )

        # Artwork was added after this model
        # was trained.
        if sasrec_item_id is None:
            continue

        # Do not recommend something
        # already in this user's sequence.
        if (
            sasrec_item_id
            in seen_items
        ):
            continue

        candidate_pairs.append(
            (
                raw_artwork_id,
                sasrec_item_id,
            )
        )

    if not candidate_pairs:
        return []

    # --------------------------------------------------
    # Build sequence tensor.
    # --------------------------------------------------

    maxlen = int(
        CONFIG["maxlen"]
    )

    inference_sequence = (
        build_inference_sequence(
            mapped_history,
            maxlen=maxlen,
        )
    )

    sequence_tensor = (
        torch
        .from_numpy(
            inference_sequence
        )
        .long()
        .unsqueeze(0)
        .to(
            DEVICE
        )
    )

    candidate_tensor = (
        torch.tensor(
            [
                sasrec_item_id

                for (
                    _,
                    sasrec_item_id,
                )
                in candidate_pairs
            ],

            dtype=torch.long,
            device=DEVICE,
        )
    )

    # --------------------------------------------------
    # SASRec inference.
    # --------------------------------------------------

    with torch.no_grad():

        scores = (
            MODEL.predict(
                sequence_tensor,
                candidate_tensor,
            )
            .squeeze(0)
        )

    limit = min(
        max(
            int(top_k),
            1,
        ),
        len(
            candidate_pairs
        ),
    )

    ranked_indices = (
        torch.topk(
            scores,
            k=limit,
        )
        .indices
        .tolist()
    )

    # --------------------------------------------------
    # Convert back to real ArtMatch artwork IDs.
    # --------------------------------------------------

    recommendations = []

    for (
        rank,
        candidate_index,
    ) in enumerate(
        ranked_indices,
        start=1,
    ):

        (
            raw_artwork_id,
            sasrec_item_id,
        ) = candidate_pairs[
            candidate_index
        ]

        recommendations.append(
            {
                "rank":
                    rank,

                "artwork_id":
                    int(
                        raw_artwork_id
                    ),

                "sasrec_item_id":
                    int(
                        sasrec_item_id
                    ),

                "score":
                    float(
                        scores[
                            candidate_index
                        ].item()
                    ),
            }
        )

    return recommendations