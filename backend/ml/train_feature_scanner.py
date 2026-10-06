import os
import copy
import gc
import pandas as pd

import torch
import torch.nn as nn
import torch.optim as optim

from torchvision import models, transforms
from torch.utils.data import Dataset, DataLoader

from PIL import Image, ImageFile

# ============================================================
# CONFIG
# ============================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TRAIN_DIR = os.path.join(BASE_DIR, "datasets", "features", "train")
VAL_DIR = os.path.join(BASE_DIR, "datasets", "features", "val")
TRAIN_CSV = os.path.join(BASE_DIR, "datasets", "features", "train_annotations.csv")
VAL_CSV = os.path.join(BASE_DIR, "datasets", "features", "val_annotations.csv")
MODEL_PATH = os.path.join(BASE_DIR, "models", "feature_scanner.pth")

IMAGE_SIZE = 224
BATCH_SIZE = 8
EPOCHS = 20
LEARNING_RATE = 0.0002
WEIGHT_DECAY = 1e-3
PREDICTION_THRESHOLD = 0.5

DEVICE = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")

# Allow loading of truncated/incomplete image files
ImageFile.LOAD_TRUNCATED_IMAGES = True


# ============================================================
# SAFE IMAGE LOADER
# ============================================================

def safe_image_loader(path):
    with Image.open(path) as img:
        img_rgb = img.convert("RGB")

        if max(img_rgb.size) > 600:
            img_rgb.thumbnail((600, 600), Image.Resampling.BILINEAR)

        return img_rgb.copy()


# ============================================================
# CUSTOM MULTI-LABEL DATASET
# ============================================================

class FeatureDataset(Dataset):

    def __init__(self, csv_file, image_root, transform=None):
        self.data = pd.read_csv(csv_file)
        self.image_root = image_root
        self.transform = transform

        # First column is image_path
        self.feature_names = list(self.data.columns[1:])

        print(f"\nLoaded: {csv_file}")
        print(f"Images: {len(self.data)}")
        print(f"Features: {len(self.feature_names)}")

    def __len__(self):
        return len(self.data)

    def __getitem__(self, index):

        row = self.data.iloc[index]

        # Example:
        # trees/17.jpg
        image_path = os.path.join(
            self.image_root,
            row["image_path"]
        )

        image = safe_image_loader(image_path)

        if self.transform:
            image = self.transform(image)

        # Get all feature values
        labels = row[self.feature_names].values.astype("float32")

        labels = torch.tensor(labels, dtype=torch.float32)

        return image, labels


# ============================================================
# TRAINING ENTRY POINT
# ============================================================

