"""Prepare verified B2 dataset caches for training, without ML dependencies."""

import json
import os
from pathlib import Path
import subprocess


BASE_DIR = Path(__file__).resolve().parent
BACKEND_DIR = BASE_DIR.parent
SYNC_SCRIPT = BACKEND_DIR / "scripts" / "syncMlDatasetsFromB2.js"
DATASET_GROUPS = frozenset({"features", "mediums_2d", "mediums_3d"})


def _validate_dataset(root, group):
    dataset_dir = root / group
    required = [dataset_dir / "train", dataset_dir / "val"]
    for directory in required:
        if not directory.is_dir():
            raise RuntimeError(f"Dataset folder not found: {directory}")

    if group == "features":
        for name in ("train_annotations.csv", "val_annotations.csv"):
            if not (dataset_dir / name).is_file():
                raise RuntimeError(f"Dataset annotations not found: {dataset_dir / name}")

    return dataset_dir


def prepare_dataset(group):
    """Synchronize a group from B2 before returning its local training directory.

    Set ML_DATASET_SOURCE=local to explicitly use local data without contacting B2.
    ML_DATASET_DIR overrides the dataset root in either mode; relative paths are
    resolved against backend/, independent of the caller's working directory.
    """
    if group not in DATASET_GROUPS:
        raise ValueError(f"Unsupported ML dataset group: {group}")

    source = os.environ.get("ML_DATASET_SOURCE", "b2").strip().lower()
    if source not in {"b2", "local"}:
        raise ValueError("ML_DATASET_SOURCE must be 'b2' or 'local'.")

    if source == "local":
        configured_root = os.environ.get("ML_DATASET_DIR", "").strip()
        root = Path(configured_root).expanduser() if configured_root else BASE_DIR / "datasets"
        if not root.is_absolute():
            root = BACKEND_DIR / root
        return _validate_dataset(root.resolve(), group)

    node_binary = os.environ.get("NODE_BINARY", "node").strip() or "node"
    try:
        # stderr remains attached so long downloads continue to show progress.
        # No shell is involved; Windows paths and arguments containing spaces
        # are passed as individual arguments.
        result = subprocess.run(
            [node_binary, str(SYNC_SCRIPT), "--dataset", group, "--json"],
            cwd=str(BACKEND_DIR),
            stdout=subprocess.PIPE,
            text=True,
            encoding="utf-8",
            errors="replace",
            check=False,
        )
    except FileNotFoundError as exc:
        raise RuntimeError(
            "Node.js is required to sync ML datasets from B2. Install Node.js "
            "or set NODE_BINARY to its executable path."
        ) from exc
    except OSError as exc:
        raise RuntimeError("Unable to start the B2 dataset sync command.") from exc

    if result.returncode != 0:
        raise RuntimeError(
            "B2 dataset sync failed. Training was stopped; check the sync error above."
        )

    lines = result.stdout.strip().splitlines()
    try:
        report = json.loads(lines[-1]) if lines else None
    except (json.JSONDecodeError, TypeError) as exc:
        raise RuntimeError("B2 dataset sync returned an invalid completion report.") from exc

    if (
        not isinstance(report, dict)
        or report.get("complete") is not True
        or report.get("dataset") != group
        or not isinstance(report.get("root"), str)
        or not report["root"].strip()
    ):
        raise RuntimeError("B2 dataset sync did not confirm a complete dataset.")

    root = Path(report["root"])
    if not root.is_absolute():
        raise RuntimeError("B2 dataset sync did not return an absolute cache directory.")

    return _validate_dataset(root.resolve(), group)
