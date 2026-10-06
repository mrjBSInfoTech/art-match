from pathlib import Path
import csv
import shutil
from datetime import datetime

# ==========================================================
# ArtMatch Feature Annotation Generator - SAFE VERSION
# ==========================================================
# This version PRESERVES existing manual multi-label annotations.
# It only creates default labels for NEW images.
#
# Existing image:
#   -> keep all manually checked labels
#
# New image:
#   -> all labels start at 0
#   -> folder label starts at 1
#
# It also creates a backup before rewriting each CSV.
# It DOES NOT modify annotation progress JSON files.
# ==========================================================

BASE_DIR = Path(__file__).resolve().parent

FEATURES_DIR = BASE_DIR / "datasets" / "features"

TRAIN_DIR = FEATURES_DIR / "train"
VAL_DIR = FEATURES_DIR / "val"

TRAIN_CSV = FEATURES_DIR / "train_annotations.csv"
VAL_CSV = FEATURES_DIR / "val_annotations.csv"

BACKUP_DIR = FEATURES_DIR / "annotation_backups"

IMAGE_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".bmp",
}


def get_feature_classes():
    if not TRAIN_DIR.exists():
        raise FileNotFoundError(
            f"Train folder not found:\n{TRAIN_DIR}"
        )

    classes = sorted(
        folder.name
        for folder in TRAIN_DIR.iterdir()
        if folder.is_dir()
    )

    if not classes:
        raise ValueError(
            "No feature folders were found inside the train folder."
        )

    return classes


def normalize_label(value):
    """
    Convert an existing CSV value safely to 0 or 1.
    """
    try:
        return 1 if int(float(value)) != 0 else 0
    except (TypeError, ValueError):
        return 0


def load_existing_annotations(csv_path):
    """
    Return:
        {
            "trees/1.jpg": {
                "image_path": "trees/1.jpg",
                "trees": "1",
                "day": "1",
                ...
            }
        }
    """
    if not csv_path.exists():
        return {}

    with open(
        csv_path,
        "r",
        newline="",
        encoding="utf-8"
    ) as file:

        reader = csv.DictReader(file)

        if not reader.fieldnames or "image_path" not in reader.fieldnames:
            raise ValueError(
                f"Existing CSV is missing image_path column:\n{csv_path}"
            )

        return {
            str(row["image_path"]): row
            for row in reader
            if row.get("image_path")
        }


def backup_existing_csv(csv_path):
    if not csv_path.exists():
        return None

    BACKUP_DIR.mkdir(
        parents=True,
        exist_ok=True
    )

    timestamp = datetime.now().strftime(
        "%Y%m%d_%H%M%S"
    )

    backup_path = (
        BACKUP_DIR
        / f"{csv_path.stem}_{timestamp}.csv"
    )

    shutil.copy2(
        csv_path,
        backup_path
    )

    return backup_path


def create_annotations(split_dir, output_csv, classes):
    if not split_dir.exists():
        raise FileNotFoundError(
            f"Dataset split folder not found:\n{split_dir}"
        )

    existing = load_existing_annotations(
        output_csv
    )

    rows = []

    preserved_count = 0
    new_count = 0
    current_paths = set()

    for feature_folder in sorted(
        split_dir.iterdir()
    ):

        if not feature_folder.is_dir():
            continue

        feature_name = feature_folder.name

        if feature_name not in classes:
            continue

        for image_file in sorted(
            feature_folder.iterdir()
        ):

            if (
                image_file.suffix.lower()
                not in IMAGE_EXTENSIONS
            ):
                continue

            relative_path = (
                f"{feature_name}/{image_file.name}"
            )

            current_paths.add(
                relative_path
            )

            # --------------------------------------------------
            # EXISTING IMAGE:
            # preserve every manual annotation
            # --------------------------------------------------
            if relative_path in existing:

                old_row = existing[
                    relative_path
                ]

                row = {
                    "image_path": relative_path
                }

                for feature in classes:
                    row[feature] = normalize_label(
                        old_row.get(feature, 0)
                    )

                # The folder feature must always stay positive.
                row[feature_name] = 1

                preserved_count += 1

            # --------------------------------------------------
            # NEW IMAGE:
            # default labels, ready for manual review
            # --------------------------------------------------
            else:

                row = {
                    "image_path": relative_path
                }

                for feature in classes:
                    row[feature] = 0

                row[feature_name] = 1

                new_count += 1

            rows.append(row)

    removed_paths = (
        set(existing.keys())
        - current_paths
    )

    backup_path = backup_existing_csv(
        output_csv
    )

    with open(
        output_csv,
        "w",
        newline="",
        encoding="utf-8"
    ) as file:

        writer = csv.DictWriter(
            file,
            fieldnames=[
                "image_path",
                *classes
            ]
        )

        writer.writeheader()
        writer.writerows(rows)

    print()
    print("=" * 60)
    print(f"Updated: {output_csv}")
    print("=" * 60)
    print(f"Current images:              {len(rows)}")
    print(f"Existing rows preserved:     {preserved_count}")
    print(f"New rows added:              {new_count}")
    print(f"Rows no longer on disk:      {len(removed_paths)}")

    if backup_path:
        print(f"Backup created:              {backup_path}")
    else:
        print("Backup created:              No old CSV existed")

    if removed_paths:
        print()
        print(
            "NOTE: Rows for files no longer present on disk "
            "were omitted from the new CSV."
        )

    print("=" * 60)


def main():
    print("=" * 60)
    print(" ArtMatch SAFE Feature Annotation Updater")
    print("=" * 60)
    print(
        "Existing manual annotations will be preserved."
    )
    print(
        "Only new image files receive default annotations."
    )
    print(
        "Progress JSON files are NOT changed."
    )

    classes = get_feature_classes()

    print()
    print("Feature classes found:")

    for index, feature in enumerate(
        classes,
        start=1
    ):
        print(
            f"{index:02d}. {feature}"
        )

    print()
    print(
        f"Total feature classes: {len(classes)}"
    )

    create_annotations(
        TRAIN_DIR,
        TRAIN_CSV,
        classes
    )

    create_annotations(
        VAL_DIR,
        VAL_CSV,
        classes
    )

    print()
    print("=" * 60)
    print("SAFE annotation update complete.")
    print()
    print(
        "You can now open feature_annotation_helper.py."
    )
    print(
        "Previously reviewed image paths remain in the "
        "progress JSON and should be skipped."
    )
    print("=" * 60)


if __name__ == "__main__":
    main()
