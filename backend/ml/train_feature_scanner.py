import os
import copy
import gc
import torch
import torch.nn as nn
import torch.optim as optim
from torchvision import datasets, models, transforms
from torch.utils.data import DataLoader
from PIL import Image, ImageFile

# Allow loading of truncated/incomplete image files without crashing
ImageFile.LOAD_TRUNCATED_IMAGES = True

def safe_image_loader(path):
    with Image.open(path) as img:
        img_rgb = img.convert('RGB')
        if max(img_rgb.size) > 600:
            img_rgb.thumbnail((600, 600), Image.Resampling.BILINEAR)
        return img_rgb.copy()

def train_feature_model():
    print("==================================================")
    print("  ArtMatch AI - Training Enhanced Feature Scanner ")
    print("==================================================")

    # 1. Image Transformations with Augmentations (Shapes & Color Independence)
    data_transforms = {
        'train': transforms.Compose([
            # Crop random areas of the image to handle varied zoom levels
            transforms.RandomResizedCrop(224, scale=(0.7, 1.0), ratio=(0.8, 1.2)),
            transforms.RandomHorizontalFlip(p=0.5),
            # Small rotations to handle tilted artwork images
            transforms.RandomRotation(degrees=15),
            # Slightly alter brightness/contrast to avoid color bias
            transforms.ColorJitter(brightness=0.15, contrast=0.15, saturation=0.15),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
        ]),
        'val': transforms.Compose([
            transforms.Resize(256),
            transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
        ]),
    }

    data_dir = 'datasets/features'
    
    # 2. Load Dataset from Folders
    image_datasets = {
        x: datasets.ImageFolder(os.path.join(data_dir, x), data_transforms[x], loader=safe_image_loader)
        for x in ['train', 'val']
    }
    
    dataloaders = {
        x: DataLoader(image_datasets[x], batch_size=8, shuffle=(x == 'train'), num_workers=0)
        for x in ['train', 'val']
    }

    class_names = image_datasets['train'].classes
    print(f"Detected Feature Classes ({len(class_names)}): {class_names}")
    print(f"Train samples: {len(image_datasets['train'])} | Val samples: {len(image_datasets['val'])}")

    # 3. Load Pretrained ResNet18 Architecture
    model = models.resnet18(weights=models.ResNet18_Weights.DEFAULT)
    
    # Freeze lower layers for low CPU memory footprint and faster convergence
    for param in model.parameters():
        param.requires_grad = False

    # Fine-tune layer4 and the classification head
    for param in model.layer4.parameters():
        param.requires_grad = True

    num_ftrs = model.fc.in_features
    model.fc = nn.Sequential(
        nn.Dropout(p=0.3),  # Helps prevent overfitting
        nn.Linear(num_ftrs, len(class_names))
    )

    device = torch.device('cuda:0' if torch.cuda.is_available() else 'cpu')
    model = model.to(device)

    # 4. Loss Function & Optimizer
    criterion = nn.CrossEntropyLoss()
    trainable_params = [p for p in model.parameters() if p.requires_grad]
    optimizer = optim.AdamW(trainable_params, lr=0.0002, weight_decay=1e-3)

    epochs = 20
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs, eta_min=1e-6)

    best_model_wts = copy.deepcopy(model.state_dict())
    best_acc = 0.0

    print("\nStarting Feature Scanner Training...\n")
    
    for epoch in range(epochs):
        for phase in ['train', 'val']:
            if phase == 'train':
                model.train()
            else:
                model.eval()

            running_loss = 0.0
            running_corrects = 0

            for inputs, labels in dataloaders[phase]:
                inputs = inputs.to(device)
                labels = labels.to(device)
                optimizer.zero_grad(set_to_none=True)

                with torch.set_grad_enabled(phase == 'train'):
                    outputs = model(inputs)
                    _, preds = torch.max(outputs, 1)
                    loss = criterion(outputs, labels)

                    if phase == 'train':
                        loss.backward()
                        optimizer.step()

                running_loss += loss.item() * inputs.size(0)
                running_corrects += (preds == labels.data).sum().item()

                del inputs, labels, outputs, loss

            if phase == 'train':
                scheduler.step()

            epoch_loss = running_loss / len(image_datasets[phase])
            epoch_acc = running_corrects / len(image_datasets[phase])

            print(f"Epoch {epoch+1:02d}/{epochs:02d} [{phase.upper()}] Loss: {epoch_loss:.4f} Acc: {epoch_acc:.4f}")

            # Keep track of the weights that performed best on validation set
            if phase == 'val' and epoch_acc >= best_acc:
                best_acc = epoch_acc
                best_model_wts = copy.deepcopy(model.state_dict())

        gc.collect()

    print(f"\nBest Validation Accuracy: {best_acc:.4f}")

    # 5. Save Model Weights & Class Names
    os.makedirs('models', exist_ok=True)
    save_path = 'models/feature_scanner.pth'
    
    torch.save({
        'model_state_dict': best_model_wts,
        'class_names': class_names
    }, save_path)
    
    print(f"Feature scanner complete! Best model saved to: {save_path}\n")

if __name__ == '__main__':
    train_feature_model()