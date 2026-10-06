import os
import copy
import torch
from torchvision import datasets, transforms, models
from torch import nn, optim
from torch.optim.lr_scheduler import ReduceLROnPlateau

# ============================================================
# CONFIG
# ============================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

TRAIN_DIR = os.path.join(
    BASE_DIR, "datasets", "mediums_3d", "train"
)

VAL_DIR = os.path.join(
    BASE_DIR, "datasets", "mediums_3d", "val"
)

MODEL_PATH = os.path.join(
    BASE_DIR, "models", "medium_3d_scanner.pth"
)

IMAGE_SIZE = 224
BATCH_SIZE = 16
EPOCHS = 30
LEARNING_RATE = 0.0001
WEIGHT_DECAY = 0.0005

DEVICE = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)

# ============================================================
# INFO
# ============================================================

print("=" * 60)
print(" ArtMatch AI - 3D Medium Scanner Training")
print("=" * 60)

print("Device:", DEVICE)
print("Training folder:", TRAIN_DIR)
print("Validation folder:", VAL_DIR)

# ============================================================
# TRANSFORMS
# ============================================================

train_transform = transforms.Compose([
    transforms.RandomResizedCrop(
        IMAGE_SIZE,
        scale=(0.60, 1.0),
        ratio=(0.85, 1.15)
    ),

    transforms.RandomHorizontalFlip(p=0.5),

    transforms.RandomRotation(10),

    transforms.ColorJitter(
        brightness=0.12,
        contrast=0.12,
        saturation=0.08,
        hue=0.02
    ),

    transforms.ToTensor(),

    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    )
])

val_transform = transforms.Compose([
    transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),

    transforms.ToTensor(),

    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    )
])

# ============================================================
# DATASETS
# ============================================================

train_dataset = datasets.ImageFolder(
    TRAIN_DIR,
    transform=train_transform
)

val_dataset = datasets.ImageFolder(
    VAL_DIR,
    transform=val_transform
)

train_loader = torch.utils.data.DataLoader(
    train_dataset,
    batch_size=BATCH_SIZE,
    shuffle=True,
    num_workers=0
)

val_loader = torch.utils.data.DataLoader(
    val_dataset,
    batch_size=BATCH_SIZE,
    shuffle=False,
    num_workers=0
)

class_names = train_dataset.classes
num_classes = len(class_names)

print()
print("Classes:")
for i, name in enumerate(class_names):
    print(f"  {i}: {name}")

print()
print("Training images:", len(train_dataset))
print("Validation images:", len(val_dataset))
print("Classes:", num_classes)

# ============================================================
# MODEL
# ============================================================

print()
print("Loading pretrained ResNet18...")

model = models.resnet18(
    weights=models.ResNet18_Weights.DEFAULT
)

# Freeze most of the pretrained network first
for param in model.parameters():
    param.requires_grad = False

# Unfreeze layer4
for param in model.layer4.parameters():
    param.requires_grad = True

# Replace classifier
model.fc = nn.Sequential(
    nn.Dropout(0.50),
    nn.Linear(model.fc.in_features, num_classes)
)

model = model.to(DEVICE)

# ============================================================
# LOSS
# ============================================================

criterion = nn.CrossEntropyLoss(
    label_smoothing=0.05
)

# Only train parameters that require gradients
optimizer = optim.AdamW(
    filter(lambda p: p.requires_grad, model.parameters()),
    lr=LEARNING_RATE,
    weight_decay=WEIGHT_DECAY
)

scheduler = ReduceLROnPlateau(
    optimizer,
    mode="max",
    factor=0.5,
    patience=3
)

# ============================================================
# TRAINING
# ============================================================

best_accuracy = 0.0
best_model = None

patience = 7
epochs_without_improvement = 0

for epoch in range(EPOCHS):

    print()
    print(f"Epoch {epoch + 1}/{EPOCHS}")

    # --------------------------------------------------------
    # TRAIN
    # --------------------------------------------------------

    model.train()

    running_loss = 0.0
    correct = 0
    total = 0

    for images, labels in train_loader:

        images = images.to(DEVICE)
        labels = labels.to(DEVICE)

        optimizer.zero_grad()

        outputs = model(images)

        loss = criterion(outputs, labels)

        loss.backward()

        optimizer.step()

        running_loss += loss.item() * images.size(0)

        _, predicted = torch.max(outputs, 1)

        total += labels.size(0)
        correct += (predicted == labels).sum().item()

    train_loss = running_loss / len(train_dataset)
    train_accuracy = correct / total

    # --------------------------------------------------------
    # VALIDATION
    # --------------------------------------------------------

    model.eval()

    val_correct = 0
    val_total = 0
    val_loss_total = 0.0

    with torch.no_grad():

        for images, labels in val_loader:

            images = images.to(DEVICE)
            labels = labels.to(DEVICE)

            outputs = model(images)

            loss = criterion(outputs, labels)

            val_loss_total += loss.item() * images.size(0)

            _, predicted = torch.max(outputs, 1)

            val_total += labels.size(0)
            val_correct += (predicted == labels).sum().item()

    val_loss = val_loss_total / len(val_dataset)
    val_accuracy = val_correct / val_total

    scheduler.step(val_accuracy)

    print(f"Train Loss: {train_loss:.4f}")
    print(f"Train Accuracy: {train_accuracy * 100:.2f}%")
    print(f"Val Loss: {val_loss:.4f}")
    print(f"Val Accuracy: {val_accuracy * 100:.2f}%")
    print(f"Learning Rate: {optimizer.param_groups[0]['lr']:.7f}")

    # --------------------------------------------------------
    # SAVE BEST MODEL
    # --------------------------------------------------------

    if val_accuracy > best_accuracy:

        best_accuracy = val_accuracy

        best_model = copy.deepcopy(model.state_dict())

        torch.save(best_model, MODEL_PATH)

        epochs_without_improvement = 0

        print("+ New best model saved!")

    else:

        epochs_without_improvement += 1

    # --------------------------------------------------------
    # EARLY STOPPING
    # --------------------------------------------------------

    if epochs_without_improvement >= patience:

        print()
        print("Early stopping triggered.")

        break

# ============================================================
# LOAD BEST MODEL
# ============================================================

model.load_state_dict(best_model)

# Save the exact best model again
torch.save(model.state_dict(), MODEL_PATH)

# ============================================================
# VERIFY BEST MODEL
# ============================================================

model.eval()

final_correct = 0
final_total = 0

with torch.no_grad():

    for images, labels in val_loader:

        images = images.to(DEVICE)
        labels = labels.to(DEVICE)

        outputs = model(images)

        _, predicted = torch.max(outputs, 1)

        final_total += labels.size(0)
        final_correct += (predicted == labels).sum().item()

final_accuracy = final_correct / final_total

# ============================================================
# FINAL
# ============================================================

print()
print("=" * 60)
print("Training Complete")
print("=" * 60)

print(f"Best Recorded Validation Accuracy: {best_accuracy * 100:.2f}%")
print(f"Reloaded Best Model Accuracy: {final_accuracy * 100:.2f}%")
print(f"Correct: {final_correct}/{final_total}")

print()
print("Model saved to:")
print(MODEL_PATH)

print()
print("=" * 60)

if abs(best_accuracy - final_accuracy) < 0.0001:
    print("+ Saved model verification MATCHES.")
else:
    print("! Saved model verification DOES NOT MATCH.")

print("=" * 60)
