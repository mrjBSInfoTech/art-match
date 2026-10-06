import os
import json
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from PIL import Image, ImageFile
from torchvision import models, transforms
from torch.utils.data import Dataset, DataLoader

# Allow loading of truncated/incomplete image files
ImageFile.LOAD_TRUNCATED_IMAGES = True

DATA_DIR = "datasets/features"
VAL_CSV = os.path.join(DATA_DIR, "val_annotations.csv")
VAL_IMAGE_ROOT = os.path.join(DATA_DIR, "val")
MODEL_PATH = "models/feature_scanner.pth"
OUTPUT_JSON = "models/feature_thresholds.json"
OUTPUT_CSV = "models/feature_threshold_report.csv"

BATCH_SIZE = 16


def safe_image_loader(path):
    with Image.open(path) as img:
        img_rgb = img.convert("RGB")
        if max(img_rgb.size) > 600:
            img_rgb.thumbnail((600, 600), Image.Resampling.BILINEAR)
        return img_rgb.copy()


class FeatureValidationDataset(Dataset):
    def __init__(self, csv_file, image_root, transform=None):
        self.data = pd.read_csv(csv_file)
        self.image_root = image_root
        self.transform = transform
        self.feature_names = list(self.data.columns[1:])

    def __len__(self):
        return len(self.data)

    def __getitem__(self, index):
        row = self.data.iloc[index]
        image_path = os.path.join(self.image_root, row["image_path"])

        image = safe_image_loader(image_path)

        if self.transform:
            image = self.transform(image)

        labels = row[self.feature_names].values.astype(np.float32)
        labels = torch.tensor(labels, dtype=torch.float32)

        return image, labels


def load_feature_model(path, num_classes):
    if not os.path.exists(path):
        raise FileNotFoundError(
            f"Feature model not found: {path}\n"
            "Train your feature scanner first."
        )

    checkpoint = torch.load(path, map_location=torch.device("cpu"))
    class_names = checkpoint["class_names"]

    model = models.resnet18(weights=None)
    num_ftrs = model.fc.in_features
    state_dict = checkpoint["model_state_dict"]

    if "fc.1.weight" in state_dict:
        model.fc = nn.Sequential(
            nn.Dropout(p=0.3),
            nn.Linear(num_ftrs, len(class_names))
        )
    else:
        model.fc = nn.Linear(num_ftrs, len(class_names))

    model.load_state_dict(state_dict)
    model.eval()

    if len(class_names) != num_classes:
        raise ValueError(
            "Model class count does not match the validation CSV.\n"
            f"Model: {len(class_names)} | CSV: {num_classes}"
        )

    return model, class_names


def binary_metrics(y_true, y_prob, threshold):
    y_pred = (y_prob >= threshold).astype(np.int32)
    y_true = y_true.astype(np.int32)

    tp = np.sum((y_pred == 1) & (y_true == 1))
    fp = np.sum((y_pred == 1) & (y_true == 0))
    fn = np.sum((y_pred == 0) & (y_true == 1))
    tn = np.sum((y_pred == 0) & (y_true == 0))

    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = (
        2 * precision * recall / (precision + recall)
        if (precision + recall) > 0
        else 0.0
    )

    return {
        "threshold": float(threshold),
        "precision": float(precision),
        "recall": float(recall),
        "f1": float(f1),
        "tp": int(tp),
        "fp": int(fp),
        "fn": int(fn),
        "tn": int(tn),
    }


def calibrate_thresholds(y_true, y_probs, feature_names):
    # Test a reasonably fine range. Ties prefer the higher threshold,
    # which helps reduce unnecessary false positives.
    thresholds = np.arange(0.05, 0.96, 0.01)

    results = []
    best_thresholds = {}

    for idx, feature_name in enumerate(feature_names):
        feature_true = y_true[:, idx]
        feature_prob = y_probs[:, idx]

        candidates = [
            binary_metrics(feature_true, feature_prob, threshold)
            for threshold in thresholds
        ]

        # Maximize F1. If F1 ties, choose the higher threshold.
        best = max(
            candidates,
            key=lambda x: (x["f1"], x["threshold"])
        )

        best_thresholds[feature_name] = round(best["threshold"], 2)

        results.append({
            "feature": feature_name,
            "best_threshold": round(best["threshold"], 2),
            "precision": round(best["precision"], 4),
            "recall": round(best["recall"], 4),
            "f1": round(best["f1"], 4),
            "tp": best["tp"],
            "fp": best["fp"],
            "fn": best["fn"],
            "tn": best["tn"],
            "positive_samples": int(np.sum(feature_true == 1)),
            "negative_samples": int(np.sum(feature_true == 0)),
        })

    return best_thresholds, pd.DataFrame(results)


def main():
    print("==================================================")
    print(" ArtMatch AI - Feature Threshold Calibration")
    print("==================================================")

    if not os.path.exists(VAL_CSV):
        raise FileNotFoundError(f"Validation CSV not found: {VAL_CSV}")

    val_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(
            [0.485, 0.456, 0.406],
            [0.229, 0.224, 0.225]
        )
    ])

    dataset = FeatureValidationDataset(
        VAL_CSV,
        VAL_IMAGE_ROOT,
        transform=val_transform
    )

    dataloader = DataLoader(
        dataset,
        batch_size=BATCH_SIZE,
        shuffle=False,
        num_workers=0
    )

    model, model_classes = load_feature_model(
        MODEL_PATH,
        len(dataset.feature_names)
    )

    if model_classes != dataset.feature_names:
        raise ValueError(
            "The feature order in the model does not match the feature order in the CSV.\n"
            f"Model classes: {model_classes}\n"
            f"CSV features:  {dataset.feature_names}"
        )

    print(f"Validation images: {len(dataset)}")
    print(f"Features: {len(dataset.feature_names)}")
    print(f"Model: {MODEL_PATH}")
    print("\nRunning validation inference...\n")

    all_probs = []
    all_labels = []

    with torch.no_grad():
        for batch_index, (images, labels) in enumerate(dataloader, start=1):
            outputs = model(images)
            probs = torch.sigmoid(outputs)

            all_probs.append(probs.cpu().numpy())
            all_labels.append(labels.cpu().numpy())

            if batch_index % 10 == 0 or batch_index == len(dataloader):
                print(f"Processed batches: {batch_index}/{len(dataloader)}")

    y_probs = np.concatenate(all_probs, axis=0)
    y_true = np.concatenate(all_labels, axis=0)

    best_thresholds, report = calibrate_thresholds(
        y_true,
        y_probs,
        dataset.feature_names
    )

    os.makedirs("models", exist_ok=True)

    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(best_thresholds, f, indent=4)

    report.to_csv(OUTPUT_CSV, index=False)

    print("\n==================================================")
    print(" Recommended Feature Thresholds")
    print("==================================================")

    for _, row in report.iterrows():
        print(
            f"{row['feature']:20s} -> "
            f"{row['best_threshold']:.2f} "
            f"(P={row['precision']:.2f}, "
            f"R={row['recall']:.2f}, "
            f"F1={row['f1']:.2f}, "
            f"FP={int(row['fp'])})"
        )

    print("\nSaved threshold file:")
    print(f"  {OUTPUT_JSON}")
    print("\nSaved detailed report:")
    print(f"  {OUTPUT_CSV}")
    print("\nCalibration complete.")


if __name__ == "__main__":
    main()