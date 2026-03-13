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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
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

function FilesForm({
  open,
  handleClose,
  onSubmit,
  selectedFile,
  mode = "form",
}) {
  const [formData, setFormData] = useState({
    file_type: "pdf",
    file: "",
    file_name: "",
  });
  const [error, setError] = useState("");
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // Prefill data when editing
  useEffect(() => {
    if (selectedFile) {
      setFormData({
        file_type: selectedFile.file_type ? String(selectedFile.file_type) : "pdf",
        file: selectedFile.file ? String(selectedFile.file) : "",
        file_name: selectedFile.file_name ? String(selectedFile.file_name) : "",
      });
    } else {
      setFormData({
        file_type: "pdf",
        file: "",
        file_name: "",
      });
    }
    setError(""); // Clear error when opening dialog
  }, [selectedFile, open]);

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
        setFormData({ 
          ...formData, 
          file: reader.result,
          file_name: file.name 
        });
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
      const reader = new FileReader();

      reader.onloadend = () => {
        setFormData({ 
          ...formData, 
          file: reader.result,
          file_name: file.name 
        });
      };

      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = () => {
    // Validate required fields
    if (!formData.file_type) {
      setError("❌ Please select a conversion format (PDF or Docs)");
      return;
    }
    if (!formData.file.trim()) {
      setError("❌ File is required");
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
        sx: { minWidth: "400px" },
      }}
    >
      <>
        <DialogTitle>
          {selectedFile ? "Edit File" : "Add File"}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* INPUT GRID */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" },
              gap: 2,
            }}
          >
            {/* File Type Dropdown */}
            <FormControl fullWidth margin="dense" sx={{ gridColumn: "1 / -1" }} autoFocus>
              <InputLabel>Convert To</InputLabel>
              <Select
                name="file_type"
                value={formData.file_type}
                onChange={handleChange}
                label="Convert To"
              >
                <MenuItem value="pdf">PDF</MenuItem>
                <MenuItem value="docs">Google Docs</MenuItem>
              </Select>
            </FormControl>

            {/* File Upload with Drag and Drop */}
            <Box
              sx={{ gridColumn: "1 / -1" }}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <DropZone isDragActive={isDragActive}>
                <CloudUploadIcon sx={{ fontSize: 48, mb: 1, color: "primary.main" }} />
                <Typography variant="h6">
                  {isDragActive ? "Drop the file here" : "Drag and drop file here"}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1, mb: 2 }}>
                  or
                </Typography>
                <input
                  type="file"
                  onChange={handleFileChange}
                  style={{
                    padding: "8px 16px",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                />
              </DropZone>

              {/* File Name Display */}
              {formData.file_name && (
                <Box sx={{ mt: 2, p: 1, backgroundColor: "#f5f5f5", borderRadius: 1 }}>
                  <Typography variant="body2">
                    <strong>Selected File:</strong> {formData.file_name}
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="secondary">
            Cancel
          </Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            {selectedFile ? "Update" : "Add"}
          </Button>
        </DialogActions>
      </>
    </Dialog>
  );
}

export default FilesForm;
