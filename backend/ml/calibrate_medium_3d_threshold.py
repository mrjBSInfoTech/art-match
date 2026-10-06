import os
import json
import torch
from torchvision import datasets, transforms, models
from torch import nn

# ============================================================
# CONFIG
# ============================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

MODEL_PATH = os.path.join(
    BASE_DIR,
    "models",
    "medium_3d_scanner.pth"
)

VAL_DIR = os.path.join(
    BASE_DIR,
    "datasets",
    "mediums_3d",
    "val"
)

OUTPUT_PATH = os.path.join(
    BASE_DIR,
    "models",
    "medium_3d_thresholds.json"
)

IMAGE_SIZE = 224

PRECISION_TARGET = 0.90

THRESHOLDS = [
    round(x / 100, 2)
    for x in range(15, 96)
]

DEVICE = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)

# ============================================================
# TRANSFORM
# Must match current validation evaluation
# ============================================================

transform = transforms.Compose([
    transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    )
])

# ============================================================
# DATASET
# ============================================================

dataset = datasets.ImageFolder(
    VAL_DIR,
    transform=transform
)

class_names = dataset.classes

if len(dataset) == 0:
    raise ValueError("The 3D medium validation dataset is empty.")

print("=" * 60)
print(" ArtMatch AI - Per-Class 3D Medium Calibration")
print("=" * 60)

print()
print("Validation images:", len(dataset))
print("Classes:", class_names)
print("Device:", DEVICE)

# ============================================================
# MODEL
# ============================================================

model = models.resnet18(weights=None)

model.fc = nn.Sequential(
    nn.Dropout(0.50),
    nn.Linear(
        model.fc.in_features,
        len(class_names)
    )
)

checkpoint = torch.load(
    MODEL_PATH,
    map_location=DEVICE
)

if (
    isinstance(checkpoint, dict)
    and "model_state_dict" in checkpoint
):

    state_dict = checkpoint["model_state_dict"]

else:

    state_dict = checkpoint

model.load_state_dict(state_dict)

model = model.to(DEVICE)
model.eval()

# ============================================================
# COLLECT PREDICTIONS
# ============================================================

records = []

print()
print("Running validation inference...")

with torch.no_grad():

    for index in range(len(dataset)):

        image_tensor, actual_index = dataset[index]

        image_tensor = image_tensor.unsqueeze(0)
        image_tensor = image_tensor.to(DEVICE)

        outputs = model(image_tensor)

        probabilities = torch.softmax(
            outputs,
            dim=1
        )[0]

        confidence, predicted_index = torch.max(
            probabilities,
            dim=0
        )

        records.append({
            "actual": actual_index,
            "predicted": predicted_index.item(),
            "confidence": confidence.item()
        })

        if (index + 1) % 20 == 0:
            print(
                f"Processed: "
                f"{index + 1}/{len(dataset)}"
            )

# ============================================================
# OVERALL ACCURACY
# ============================================================

correct = sum(
    1
    for r in records
    if r["actual"] == r["predicted"]
)

overall_accuracy = (
    correct / len(records)
)

print()
print(
    f"Overall top-1 accuracy: "
    f"{overall_accuracy:.4f}"
)

# ============================================================
# PER-CLASS CALIBRATION
#
# Important:
# For a given class, we examine predictions where the model
# selected that class and determine how often those predictions
# were actually correct.
#
# Example:
# predicted Acrylic with 90% confidence
# predicted Acrylic with 70% confidence
#
# The threshold controls how confident the scanner must be
# before accepting Acrylic.
# ============================================================

results = {}

