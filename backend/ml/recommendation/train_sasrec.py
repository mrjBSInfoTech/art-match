from __future__ import annotations

import json
import math
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import torch
from torch import nn

from sasrec_dataset import (
    build_inference_sequence,
    load_sasrec_data,
    make_batch,
)

from sasrec_model import SASRec


BASE_DIR = Path(__file__).resolve().parent

DATA_FILE = (
    BASE_DIR
    / "data"
    / "ArtMatch.txt"
)

MODEL_DIR = (
    BASE_DIR
    / "models"
)

CHECKPOINT_FILE = (
    MODEL_DIR
    / "sasrec.pth"
)

REPORT_FILE = (
    MODEL_DIR
    / "training_report.json"
)


# ==========================================
# CPU-FRIENDLY TRAINING SETTINGS
# ==========================================

DEVICE = torch.device("cpu")

SEED = 42

EPOCHS = 50

BATCH_SIZE = 32

MAXLEN = 50

HIDDEN_UNITS = 50

NUM_BLOCKS = 2

NUM_HEADS = 1

DROPOUT_RATE = 0.2

LEARNING_RATE = 0.001

WEIGHT_DECAY = 0.0

GRAD_CLIP = 5.0

EVAL_K = 5

EVAL_EVERY = 5


def set_seed(seed: int) -> None:

    np.random.seed(seed)

    torch.manual_seed(seed)


def evaluate_next_item(
    model: SASRec,
    user_train: dict[int, list[int]],
    user_valid: dict[int, list[int]],
    user_test: dict[int, list[int]],
    item_num: int,
    maxlen: int,
    split: str,
    k: int,
) -> dict:

    if split not in {
        "valid",
        "test",
    }:
        raise ValueError(
            "split must be "
            "'valid' or 'test'"
        )

    model.eval()

    hits = 0.0
    ndcg = 0.0
    evaluated = 0

    effective_k = min(
        k,
        item_num,
    )

    # Candidate items:
    #
    # 1, 2, 3, ... item_num
    #
    # Item 0 is padding and is
    # never a recommendation.
    candidate_ids = torch.arange(
        1,
        item_num + 1,
        dtype=torch.long,
        device=DEVICE,
    )

    with torch.no_grad():

        for user_id in sorted(
            user_train
        ):

            train_items = list(
                user_train[
                    user_id
                ]
            )

            valid_items = list(
                user_valid.get(
                    user_id,
                    [],
                )
            )

            test_items = list(
                user_test.get(
                    user_id,
                    [],
                )
            )

            # --------------------------
            # VALIDATION
            # --------------------------

            if split == "valid":

                if not valid_items:
                    continue

                prefix = (
                    train_items
                )

                target = (
                    valid_items[0]
                )

            # --------------------------
            # TEST
            # --------------------------

            else:

                if not test_items:
                    continue

                prefix = (
                    train_items
                    + valid_items
                )

                target = (
                    test_items[0]
                )

            if not prefix:
                continue

            sequence = (
                build_inference_sequence(
                    prefix,
                    maxlen=maxlen,
                )
            )

            sequence_tensor = (
                torch
                .from_numpy(
                    sequence
                )
                .long()
                .unsqueeze(0)
                .to(DEVICE)
            )

            scores = (
                model.predict(
                    sequence_tensor,
                    candidate_ids,
                )
                .squeeze(0)
            )

            ranked_indices = (
                torch.argsort(
                    scores,
                    descending=True,
                )
            )

            ranked_items = (
                candidate_ids[
                    ranked_indices
                ]
            )

            target_positions = (
                (
                    ranked_items
                    == target
                )
                .nonzero(
                    as_tuple=False
                )
            )

            if (
                target_positions
                .numel()
                == 0
            ):
                continue

            rank = (
                int(
                    target_positions[
                        0
                    ].item()
                )
                + 1
            )

            evaluated += 1

            if rank <= effective_k:

                hits += 1.0

                ndcg += (
                    1.0
                    / math.log2(
                        rank + 1
                    )
                )

    if evaluated == 0:

        return {
            "users": 0,
            "hit_rate": 0.0,
            "ndcg": 0.0,
            "k": effective_k,
        }

    return {
        "users":
            evaluated,

        "hit_rate":
            hits
            / evaluated,

        "ndcg":
            ndcg
            / evaluated,

        "k":
            effective_k,
    }


