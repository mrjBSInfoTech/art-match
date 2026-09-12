import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Slide,
  Alert,
  Box,
  Typography,
  Stack,
  CircularProgress,
} from "@mui/material";
import { styled } from "@mui/material/styles";

const DropZone = styled(Box, {
  shouldForwardProp: (prop) => prop !== "isDragActive" && prop !== "hasError",
})(({ theme, isDragActive, hasError }) => ({
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

function ArtworkForm({ open, handleClose, onSubmit, selectedArtwork = null }) {
  const [formData, setFormData] = useState({
    title: "",
    art_size: "",
    genre: "",
    price: "",
    description: "",
    image: "",
    file: null,
    date_posted: "",
  });
  const [error, setError] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (selectedArtwork) {
      setFormData({
        title: selectedArtwork.title || "",
        art_size: selectedArtwork.art_size || "",
        genre: selectedArtwork.genre || selectedArtwork.color_used || "",
        price: selectedArtwork.price || "",
        description: selectedArtwork.description || "",
        image: selectedArtwork.image || "",
        file: null,
        date_created: selectedArtwork.date_created || "",
      });
      setImagePreview(selectedArtwork.image || null);
    } else {
      setFormData({
        title: "",
        art_size: "",
        genre: "",
        price: "",
        description: "",
        image: "",
        file: null,
        date_created: "",
      });
      setImagePreview(null);
    }
    setError("");
    setUploadError("");
    setIsSubmitting(false);
  }, [selectedArtwork, open]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setUploadError(`File size exceeds 2MB limit. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB`);
      setImagePreview(null);
      setFormData((prev) => ({ ...prev, image: "", file: null }));
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((prev) => ({ ...prev, image: reader.result, file }));
      setImagePreview(reader.result);
      setUploadError("");
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    if (!formData.title.trim()) {
      setError("Title is required");
      return;
    }
    if (!formData.art_size.trim()) {
      setError("Art size is required");
      return;
    }
    if (!formData.genre.trim()) {
      setError("Genre is required");
      return;
    }
    if (!formData.price || Number(formData.price) <= 0) {
      setError("Price must be greater than zero");
      return;
    }
    if (!selectedArtwork && !formData.file) {
      setError("Artwork image is required");
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit?.({ ...formData, price: Number(formData.price) });
      handleClose();
    } catch (submissionError) {
      setError(submissionError.message || "Unable to save artwork");
    } finally {
      setIsSubmitting(false);
    }
  };

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

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      TransitionComponent={Transition}
      keepMounted
      PaperProps={{
        sx: {
          minWidth: { xs: "92%", sm: "720px" },
          width: "100%",
          borderRadius: 3,
        },
      }}
    >
      <DialogTitle sx={{ fontWeight: 700 }}>
        {selectedArtwork ? "Edit Artwork" : "Add Artwork"}
      </DialogTitle>
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {uploadError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {uploadError}
          </Alert>
        )}

        <Stack spacing={2.5}>
          <DropZone
            isDragActive={isDragActive}
            hasError={Boolean(uploadError)}
            onDragEnter={() => setIsDragActive(true)}
            onDragLeave={() => setIsDragActive(false)}
            onDrop={(event) => {
              event.preventDefault();
              setIsDragActive(false);
              const file = event.dataTransfer.files?.[0];
              if (!file) return;
              const input = document.createElement("input");
              Object.defineProperty(input, "files", { value: [file] });
              handleFileChange({ target: input });
            }}
            onDragOver={(event) => event.preventDefault()}
          >
            {imagePreview ? (
              <Box component="img" src={imagePreview} alt="Preview" sx={{ maxWidth: "100%", maxHeight: 160, objectFit: "contain" }} />
            ) : (
              <>
                <Typography variant="h6" fontWeight={700}>Upload artwork image</Typography>
                <Typography color="text.secondary">PNG, JPG, or WEBP up to 2MB</Typography>
              </>
            )}
          </DropZone>
          <Button variant="outlined" component="label" sx={{ width: "100%" }}>
            Choose file
            <input hidden accept="image/*" type="file" onChange={handleFileChange} />
          </Button>

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
            <TextField label="Artwork title" name="title" value={formData.title} onChange={handleChange} fullWidth autoFocus />
            <TextField label="Art size" name="art_size" value={formData.art_size} onChange={handleChange} fullWidth />
            <FormControl fullWidth>
              <InputLabel>Genre</InputLabel>
              <Select label="Genre" name="genre" value={formData.genre} onChange={handleChange}>
                <MenuItem value="Abstract">Abstract</MenuItem>
                <MenuItem value="Realism">Realism</MenuItem>
                <MenuItem value="Surrealism">Surrealism</MenuItem>
                <MenuItem value="Impressionism">Impressionism</MenuItem>
                <MenuItem value="Portrait">Portrait</MenuItem>
                <MenuItem value="Landscape">Landscape</MenuItem>
              </Select>
            </FormControl>
            <TextField label="Price" name="price" type="number" value={formData.price} onChange={handleChange} fullWidth />
            <TextField label="Description" name="description" value={formData.description} onChange={handleChange} fullWidth multiline rows={3} sx={{ gridColumn: { xs: "auto", md: "1 / -1" } }} />
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting && <CircularProgress size={18} color="inherit" sx={{ mr: 1 }} />}
          {isSubmitting
            ? selectedArtwork
              ? "Updating"
              : "Creating"
            : selectedArtwork
              ? "Save changes"
              : "Create artwork"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ArtworkForm;
