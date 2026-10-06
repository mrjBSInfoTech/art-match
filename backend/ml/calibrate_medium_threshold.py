import os
import json
import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from torchvision import datasets, models, transforms
from PIL import Image, ImageFile

# ============================================================
# ArtMatch AI - Medium Confidence Calibration
# ============================================================

ImageFile.LOAD_TRUNCATED_IMAGES = True


# ------------------------------------------------------------
# Safe image loader
# ------------------------------------------------------------

def safe_image_loader(path):
    try:
        with open(path, "rb") as f:
            with Image.open(f) as img:
                img_rgb = img.convert("RGB")

                if max(img_rgb.size) > 600:
                    img_rgb.thumbnail(
                        (600, 600),
                        Image.Resampling.BILINEAR
                    )

                return img_rgb.copy()

    except Exception as e:
        print(
            f"[Warning] Could not load image: "
            f"{path} ({e})"
        )

        return Image.new(
            "RGB",
            (224, 224),
            (0, 0, 0)
        )


# ------------------------------------------------------------
# Paths
# ------------------------------------------------------------

BASE_DIR = os.path.dirname(
    os.path.abspath(__file__)
)

DATA_DIR = os.path.join(
    BASE_DIR,
    "datasets",
    "mediums"
)

MODEL_PATH = os.path.join(
    BASE_DIR,
    "models",
    "medium_scanner.pth"
)

THRESHOLD_PATH = os.path.join(
    BASE_DIR,
    "models",
    "medium_threshold.json"
)

REPORT_PATH = os.path.join(
    BASE_DIR,
    "models",
    "medium_threshold_report.csv"
)


# ------------------------------------------------------------
# Validation transform
# ------------------------------------------------------------

val_transform = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize(
        [0.485, 0.456, 0.406],
        [0.229, 0.224, 0.225]
    )
])


# ------------------------------------------------------------
# Build model
# ------------------------------------------------------------

def build_model(num_classes):

    model = models.resnet18(
        weights=None
    )

    model.fc = nn.Sequential(
        nn.Dropout(p=0.35),
        nn.Linear(
            model.fc.in_features,
            num_classes
        )
    )

    return model


# ------------------------------------------------------------
# Main calibration
# ------------------------------------------------------------

