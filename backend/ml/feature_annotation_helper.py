import os
import json
import tkinter as tk
from tkinter import ttk, messagebox
from pathlib import Path

import pandas as pd
from PIL import Image, ImageTk


# ==========================================================
# PATHS
# ==========================================================

BASE_DIR = Path(__file__).resolve().parent

FEATURES_DIR = BASE_DIR / "datasets" / "features"

TRAIN_CSV = FEATURES_DIR / "train_annotations.csv"
VAL_CSV = FEATURES_DIR / "val_annotations.csv"

TRAIN_DIR = FEATURES_DIR / "train"
VAL_DIR = FEATURES_DIR / "val"

TRAIN_PROGRESS = FEATURES_DIR / "train_annotation_progress.json"
VAL_PROGRESS = FEATURES_DIR / "val_annotation_progress.json"


# ==========================================================
# IMAGE SETTINGS
# ==========================================================

PREVIEW_WIDTH = 650
PREVIEW_HEIGHT = 500


# ==========================================================
# ANNOTATION HELPER
# ==========================================================

class FeatureAnnotationHelper:

    def __init__(self, root):

        self.root = root
        self.root.title("ArtMatch Feature Annotation Helper")
        self.root.geometry("1100x800")
        self.root.minsize(900, 650)

        self.df = None
        self.feature_names = []
        self.image_index = 0
        self.reviewed = set()
        self.visible_indices = []
        self.image_paths = []

        self.image_photo = None

        self.check_vars = {}

        self.current_csv = None
        self.current_dataset_dir = None
        self.current_progress_file = None

        self.build_dataset_selector()

    # ======================================================
    # DATASET SELECTOR
    # ======================================================

    def build_dataset_selector(self):

        container = ttk.Frame(self.root, padding=20)
        container.pack(fill="both", expand=True)

        title = ttk.Label(
            container,
            text="ArtMatch Feature Annotation Helper",
            font=("Arial", 22, "bold")
        )
        title.pack(pady=(20, 10))

        subtitle = ttk.Label(
            container,
            text="Choose which dataset you want to annotate.",
            font=("Arial", 12)
        )
        subtitle.pack(pady=(0, 30))

        train_button = ttk.Button(
            container,
            text="Annotate TRAIN dataset",
            command=lambda: self.start_dataset("train")
        )
        train_button.pack(pady=10, ipadx=30, ipady=10)

        val_button = ttk.Button(
            container,
            text="Annotate VALIDATION dataset",
            command=lambda: self.start_dataset("val")
        )
        val_button.pack(pady=10, ipadx=30, ipady=10)

        info = ttk.Label(
            container,
            text=(
                "TRAIN = 80 images per feature\n"
                "VALIDATION = 20 images per feature"
            ),
            justify="center"
        )
        info.pack(pady=30)

    # ======================================================
    # START DATASET
    # ======================================================

    def start_dataset(self, dataset_type):

        if dataset_type == "train":
            self.current_csv = TRAIN_CSV
            self.current_dataset_dir = TRAIN_DIR
            self.current_progress_file = TRAIN_PROGRESS

        else:
            self.current_csv = VAL_CSV
            self.current_dataset_dir = VAL_DIR
            self.current_progress_file = VAL_PROGRESS

        if not self.current_csv.exists():

            messagebox.showerror(
                "CSV not found",
                f"Could not find:\n\n{self.current_csv}"
            )
            return

        if not self.current_dataset_dir.exists():

            messagebox.showerror(
                "Dataset folder not found",
                f"Could not find:\n\n{self.current_dataset_dir}"
            )
            return

        self.load_csv()
        self.load_progress()
        self.build_annotation_screen()

        self.find_first_unreviewed()

        self.show_current_image()

    # ======================================================
    # LOAD CSV
    # ======================================================

    def load_csv(self):

        self.df = pd.read_csv(self.current_csv)

        if "image_path" not in self.df.columns:

            raise ValueError(
                "The CSV must contain an 'image_path' column."
            )

        self.feature_names = [
            column
            for column in self.df.columns
            if column != "image_path"
        ]
        self.image_paths = [
            str(path).replace("\\", "/")
            for path in self.df["image_path"]
        ]
        self.visible_indices = list(range(len(self.df)))

        # Make sure all feature columns are numeric
        for feature in self.feature_names:
            self.df[feature] = (
                pd.to_numeric(
                    self.df[feature],
                    errors="coerce"
                )
                .fillna(0)
                .astype(int)
            )

    # ======================================================
    # LOAD PROGRESS
    # ======================================================

    def load_progress(self):

        if not self.current_progress_file.exists():

            self.reviewed = set()
            return

        try:

            with open(
                self.current_progress_file,
                "r",
                encoding="utf-8"
            ) as file:

                data = json.load(file)

            self.reviewed = set(data)

        except Exception:

            self.reviewed = set()

    # ======================================================
    # SAVE PROGRESS
    # ======================================================

    def save_progress(self):

        with open(
            self.current_progress_file,
            "w",
            encoding="utf-8"
        ) as file:

            json.dump(
                sorted(list(self.reviewed)),
                file,
                indent=2
            )

    # ======================================================
    # BUILD ANNOTATION SCREEN
    # ======================================================

    def build_annotation_screen(self):

        for widget in self.root.winfo_children():
            widget.destroy()

        # -------------------------------
        # TOP BAR
        # -------------------------------

        top = ttk.Frame(
            self.root,
            padding=(15, 10)
        )

        top.pack(fill="x")

        self.title_label = ttk.Label(
            top,
            text="Feature Annotation",
            font=("Arial", 18, "bold")
        )

        self.title_label.pack(side="left")

        self.progress_label = ttk.Label(
            top,
            text="",
            font=("Arial", 11)
        )

        self.progress_label.pack(side="right")

        browser = ttk.LabelFrame(self.root, text="Find images", padding=10)
        browser.pack(fill="x", padx=15)
        controls = ttk.Frame(browser)
        controls.pack(fill="x")
        ttk.Label(controls, text="Folder:").pack(side="left")
        self.folder_var = tk.StringVar(value="All folders")
        folders = sorted({path.rsplit("/", 1)[0] if "/" in path else ""
                          for path in self.image_paths})
        self.folder_selector = ttk.Combobox(
            controls, textvariable=self.folder_var,
            values=["All folders", *folders], state="readonly", width=24
        )
        self.folder_selector.pack(side="left", padx=(5, 15))
        self.folder_selector.bind("<<ComboboxSelected>>", self.filter_images)
        ttk.Label(controls, text="Filename or path:").pack(side="left")
        self.search_var = tk.StringVar()
        self.search_entry = ttk.Entry(controls, textvariable=self.search_var)
        self.search_entry.pack(side="left", fill="x", expand=True, padx=5)
        self.search_timer = None
        self.search_var.trace_add("write", self.schedule_search)
        ttk.Button(controls, text="Clear", command=self.clear_search).pack(side="left")
        results = ttk.Frame(browser)
        results.pack(fill="x", pady=(8, 0))
        self.image_list = tk.Listbox(results, height=4, exportselection=False)
        result_scroll = ttk.Scrollbar(results, command=self.image_list.yview)
        self.image_list.configure(yscrollcommand=result_scroll.set)
        self.image_list.pack(side="left", fill="x", expand=True)
        result_scroll.pack(side="right", fill="y")
        self.image_list.bind("<<ListboxSelect>>", self.select_image)
        self.match_label = ttk.Label(browser)
        self.match_label.pack(anchor="w")
        self.filter_images()

        # -------------------------------
        # MAIN AREA
        # -------------------------------

        main = ttk.Frame(
            self.root,
            padding=15
        )

        main.pack(
            fill="both",
            expand=True
        )

        main.columnconfigure(0, weight=3)
        main.columnconfigure(1, weight=2)
        main.rowconfigure(0, weight=1)

        # -------------------------------
        # IMAGE AREA
        # -------------------------------

        image_frame = ttk.LabelFrame(
            main,
            text="Artwork",
            padding=10
        )

        image_frame.grid(
            row=0,
            column=0,
            sticky="nsew",
            padx=(0, 10)
        )

        image_frame.rowconfigure(0, weight=1)
        image_frame.columnconfigure(0, weight=1)

        self.image_label = ttk.Label(
            image_frame,
            anchor="center"
        )

        self.image_label.grid(
            row=0,
            column=0,
            sticky="nsew"
        )

        self.filename_label = ttk.Label(
            image_frame,
            text="",
            font=("Arial", 11, "bold"),
            anchor="center"
        )

        self.filename_label.grid(
            row=1,
            column=0,
            pady=10
        )

        # -------------------------------
        # FEATURES AREA
        # -------------------------------

        feature_frame = ttk.LabelFrame(
            main,
            text="Select all features actually visible in the artwork",
            padding=10
        )

        feature_frame.grid(
            row=0,
            column=1,
            sticky="nsew"
        )

        feature_canvas = tk.Canvas(
            feature_frame,
            highlightthickness=0
        )

        scrollbar = ttk.Scrollbar(
            feature_frame,
            orient="vertical",
            command=feature_canvas.yview
        )

        feature_canvas.configure(
            yscrollcommand=scrollbar.set
        )

        scrollbar.pack(
            side="right",
            fill="y"
        )

        feature_canvas.pack(
            side="left",
            fill="both",
            expand=True
        )

        feature_inner = ttk.Frame(feature_canvas)

        feature_canvas.create_window(
            (0, 0),
            window=feature_inner,
            anchor="nw"
        )

        feature_inner.bind(
            "<Configure>",
            lambda event: feature_canvas.configure(
                scrollregion=feature_canvas.bbox("all")
            )
        )

        # Two columns
        for index, feature in enumerate(self.feature_names):

            row = index // 2
            column = index % 2

            variable = tk.IntVar(value=0)

            check = ttk.Checkbutton(
                feature_inner,
                text=feature.replace("_", " ").title(),
                variable=variable
            )

            check.grid(
                row=row,
                column=column,
                sticky="w",
                padx=10,
                pady=6
            )

            self.check_vars[feature] = variable

        # -------------------------------
        # BOTTOM BUTTONS
        # -------------------------------

        bottom = ttk.Frame(
            self.root,
            padding=15
        )

        bottom.pack(fill="x")

        previous_button = ttk.Button(
            bottom,
            text="← Previous",
            command=self.previous_image
        )

        previous_button.pack(
            side="left",
            padx=5
        )

        skip_button = ttk.Button(
            bottom,
            text="Skip",
            command=self.skip_image
        )

        skip_button.pack(
            side="left",
            padx=5
        )

        save_button = ttk.Button(
            bottom,
            text="Save & Next →",
            command=self.save_and_next
        )

        save_button.pack(
            side="right",
            padx=5
        )

        # Keyboard shortcuts
        self.root.bind(
            "<Right>",
            lambda event: self.annotation_shortcut(event, self.save_and_next)
        )

        self.root.bind(
            "<Left>",
            lambda event: self.annotation_shortcut(event, self.previous_image)
        )

        self.root.bind(
            "<space>",
            lambda event: self.annotation_shortcut(event, self.save_and_next)
        )

    def annotation_shortcut(self, event, action):
        if isinstance(event.widget, (tk.Entry, ttk.Entry, ttk.Combobox, tk.Listbox)):
            return
        action()
        return "break"

    def schedule_search(self, *_):
        if self.search_timer is not None:
            self.root.after_cancel(self.search_timer)
        self.search_timer = self.root.after(150, self.filter_images)

    def clear_search(self):
        self.folder_var.set("All folders")
        self.search_var.set("")
        self.filter_images()

    def filter_images(self, event=None):
        if self.search_timer is not None:
            self.root.after_cancel(self.search_timer)
            self.search_timer = None
        folder = self.folder_var.get()
        query = self.search_var.get().strip().replace("\\", "/").casefold()
        self.visible_indices = [
            index for index, path in enumerate(self.image_paths)
            if (folder == "All folders" or
                (path.rsplit("/", 1)[0] if "/" in path else "") == folder)
            and query in path.casefold()
        ]
        self.image_list.delete(0, tk.END)
        if self.visible_indices:
            self.image_list.insert(tk.END, *[
                self.image_paths[index] for index in self.visible_indices
            ])
        self.match_label.config(text=f"{len(self.visible_indices)} matching images — select an image to open it")
        self.sync_image_selection()

    def sync_image_selection(self):
        self.image_list.selection_clear(0, tk.END)
        if self.image_index in self.visible_indices:
            position = self.visible_indices.index(self.image_index)
            self.image_list.selection_set(position)
            self.image_list.see(position)

    def select_image(self, event=None):
        selection = self.image_list.curselection()
        if selection:
            index = self.visible_indices[selection[0]]
            if index != self.image_index:
                self.image_index = index
                self.show_current_image()

    def move_image(self, direction):
        if not self.visible_indices:
            messagebox.showinfo("No matches", "Choose a folder or change the search to find images.")
            return
        if self.image_index in self.visible_indices:
            position = self.visible_indices.index(self.image_index) + direction
        else:
            position = 0 if direction > 0 else len(self.visible_indices) - 1
        if 0 <= position < len(self.visible_indices):
            self.image_index = self.visible_indices[position]
            self.show_current_image()
        else:
            messagebox.showinfo("End of results", "You have reached the end of the matching images.")

    # ======================================================
    # FIND FIRST UNREVIEWED
    # ======================================================

    def find_first_unreviewed(self):

        for index in range(len(self.df)):

            image_path = self.df.iloc[index]["image_path"]

            if image_path not in self.reviewed:

                self.image_index = index
                return

        self.image_index = 0

    # ======================================================
    # GET IMAGE PATH
    # ======================================================

    def get_current_image_path(self):

        relative_path = str(
            self.df.iloc[self.image_index]["image_path"]
        )

        return self.current_dataset_dir / relative_path

    # ======================================================
    # SHOW IMAGE
    # ======================================================

    def show_current_image(self):

        if len(self.df) == 0:
            return

        row = self.df.iloc[self.image_index]
        self.sync_image_selection()

        image_path = self.get_current_image_path()

        self.progress_label.config(
            text=(
                f"{self.image_index + 1} / {len(self.df)}   "
                f"Reviewed: {len(self.reviewed)}"
            )
        )

        self.filename_label.config(
            text=str(row["image_path"])
        )

        # Clear / update checkboxes
        for feature in self.feature_names:

            value = int(row[feature])

            self.check_vars[feature].set(value)

        # Load image
        try:

            image = Image.open(image_path).convert("RGB")

            image.thumbnail(
                (
                    PREVIEW_WIDTH,
                    PREVIEW_HEIGHT
                ),
                Image.Resampling.LANCZOS
            )

            self.image_photo = ImageTk.PhotoImage(image)

            self.image_label.config(
                image=self.image_photo,
                text=""
            )

        except Exception as error:

            self.image_label.config(
                text=f"Unable to load image:\n{error}",
                image=""
            )

    # ======================================================
    # SAVE CURRENT ANNOTATION
    # ======================================================

    def save_current(self):

        for feature in self.feature_names:

            self.df.at[
                self.image_index,
                feature
            ] = self.check_vars[feature].get()

        image_path = str(
            self.df.iloc[self.image_index]["image_path"]
        )

        self.reviewed.add(image_path)

        # Save CSV immediately
        self.df.to_csv(
            self.current_csv,
            index=False
        )

        # Save progress separately
        self.save_progress()

    # ======================================================
    # SAVE & NEXT
    # ======================================================

    def save_and_next(self):

        if self.df.empty:
            return
        self.save_current()
        self.move_image(1)

    # ======================================================
    # SKIP
    # ======================================================

    def skip_image(self):
        self.move_image(1)

    # ======================================================
    # PREVIOUS
    # ======================================================

    def previous_image(self):
        self.move_image(-1)


# ==========================================================
# RUN
# ==========================================================

if __name__ == "__main__":

    root = tk.Tk()

    try:
        style = ttk.Style()

        if "vista" in style.theme_names():
            style.theme_use("vista")

    except Exception:
        pass

    app = FeatureAnnotationHelper(root)

    root.mainloop()
