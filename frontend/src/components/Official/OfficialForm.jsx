import React, { useState, useEffect } from "react";
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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
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

// Helper function to get local date string (YYYY-MM-DD) without timezone conversion
const getLocalDateString = (dateValue = null) => {
  let date;
  
  if (dateValue) {
    // If a date value is provided, parse it
    if (dateValue instanceof Date) {
      date = dateValue;
    } else {
      // If it's a string like "2024-03-13" or "2024-03-13T00:00:00", just extract the date part
      const dateStr = String(dateValue);
      if (dateStr.includes('T')) {
        return dateStr.split('T')[0]; // Already in correct format, just extract
      }
      return dateStr; // Already in YYYY-MM-DD format
    }
  } else {
    // Use today's local date
    date = new Date();
  }
  
  // Get local date components (not UTC)
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

function OfficialForm({
  open,
  handleClose,
  onSubmit,
  selectedOfficial,
  mode = "form",
}) {
  // Helper function to get local date without timezone conversion
  const getLocalDateString = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const [formData, setFormData] = useState({
    first_name: "",
    middle_name: "",
    last_name: "",
    dob: "",
    position: "",
    email: "",
    phone_number: "",
    address: "",
    image: "",
  });
  const [error, setError] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // Prefill data when editing
  useEffect(() => {
    if (selectedOfficial) {
      setFormData({
        first_name: selectedOfficial.first_name
          ? String(selectedOfficial.first_name)
          : "",
        middle_name: selectedOfficial.middle_name
          ? String(selectedOfficial.middle_name)
          : "",
        last_name: selectedOfficial.last_name
          ? String(selectedOfficial.last_name)
          : "",
        dob: selectedOfficial.dob 
          ? getLocalDateString(selectedOfficial.dob)
          : "",
        position: selectedOfficial.position
          ? String(selectedOfficial.position)
          : "",
        email: selectedOfficial.email ? String(selectedOfficial.email) : "",
        phone_number: selectedOfficial.phone_number
          ? String(selectedOfficial.phone_number)
          : "",
        address: selectedOfficial.address
          ? String(selectedOfficial.address)
          : "",
        image: selectedOfficial.image ? String(selectedOfficial.image) : "",
      });

      // Set image preview for existing official
      if (selectedOfficial.image) {
        setImagePreview(selectedOfficial.image);
      } else {
        setImagePreview(null);
      }
    } else {
      setFormData({
        first_name: "",
        middle_name: "",
        last_name: "",
        dob: "",
        position: "",
        email: "",
        phone_number: "",
        address: "",
        image: "",
      });
      setImagePreview(null);
    }
    setError(""); // Clear error when opening dialog
  }, [selectedOfficial, open]);

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
    if (!formData.position.trim()) {
      setError("❌ Position is required");
      return;
    }
    if (!formData.dob) {
      setError("❌ Date of birth is required");
      return;
    }
    if (!formData.email.trim()) {
      setError("❌ Email is required");
      return;
    }
    if (!formData.phone_number.trim()) {
      setError("❌ Phone number is required");
      return;
    }
    if (!formData.address.trim()) {
      setError("❌ Address is required");
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
          {selectedOfficial ? "Edit Official" : "Add Official"}
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

              {/* Phone Number */}
              <TextField
                label="Phone Number"
                name="phone_number"
                value={formData.phone_number}
                onChange={handleChange}
                fullWidth
                margin="dense"
              />

              {/* Position */}
              <FormControl fullWidth margin="dense">
                <InputLabel>Position</InputLabel>
                <Select
                  label="Position"
                  name="position"
                  value={formData.position}
                  onChange={handleChange}
                >
                  <MenuItem value="Barangay Captain">Barangay Captain</MenuItem>
                  <MenuItem value="Secretary">Secretary</MenuItem>
                  <MenuItem value="Treasurer">Treasurer</MenuItem>
                  <MenuItem value="Kagawad">Kagawad</MenuItem>
                  <MenuItem value="Barangay Tanod">Barangay Tanod</MenuItem>
                  <MenuItem value="Health Worker">SK Chairman</MenuItem>
                  <MenuItem value="Midwife">SK Kagawad</MenuItem>
                </Select>
              </FormControl>

              {/* Address */}
              <TextField
                label="Address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                fullWidth
                margin="dense"
                multiline
                rows={1}
                sx={{ gridColumn: "2 / -1" }}
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
                    alt="Official Preview"
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
            {selectedOfficial ? "Update" : "Add"}
          </Button>
        </DialogActions>
      </>
    </Dialog>
  );
}

export default OfficialForm;
