from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import os
import torch
import torchvision.transforms as transforms
from torchvision.models import resnet18, resnet50
from PIL import Image, ImageFile
import cv2
import numpy as np
from sklearn.cluster import KMeans
import json

import csv

try:
    from recommendation.recommendation_service import (
        recommend_from_artwork_ids,
    )
except ModuleNotFoundError:
    from ml.recommendation.recommendation_service import (
        recommend_from_artwork_ids,
    )

# Allow loading of truncated/incomplete image files without crashing
ImageFile.LOAD_TRUNCATED_IMAGES = True

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

app = FastAPI()

class ImageRequest(BaseModel):
    image_path: str
    artwork_type: str = "auto"  # frontend values: "physical" or "digital"; legacy values still supported
    product: str = ""            # "painting" or "3d_object"

class RecommendationRequest(BaseModel):
    artwork_ids: list[int]
    candidate_artwork_ids: list[int] | None = None
    top_k: int = 5

# Common Transform for Neural Networks
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
])

# --- Category Classifications (User Dataset Specs) ---
PHYSICAL_FEATURES = {"keychains", "pins_and_badges", "sculptures", "pottery"}
PHYSICAL_MEDIUMS = {
    "acrylic_plastic", "ceramic_sculpture", "metal_enamel", 
    "metal_sculpture", "recycle_sculpture", "wood_sculpture", "yarn_textile"
}
TWOD_MEDIUMS = {"acrylic", "charcoal", "digital", "oil", "pastel", "pencil", "watercolor"}

# --- Helper: Convert RGB to Hex & Color Name Lookup ---
def rgb_to_hex(r, g, b):
    return f"#{r:02x}{g:02x}{b:02x}".upper()

COLOR_NAMES_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "color_names.csv")
COLOR_DATA = []

if os.path.exists(COLOR_NAMES_PATH):
    try:
        with open(COLOR_NAMES_PATH, mode='r', encoding='utf-8', errors='replace') as f:
            reader = csv.DictReader(f)
            for row in reader:
                name = row.get("Name", "").strip()
                name = name.encode('ascii', 'ignore').decode('ascii').strip()
                try:
                    r = int(row.get("Red (8 bit)", 0))
                    g = int(row.get("Green (8 bit)", 0))
                    b = int(row.get("Blue (8 bit)", 0))
                    hex_val = row.get("Hex (24 bit)", "").strip()
                    if name:
                        COLOR_DATA.append((name, r, g, b, hex_val))
                except ValueError:
                    continue
    except Exception as e:
        print(f"Warning loading color_names.csv: {e}")

def get_closest_color_name(r, g, b):
    hex_code = rgb_to_hex(r, g, b)
    if not COLOR_DATA:
        return hex_code
    min_dist = float('inf')
    best_name = None
    for name, cr, cg, cb, chex in COLOR_DATA:
        dist = (r - cr)**2 + (g - cg)**2 + (b - cb)**2
        if dist < min_dist:
            min_dist = dist
            best_name = name
    return f"{best_name} ({hex_code})" if best_name else hex_code

# --- 3D Object & Foreground Segmentation ---
THREE_D_MEDIUMS = {
    "ceramic_sculpture", "wood_sculpture", "metal_sculpture", 
    "recycle_sculpture", "acrylic_plastic", "metal_enamel", "yarn_textile"
}

THREE_D_FEATURES = {
    "sculptures", "pottery", "keychains", "pins_and_badges", "object"
}

FEATURE_THRESHOLDS_PATH = os.path.join(BASE_DIR, "models", "feature_thresholds.json")

if os.path.exists(FEATURE_THRESHOLDS_PATH):
    with open(FEATURE_THRESHOLDS_PATH, "r", encoding="utf-8") as f:
        FEATURE_THRESHOLDS = json.load(f)
else:
    FEATURE_THRESHOLDS = {}