def calibrate_medium():

    print("==================================================")
    print(" ArtMatch AI - Medium Confidence Calibration")
    print("==================================================")

    # --------------------------------------------------------
    # Check files
    # --------------------------------------------------------

    if not os.path.exists(MODEL_PATH):

        print(
            f"\nERROR: Model not found:\n"
            f"{MODEL_PATH}"
        )

        return

    if not os.path.exists(
        os.path.join(DATA_DIR, "val")
    ):

        print(
            f"\nERROR: Validation dataset not found:\n"
            f"{os.path.join(DATA_DIR, 'val')}"
        )

        return

    # --------------------------------------------------------
    # Device
    # --------------------------------------------------------

    device = torch.device(
        "cuda:0"
        if torch.cuda.is_available()
        else "cpu"
    )

    print(f"\nDevice: {device}")

    # --------------------------------------------------------
    # Load validation dataset
    # --------------------------------------------------------

    val_dataset = datasets.ImageFolder(
        os.path.join(DATA_DIR, "val"),
        transform=val_transform,
        loader=safe_image_loader
    )

    val_loader = DataLoader(
        val_dataset,
        batch_size=8,
        shuffle=False,
        num_workers=0
    )

    class_names = val_dataset.classes

    print(
        f"Validation images: "
        f"{len(val_dataset)}"
    )

    print(
        f"Medium classes: "
        f"{len(class_names)}"
    )

    print(
        f"Classes: {class_names}"
    )

    # --------------------------------------------------------
    # Load checkpoint
    # --------------------------------------------------------

    checkpoint = torch.load(
        MODEL_PATH,
        map_location=device
    )

    # Use saved class names if available
    saved_classes = checkpoint.get(
        "class_names",
        class_names
    )

    class_names = saved_classes

    print(
        f"\nModel classes: "
        f"{class_names}"
    )

    # --------------------------------------------------------
    # Build model
    # --------------------------------------------------------

    model = build_model(
        len(class_names)
    )

    model.load_state_dict(
        checkpoint["model_state_dict"]
    )

    model = model.to(device)
    model.eval()

    # --------------------------------------------------------
    # Store predictions
    # --------------------------------------------------------

    all_predictions = []
    all_labels = []
    all_confidences = []

    print(
        "\nRunning validation inference..."
    )

    processed = 0

    with torch.no_grad():

        for inputs, labels in val_loader:

            inputs = inputs.to(device)
            labels = labels.to(device)

            outputs = model(inputs)

            probabilities = torch.softmax(
                outputs,
                dim=1
            )

            confidences, predictions = torch.max(
                probabilities,
                dim=1
            )

            all_predictions.extend(
                predictions.cpu().tolist()
            )

            all_labels.extend(
                labels.cpu().tolist()
            )

            all_confidences.extend(
                confidences.cpu().tolist()
            )

            processed += inputs.size(0)

            print(
                f"\rProcessed: "
                f"{processed}/{len(val_dataset)}",
                end=""
            )

    print("\n")

    # --------------------------------------------------------
    # Threshold analysis
    # --------------------------------------------------------

    results = []

    print(
        "=================================================="
    )

    print(
        " Threshold Analysis"
    )

    print(
        "=================================================="
    )

    print(
        f"{'Threshold':<12}"
        f"{'Precision':<12}"
        f"{'Recall':<12}"
        f"{'F1':<12}"
        f"{'Coverage':<12}"
        f"{'Accepted':<10}"
    )

    # Test thresholds
    threshold_values = [
        round(x / 100, 2)
        for x in range(15, 96)
    ]

    for threshold in threshold_values:

        accepted = 0
        correct = 0

        for pred, label, confidence in zip(
            all_predictions,
            all_labels,
            all_confidences
        ):

            # Only accept prediction if confidence
            # reaches threshold
            if confidence >= threshold:

                accepted += 1

                if pred == label:
                    correct += 1

        # No accepted predictions
        if accepted == 0:

            precision = 0.0
            recall = 0.0
            f1 = 0.0
            coverage = 0.0

        else:

            precision = (
                correct / accepted
            )

            coverage = (
                accepted / len(val_dataset)
            )

            # For this calibration:
            # recall = correct predictions / all images
            recall = (
                correct / len(val_dataset)
            )

            if (
                precision + recall
                > 0
            ):

                f1 = (
                    2
                    * precision
                    * recall
                    / (
                        precision
                        + recall
                    )
                )

            else:

                f1 = 0.0

        results.append({
            "threshold": threshold,
            "precision": precision,
            "recall": recall,
            "f1": f1,
            "coverage": coverage,
            "accepted": accepted
        })

        print(
            f"{threshold:<12.2f}"
            f"{precision:<12.3f}"
            f"{recall:<12.3f}"
            f"{f1:<12.3f}"
            f"{coverage:<12.3f}"
            f"{accepted:<10}"
        )

    # --------------------------------------------------------
    # Recommended threshold
    # --------------------------------------------------------
    #
    # We want a threshold that gives good F1 while still
    # keeping reasonable coverage.
    #
    # First find the highest F1.
    # --------------------------------------------------------

    best_f1 = max(
        results,
        key=lambda x: x["f1"]
    )

    # --------------------------------------------------------
    # Also find thresholds with high precision
    # --------------------------------------------------------

    high_precision_results = [
        r for r in results
        if r["precision"] >= 0.90
    ]

    if high_precision_results:

        # Among thresholds with >=90% precision,
        # choose the one with the highest coverage.
        recommended = max(
            high_precision_results,
            key=lambda x: (
                x["coverage"],
                x["f1"]
            )
        )

    else:

        recommended = best_f1

    # --------------------------------------------------------
    # Print recommendation
    # --------------------------------------------------------

    print(
        "\n=================================================="
    )

    print(
        " Recommended Medium Threshold"
    )

    print(
        "=================================================="
    )

    print(
        f"Threshold : "
        f"{recommended['threshold']:.2f}"
    )

    print(
        f"Precision : "
        f"{recommended['precision']:.3f}"
    )

    print(
        f"Recall    : "
        f"{recommended['recall']:.3f}"
    )

    print(
        f"F1        : "
        f"{recommended['f1']:.3f}"
    )

    print(
        f"Coverage  : "
        f"{recommended['coverage']:.3f}"
    )

    print(
        f"Accepted  : "
        f"{recommended['accepted']}"
    )

    print(
        "=================================================="
    )

    # --------------------------------------------------------
    # Save threshold
    # --------------------------------------------------------

    os.makedirs(
        os.path.join(
            BASE_DIR,
            "models"
        ),
        exist_ok=True
    )

    threshold_data = {
        "threshold": recommended["threshold"],
        "precision": recommended["precision"],
        "recall": recommended["recall"],
        "f1": recommended["f1"],
        "coverage": recommended["coverage"],
        "accepted": recommended["accepted"],
        "validation_images": len(val_dataset),
        "classes": class_names
    }

    with open(
        THRESHOLD_PATH,
        "w",
        encoding="utf-8"
    ) as f:

        json.dump(
            threshold_data,
            f,
            indent=4
        )

    print(
        f"\nSaved threshold file:"
    )

    print(
        f"  {THRESHOLD_PATH}"
    )

    # --------------------------------------------------------
    # Save detailed CSV report
    # --------------------------------------------------------

    with open(
        REPORT_PATH,
        "w",
        encoding="utf-8"
    ) as f:

        f.write(
            "threshold,precision,recall,"
            "f1,coverage,accepted\n"
        )

        for r in results:

            f.write(
                f"{r['threshold']:.2f},"
                f"{r['precision']:.4f},"
                f"{r['recall']:.4f},"
                f"{r['f1']:.4f},"
                f"{r['coverage']:.4f},"
                f"{r['accepted']}\n"
            )

    print(
        f"Saved detailed report:"
    )

    print(
        f"  {REPORT_PATH}"
    )

    print(
        "\nMedium calibration complete."
    )


# ------------------------------------------------------------
# Run
# ------------------------------------------------------------

if __name__ == "__main__":
    calibrate_medium()