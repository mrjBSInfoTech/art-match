from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import os
import torch
import torchvision.transforms as transforms
from torchvision.models import resnet18
from PIL import Image, ImageFile
import cv2
import numpy as np
from sklearn.cluster import KMeans

# Allow loading of truncated/incomplete image files without crashing
ImageFile.LOAD_TRUNCATED_IMAGES = True

app = FastAPI()

class ImageRequest(BaseModel):
    image_path: str

# Common Transform for Neural Networks
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
])

# --- Helper: Convert RGB to Hex ---
def rgb_to_hex(r, g, b):
    """Converts RGB integers to a 6-character hex string."""
    return f"#{r:02x}{g:02x}{b:02x}".upper()

# --- 3D Object & Foreground Segmentation ---
THREE_D_MEDIUMS = {
    "ceramic_sculpture", "wood_sculpture", "metal_sculpture", 
    "recycle_sculpture", "acrylic_plastic", "metal_enamel", "yarn_textile"
}

THREE_D_FEATURES = {
    "sculptures", "pottery", "keychains", "pins_and_badges", "object"
}

def is_three_d_artwork(features, mediums):
    """Checks if predicted features or mediums indicate a 3D physical object."""
    has_3d_medium = any(m.lower() in THREE_D_MEDIUMS for m in mediums)
    has_3d_feature = any(f.lower() in THREE_D_FEATURES for f in features)
    return has_3d_medium or has_3d_feature