def is_three_d_artwork(features, mediums):
    # Only classify as 3D artwork if the detected medium is explicitly a 3D physical sculpture medium
    return any(m.lower() in THREE_D_MEDIUMS for m in mediums)

def segment_foreground_object(image_rgb, alpha_channel=None):
    h, w, _ = image_rgb.shape

    if alpha_channel is not None:
        alpha_mask = (alpha_channel > 25).astype(np.uint8) * 255
        fg_ratio = np.count_nonzero(alpha_mask) / (h * w)
        if 0.02 < fg_ratio < 0.98:
            return alpha_mask

    max_dim = 300
    scale = min(1.0, max_dim / max(h, w))
    sh, sw = max(10, int(h * scale)), max(10, int(w * scale))
    small = cv2.resize(image_rgb, (sw, sh), interpolation=cv2.INTER_AREA)

    b_h = max(2, int(sh * 0.05))
    b_w = max(2, int(sw * 0.05))

    border_pixels = np.vstack([
        small[:b_h, :].reshape(-1, 3),
        small[-b_h:, :].reshape(-1, 3),
        small[:, :b_w].reshape(-1, 3),
        small[:, -b_w:].reshape(-1, 3)
    ])

    bg_median = np.median(border_pixels, axis=0)
    small_lab = cv2.cvtColor(small, cv2.COLOR_RGB2LAB)
    bg_lab = cv2.cvtColor(np.uint8([[bg_median]]), cv2.COLOR_RGB2LAB)[0, 0]

    dist = np.linalg.norm(small_lab.astype(np.float32) - bg_lab.astype(np.float32), axis=2)

    gc_mask = np.full((sh, sw), cv2.GC_PR_FGD, dtype=np.uint8)
    gc_mask[:b_h, :] = cv2.GC_BGD
    gc_mask[-b_h:, :] = cv2.GC_BGD
    gc_mask[:, :b_w] = cv2.GC_BGD
    gc_mask[:, -b_w:] = cv2.GC_BGD

    dist_thresh = max(18.0, np.percentile(dist, 25))
    gc_mask[dist < dist_thresh] = cv2.GC_PR_BGD

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

    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    bin_mask = cv2.morphologyEx(bin_mask, cv2.MORPH_CLOSE, kernel, iterations=2)
    bin_mask = cv2.morphologyEx(bin_mask, cv2.MORPH_OPEN, kernel, iterations=1)

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

    full_mask = cv2.resize(bin_mask, (w, h), interpolation=cv2.INTER_NEAREST)
    fg_ratio = np.count_nonzero(full_mask) / (h * w)
    if 0.03 <= fg_ratio <= 0.95:
        return full_mask

    return full_mask if fg_ratio > 0.01 else np.ones((h, w), dtype=np.uint8) * 255

