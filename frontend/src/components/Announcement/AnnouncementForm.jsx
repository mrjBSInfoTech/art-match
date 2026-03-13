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

function AnnouncementForm({
  open,
  handleClose,
  onSubmit,
  selectedAnnouncement,
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
    title: "",
    description: "",
    date_posted: getLocalDateString(),
    file: null,
    file_name: "",
  });
  const [error, setError] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // Prefill data when editing
  useEffect(() => {
    if (selectedAnnouncement) {      
      setFormData({
        title: selectedAnnouncement.title ? String(selectedAnnouncement.title) : "",
        description: selectedAnnouncement.description ? String(selectedAnnouncement.description) : "",
        date_posted: selectedAnnouncement.date_posted ? getLocalDateString(selectedAnnouncement.date_posted) : "",
        file: null,
        file_name: selectedAnnouncement.image ? String(selectedAnnouncement.image) : "",
      });

      // Set image preview for existing announcement
      if (selectedAnnouncement.image) {
        setImagePreview(`http://localhost:5000/uploads/uploadAnnouncement/${selectedAnnouncement.image}`);
      } else {
        setImagePreview(null);
      }
    } else {
      const newDate = getLocalDateString();
      console.log("Create mode - new date:", newDate);
      
      setFormData({
        title: "",
        description: "",
        date_posted: newDate,
        file: null,
        file_name: "",
      });
      setImagePreview(null);
    }
    setError(""); // Clear error when opening dialog
  }, [selectedAnnouncement, open]);

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
      // Store the actual File object
      setFormData({ 
        ...formData, 
        file: file,
        file_name: file.name 
      });
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      
      // Store the actual File object
      setFormData({ 
        ...formData, 
        file: file,
        file_name: file.name 
      });
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = () => {
    // Validate required fields
    if (!formData.title.trim()) {
      setError("Title is required");
      return;
    }
    if (!formData.description.trim()) {
      setError("Description is required");
      return;
    }
    if (!formData.date_posted) {
      setError("Date posted is required");
      return;
    }
    if (!formData.file && !selectedAnnouncement) {
      setError("Image file is required");
      return;
    }

    // Pass formData with file object to parent
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
        sx: { minWidth: "600px" },
      }}
    >
      <>
        <DialogTitle>
          {selectedAnnouncement ? "Edit Announcement" : "Add Announcement"}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {/* Title */}
            <TextField
              label="Title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              fullWidth
              margin="dense"
              autoFocus
            />

            {/* Description */}
            <TextField
              label="Description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              fullWidth
              margin="dense"
              multiline
              rows={4}
            />

            {/* Date Posted */}
            <TextField
              type="date"
              label="Date Posted"
              name="date_posted"
              value={formData.date_posted}
              onChange={handleChange}
              fullWidth
              margin="dense"
              InputLabelProps={{
                shrink: true,
              }}
              sx={{display: "none"}}
            />

            {/* Image Upload Section */}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <Typography variant="subtitle2">Image</Typography>
              
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
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Announcement Preview"
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
            {selectedAnnouncement ? "Update" : "Add"}
          </Button>
        </DialogActions>
      </>
    </Dialog>
  );
}

export default AnnouncementForm;