def segment_foreground_object(image_rgb, alpha_channel=None):
    """
    Isolates the 3D foreground object from studio/photo backgrounds.
    Returns a binary mask (uint8, 255 for foreground object, 0 for background).
    """
    h, w, _ = image_rgb.shape

    # 1. Transparency check (PNG / WebP alpha channel)
    if alpha_channel is not None:
        alpha_mask = (alpha_channel > 25).astype(np.uint8) * 255
        fg_ratio = np.count_nonzero(alpha_mask) / (h * w)
        if 0.02 < fg_ratio < 0.98:
            return alpha_mask

    # 2. Fast multi-scale GrabCut segmentation
    max_dim = 300
    scale = min(1.0, max_dim / max(h, w))
    sh, sw = max(10, int(h * scale)), max(10, int(w * scale))
    small = cv2.resize(image_rgb, (sw, sh), interpolation=cv2.INTER_AREA)

    # Sample borders for background color estimation
    b_h = max(2, int(sh * 0.05))
    b_w = max(2, int(sw * 0.05))

    border_pixels = np.vstack([
        small[:b_h, :].reshape(-1, 3),
        small[-b_h:, :].reshape(-1, 3),
        small[:, :b_w].reshape(-1, 3),
        small[:, -b_w:].reshape(-1, 3)
    ])

    bg_median = np.median(border_pixels, axis=0)

    # Convert to CIELAB for perceptual color distance
    small_lab = cv2.cvtColor(small, cv2.COLOR_RGB2LAB)
    bg_lab = cv2.cvtColor(np.uint8([[bg_median]]), cv2.COLOR_RGB2LAB)[0, 0]

    dist = np.linalg.norm(small_lab.astype(np.float32) - bg_lab.astype(np.float32), axis=2)

    # Initialize GrabCut mask
    gc_mask = np.full((sh, sw), cv2.GC_PR_FGD, dtype=np.uint8)

    # Borders are marked as definite background
    gc_mask[:b_h, :] = cv2.GC_BGD
    gc_mask[-b_h:, :] = cv2.GC_BGD
    gc_mask[:, :b_w] = cv2.GC_BGD
    gc_mask[:, -b_w:] = cv2.GC_BGD

    # Pixels very close to border background marked as probable background
    dist_thresh = max(18.0, np.percentile(dist, 25))
    gc_mask[dist < dist_thresh] = cv2.GC_PR_BGD

    # Central high-contrast pixels marked as definite foreground
    c_y1, c_y2 = int(sh * 0.15), int(sh * 0.85)
    c_x1, c_x2 = int(sw * 0.15), int(sw * 0.85)
    if c_y2 > c_y1 and c_x2 > c_x1:
        center_roi = dist[c_y1:c_y2, c_x1:c_x2]
        high_contrast = center_roi > (dist_thresh * 1.6)
        gc_mask[c_y1:c_y2, c_x1:c_x2][high_contrast] = cv2.GC_FGD

    bgdModel = np.zeros((1, 65), np.float64)
    fgdModel = np.zeros((1, 65), np.float64)

    try:
        cv2.grabCut(small, gc_mask, None, bgdModel, fgdModel, 3, cv2.GC_INIT_WITH_MASK)
        bin_mask = np.where((gc_mask == cv2.GC_FGD) | (gc_mask == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
    except Exception:
        bin_mask = (dist > dist_thresh).astype(np.uint8) * 255

    # Morphological cleaning (fill inner holes, remove speckles)
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    bin_mask = cv2.morphologyEx(bin_mask, cv2.MORPH_CLOSE, kernel, iterations=2)
    bin_mask = cv2.morphologyEx(bin_mask, cv2.MORPH_OPEN, kernel, iterations=1)

    # Keep dominant connected components (the 3D object)
    contours, _ = cv2.findContours(bin_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if contours:
        c_max = max(contours, key=cv2.contourArea)
        max_area = cv2.contourArea(c_max)
        clean_mask = np.zeros_like(bin_mask)
        cv2.drawContours(clean_mask, [c_max], -1, 255, -1)
        for c in contours:
            if cv2.contourArea(c) > max_area * 0.12:
                cv2.drawContours(clean_mask, [c], -1, 255, -1)
        bin_mask = clean_mask

    # Scale mask back to full original resolution
    full_mask = cv2.resize(bin_mask, (w, h), interpolation=cv2.INTER_NEAREST)

    fg_ratio = np.count_nonzero(full_mask) / (h * w)
    if 0.03 <= fg_ratio <= 0.95:
        return full_mask

    return full_mask if fg_ratio > 0.01 else np.ones((h, w), dtype=np.uint8) * 255

# --- 1. Direct Pixel Hex Color Extraction (Foreground-Aware) ---
def extract_all_detailed_colors(image_path, is_3d=False, clusters_per_region=8, min_pixel_percent=0.15):
    """
    Scans the artwork using global and local 3x3 grid sampling to extract 
    exact visual Hex codes for main and micro-detail colors.
    If the object is 3D, background pixels are completely isolated and excluded.
    """
    raw_img = cv2.imread(image_path, cv2.IMREAD_UNCHANGED)
    if raw_img is None:
        return []

    alpha_channel = None
    if len(raw_img.shape) == 3 and raw_img.shape[2] == 4:
        alpha_channel = raw_img[:, :, 3]
        image_bgr = raw_img[:, :, :3]
    elif len(raw_img.shape) == 2:
        image_bgr = cv2.cvtColor(raw_img, cv2.COLOR_GRAY2BGR)
    else:
        image_bgr = raw_img

    # Convert OpenCV BGR to standard RGB
    image = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
    h, w, _ = image.shape

    # If 3D object or alpha channel is present, isolate foreground object
    if is_3d or (alpha_channel is not None and np.any(alpha_channel < 250)):
        mask = segment_foreground_object(image, alpha_channel)
    else:
        mask = np.ones((h, w), dtype=np.uint8) * 255

    # Crop to object bounding box so 3x3 grids focus on object sub-zones
    fg_indices = np.where(mask > 0)
    if len(fg_indices[0]) > 100:
        y1, y2 = fg_indices[0].min(), fg_indices[0].max()
        x1, x2 = fg_indices[1].min(), fg_indices[1].max()
        pad_y = int((y2 - y1) * 0.02)
        pad_x = int((x2 - x1) * 0.02)
        y1, y2 = max(0, y1 - pad_y), min(h, y2 + pad_y + 1)
        x1, x2 = max(0, x1 - pad_x), min(w, x2 + pad_x + 1)

        cropped_img = image[y1:y2, x1:x2]
        cropped_mask = mask[y1:y2, x1:x2]
    else:
        cropped_img = image
        cropped_mask = mask

    ch, cw, _ = cropped_img.shape
    regions = [(cropped_img, cropped_mask)]

    # Collect pixel samples from 3x3 sub-regions within the object bounding box
    grid_h, grid_w = ch // 3, cw // 3
    if grid_h > 15 and grid_w > 15:
        for i in range(3):
            for j in range(3):
                sub_img = cropped_img[i*grid_h:(i+1)*grid_h, j*grid_w:(j+1)*grid_w]
                sub_mask = cropped_mask[i*grid_h:(i+1)*grid_h, j*grid_w:(j+1)*grid_w]
                if np.count_nonzero(sub_mask) >= 30:
                    regions.append((sub_img, sub_mask))

    detected_hex_set = set()
    detected_hex_list = []

    for reg_img, reg_mask in regions:
        resized_region = cv2.resize(reg_img, (120, 120), interpolation=cv2.INTER_AREA)
        resized_mask = cv2.resize(reg_mask, (120, 120), interpolation=cv2.INTER_NEAREST)

        # Extract only pixels that belong to the foreground object
        fg_pixels = resized_region[resized_mask > 0]
        if len(fg_pixels) < 25:
            continue

        n_clusters = min(clusters_per_region, max(2, len(fg_pixels) // 30))
        kmeans = KMeans(n_clusters=n_clusters, n_init=5, random_state=42)
        kmeans.fit(fg_pixels)

        labels, counts = np.unique(kmeans.labels_, return_counts=True)
        total_pixels = len(fg_pixels)

        for label, count in zip(labels, counts):
            percent = (count / total_pixels) * 100
            
            if percent >= min_pixel_percent:
                r, g, b = kmeans.cluster_centers_[label].astype(int)
                hex_code = rgb_to_hex(r, g, b)
                
                if hex_code not in detected_hex_set:
                    detected_hex_set.add(hex_code)
                    detected_hex_list.append(hex_code)

    if not detected_hex_list:
        fg_pixels_all = cropped_img[cropped_mask > 0]
        if len(fg_pixels_all) > 0:
            r, g, b = np.median(fg_pixels_all, axis=0).astype(int)
            detected_hex_list.append(rgb_to_hex(r, g, b))
        else:
            r, g, b = np.median(image.reshape(-1, 3), axis=0).astype(int)
            detected_hex_list.append(rgb_to_hex(r, g, b))

    return detected_hex_list

# --- 2. Load PyTorch Feature & Medium Models ---
def load_model(path):
    if not os.path.exists(path):
        return None, []
    checkpoint = torch.load(path, map_location=torch.device('cpu'))
    classes = checkpoint['class_names']
    model = resnet18(weights=None)
    num_ftrs = model.fc.in_features
    state_dict = checkpoint['model_state_dict']

    if 'fc.1.weight' in state_dict:
        model.fc = torch.nn.Sequential(
            torch.nn.Dropout(p=0.3),
            torch.nn.Linear(num_ftrs, len(classes))
        )
    else:
        model.fc = torch.nn.Linear(num_ftrs, len(classes))

    model.load_state_dict(state_dict)
    model.eval()
    return model, classes

FEATURE_MODEL_PATH = "models/feature_scanner.pth"
feature_model, feature_classes = load_model(FEATURE_MODEL_PATH)

MEDIUM_MODEL_PATH = "models/medium_scanner.pth"
medium_model, medium_classes = load_model(MEDIUM_MODEL_PATH)

# --- 3. FastAPI Analyze Endpoint ---
@app.post("/analyze")
def analyze_artwork(req: ImageRequest):
    if not os.path.exists(req.image_path):
        raise HTTPException(status_code=404, detail="Image path not found")

    img = Image.open(req.image_path).convert('RGB')
    img_tensor = transform(img).unsqueeze(0)

    # Multi-label detection for Features
    detected_features = []
    if feature_model and feature_classes:
        with torch.no_grad():
            outputs = feature_model(img_tensor)
            probs = torch.nn.functional.softmax(outputs[0], dim=0)
            
            for idx, prob in enumerate(probs):
                if prob.item() >= 0.15:
                    detected_features.append(feature_classes[idx])

    if not detected_features:
        detected_features = ["Artwork"]

    # Multi-label detection for Mediums
    detected_mediums = []
    if medium_model and medium_classes:
        with torch.no_grad():
            outputs = medium_model(img_tensor)
            probs = torch.nn.functional.softmax(outputs[0], dim=0)
            
            for idx, prob in enumerate(probs):
                if prob.item() >= 0.15:
                    detected_mediums.append(medium_classes[idx])

    if not detected_mediums:
        detected_mediums = ["Unknown"]

    # Detect if artwork is a 3D physical object
    is_3d = is_three_d_artwork(detected_features, detected_mediums)

    # Extract exact Hex colors (filters out background for 3D objects)
    detected_colors = extract_all_detailed_colors(req.image_path, is_3d=is_3d)

    return {
        "success": True,
        "is_3d": is_3d,
        "features": detected_features,
        "mediums": detected_mediums,
        "colors": detected_colors
    }