import os
from PIL import Image, ImageFile

ImageFile.LOAD_TRUNCATED_IMAGES = True

dataset_dirs = ["datasets/features", "datasets/mediums"]
corrupted_count = 0
resized_count = 0
MAX_DIM = 600  # ResNet only needs 224x224, so max 600px is more than enough

print("==================================================")
print("  ArtMatch AI - Dataset Cleaner & Image Optimizer  ")
print("==================================================")

for dataset_dir in dataset_dirs:
    if not os.path.exists(dataset_dir):
        continue
    print(f"\nScanning: {dataset_dir}")
    
    for root, _, files in os.walk(dataset_dir):
        for file in files:
            file_path = os.path.join(root, file)
            
            # Check 0-byte empty files
            try:
                if os.path.getsize(file_path) == 0:
                    print(f"  [Removed 0-byte] {file_path}")
                    os.remove(file_path)
                    corrupted_count += 1
                    continue
            except OSError:
                continue

            # Check validity and resize oversized images
            try:
                with Image.open(file_path) as img:
                    img_rgb = img.convert('RGB')
                    w, h = img_rgb.size

                    # Downscale oversized images to save memory and eliminate MemoryErrors
                    if max(w, h) > MAX_DIM:
                        img_rgb.thumbnail((MAX_DIM, MAX_DIM), Image.Resampling.LANCZOS)
                        img_rgb.save(file_path, "JPEG", quality=90, optimize=True)
                        resized_count += 1

            except Exception as e:
                print(f"  [Deleted corrupt] {file_path} ({e})")
                try:
                    os.remove(file_path)
                    corrupted_count += 1
                except OSError:
                    pass

print(f"\nCleanup finished!")
print(f" - Corrupted files removed: {corrupted_count}")
print(f" - Oversized images downscaled to <= {MAX_DIM}px: {resized_count}")
print("Your datasets are now fully optimized for high-speed, crash-free training.\n")