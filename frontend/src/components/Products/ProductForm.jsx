import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  MenuItem,
  Slide,
  Typography,
  Grid,
  Box,
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

// Transition component for dialog
const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

function ProductForm({
  open,
  handleClose,
  onSubmit,
  selectedProduct,
  categories = [],
  mode = "form",
  onConfirm,
  productName,
}) {
  const initialFormState = {
    name: "",
    category_id: "",
    brand: "",
    model: "",
    sync_product: "disable",
    image: "",
    price: "",
    stock: "",
  };

  const [formData, setFormData] = useState(initialFormState);
  const [imagePreview, setImagePreview] = useState(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // Reset form when modal is opened/closed
  useEffect(() => {
    if (!open) {
      // Reset form when modal is closed
      setFormData(initialFormState);
      setImagePreview(null);
      setUploadError("");
      setIsUploading(false);
    }
  }, [open]);

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

  const validateFile = (file) => {
    // Check file type
    const validTypes = ["image/jpeg", "image/png", "image/gif"];
    if (!validTypes.includes(file.type)) {
      setUploadError("Please upload a valid image file (JPEG, PNG, or GIF)");
      return false;
    }

    // Check file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      setUploadError("File size must be less than 5MB");
      return false;
    }

    setUploadError("");
    return true;
  };

  // Handle image upload
  const handleImageUpload = useCallback((file) => {
    if (!file) return;

    if (validateFile(file)) {
      setIsUploading(true);
      setFormData((prev) => ({ ...prev, image: file }));
      setImagePreview(URL.createObjectURL(file));
      setIsUploading(false);
    }
  }, []);

  // Handle drag and drop events
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragActive(false);

      const file = e.dataTransfer.files[0];
      handleImageUpload(file);
    },
    [handleImageUpload]
  );

  // Handle file input change
  const handleFileInputChange = (event) => {
    const file = event.target.files[0];
    handleImageUpload(file);
  };

  // Handle image removal
  const handleRemoveImage = () => {
    setFormData((prev) => ({ ...prev, image: "" }));
    setImagePreview(null);
    setUploadError("");

    // Reset the file input if it exists
    const fileInput = document.getElementById("image-upload");
    if (fileInput) {
      fileInput.value = "";
    }
  };

  useEffect(() => {
    if (selectedProduct && selectedProduct.product_id) {
      // Only set form data if we have a valid selected product
      const initialFormData = {
        name: selectedProduct.name || "",
        category_id: selectedProduct.category_id || "",
        brand: selectedProduct.brand || "",
        model: selectedProduct.model || "",
        sync_product: selectedProduct.sync_product || "disable",
        image: selectedProduct.image || "",
        price: selectedProduct.price || "",
        stock: selectedProduct.stock || "",
      };
      setFormData(initialFormData);

      // Set image preview for existing product
      if (selectedProduct.image) {
        const imageUrl = `http://localhost:5000/uploads/uploadProducts/${selectedProduct.image}`;
        setImagePreview(imageUrl);
      }
    }
  }, [selectedProduct]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = () => {
    onSubmit(formData);
    handleClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      TransitionComponent={Transition}
      fullWidth
    >
      {mode === "delete" ? (
        <>
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete the product "{productName}"?
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose} color="primary">
              Cancel
            </Button>
            <Button onClick={onConfirm} color="error" variant="contained">
              Delete
            </Button>
          </DialogActions>
        </>
      ) : (
        <>
          <DialogTitle>
            {selectedProduct ? "Edit Product" : "Add Product"}
          </DialogTitle>
          <DialogContent>
            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", sm: "row" },
                gap: 1,
              }}
            >
              <TextField
                label="Product Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                margin="dense"
                required
                sx={{ width: { xs: "100%", sm: "50%" } }}
              />
              <TextField
                select
                label="Category"
                name="category_id"
                value={formData.category_id}
                onChange={handleChange}
                sx={{ width: { xs: "100%", sm: "50%" } }}
                margin="dense"
                required
              >
                {categories.map((cat) => (
                  <MenuItem key={cat.category_id} value={cat.category_id}>
                    {cat.name}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", sm: "row" },
                gap: 1,
              }}
            >
              <TextField
                label="Brand"
                name="brand"
                value={formData.brand}
                onChange={handleChange}
                sx={{ width: { xs: "100%", sm: "50%" } }}
                margin="dense"
              />
              <TextField
                label="Model"
                name="model"
                value={formData.model}
                onChange={handleChange}
                sx={{ width: { xs: "100%", sm: "50%" } }}
                margin="dense"
              />
            </Box>
            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", sm: "row" },
                gap: 1,
              }}
            >
              <TextField
                select
                label="Sync Product"
                name="sync_product"
                value={formData.sync_product}
                onChange={handleChange}
                sx={{ width: { xs: "100%", sm: "50%" } }}
                margin="dense"
              >
                <MenuItem value="enable">Enable</MenuItem>
                <MenuItem value="disable">Disable</MenuItem>
              </TextField>
              <TextField
                label="Stock"
                name="stock"
                type="number"
                value={formData.stock}
                onChange={handleChange}
                sx={{ width: { xs: "100%", sm: "50%" } }}
                margin="dense"
              />
            </Box>
            <TextField
              label="Price"
              name="price"
              type="number"
              value={formData.price}
              onChange={handleChange}
              fullWidth
              margin="dense"
              inputProps={{ step: "0.01" }}
            />

            <Box sx={{ mt: 2, mb: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Product Image
              </Typography>
              {!imagePreview ? (
                <DropZone
                  onDrop={handleDrop}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  isDragActive={isDragActive}
                  hasError={!!uploadError}
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileInputChange}
                    style={{ display: "none" }}
                    id="image-upload"
                  />
                  <label
                    htmlFor="image-upload"
                    style={{ width: "100%", textAlign: "center" }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 2,
                      }}
                    >
                      <CloudUploadIcon
                        sx={{
                          fontSize: 64,
                          color: (theme) =>
                            isDragActive
                              ? theme.palette.primary.main
                              : "text.secondary",
                          transition: "color 0.3s ease",
                        }}
                      />
                      <Typography
                        variant="body1"
                        color="text.secondary"
                        sx={{
                          maxWidth: "80%",
                          textAlign: "center",
                        }}
                      >
                        {isDragActive
                          ? "Drop the image here"
                          : "Drag and drop an image here, or click to select"}
                      </Typography>
                      {uploadError && (
                        <Typography
                          color="error"
                          variant="caption"
                          sx={{
                            mt: 1,
                            textAlign: "center",
                          }}
                        >
                          {uploadError}
                        </Typography>
                      )}
                    </Box>
                  </label>
                </DropZone>
              ) : (
                <ImagePreview>
                  {isUploading ? (
                    <Box
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      height="100%"
                    >
                      <CircularProgress />
                    </Box>
                  ) : (
                    <>
                      <img src={imagePreview} alt="Preview" />
                      <Box className="overlay">
                        <IconButton
                          onClick={handleRemoveImage}
                          sx={{ color: "white" }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </>
                  )}
                </ImagePreview>
              )}
            </Box>

            <TextField
              label="Image Filename"
              name="image"
              value={formData.image}
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
              {selectedProduct ? "Update" : "Add"}
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}

export default ProductForm;
