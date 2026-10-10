from __future__ import annotations

import argparse
import json
from pathlib import Path

import torch

from sasrec_dataset import (
    build_inference_sequence,
    load_sasrec_data,
)

from sasrec_model import SASRec


BASE_DIR = Path(__file__).resolve().parent

DATA_DIR = BASE_DIR / "data"
MODEL_DIR = BASE_DIR / "models"

DATA_FILE = (
    DATA_DIR
    / "ArtMatch.txt"
)

USER_MAP_FILE = (
    DATA_DIR
    / "user_mapping.json"
)

ITEM_MAP_FILE = (
    DATA_DIR
    / "item_mapping.json"
)

CHECKPOINT_FILE = (
    MODEL_DIR
    / "sasrec.pth"
)

DEVICE = torch.device(
    "cpu"
)


def read_json(
    path: Path,
) -> dict:

    if not path.exists():
        raise FileNotFoundError(
            f"Required file "
            f"not found: {path}"
        )

    return json.loads(
        path.read_text(
            encoding="utf-8"
        )
    )


def load_checkpoint(
    path: Path,
) -> dict:

    if not path.exists():
        raise FileNotFoundError(
            f"SASRec checkpoint "
            f"not found: {path}"
        )

    try:

        return torch.load(
            path,
            map_location=DEVICE,
            weights_only=False,
        )

    except TypeError:

        # Compatibility with older
        # PyTorch versions.
        return torch.load(
            path,
            map_location=DEVICE,
        )


def build_full_sequences(
    data,
) -> dict[int, list[int]]:

    """
    Reconstruct each user's
    complete exported sequence.

    train + validation + test
    """

    sequences = {}

    for user_id in range(
        1,
        data.user_num + 1,
    ):

        sequence = []

        sequence.extend(
            data.user_train.get(
                user_id,
                [],
            )
        )

        sequence.extend(
            data.user_valid.get(
                user_id,
                [],
            )
        )

        sequence.extend(
            data.user_test.get(
                user_id,
                [],
            )
        )

        if sequence:

            sequences[
                user_id
            ] = sequence

    return sequences


def load_model(
    checkpoint: dict,
) -> SASRec:

    config = checkpoint.get(
        "config",
        {},
    )

    required = [
        "item_num",
        "maxlen",
        "hidden_units",
        "num_blocks",
        "num_heads",
        "dropout_rate",
        "norm_first",
    ]

    missing = [
        key

        for key in required

        if key not in config
    ]

    if missing:

        raise ValueError(
            "Checkpoint is missing "
            "model config fields: "
            + ", ".join(
                missing
            )
        )

    model = SASRec(
        item_num=
            int(
                config[
                    "item_num"
                ]
            ),

        maxlen=
            int(
                config[
                    "maxlen"
                ]
            ),

        hidden_units=
            int(
                config[
                    "hidden_units"
                ]
            ),

        num_blocks=
            int(
                config[
                    "num_blocks"
                ]
            ),

        num_heads=
            int(
                config[
                    "num_heads"
                ]
            ),

        dropout_rate=
            float(
                config[
                    "dropout_rate"
                ]
            ),

        norm_first=
            bool(
                config[
                    "norm_first"
                ]
            ),
    ).to(
        DEVICE
    )

    model.load_state_dict(
        checkpoint[
            "model_state_dict"
        ]
    )

    model.eval()

    return model