for class_index, class_name in enumerate(class_names):

    class_predictions = [
        r
        for r in records
        if r["predicted"] == class_index
    ]

    print()
    print("=" * 60)
    print(
        f"Class: {class_name}"
    )
    print(
        f"Model predicted this class "
        f"{len(class_predictions)} times"
    )
    print("=" * 60)

    if not class_predictions:

        print("No predictions for this class.")

        results[class_name] = {
            "threshold": 0.90,
            "precision": 0.0,
            "coverage": 0.0,
            "accepted": 0,
            "correct": 0,
            "recall": 0.0,
            "f1": 0.0,
            "fallback": True
        }

        continue

    candidates = []

    for threshold in THRESHOLDS:

        accepted = [
            r
            for r in class_predictions
            if r["confidence"] >= threshold
        ]

        accepted_count = len(accepted)

        if accepted_count == 0:
            continue

        accepted_correct = sum(
            1
            for r in accepted
            if r["actual"] == class_index
        )

        precision = (
            accepted_correct /
            accepted_count
        )

        # Coverage is relative to ALL validation images
        coverage = (
            accepted_count /
            len(records)
        )

        # Recall for this class among all actual examples
        actual_count = sum(
            1
            for r in records
            if r["actual"] == class_index
        )

        recall = (
            accepted_correct /
            actual_count
        ) if actual_count else 0.0

        f1 = (
            2 * precision * recall /
            (precision + recall)
        ) if (precision + recall) > 0 else 0.0

        candidates.append({
            "threshold": threshold,
            "precision": precision,
            "coverage": coverage,
            "accepted": accepted_count,
            "correct": accepted_correct,
            "recall": recall,
            "f1": f1
        })

    # --------------------------------------------------------
    # First choice:
    # Highest coverage while meeting target precision
    # --------------------------------------------------------

    if not candidates:
        print("No predictions reached the tested thresholds.")

        results[class_name] = {
            "threshold": 0.90,
            "precision": 0.0,
            "coverage": 0.0,
            "accepted": 0,
            "correct": 0,
            "recall": 0.0,
            "f1": 0.0,
            "fallback": True,
            "reason": "No predictions reached the tested thresholds."
        }

        continue

    target_candidates = [
        c
        for c in candidates
        if c["precision"] >= PRECISION_TARGET
    ]

    if target_candidates:

        selected = max(
            target_candidates,
            key=lambda c: (
                c["coverage"],
                c["precision"],
                c["f1"]
            )
        )

        fallback = False

        reason = (
            f"Meets {PRECISION_TARGET * 100:.0f}% "
            f"precision target; maximized coverage."
        )

    else:

        # ----------------------------------------------------
        # Fallback:
        # Highest F1 when the precision target is impossible
        # ----------------------------------------------------

        selected = max(
            candidates,
            key=lambda c: (
                c["f1"],
                c["precision"],
                c["coverage"]
            )
        )

        fallback = True

        reason = (
            f"No threshold reached "
            f"{PRECISION_TARGET * 100:.0f}% precision; "
            f"selected best F1."
        )

    results[class_name] = {
        "threshold": selected["threshold"],
        "precision": selected["precision"],
        "coverage": selected["coverage"],
        "accepted": selected["accepted"],
        "correct": selected["correct"],
        "recall": selected["recall"],
        "f1": selected["f1"],
        "fallback": fallback,
        "reason": reason
    }

    # --------------------------------------------------------
    # Print useful threshold table
    # --------------------------------------------------------

    print()

    print(
        f"{'Threshold':12s}"
        f"{'Precision':12s}"
        f"{'Recall':12s}"
        f"{'F1':12s}"
        f"{'Accepted':12s}"
    )

    print("-" * 60)

    for candidate in candidates:

        if (
            candidate["threshold"] in {
                0.50,
                0.60,
                0.70,
                0.75,
                0.80,
                0.81,
                0.85,
                0.90,
                0.95
            }
            or candidate["threshold"]
            == selected["threshold"]
        ):

            marker = ""

            if (
                candidate["threshold"]
                == selected["threshold"]
            ):
                marker = "  <-- SELECTED"

            print(
                f"{candidate['threshold']:.2f}"
                f"{marker:15s}"
                f"{candidate['precision']:.3f}"
                f"        "
                f"{candidate['recall']:.3f}"
                f"        "
                f"{candidate['f1']:.3f}"
                f"        "
                f"{candidate['accepted']}"
            )

    print()
    print(
        f"Selected threshold : "
        f"{selected['threshold']:.2f}"
    )

    print(
        f"Precision           : "
        f"{selected['precision']:.3f}"
    )

    print(
        f"Recall              : "
        f"{selected['recall']:.3f}"
    )

    print(
        f"F1                  : "
        f"{selected['f1']:.3f}"
    )

    print(
        f"Accepted            : "
        f"{selected['accepted']}"
    )

    print(
        f"Correct             : "
        f"{selected['correct']}"
    )

    print(
        "Reason              : "
        f"{reason}"
    )

# ============================================================
# SAVE RESULTS
# ============================================================

output = {
    "model": "medium_3d_scanner.pth",
    "classes": class_names,
    "validation_images": len(dataset),
    "overall_accuracy": overall_accuracy,
    "precision_target": PRECISION_TARGET,
    "thresholds": results
}

with open(
    OUTPUT_PATH,
    "w",
    encoding="utf-8"
) as f:

    json.dump(
        output,
        f,
        indent=4
    )

# ============================================================
# FINAL SUMMARY
# ============================================================

print()
print("=" * 60)
print(" Recommended Per-Class Thresholds")
print("=" * 60)

print()

for class_name in class_names:

    result = results[class_name]

    print(
        f"{class_name:15s}"
        f" -> threshold "
        f"{result['threshold']:.2f} "
        f"| Precision "
        f"{result['precision'] * 100:.1f}% "
        f"| Recall "
        f"{result['recall'] * 100:.1f}% "
        f"| F1 "
        f"{result['f1']:.3f}"
    )

print()
print("Saved to:")
print(OUTPUT_PATH)

print()
print("=" * 60)
print("Per-class calibration complete.")
print("=" * 60)
