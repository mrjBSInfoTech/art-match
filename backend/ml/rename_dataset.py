import os

# Base directory relative to this script
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

# List all target dataset directories you want to batch-rename
TARGET_DIRECTORIES = [
    "datasets/mediums_2d/train",
    "datasets/mediums_2d/val",
]

# Valid image extensions to rename
IMAGE_EXTENSIONS = ('.jpg', '.jpeg', '.png', '.bmp', '.webp', '.tiff')

def rename_images_in_subfolders(target_rel_dir):
    base_dir = os.path.join(SCRIPT_DIR, target_rel_dir) if not os.path.isabs(target_rel_dir) else target_rel_dir
    if not os.path.exists(base_dir):
        print(f"Skipping: Directory '{target_rel_dir}' (resolved: '{base_dir}') does not exist.")
        return

    print(f"==================================================")
    print(f" Starting batch rename in: {base_dir}")
    print(f"==================================================")

    # Walk through every subfolder in the target directory
    for root, dirs, files in os.walk(base_dir):
        # Filter out non-image files
        image_files = [f for f in files if f.lower().endswith(IMAGE_EXTENSIONS)]
        
        if not image_files:
            continue

        folder_name = os.path.basename(root)
        print(f"Processing folder '{folder_name}' ({len(image_files)} images)...")

        # Step 1: Temporary rename to prevent file collision (e.g., if 1.jpg already exists)
        temp_files = []
        for index, filename in enumerate(image_files, start=1):
            old_path = os.path.join(root, filename)
            ext = os.path.splitext(filename)[1].lower()
            temp_name = f"temp_rename_{index}{ext}"
            temp_path = os.path.join(root, temp_name)
            
            os.rename(old_path, temp_path)
            temp_files.append((temp_path, ext))

        # Step 2: Final sequential rename (1.jpg, 2.jpg, 3.jpg...)
        for index, (temp_path, ext) in enumerate(temp_files, start=1):
            final_name = f"{index}{ext}"
            final_path = os.path.join(root, final_name)
            os.rename(temp_path, final_path)

        print(f"  [OK] Renamed {len(image_files)} images (1{temp_files[0][1]} to {len(image_files)}{temp_files[-1][1]})\n")

if __name__ == "__main__":
    for target_dir in TARGET_DIRECTORIES:
        rename_images_in_subfolders(target_dir)
        
    print("Batch rename complete for all datasets!")