def recommend_for_identity(
    identity: str,
    top_k: int,
) -> list[dict]:

    user_mapping = read_json(
        USER_MAP_FILE
    )

    item_mapping = read_json(
        ITEM_MAP_FILE
    )

    checkpoint = load_checkpoint(
        CHECKPOINT_FILE
    )

    data = load_sasrec_data(
        DATA_FILE
    )

    raw_to_user = (
        user_mapping.get(
            "raw_to_sasrec",
            {},
        )
    )

    sasrec_to_raw_item = (
        item_mapping.get(
            "sasrec_to_raw",
            {},
        )
    )

    # ---------------------------------
    # FIND USER
    # ---------------------------------

    if identity not in raw_to_user:

        available = ", ".join(
            sorted(
                raw_to_user
            )
        )

        if not available:
            available = "none"

        raise ValueError(
            f"Identity '{identity}' "
            f"is not present in "
            f"user_mapping.json. "
            f"Available identities: "
            f"{available}"
        )

    sasrec_user_id = int(
        raw_to_user[
            identity
        ]
    )

    # ---------------------------------
    # REBUILD FULL HISTORY
    # ---------------------------------

    full_sequences = (
        build_full_sequences(
            data
        )
    )

    if (
        sasrec_user_id
        not in full_sequences
    ):

        raise ValueError(
            f"SASRec user "
            f"{sasrec_user_id} "
            f"has no sequence in "
            f"{DATA_FILE.name}."
        )

    sequence = (
        full_sequences[
            sasrec_user_id
        ]
    )

    # Items the user has
    # already interacted with.
    seen_items = set(
        sequence
    )

    # ---------------------------------
    # LOAD MODEL
    # ---------------------------------

    model = load_model(
        checkpoint
    )

    maxlen = int(
        checkpoint[
            "config"
        ][
            "maxlen"
        ]
    )

    item_num = int(
        checkpoint[
            "config"
        ][
            "item_num"
        ]
    )

    # Ensure the checkpoint and current
    # exported data still agree.
    if (
        item_num
        != data.item_num
    ):

        raise ValueError(
            "Checkpoint item count "
            "does not match "
            "ArtMatch.txt. "
            "Re-export the data "
            "and retrain SASRec "
            "before inference."
        )

    # ---------------------------------
    # CANDIDATES
    # ---------------------------------

    # Recommend only artwork that
    # this user has NOT already seen.
    candidate_items = [
        item_id

        for item_id in range(
            1,
            item_num + 1,
        )

        if item_id
        not in seen_items
    ]

    if not candidate_items:
        return []

    # ---------------------------------
    # BUILD MODEL INPUT
    # ---------------------------------

    inference_sequence = (
        build_inference_sequence(
            sequence,
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
            candidate_items,
            dtype=torch.long,
            device=DEVICE,
        )
    )

    # ---------------------------------
    # SCORE ITEMS
    # ---------------------------------

    with torch.no_grad():

        scores = (
            model.predict(
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
            candidate_items
        ),
    )

    top_indices = (
        torch.topk(
            scores,
            k=limit,
        )
        .indices
        .tolist()
    )

    # ---------------------------------
    # MAP SASRec IDs BACK TO
    # REAL artwork_id VALUES
    # ---------------------------------

    recommendations = []

    for (
        rank,
        candidate_index,
    ) in enumerate(
        top_indices,
        start=1,
    ):

        sasrec_item_id = int(
            candidate_items[
                candidate_index
            ]
        )

        raw_artwork_id = (
            sasrec_to_raw_item.get(
                str(
                    sasrec_item_id
                )
            )
        )

        if (
            raw_artwork_id
            is None
        ):

            raise ValueError(
                "No raw artwork "
                "mapping exists for "
                f"SASRec item "
                f"{sasrec_item_id}."
            )

        recommendations.append(
            {
                "rank":
                    rank,

                "artwork_id":
                    int(
                        raw_artwork_id
                    ),

                "sasrec_item_id":
                    sasrec_item_id,

                "score":
                    float(
                        scores[
                            candidate_index
                        ].item()
                    ),
            }
        )

    return recommendations


def parse_args():

    parser = (
        argparse.ArgumentParser(
            description=(
                "Generate ArtMatch "
                "artwork recommendations "
                "with the trained "
                "SASRec model."
            )
        )
    )

    parser.add_argument(
        "--identity",
        type=str,

        help=(
            "Raw identity from "
            "user_mapping.json, "
            "for example customer:1"
        ),
    )

    parser.add_argument(
        "--top-k",
        type=int,
        default=5,

        help=(
            "Maximum number of "
            "unseen artwork "
            "recommendations."
        ),
    )

    parser.add_argument(
        "--list-identities",
        action="store_true",

        help=(
            "Print identities "
            "currently available "
            "in user_mapping.json."
        ),
    )

    parser.add_argument(
        "--json",
        action="store_true",

        help=(
            "Print recommendations "
            "as JSON."
        ),
    )

    return parser.parse_args()


def main():

    args = parse_args()

    user_mapping = read_json(
        USER_MAP_FILE
    )

    available_identities = sorted(
        user_mapping.get(
            "raw_to_sasrec",
            {},
        )
    )

    # ---------------------------------
    # LIST USERS
    # ---------------------------------

    if args.list_identities:

        print(
            "Available SASRec identities:"
        )

        for identity in (
            available_identities
        ):

            print(
                f"  {identity}"
            )

        return

    # ---------------------------------
    # NO USER PROVIDED
    # ---------------------------------

    if not args.identity:

        print(
            "No --identity "
            "was provided."
        )

        print("")

        print(
            "Available identities:"
        )

        for identity in (
            available_identities
        ):

            print(
                f"  {identity}"
            )

        print("")

        print(
            "Example:"
        )

        print(
            "  python "
            "ml/recommendation/"
            "recommend.py "
            "--identity customer:1 "
            "--top-k 5"
        )

        return

    # ---------------------------------
    # GENERATE RECOMMENDATIONS
    # ---------------------------------

    recommendations = (
        recommend_for_identity(
            identity=
                args.identity,

            top_k=
                args.top_k,
        )
    )

    # ---------------------------------
    # JSON MODE
    # ---------------------------------

    if args.json:

        print(
            json.dumps(
                {
                    "identity":
                        args.identity,

                    "recommendations":
                        recommendations,
                },

                indent=2,
            )
        )

        return

    # ---------------------------------
    # HUMAN READABLE OUTPUT
    # ---------------------------------

    print("")

    print(
        "ArtMatch SASRec "
        "recommendations"
    )

    print(
        "--------------------------------"
    )

    print(
        f"Identity: "
        f"{args.identity}"
    )

    print(
        f"Device:   "
        f"{DEVICE}"
    )

    print("")

    if not recommendations:

        print(
            "No unseen mapped "
            "artworks are available "
            "to recommend."
        )

        return

    for item in recommendations:

        print(
            f"#{item['rank']} | "
            f"artwork_id="
            f"{item['artwork_id']} | "
            f"sasrec_item_id="
            f"{item['sasrec_item_id']} | "
            f"score="
            f"{item['score']:.6f}"
        )


if __name__ == "__main__":
    main()