def main() -> None:

    set_seed(
        SEED
    )

    rng = (
        np.random
        .default_rng(
            SEED
        )
    )

    # Create the recommendation
    # model directory automatically.
    MODEL_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    # ======================================
    # LOAD ArtMatch.txt
    # ======================================

    data = load_sasrec_data(
        DATA_FILE
    )

    trainable_users = [
        user_id

        for (
            user_id,
            sequence,
        ) in (
            data
            .user_train
            .items()
        )

        if len(
            sequence
        ) >= 2
    ]

    if not trainable_users:

        raise RuntimeError(
            "No user has at least "
            "2 training items. "
            "Collect more interactions first."
        )

    # ======================================
    # CREATE MODEL
    # ======================================

    model = SASRec(
        item_num=
            data.item_num,

        maxlen=
            MAXLEN,

        hidden_units=
            HIDDEN_UNITS,

        num_blocks=
            NUM_BLOCKS,

        num_heads=
            NUM_HEADS,

        dropout_rate=
            DROPOUT_RATE,

        norm_first=True,
    ).to(
        DEVICE
    )

    # ======================================
    # OPTIMIZER
    # ======================================

    optimizer = torch.optim.Adam(
        model.parameters(),

        lr=
            LEARNING_RATE,

        weight_decay=
            WEIGHT_DECAY,

        betas=(
            0.9,
            0.98,
        ),
    )

    criterion = (
        nn.BCEWithLogitsLoss()
    )

    history = []

    print("")

    print(
        "ArtMatch SASRec "
        "CPU training"
    )

    print(
        "--------------------------------"
    )

    print(
        f"Device:          "
        f"{DEVICE}"
    )

    print(
        f"Users:           "
        f"{data.user_num}"
    )

    print(
        f"Items:           "
        f"{data.item_num}"
    )

    print(
        f"Trainable users: "
        f"{len(trainable_users)}"
    )

    print(
        f"Epochs:          "
        f"{EPOCHS}"
    )

    print(
        f"Batch size:      "
        f"{BATCH_SIZE}"
    )

    print(
        f"Max sequence:    "
        f"{MAXLEN}"
    )

    print("")

    # ======================================
    # TRAINING LOOP
    # ======================================

    for epoch in range(
        1,
        EPOCHS + 1,
    ):

        model.train()

        shuffled_users = (
            rng.permutation(
                trainable_users
            )
            .tolist()
        )

        total_loss = 0.0

        total_targets = 0

        for start in range(
            0,
            len(shuffled_users),
            BATCH_SIZE,
        ):

            batch_users = (
                shuffled_users[
                    start:
                    start + BATCH_SIZE
                ]
            )

            (
                seq,
                pos,
                neg,
            ) = make_batch(
                user_train=
                    data.user_train,

                user_ids=
                    batch_users,

                item_num=
                    data.item_num,

                maxlen=
                    MAXLEN,

                rng=
                    rng,
            )

            seq = seq.to(
                DEVICE
            )

            pos = pos.to(
                DEVICE
            )

            neg = neg.to(
                DEVICE
            )

            optimizer.zero_grad(
                set_to_none=True
            )

            (
                pos_logits,
                neg_logits,
            ) = model(
                seq,
                pos,
                neg,
            )

            # Ignore padding positions.
            active = (
                pos.ne(0)
            )

            if not active.any():
                continue

            positive_loss = (
                criterion(
                    pos_logits[
                        active
                    ],

                    torch.ones_like(
                        pos_logits[
                            active
                        ]
                    ),
                )
            )

            negative_loss = (
                criterion(
                    neg_logits[
                        active
                    ],

                    torch.zeros_like(
                        neg_logits[
                            active
                        ]
                    ),
                )
            )

            loss = (
                positive_loss
                + negative_loss
            )

            # Backpropagation
            loss.backward()

            # Prevent extreme gradients.
            torch.nn.utils.clip_grad_norm_(
                model.parameters(),
                GRAD_CLIP,
            )

            optimizer.step()

            target_count = int(
                active.sum().item()
            )

            total_loss += (
                float(
                    loss.item()
                )
                * target_count
            )

            total_targets += (
                target_count
            )

        if total_targets == 0:

            raise RuntimeError(
                "No usable next-item "
                "targets were produced "
                "during training."
            )

        average_loss = (
            total_loss
            / total_targets
        )

        record = {
            "epoch":
                epoch,

            "loss":
                average_loss,
        }

        should_evaluate = (
            epoch == 1

            or epoch
            % EVAL_EVERY
            == 0

            or epoch
            == EPOCHS
        )

        # ==================================
        # VALIDATION
        # ==================================

        if should_evaluate:

            valid_metrics = (
                evaluate_next_item(
                    model=
                        model,

                    user_train=
                        data.user_train,

                    user_valid=
                        data.user_valid,

                    user_test=
                        data.user_test,

                    item_num=
                        data.item_num,

                    maxlen=
                        MAXLEN,

                    split=
                        "valid",

                    k=
                        EVAL_K,
                )
            )

            record[
                "valid_users"
            ] = int(
                valid_metrics[
                    "users"
                ]
            )

            record[
                "valid_hit_rate"
            ] = float(
                valid_metrics[
                    "hit_rate"
                ]
            )

            record[
                "valid_ndcg"
            ] = float(
                valid_metrics[
                    "ndcg"
                ]
            )

            print(
                f"Epoch "
                f"{epoch:>3}"
                f"/{EPOCHS} | "

                f"loss="
                f"{average_loss:.6f} | "

                f"val_users="
                f"{valid_metrics['users']} | "

                f"HR@"
                f"{valid_metrics['k']}="
                f"{valid_metrics['hit_rate']:.4f} | "

                f"NDCG@"
                f"{valid_metrics['k']}="
                f"{valid_metrics['ndcg']:.4f}"
            )

        else:

            print(
                f"Epoch "
                f"{epoch:>3}"
                f"/{EPOCHS} | "

                f"loss="
                f"{average_loss:.6f}"
            )

        history.append(
            record
        )

    # ======================================
    # FINAL TEST
    # ======================================

    test_metrics = (
        evaluate_next_item(
            model=
                model,

            user_train=
                data.user_train,

            user_valid=
                data.user_valid,

            user_test=
                data.user_test,

            item_num=
                data.item_num,

            maxlen=
                MAXLEN,

            split=
                "test",

            k=
                EVAL_K,
        )
    )

    # ======================================
    # SAVE MODEL
    # ======================================

    checkpoint = {

        "model_state_dict":
            model.state_dict(),

        "config": {

            "item_num":
                data.item_num,

            "maxlen":
                MAXLEN,

            "hidden_units":
                HIDDEN_UNITS,

            "num_blocks":
                NUM_BLOCKS,

            "num_heads":
                NUM_HEADS,

            "dropout_rate":
                DROPOUT_RATE,

            "norm_first":
                True,
        },

        "training": {

            "epochs":
                EPOCHS,

            "batch_size":
                BATCH_SIZE,

            "learning_rate":
                LEARNING_RATE,

            "weight_decay":
                WEIGHT_DECAY,

            "seed":
                SEED,

            "device":
                str(
                    DEVICE
                ),
        },

        "dataset": {

            "user_num":
                data.user_num,

            "item_num":
                data.item_num,

            "trainable_users":
                len(
                    trainable_users
                ),

            "source_file":
                DATA_FILE.name,
        },

        "saved_at":
            datetime.now(
                timezone.utc
            ).isoformat(),
    }

    torch.save(
        checkpoint,
        CHECKPOINT_FILE,
    )

    # ======================================
    # SAVE TRAINING REPORT
    # ======================================

    report = {

        "checkpoint":
            str(
                CHECKPOINT_FILE
            ),

        "saved_at":
            checkpoint[
                "saved_at"
            ],

        "config":
            checkpoint[
                "config"
            ],

        "training":
            checkpoint[
                "training"
            ],

        "dataset":
            checkpoint[
                "dataset"
            ],

        "final_test":
            test_metrics,

        "history":
            history,

        "warning":
            (
                "Current metrics are "
                "diagnostic only. "
                "ArtMatch currently "
                "has very few users "
                "and interactions, "
                "so HR/NDCG are not "
                "statistically "
                "meaningful yet."
            ),
    }

    REPORT_FILE.write_text(
        json.dumps(
            report,
            indent=2,
        ),
        encoding="utf-8",
    )

    # ======================================
    # FINAL OUTPUT
    # ======================================

    print("")

    print(
        "Training complete."
    )

    print(
        "--------------------------------"
    )

    print(
        f"Saved checkpoint: "
        f"{CHECKPOINT_FILE}"
    )

    print(
        f"Saved report:     "
        f"{REPORT_FILE}"
    )

    print(
        f"Test users:       "
        f"{test_metrics['users']} | "

        f"HR@"
        f"{test_metrics['k']}="
        f"{test_metrics['hit_rate']:.4f} | "

        f"NDCG@"
        f"{test_metrics['k']}="
        f"{test_metrics['ndcg']:.4f}"
    )

    print("")

    print(
        "IMPORTANT: These "
        "evaluation numbers are only "
        "a pipeline sanity check "
        "until you collect "
        "substantially more user "
        "interaction history."
    )


if __name__ == "__main__":
    main()