import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Slide,
  Typography,
  Snackbar,
  Alert,
} from "@mui/material";

// Animation transition
const Transition = React.forwardRef(function Transition(props, ref) {
  return (
    <Slide
      direction="up"
      ref={ref}
      {...props}
      timeout={500}
      easing={{
        enter: "cubic-bezier(0.4, 0, 0.2, 1)",
        exit: "ease-out",
      }}
    />
  );
});

function CategoryForm({
  open,
  handleClose,
  onSubmit,
  selectedCategory,
  mode = "form",
}) {
  const [formData, setFormData] = useState({
    name: "",
  });
  const [error, setError] = useState("");

  // Prefill data when editing
  useEffect(() => {
    if (selectedCategory) {
      setFormData({
        name: selectedCategory.name || "",
      });
    } else {
      setFormData({ name: "" });
    }
    setError(""); // Clear error when opening dialog
  }, [selectedCategory, open]);

  // Handle Enter key for both delete and submit
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Enter" && open) {
        event.preventDefault();
        if (mode === "delete") {
          handleDelete();
        } else {
          handleSubmit();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, mode, formData]);

  // Handle Esacape key for both delete and submit
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        handleClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mode, formData]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError(""); // Clear error when user types
  };

  const handleSubmit = () => {
    // Validate input
    if (!formData.name.trim()) {
      setError("❌ Category name is required");
      return;
    }
    onSubmit(formData);
    handleClose();
  };

  // 🔴 Delete confirmation submit
  const handleDelete = () => {
    onSubmit(selectedCategory);
    handleClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      TransitionComponent={Transition}
      keepMounted
    >
      {mode === "delete" ? (
        <>
          <DialogTitle>Delete Category</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete{" "}
              <strong>{selectedCategory?.name}</strong>?
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose} color="secondary">
              Cancel
            </Button>
            <Button onClick={handleDelete} color="error" variant="contained">
              Delete
            </Button>
          </DialogActions>
        </>
      ) : (
        <>
          <DialogTitle>
            {selectedCategory ? "Edit Category" : "Add Category"}
          </DialogTitle>
          <DialogContent>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            <TextField
              label="Category Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              sx={{ width: "300px" }}
              margin="dense"
              autoFocus
              error={!!error}
              helperText={error ? "Please enter a category name" : ""}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose} color="secondary">
              Cancel
            </Button>
            <Button onClick={handleSubmit} variant="contained" color="primary">
              {selectedCategory ? "Update" : "Add"}
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}

export default CategoryForm;
