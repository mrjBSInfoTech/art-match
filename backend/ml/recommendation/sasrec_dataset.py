from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable

import numpy as np
import torch


@dataclass
class SASRecData:
    user_train: Dict[
        int,
        list[int],
    ]

    user_valid: Dict[
        int,
        list[int],
    ]

    user_test: Dict[
        int,
        list[int],
    ]

    user_num: int
    item_num: int


def load_sasrec_data(
    path: str | Path,
) -> SASRecData:

    path = Path(path)

    if not path.exists():
        raise FileNotFoundError(
            f"SASRec data file "
            f"not found: {path}"
        )

    interactions = defaultdict(
        list
    )

    user_num = 0
    item_num = 0

    with path.open(
        "r",
        encoding="utf-8",
    ) as handle:

        for (
            line_number,
            raw_line,
        ) in enumerate(
            handle,
            start=1,
        ):

            line = (
                raw_line.strip()
            )

            if not line:
                continue

            parts = line.split()

            if len(parts) != 2:
                raise ValueError(
                    f"{path.name} "
                    f"line {line_number}: "
                    f"expected "
                    f"'user item'"
                )

            user_id, item_id = map(
                int,
                parts,
            )

            if (
                user_id < 1
                or item_id < 1
            ):
                raise ValueError(
                    f"{path.name} "
                    f"line {line_number}: "
                    f"ids must start at 1"
                )

            interactions[
                user_id
            ].append(
                item_id
            )

            user_num = max(
                user_num,
                user_id,
            )

            item_num = max(
                item_num,
                item_id,
            )

    if not interactions:
        raise ValueError(
            f"No interactions "
            f"found in {path}"
        )

    user_train = {}
    user_valid = {}
    user_test = {}

    # Match pmixer's current
    # train/validation/test policy.
    for (
        user_id,
        items,
    ) in interactions.items():

        if len(items) < 4:

            user_train[
                user_id
            ] = list(
                items
            )

            user_valid[
                user_id
            ] = []

            user_test[
                user_id
            ] = []

        else:

            user_train[
                user_id
            ] = list(
                items[:-2]
            )

            user_valid[
                user_id
            ] = [
                items[-2]
            ]

            user_test[
                user_id
            ] = [
                items[-1]
            ]

    return SASRecData(
        user_train=
            user_train,

        user_valid=
            user_valid,

        user_test=
            user_test,

        user_num=
            user_num,

        item_num=
            item_num,
    )


def random_negative_item(
    item_num: int,
    excluded_items: set[int],
    rng: np.random.Generator,
) -> int:

    if (
        len(excluded_items)
        >= item_num
    ):
        raise ValueError(
            "Negative sampling is "
            "impossible because this "
            "user has interacted with "
            "every item."
        )

    while True:

        candidate = int(
            rng.integers(
                1,
                item_num + 1,
            )
        )

        if (
            candidate
            not in excluded_items
        ):
            return candidate


def build_training_example(
    user_sequence:
        Iterable[int],

    item_num: int,
    maxlen: int,

    rng:
        np.random.Generator,
):

    items = list(
        user_sequence
    )

    if len(items) < 2:
        raise ValueError(
            "A training sequence "
            "needs at least 2 items"
        )

    seq = np.zeros(
        maxlen,
        dtype=np.int64,
    )

    pos = np.zeros(
        maxlen,
        dtype=np.int64,
    )

    neg = np.zeros(
        maxlen,
        dtype=np.int64,
    )

    next_item = items[-1]

    index = maxlen - 1

    seen = set(
        items
    )

    for item in reversed(
        items[:-1]
    ):

        seq[index] = item

        pos[index] = (
            next_item
        )

        neg[index] = (
            random_negative_item(
                item_num=
                    item_num,

                excluded_items=
                    seen,

                rng=rng,
            )
        )

        next_item = item

        index -= 1

        if index < 0:
            break

    return (
        seq,
        pos,
        neg,
    )


def build_inference_sequence(
    item_sequence:
        Iterable[int],

    maxlen: int,
):

    items = list(
        item_sequence
    )[-maxlen:]

    seq = np.zeros(
        maxlen,
        dtype=np.int64,
    )

    if items:

        seq[
            -len(items):
        ] = np.asarray(
            items,
            dtype=np.int64,
        )

    return seq


def make_batch(
    user_train,
    user_ids,
    item_num,
    maxlen,
    rng,
):

    seq_batch = []
    pos_batch = []
    neg_batch = []

    for user_id in user_ids:

        sequence = user_train[
            int(user_id)
        ]

        (
            seq,
            pos,
            neg,
        ) = build_training_example(
            user_sequence=
                sequence,

            item_num=
                item_num,

            maxlen=
                maxlen,

            rng=
                rng,
        )

        seq_batch.append(
            seq
        )

        pos_batch.append(
            pos
        )

        neg_batch.append(
            neg
        )

    return (
        torch.from_numpy(
            np.stack(
                seq_batch
            )
        ).long(),

        torch.from_numpy(
            np.stack(
                pos_batch
            )
        ).long(),

        torch.from_numpy(
            np.stack(
                neg_batch
            )
        ).long(),
    )