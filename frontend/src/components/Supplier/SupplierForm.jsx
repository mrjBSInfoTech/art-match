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

function SupplierForm({
  open,
  handleClose,
  onSubmit,
  selectedSupplier,
  mode = "form",
}) {
  const [formData, setFormData] = useState({
    name: "",
    number: "",
    facebook_link: "",
    email: "",
  });

  // Prefill data when editing
  useEffect(() => {
    if (selectedSupplier) {
      setFormData({
        name: selectedSupplier.name || "",
        number: selectedSupplier.number || "",
        facebook_link: selectedSupplier.facebook_link || "",
        email: selectedSupplier.email || "",
      });
    } else {
      setFormData({
        name: "",
        number: "",
        facebook_link: "",
        email: "",
      });
    }
  }, [selectedSupplier]);

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
  };

  const handleSubmit = () => {
    onSubmit(formData);
    handleClose();
  };

  // 🔴 Delete confirmation submit
  const handleDelete = () => {
    onSubmit(selectedSupplier);
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
          <DialogTitle>Delete Supplier</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete{" "}
              <strong>{selectedSupplier?.name}</strong>?
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
            {selectedSupplier ? "Edit Supplier" : "Add Supplier"}
          </DialogTitle>
          <DialogContent>
            <TextField
              label="Supplier Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              fullWidth
              margin="dense"
            />
            <TextField
              label="Supplier Number"
              name="number"
              value={formData.number}
              onChange={handleChange}
              fullWidth
              margin="dense"
            />
            <TextField
              label="Supplier Facebook Link"
              name="facebook_link"
              value={formData.facebook_link}
              onChange={handleChange}
              fullWidth
              margin="dense"
            />
            <TextField
              label="Supplier Email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              fullWidth
              margin="dense"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose} color="secondary">
              Cancel
            </Button>
            <Button onClick={handleSubmit} variant="contained" color="primary">
              {selectedSupplier ? "Update" : "Add"}
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}

export default SupplierForm;
