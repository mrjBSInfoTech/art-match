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

def train_medium_model():
    print("==================================================")
    print("  ArtMatch AI - Training Enhanced Medium Scanner  ")
    print("==================================================")

    # 1. Advanced Data Transforms with Augmentations
    data_transforms = {
        'train': transforms.Compose([
            transforms.RandomResizedCrop(224, scale=(0.8, 1.0), ratio=(0.85, 1.15)),
            transforms.RandomHorizontalFlip(p=0.5),
            transforms.RandomRotation(degrees=12),
            transforms.ColorJitter(brightness=0.1, contrast=0.1, saturation=0.1),
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

    data_dir = 'datasets/mediums'
    
    # 2. Load dataset
    image_datasets = {
        x: datasets.ImageFolder(os.path.join(data_dir, x), data_transforms[x], loader=safe_image_loader)
        for x in ['train', 'val']
    }
    
    dataloaders = {
        x: DataLoader(image_datasets[x], batch_size=8, shuffle=(x == 'train'), num_workers=0)
        for x in ['train', 'val']
    }

    class_names = image_datasets['train'].classes
    print(f"Categories ({len(class_names)}): {class_names}")
    print(f"Train samples: {len(image_datasets['train'])} | Val samples: {len(image_datasets['val'])}")

    # 3. Model Architecture: Pretrained ResNet18 with Dropout
    model = models.resnet18(weights=models.ResNet18_Weights.DEFAULT)
    
    # Freeze lower layers to conserve memory and prevent overfitting
    for param in model.parameters():
        param.requires_grad = False

    for param in model.layer4.parameters():
        param.requires_grad = True

    num_ftrs = model.fc.in_features
    model.fc = nn.Sequential(
        nn.Dropout(p=0.35),
        nn.Linear(num_ftrs, len(class_names))
    )

    device = torch.device('cuda:0' if torch.cuda.is_available() else 'cpu')
    model = model.to(device)

    # 4. Optimizer with differential learning rates & Label Smoothing
    criterion = nn.CrossEntropyLoss(label_smoothing=0.08)
    trainable_params = [
        {'params': model.layer4.parameters(), 'lr': 5e-5},
        {'params': model.fc.parameters(), 'lr': 3e-4}
    ]
    optimizer = optim.AdamW(trainable_params, weight_decay=1e-3)

    epochs = 20
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs, eta_min=1e-6)

    best_model_wts = copy.deepcopy(model.state_dict())
    best_acc = 0.0

    print("\nStarting Training Pipeline...\n")
    
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

            # Save best validation model weights
            if phase == 'val' and epoch_acc >= best_acc:
                best_acc = epoch_acc
                best_model_wts = copy.deepcopy(model.state_dict())

        gc.collect()

    print(f"\nBest Validation Accuracy: {best_acc:.4f}")

    # 5. Save Model Weights
    os.makedirs('models', exist_ok=True)
    save_path = 'models/medium_scanner.pth'
    
    torch.save({
        'model_state_dict': best_model_wts,
        'class_names': class_names
    }, save_path)
    
    print(f"Enhanced medium scanner model saved to: {save_path}\n")

if __name__ == '__main__':
    train_medium_model()
from torchvision import datasets, models, transforms
from PIL import Image, ImageFile

# Allow loading of truncated/incomplete image files without crashing
ImageFile.LOAD_TRUNCATED_IMAGES = True

def safe_image_loader(path):
    with Image.open(path) as img:
        img_rgb = img.convert('RGB')
        if max(img_rgb.size) > 600:
            img_rgb.thumbnail((600, 600), Image.Resampling.BILINEAR)
        return img_rgb.copy()

def train_medium_model():
    print("==================================================")
    print("  ArtMatch AI - Training Enhanced Medium Scanner  ")
    print("==================================================")

    # 1. Advanced Data Transforms with Augmentations
    data_transforms = {
        'train': transforms.Compose([
            transforms.RandomResizedCrop(224, scale=(0.8, 1.0), ratio=(0.85, 1.15)),
            transforms.RandomHorizontalFlip(p=0.5),
            transforms.RandomRotation(degrees=12),
            transforms.ColorJitter(brightness=0.1, contrast=0.1, saturation=0.1),
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

    data_dir = 'datasets/mediums'
    
    # 2. Load dataset
    image_datasets = {
        x: datasets.ImageFolder(os.path.join(data_dir, x), data_transforms[x], loader=safe_image_loader)
        for x in ['train', 'val']
    }
    
    dataloaders = {
        x: DataLoader(image_datasets[x], batch_size=8, shuffle=(x == 'train'), num_workers=0)
        for x in ['train', 'val']
    }

    class_names = image_datasets['train'].classes
    print(f"Categories ({len(class_names)}): {class_names}")
    print(f"Train samples: {len(image_datasets['train'])} | Val samples: {len(image_datasets['val'])}")

    # 3. Model Architecture: Pretrained ResNet18 with Dropout
    model = models.resnet18(weights=models.ResNet18_Weights.DEFAULT)
    
    # Freeze lower layers to conserve memory and prevent overfitting
    for param in model.parameters():
        param.requires_grad = False

    for param in model.layer4.parameters():
        param.requires_grad = True

    num_ftrs = model.fc.in_features
    model.fc = nn.Sequential(
        nn.Dropout(p=0.35),
        nn.Linear(num_ftrs, len(class_names))
    )

    device = torch.device('cuda:0' if torch.cuda.is_available() else 'cpu')
    model = model.to(device)

    # 4. Optimizer with differential learning rates & Label Smoothing
    criterion = nn.CrossEntropyLoss(label_smoothing=0.08)
    trainable_params = [
        {'params': model.layer4.parameters(), 'lr': 5e-5},
        {'params': model.fc.parameters(), 'lr': 3e-4}
    ]
    optimizer = optim.AdamW(trainable_params, weight_decay=1e-3)

    epochs = 20
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs, eta_min=1e-6)

    best_model_wts = copy.deepcopy(model.state_dict())
    best_acc = 0.0

    print("\nStarting Training Pipeline...\n")
    
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

            # Save best validation model weights
            if phase == 'val' and epoch_acc >= best_acc:
                best_acc = epoch_acc
                best_model_wts = copy.deepcopy(model.state_dict())

        gc.collect()

    print(f"\nBest Validation Accuracy: {best_acc:.4f}")

    # 5. Save Model Weights
    os.makedirs('models', exist_ok=True)
    save_path = 'models/medium_scanner.pth'
    
    torch.save({
        'model_state_dict': best_model_wts,
        'class_names': class_names
    }, save_path)
    
    print(f"Enhanced medium scanner model saved to: {save_path}\n")

if __name__ == '__main__':
    train_medium_model()