# --- 1. Direct Pixel Hex Color Extraction (Perceptually Accurate LAB + HSV) ---
def extract_all_detailed_colors(img_input, is_3d=False):
    alpha_channel = None

    if isinstance(img_input, str):
        if not os.path.exists(img_input):
            return []
        try:
            pil_img = Image.open(img_input)
        except Exception:
            return []
    else:
        pil_img = img_input

    if pil_img is None:
        return []

    if pil_img.mode == 'RGBA':
        np_img = np.array(pil_img)
        alpha_channel = np_img[:, :, 3]
        image = np_img[:, :, :3]
    else:
        image = np.array(pil_img.convert('RGB'))

    h, w, _ = image.shape

    if is_3d or (alpha_channel is not None and np.any(alpha_channel < 250)):
        mask = segment_foreground_object(image, alpha_channel)
    else:
        mask = np.ones((h, w), dtype=np.uint8) * 255

    max_dim = 250
    scale = min(1.0, max_dim / max(h, w))
    sw, sh = max(10, int(w * scale)), max(10, int(h * scale))
    resized_rgb = cv2.resize(image, (sw, sh), interpolation=cv2.INTER_AREA)
    resized_mask = cv2.resize(mask, (sw, sh), interpolation=cv2.INTER_NEAREST)

    valid_pixels_rgb = resized_rgb[resized_mask > 0]
    if len(valid_pixels_rgb) < 20:
        valid_pixels_rgb = resized_rgb.reshape(-1, 3)

    # 1. Convert to CIELAB color space for perceptual color clustering
    lab_pixels = cv2.cvtColor(valid_pixels_rgb.reshape(1, -1, 3).astype(np.uint8), cv2.COLOR_RGB2LAB).reshape(-1, 3)

    n_clusters = min(8, max(3, len(lab_pixels) // 30))
    kmeans = KMeans(n_clusters=n_clusters, n_init=10, random_state=42)
    kmeans.fit(lab_pixels.astype(np.float32))

    labels, counts = np.unique(kmeans.labels_, return_counts=True)
    total_pixels = len(lab_pixels)
    sorted_indices = np.argsort(-counts)

    detected_hex_list = []
    detected_labs = []

    for idx in sorted_indices:
        percent = (counts[idx] / total_pixels) * 100
        if percent >= 1.0:
            lab_c = kmeans.cluster_centers_[idx]
            l1, a1, b1 = lab_c

            is_similar = False
            for l2, a2, b2 in detected_labs:
                lab_dist = np.sqrt((l1 - l2)**2 + (a1 - a2)**2 + (b1 - b2)**2)
                if lab_dist < 14.0:
                    is_similar = True
                    break

            if not is_similar:
                lab_center = lab_c.reshape(1, 1, 3).astype(np.uint8)
                rgb_center = cv2.cvtColor(lab_center, cv2.COLOR_LAB2RGB)[0, 0]
                r, g, b = int(rgb_center[0]), int(rgb_center[1]), int(rgb_center[2])
                
                detected_labs.append((l1, a1, b1))
                detected_hex_list.append(rgb_to_hex(r, g, b))

    # 2. Extract prominent accent colors (high saturation)
    hsv_pixels = cv2.cvtColor(valid_pixels_rgb.reshape(1, -1, 3).astype(np.uint8), cv2.COLOR_RGB2HSV).reshape(-1, 3)
    high_sat_mask = hsv_pixels[:, 1] > 115
    if np.count_nonzero(high_sat_mask) > (total_pixels * 0.015):
        sat_lab_pixels = lab_pixels[high_sat_mask]
        n_sat_clusters = min(3, max(1, len(sat_lab_pixels) // 20))
        sat_kmeans = KMeans(n_clusters=n_sat_clusters, n_init=5, random_state=42)
        sat_kmeans.fit(sat_lab_pixels.astype(np.float32))
        
        for lab_c in sat_kmeans.cluster_centers_:
            l1, a1, b1 = lab_c
            is_similar = False
            for l2, a2, b2 in detected_labs:
                if np.sqrt((l1 - l2)**2 + (a1 - a2)**2 + (b1 - b2)**2) < 16.0:
                    is_similar = True
                    break
            if not is_similar:
                lab_center = lab_c.reshape(1, 1, 3).astype(np.uint8)
                rgb_center = cv2.cvtColor(lab_center, cv2.COLOR_LAB2RGB)[0, 0]
                r, g, b = int(rgb_center[0]), int(rgb_center[1]), int(rgb_center[2])
                detected_labs.append((l1, a1, b1))
                detected_hex_list.append(rgb_to_hex(r, g, b))

    return detected_hex_list[:7]

# --- 2. Load PyTorch Models ---
def load_model(path, fallback_classes=None):
    if not os.path.exists(path):
        return None, []
    checkpoint = torch.load(path, map_location=torch.device('cpu'))

    if isinstance(checkpoint, dict) and 'class_names' in checkpoint:
        classes = checkpoint['class_names']
        state_dict = checkpoint.get('model_state_dict', checkpoint)
    elif isinstance(checkpoint, dict) and 'classes' in checkpoint:
        classes = checkpoint['classes']
        state_dict = checkpoint.get('model_state_dict', checkpoint)
    else:
        state_dict = checkpoint
        classes = fallback_classes or []
        if not classes:
            filename = os.path.basename(path).lower()
            if "2d" in filename:
                val_dir = os.path.join(BASE_DIR, "datasets", "mediums_2d", "val")
                if os.path.exists(val_dir):
                    classes = sorted(d for d in os.listdir(val_dir) if os.path.isdir(os.path.join(val_dir, d)))
                else:
                    classes = sorted(list(TWOD_MEDIUMS))
            elif "3d" in filename:
                val_dir = os.path.join(BASE_DIR, "datasets", "mediums_3d", "val")
                if os.path.exists(val_dir):
                    classes = sorted(d for d in os.listdir(val_dir) if os.path.isdir(os.path.join(val_dir, d)))
                else:
                    classes = sorted(list(PHYSICAL_MEDIUMS))
            else:
                fc_weight = state_dict.get('fc.1.weight') if 'fc.1.weight' in state_dict else state_dict.get('fc.weight')
                if fc_weight is not None:
                    classes = [f"class_{i}" for i in range(fc_weight.shape[0])]

    model = resnet18(weights=None)
    num_ftrs = model.fc.in_features

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

# ============================================================
# Separate Medium Model Loader
# Supports the new medium_2d_scanner.pth / medium_3d_scanner.pth
# ============================================================

def load_separate_medium_model(path, class_names):
    if not os.path.exists(path):
        print(f"Medium model not found: {path}")
        return None, []

    try:
        checkpoint = torch.load(
            path,
            map_location=torch.device("cpu")
        )

        # New training script saves a raw state_dict
        # but this also supports a checkpoint containing model_state_dict.
        if isinstance(checkpoint, dict) and "model_state_dict" in checkpoint:
            state_dict = checkpoint["model_state_dict"]

            saved_classes = checkpoint.get("class_names")

            if saved_classes:
                class_names = saved_classes

        else:
            state_dict = checkpoint

        arch = "resnet18"
        if isinstance(checkpoint, dict) and "arch" in checkpoint:
            arch = checkpoint["arch"]
        elif any("layer4.2." in k for k in state_dict.keys()):
            arch = "resnet50"

        if arch == "resnet50":
            model = resnet50(weights=None)
        else:
            model = resnet18(weights=None)

        num_ftrs = model.fc.in_features

        # Your current medium training script uses:
        # Dropout(0.50) + Linear
        if "fc.1.weight" in state_dict:
            model.fc = torch.nn.Sequential(
                torch.nn.Dropout(p=0.50),
                torch.nn.Linear(
                    num_ftrs,
                    len(class_names)
                )
            )
        else:
            model.fc = torch.nn.Linear(
                num_ftrs,
                len(class_names)
            )

        model.load_state_dict(state_dict)
        model.eval()

        print(f"Loaded medium model: {path}")
        print(f"Medium classes: {class_names}")

        return model, class_names

    except Exception as e:
        print(f"Error loading medium model {path}: {e}")
        return None, []

FEATURE_MODEL_PATH = os.path.join(
    BASE_DIR,
    "models",
    "feature_scanner.pth"
)

feature_model, feature_classes = load_model(
    FEATURE_MODEL_PATH
)

# ============================================================
# Separate 2D / 3D Medium Models
# ============================================================

MEDIUM_2D_MODEL_PATH = os.path.join(
    BASE_DIR,
    "models",
    "medium_2d_scanner.pth"
)

MEDIUM_3D_MODEL_PATH = os.path.join(
    BASE_DIR,
    "models",
    "medium_3d_scanner.pth"
)

MEDIUM_2D_CLASSES = [
    "acrylic",
    "charcoal",
    "digital",
    "oil",
    "pastel",
    "pencil",
    "watercolor"
]

MEDIUM_3D_CLASSES = [
    "acrylic_plastic",
    "ceramic_sculpture",
    "metal_enamel",
    "metal_sculpture",
    "recycle_sculpture",
    "wood_sculpture",
    "yarn_textile"
]

medium_2d_model, medium_2d_classes = load_separate_medium_model(
    MEDIUM_2D_MODEL_PATH,
    MEDIUM_2D_CLASSES
)

medium_3d_model, medium_3d_classes = load_separate_medium_model(
    MEDIUM_3D_MODEL_PATH,
    MEDIUM_3D_CLASSES
)

# --- 3. FastAPI Analyze Endpoint ---
def extract_features(img):
    """Detect all feature labels whose calibrated thresholds are met."""
    detected_features = []

    if feature_model and feature_classes:
        with torch.no_grad():
            main_tensor = transform(img).unsqueeze(0)
            outputs = feature_model(main_tensor)
            probabilities = torch.sigmoid(outputs)[0]

        scored_features = []

        for idx, probability in enumerate(probabilities):
            confidence = probability.item()
            feature_name = feature_classes[idx]
            threshold = float(FEATURE_THRESHOLDS.get(feature_name, 0.50))
            scored_features.append((confidence, feature_name, threshold))

        scored_features.sort(key=lambda item: item[0], reverse=True)

        print("\n========== FEATURE CONFIDENCE ==========")

        for confidence, feature_name, threshold in scored_features:
            print(
                f"{feature_name:20s} : "
                f"{confidence * 100:6.2f}% "
                f"(threshold {threshold * 100:5.1f}%)"
            )

            if confidence >= threshold:
                detected_features.append(feature_name)

        print("----------------------------------------")
        print("Detected features:", detected_features or "None")
        print("========================================\n")

    return detected_features


def extract_mediums(img, *args, **kwargs):
    # Support extract_mediums(img, is_3d), extract_mediums(img, crop_tensors, is_3d), and keyword args
    if "is_3d" in kwargs:
        is_3d = kwargs["is_3d"]
    elif len(args) == 1:
        is_3d = args[0]
    elif len(args) >= 2:
        is_3d = args[1]
    else:
        is_3d = False

    # ========================================================
    # Choose the correct model and threshold
    # ========================================================

    if is_3d:
        medium_model = medium_3d_model
        medium_classes = medium_3d_classes

        threshold_path = os.path.join(
            BASE_DIR,
            "models",
            "medium_3d_threshold.json"
        )

        # Temporary fallback until the 3D model is calibrated
        medium_threshold = 0.70

        print("Medium mode: 3D / Physical Art")

    else:
        medium_model = medium_2d_model
        medium_classes = medium_2d_classes

        threshold_path = os.path.join(
            BASE_DIR,
            "models",
            "medium_2d_threshold.json"
        )

        # Current calibrated 2D threshold
        medium_threshold = 0.81

        print("Medium mode: 2D / Painting")

    # ========================================================
    # Load threshold
    # ========================================================

    if os.path.exists(threshold_path):
        try:
            with open(
                threshold_path,
                "r",
                encoding="utf-8"
            ) as f:

                threshold_data = json.load(f)

            medium_threshold = float(
                threshold_data.get(
                    "threshold",
                    medium_threshold
                )
            )

        except Exception as e:
            print(
                f"Warning loading medium threshold: {e}"
            )

    # ========================================================
    # Confidence margin
    # ========================================================

    medium_margin = 0.20

    # ========================================================
    # Check model
    # ========================================================

    if medium_model is None or not medium_classes:

        print(
            "Selected medium model unavailable."
        )

        return ["No medium detected"]

    # ========================================================
    # Run model
    # ========================================================

    with torch.no_grad():

        medium_tensor = transform(
            img
        ).unsqueeze(0)

        outputs = medium_model(
            medium_tensor
        )

        probabilities = torch.softmax(
            outputs,
            dim=1
        )[0]

    # ========================================================
    # Score all mediums
    # ========================================================

    scored_mediums = []

    for idx, probability in enumerate(
        probabilities
    ):

        confidence = probability.item()

        medium_name = medium_classes[idx]

        scored_mediums.append(
            (
                confidence,
                medium_name
            )
        )

    scored_mediums.sort(
        key=lambda item: item[0],
        reverse=True
    )

    # ========================================================
    # Print confidence scores
    # ========================================================

    print(
        "\n========== MEDIUM CONFIDENCE =========="
    )

    for confidence, medium_name in scored_mediums:

        display_name = medium_name.replace(
            "_",
            " "
        ).title()

        print(
            f"{display_name:25s} : "
            f"{confidence * 100:6.2f}%"
        )

    print(
        f"Minimum accepted confidence: "
        f"{medium_threshold * 100:.2f}%"
    )

    print(
        "========================================"
    )

    # ========================================================
    # Top prediction
    # ========================================================

    top_confidence, top_medium = scored_mediums[0]

    second_confidence, second_medium = (
        scored_mediums[1]
    )

    top_display_medium = top_medium.replace(
        "_",
        " "
    ).title()

    second_display_medium = (
        second_medium
        .replace("_", " ")
        .title()
    )

    # ========================================================
    # Confidence margin
    # ========================================================

    confidence_margin = (
        top_confidence -
        second_confidence
    )

    print(
        f"Top Medium: "
        f"{top_display_medium} "
        f"({top_confidence * 100:.2f}%)"
    )

    print(
        f"Second Medium: "
        f"{second_display_medium} "
        f"({second_confidence * 100:.2f}%)"
    )

    print(
        f"Confidence Margin: "
        f"{confidence_margin * 100:.2f}%"
    )

    print(
        f"Required Margin: "
        f"{medium_margin * 100:.2f}%"
    )

    # ========================================================
    # Accept only if BOTH conditions pass
    # ========================================================

    selected_medium = None

    if (
        top_confidence >= medium_threshold
        and confidence_margin >= medium_margin
    ):
        selected_medium = top_display_medium

    # ========================================================
    # Final result
    # ========================================================

    if selected_medium:

        print(
            f"Selected Medium: "
            f"{selected_medium} "
            f"({top_confidence * 100:.2f}%)"
        )

        return [selected_medium]

    print(
        "Selected Medium: "
        "No medium detected"
    )

    return ["No medium detected"]
    
def prepare_physical_art_scan(original_rgba):
    """Return an RGB model input and masked color input without saving either."""
    try:
        pixels = np.array(original_rgba)
        image_rgb = pixels[:, :, :3].copy()
        mask = segment_foreground_object(image_rgb, pixels[:, :, 3])
        coords = cv2.findNonZero(mask)
        if coords is None:
            raise ValueError("No foreground object found")

        x, y, w, h = cv2.boundingRect(coords)
        pad = int(max(w, h) * 0.05)
        x1, y1 = max(0, x - pad), max(0, y - pad)
        x2 = min(image_rgb.shape[1], x + w + pad)
        y2 = min(image_rgb.shape[0], y + h + pad)

        foreground_rgba = np.dstack((image_rgb, mask))[y1:y2, x1:x2]
        color_img = Image.fromarray(foreground_rgba)
        white_background = Image.new("RGBA", color_img.size, (255, 255, 255, 255))
        scan_img = Image.alpha_composite(white_background, color_img).convert("RGB")
        return scan_img, color_img
    except Exception as e:
        print(f"3D segmentation warning: {e}")
        original_rgb = original_rgba.convert("RGB")
        return original_rgb, original_rgba


@app.post("/analyze")
def analyze_artwork(req: ImageRequest):
    if not os.path.exists(req.image_path):
        raise HTTPException(status_code=404, detail="Image path not found")

    with Image.open(req.image_path) as uploaded_image:
        original_rgba = uploaded_image.convert("RGBA")

    original_rgb = original_rgba.convert("RGB")

    user_selection = (req.artwork_type or "auto").strip().lower()
    product_selection = (req.product or "").strip().lower()

    # --------------------------------------------------------
    # Frontend selection rules
    # --------------------------------------------------------
    # Digital artwork:
    #   - never run the medium classifier
    #   - medium is always Digital
    #
    # Physical + 3D Object:
    #   - remove background in memory for ML analysis
    #   - run the 3D medium scanner
    #
    # Physical + Painting:
    #   - keep the original image
    #   - run the 2D medium scanner
    # --------------------------------------------------------

    is_digital = user_selection == "digital"

    explicit_3d = (
        not is_digital
        and (
            user_selection in {"physical_art", "3d_object"}
            or product_selection == "3d_object"
        )
    )

    explicit_2d = (
        is_digital
        or user_selection in {"2d_art", "painting"}
        or product_selection == "painting"
    )

    is_3d = explicit_3d

    # The original uploaded file is never overwritten.
    scan_img = original_rgb
    color_img = original_rgb

    if is_3d:
        scan_img, color_img = prepare_physical_art_scan(original_rgba)

    # Feature scanning still runs for every artwork type.
    final_features = extract_features(scan_img)

    # Digital is a user-declared art type, so its medium is deterministic.
    if is_digital:
        final_mediums = ["Digital"]
        print("Medium mode: Digital art selected by user")
        print("Selected Medium: Digital (forced by art type)")
    else:
        final_mediums = extract_mediums(scan_img, is_3d)

    # Only use automatic 2D/3D inference when the request did not explicitly
    # tell us whether this is a painting/digital work or a 3D object.
    if not explicit_2d and not explicit_3d:
        inferred_3d = is_three_d_artwork(final_features, final_mediums)

        if inferred_3d and not is_3d:
            is_3d = True
            scan_img, color_img = prepare_physical_art_scan(original_rgba)
            final_features = extract_features(scan_img)
            final_mediums = extract_mediums(scan_img, is_3d=True)

    # Keep the prediction vocabulary scoped to the selected artwork type.
    if is_3d:
        final_mediums = [
            medium
            for medium in final_mediums
            if medium.lower().replace(" ", "_") in PHYSICAL_MEDIUMS
        ]
        final_features = [
            feature
            for feature in final_features
            if feature.lower().replace(" ", "_") in PHYSICAL_FEATURES
        ]
    else:
        if is_digital:
            # Do not allow later filtering/model logic to replace the explicit
            # Digital medium selected from the frontend.
            final_mediums = ["Digital"]
        else:
            final_mediums = [
                medium
                for medium in final_mediums
                if medium.lower().replace(" ", "_") in TWOD_MEDIUMS
            ]

        final_features = [
            feature
            for feature in final_features
            if feature.lower().replace(" ", "_") not in PHYSICAL_FEATURES
        ]

    detected_colors = extract_all_detailed_colors(
        color_img,
        is_3d=is_3d
    )

    # Truthful fallbacks instead of guessing.
    if not final_features or final_features == ["artwork"]:
        final_features = ["No feature detected"]

    if not final_mediums:
        final_mediums = ["No medium detected"]

    return {
        "success": True,
        "is_3d": is_3d,
        "artwork_type": user_selection,
        "product": product_selection,
        "features": final_features,
        "mediums": final_mediums,
        "colors": detected_colors
    }

@app.post("/recommend")
def recommend_artworks(
    req: RecommendationRequest,
):

    try:

        recommendations = (
            recommend_from_artwork_ids(
                artwork_ids=
                    req.artwork_ids,

                candidate_artwork_ids=
                    req.candidate_artwork_ids,

                top_k=
                    req.top_k,
            )
        )

        return {
            "recommendations":
                recommendations
        }

    except Exception as error:

        print(
            "Recommendation error:",
            error,
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Unable to generate "
                "recommendations"
            ),
        )