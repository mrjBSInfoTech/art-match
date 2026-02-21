import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Slide,
  Alert,
  Box,
  Typography,
  IconButton,
  CircularProgress,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DeleteIcon from "@mui/icons-material/Delete";
import { styled } from "@mui/material/styles";

// Styled component for the drop zone
const DropZone = styled(Box)(({ theme, isDragActive, hasError }) => ({
  width: "100%",
  minHeight: 200,
  border: `2px dashed ${
    hasError
      ? theme.palette.error.main
      : isDragActive
        ? theme.palette.primary.main
        : theme.palette.grey[400]
  }`,
  borderRadius: theme.shape.borderRadius,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: theme.spacing(3),
  cursor: "pointer",
  transition: "all 0.3s ease-in-out",
  backgroundColor: isDragActive ? theme.palette.action.hover : "transparent",
  "&:hover": {
    backgroundColor: theme.palette.action.hover,
  },
}));

// Image preview container
const ImagePreview = styled(Box)(({ theme }) => ({
  width: "100%",
  height: 200,
  position: "relative",
  borderRadius: theme.shape.borderRadius,
  overflow: "hidden",
  marginTop: theme.spacing(1),
  marginBottom: theme.spacing(2),
  "& img": {
    width: "100%",
    height: "100%",
    objectFit: "contain",
  },
  "& .overlay": {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    display: "none",
    alignItems: "center",
    justifyContent: "center",
  },
  "&:hover .overlay": {
    display: "flex",
  },
}));

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

function ResidentsForm({
  open,
  handleClose,
  onSubmit,
  selectedResident,
  mode = "form",
}) {
  const [formData, setFormData] = useState({
    first_name: "",
    middle_name: "",
    last_name: "",
    dob: "",
    address: "",
    phone_number: "",
    email: "",
    image: "",
  });
  const [error, setError] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // Prefill data when editing
  useEffect(() => {
    if (selectedResident) {
      setFormData({
        first_name: selectedResident.first_name ? String(selectedResident.first_name) : "",
        middle_name: selectedResident.middle_name ? String(selectedResident.middle_name) : "",
        last_name: selectedResident.last_name ? String(selectedResident.last_name) : "",
        dob: selectedResident.dob ? String(selectedResident.dob) : "",
        address: selectedResident.address ? String(selectedResident.address) : "",
        phone_number: selectedResident.phone_number ? String(selectedResident.phone_number) : "",
        email: selectedResident.email ? String(selectedResident.email) : "",
        image: selectedResident.image ? String(selectedResident.image) : "",
      });

      // Set image preview for existing resident
      if (selectedResident.image) {
        setImagePreview(selectedResident.image);
      } else {
        setImagePreview(null);
      }
    } else {
      setFormData({
        first_name: "",
        middle_name: "",
        last_name: "",
        dob: "",
        address: "",
        phone_number: "",
        email: "",
        image: "",
      });
      setImagePreview(null);
    }
    setError(""); // Clear error when opening dialog
  }, [selectedResident, open]);

  // Handle Enter key for submit
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Enter" && open) {
        event.preventDefault();
        handleSubmit();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, formData]);

  // Handle Escape key
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
  }, [open]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setError(""); // Clear error when user types
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];

    if (file) {
      const reader = new FileReader();

      reader.onloadend = () => {
        setFormData({ ...formData, image: reader.result });
        setImagePreview(reader.result); // <-- IMPORTANT
      };

      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = () => {
    // Validate required fields
    if (!formData.first_name.trim()) {
      setError("❌ First name is required");
      return;
    }
    if (!formData.last_name.trim()) {
      setError("❌ Last name is required");
      return;
    }
    if (!formData.dob.trim()) {
      setError("❌ Date of birth is required");
      return;
    }
    if (!formData.address.trim()) {
      setError("❌ Address is required");
      return;
    }
    if (!formData.phone_number.trim()) {
      setError("❌ Phone number is required");
      return;
    }
    if (!formData.email.trim()) {
      setError("❌ Email is required");
      return;
    }
    onSubmit(formData);
    handleClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      TransitionComponent={Transition}
      keepMounted
      PaperProps={{
        sx: { minWidth: "1000px" },
      }}
    >
      <>
        <DialogTitle>
          {selectedResident ? "Edit Resident" : "Add Resident"}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ display: "flex", gap: 3 }}>
            {/* LEFT SIDE - INPUT GRID */}
            <Box
              sx={{
                flex: 3,
                display: "grid",
                gridTemplateRows: { xs: "auto", md: "repeat(3, 1fr)" },
                gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
                gridAutoFlow: "row",
                gap: 2,
              }}
            >
              {/* First Name */}
              <TextField
                label="First Name"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                fullWidth
                margin="dense"
                autoFocus
              />

              {/* Middle Name */}
              <TextField
                label="Middle Name"
                name="middle_name"
                value={formData.middle_name}
                onChange={handleChange}
                fullWidth
                margin="dense"
              />

              {/* Last Name */}
              <TextField
                label="Last Name"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                fullWidth
                margin="dense"
              />

              {/* Date of Birth */}
              <TextField
                label="Date of Birth"
                name="dob"
                type="date"
                value={formData.dob}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
                fullWidth
                margin="dense"
              />

              {/* Phone Number */}
              <TextField
                label="Phone Number"
                name="phone_number"
                value={formData.phone_number}
                onChange={handleChange}
                fullWidth
                margin="dense"
              />

              {/* Email */}
              <TextField
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                fullWidth
                margin="dense"
              />

              {/* Address */}
              <TextField
                label="Address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                fullWidth
                margin="dense"
                multiline
                rows={2}
                sx={{ gridColumn: "1 / -1" }}
              />
            </Box>

            {/* Image Upload with Permanent Preview Box */}
            <Box sx={{ flex: 1 }}>
              {/* ALWAYS VISIBLE PREVIEW CONTAINER */}
              <Box
                sx={{
                  width: "100%",
                  height: 200,
                  border: "1px solid #555",
                  borderRadius: 1,
                  mb: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "#ffffff",
                  color: "#aaa",
                }}
              >
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Resident Preview"
                    style={{
                      maxWidth: "100%",
                      maxHeight: "100%",
                      objectFit: "contain",
                    }}
                  />
                ) : (
                  <Typography variant="body2">No Image Uploaded</Typography>
                )}
              </Box>

              {/* Choose File Button */}
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ width: "100%" }}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="secondary">
            Cancel
          </Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            {selectedResident ? "Update" : "Add"}
          </Button>
        </DialogActions>
      </>
    </Dialog>
  );
}

export default ResidentsForm;
