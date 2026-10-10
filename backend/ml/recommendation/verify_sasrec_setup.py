from pathlib import Path

import numpy as np
import torch
from torch import nn

from sasrec_dataset import (
    load_sasrec_data,
    make_batch,
)

from sasrec_model import SASRec


BASE_DIR = (
    Path(__file__)
    .resolve()
    .parent
)

DATA_FILE = (
    BASE_DIR
    / "data"
    / "ArtMatch.txt"
)

DEVICE = torch.device(
    "cpu"
)

MAXLEN = 50

HIDDEN_UNITS = 50

NUM_BLOCKS = 2

NUM_HEADS = 1

DROPOUT_RATE = 0.2


def main():

    torch.manual_seed(
        42
    )

    rng = (
        np.random
        .default_rng(
            42
        )
    )

    data = load_sasrec_data(
        DATA_FILE
    )

    eligible_users = [
        user_id

        for (
            user_id,
            sequence,
        ) in data.user_train.items()

        if len(
            sequence
        ) >= 2
    ]

    if not eligible_users:

        raise RuntimeError(
            "No training user "
            "has at least 2 items."
        )

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

    (
        seq,
        pos,
        neg,
    ) = make_batch(
        user_train=
            data.user_train,

        user_ids=
            eligible_users,

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

    model.train()

    (
        pos_logits,
        neg_logits,
    ) = model(
        seq,
        pos,
        neg,
    )

    active = pos.ne(
        0
    )

    if not active.any():

        raise RuntimeError(
            "Training batch "
            "contains no targets."
        )

    criterion = (
        nn.BCEWithLogitsLoss()
    )

    positive_loss = criterion(
        pos_logits[
            active
        ],

        torch.ones_like(
            pos_logits[
                active
            ]
        ),
    )

    negative_loss = criterion(
        neg_logits[
            active
        ],

        torch.zeros_like(
            neg_logits[
                active
            ]
        ),
    )

    loss = (
        positive_loss
        + negative_loss
    )

    parameter_count = sum(
        parameter.numel()

        for parameter
        in model.parameters()
    )

    print("")

    print(
        "ArtMatch SASRec "
        "setup check PASSED"
    )

    print(
        "--------------------------------"
    )

    print(
        f"Device:                 "
        f"{DEVICE}"
    )

    print(
        f"Users in file:          "
        f"{data.user_num}"
    )

    print(
        f"Items in file:          "
        f"{data.item_num}"
    )

    print(
        f"Trainable users:        "
        f"{len(eligible_users)}"
    )

    print(
        f"Batch sequence shape:   "
        f"{tuple(seq.shape)}"
    )

    print(
        f"Positive logits shape:  "
        f"{tuple(pos_logits.shape)}"
    )

    print(
        f"Model parameters:       "
        f"{parameter_count:,}"
    )

    print(
        f"Dry-run loss:           "
        f"{loss.item():.6f}"
    )

    print("")

    print(
        "No training checkpoint "
        "was written."
    )

    print(
        "This only verified that "
        "the model and data pipeline "
        "work together."
    )


if __name__ == "__main__":
    main()