def train_feature_model():

    # ============================================================
    # INFO
    # ============================================================

    print("=" * 60)
    print(" ArtMatch AI - Multi-Label Feature Scanner Training")
    print("=" * 60)
    print("Device:", DEVICE)
    print("Training folder:", TRAIN_DIR)
    print("Validation folder:", VAL_DIR)

    # ============================================================
    # TRANSFORMS
    # ============================================================

    data_transforms = {

        "train": transforms.Compose([
            transforms.RandomResizedCrop(
                IMAGE_SIZE,
                scale=(0.40, 1.0),  # Tight crops force learning of specific subject regions
                ratio=(0.85, 1.15)
            ),

            transforms.RandomHorizontalFlip(p=0.5),

            transforms.RandomRotation(degrees=10),

            transforms.ColorJitter(
                brightness=0.15,
                contrast=0.15,
                saturation=0.15
            ),

            transforms.ToTensor(),

            transforms.Normalize(
                [0.485, 0.456, 0.406],
                [0.229, 0.224, 0.225]
            )
        ]),

        "val": transforms.Compose([
            transforms.Resize((224, 224)),

            transforms.ToTensor(),

            transforms.Normalize(
                [0.485, 0.456, 0.406],
                [0.229, 0.224, 0.225]
            )
        ])
    }


    # ============================================================
    # DATASETS
    # ============================================================

    train_dataset = FeatureDataset(
        csv_file=TRAIN_CSV,
        image_root=TRAIN_DIR,
        transform=data_transforms["train"]
    )

    val_dataset = FeatureDataset(
        csv_file=VAL_CSV,
        image_root=VAL_DIR,
        transform=data_transforms["val"]
    )


    train_loader = DataLoader(
        train_dataset,
        batch_size=BATCH_SIZE,
        shuffle=True,
        num_workers=0
    )

    val_loader = DataLoader(
        val_dataset,
        batch_size=BATCH_SIZE,
        shuffle=False,
        num_workers=0
    )


    if train_dataset.feature_names != val_dataset.feature_names:
        raise ValueError("Training and validation feature columns must match in order.")
    if len(train_dataset) == 0 or len(val_dataset) == 0:
        raise ValueError("Training and validation datasets must both contain images.")

    feature_names = train_dataset.feature_names
    num_features = len(feature_names)

    print("\n==================================================")
    print(f"Detected Features: {num_features}")
    print("==================================================")

    for i, name in enumerate(feature_names):
        print(f"{i + 1:02d}. {name}")


    print("\nTrain samples:", len(train_dataset))
    print("Validation samples:", len(val_dataset))


    # ============================================================
    # CALCULATE POSITIVE WEIGHTS
    # ============================================================
    #
    # Some images may contain a feature while others do not.
    # pos_weight helps the model pay attention to less common
    # positive labels.

    train_labels = train_dataset.data[feature_names].values

    positive_count = train_labels.sum(axis=0)
    negative_count = len(train_labels) - positive_count

    # Prevent division by zero
    positive_count = positive_count.clip(min=1)

    pos_weight = negative_count / positive_count

    pos_weight = torch.tensor(
        pos_weight,
        dtype=torch.float32
    )


    # ============================================================
    # MODEL
    # ============================================================

    model = models.resnet18(
        weights=models.ResNet18_Weights.DEFAULT
    )

    # Freeze lower layers
    for param in model.parameters():
        param.requires_grad = False

    # Fine-tune layer3 + layer4 for better semantic object recognition
    for param in model.layer3.parameters():
        param.requires_grad = True
    for param in model.layer4.parameters():
        param.requires_grad = True

    # Replace classification head
    num_ftrs = model.fc.in_features

    model.fc = nn.Sequential(
        nn.Dropout(p=0.3),
        nn.Linear(num_ftrs, num_features)
    )


    model = model.to(DEVICE)
    pos_weight = pos_weight.to(DEVICE)


    # ============================================================
    # LOSS
    # ============================================================
    #
    # BCEWithLogitsLoss is used because an image can have
    # multiple features at the same time.

    criterion = nn.BCEWithLogitsLoss(
        pos_weight=pos_weight
    )


    # ============================================================
    # OPTIMIZER
    # ============================================================

    trainable_params = [
        p for p in model.parameters()
        if p.requires_grad
    ]

    optimizer = optim.AdamW(
        trainable_params,
        lr=LEARNING_RATE,
        weight_decay=WEIGHT_DECAY
    )


    # ============================================================
    # LEARNING RATE SCHEDULER
    # ============================================================

    scheduler = optim.lr_scheduler.CosineAnnealingLR(
        optimizer,
        T_max=EPOCHS,
        eta_min=1e-6
    )


    # ============================================================
    # TRAINING
    # ============================================================

    best_model_wts = copy.deepcopy(
        model.state_dict()
    )

    best_f1 = 0.0


    # --------------------------------------------------------
    # TRAIN / VALIDATION
    # --------------------------------------------------------

    print("\nStarting Multi-Label Feature Scanner Training...\n")

    for epoch in range(EPOCHS):

        print(
            f"========== Epoch {epoch + 1}/{EPOCHS} =========="
        )

        for phase in ["train", "val"]:

            if phase == "train":
                model.train()
            else:
                model.eval()

            dataloader = (
                train_loader
                if phase == "train"
                else val_loader
            )

            dataset_size = (
                len(train_dataset)
                if phase == "train"
                else len(val_dataset)
            )

            running_loss = 0.0

            total_true_positives = 0
            total_false_positives = 0
            total_false_negatives = 0


            # ---------------------------------------------
            # BATCH LOOP
            # ---------------------------------------------

            for inputs, labels in dataloader:

                inputs = inputs.to(DEVICE)
                labels = labels.to(DEVICE)

                optimizer.zero_grad(
                    set_to_none=True
                )


                with torch.set_grad_enabled(
                    phase == "train"
                ):

                    outputs = model(inputs)

                    loss = criterion(
                        outputs,
                        labels
                    )


                    # Convert logits to probabilities
                    probabilities = torch.sigmoid(
                        outputs
                    )

                    # Prediction threshold
                    predictions = (
                        probabilities >= PREDICTION_THRESHOLD
                    ).float()


                    if phase == "train":

                        loss.backward()

                        optimizer.step()


                running_loss += (
                    loss.item()
                    * inputs.size(0)
                )


                # -----------------------------------------
                # F1 COUNTS
                # -----------------------------------------

                total_true_positives += (
                    (
                        predictions * labels
                    )
                    .sum()
                    .item()
                )

                total_false_positives += (
                    (
                        predictions
                        * (1 - labels)
                    )
                    .sum()
                    .item()
                )

                total_false_negatives += (
                    (
                        (1 - predictions)
                        * labels
                    )
                    .sum()
                    .item()
                )


                del inputs
                del labels
                del outputs
                del loss


            # -------------------------------------------------
            # END OF PHASE
            # -------------------------------------------------

            epoch_loss = (
                running_loss / dataset_size
            )


            precision = (
                total_true_positives
                / (
                    total_true_positives
                    + total_false_positives
                    + 1e-8
                )
            )

            recall = (
                total_true_positives
                / (
                    total_true_positives
                    + total_false_negatives
                    + 1e-8
                )
            )

            f1 = (
                2 * precision * recall
                / (precision + recall + 1e-8)
            )


            print(
                f"[{phase.upper()}] "
                f"Loss: {epoch_loss:.4f} | "
                f"Precision: {precision:.4f} | "
                f"Recall: {recall:.4f} | "
                f"F1: {f1:.4f}"
            )


            # Save best validation model
            if phase == "val" and f1 >= best_f1:

                best_f1 = f1

                best_model_wts = copy.deepcopy(
                    model.state_dict()
                )


        scheduler.step()

        gc.collect()

        if torch.cuda.is_available():
            torch.cuda.empty_cache()


    # ============================================================
    # FINAL
    # ============================================================

    model.load_state_dict(best_model_wts)
    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)

    # Preserve the metadata used by inference and feature calibration.
    torch.save({
        "model_state_dict": best_model_wts,
        "class_names": feature_names,
        "threshold": PREDICTION_THRESHOLD,
        "num_features": num_features
    }, MODEL_PATH)

    print()
    print("=" * 60)
    print("Training Complete")
    print("=" * 60)
    print(f"Best Validation F1: {best_f1:.4f}")
    print("Model saved to:")
    print(MODEL_PATH)
    print("=" * 60)


# ============================================================
# MAIN
# ============================================================

if __name__ == "__main__":
    train_feature_model()
