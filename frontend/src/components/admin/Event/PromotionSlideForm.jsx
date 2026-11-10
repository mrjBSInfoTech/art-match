import React, { useState, useEffect, useRef } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Slide,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { styled, useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import ViewCarouselOutlinedIcon from "@mui/icons-material/ViewCarouselOutlined";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";

const DropZone = styled(Box, {
  shouldForwardProp: (prop) => prop !== "isDragActive" && prop !== "hasError",
})(({ theme, isDragActive, hasError }) => ({
  width: "100%",
  minHeight: 180,
  border: `2px dashed ${
    hasError
      ? theme.palette.error.main
      : isDragActive
      ? theme.palette.primary.main
      : theme.palette.divider
  }`,
  borderRadius: theme.shape.borderRadius,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: theme.spacing(2.5),
  cursor: "pointer",
  backgroundColor: isDragActive ? theme.palette.action.hover : "transparent",
  transition: "all 0.3s ease-in-out",
  overflow: "hidden",
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

const emptySlideForm = {
  title: "",
  description: "",
  button_label: "",
  button_url: "",
  status: "Draft",
  sort_order: 2,
  file: null,
};

export default function PromotionSlideForm({
  open,
  onClose,
  onSubmit,
  selectedSlide = null,
  totalSlides = 1,
  saving = false,
}) {
  const theme = useTheme();
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState(emptySlideForm);
  const [imagePreview, setImagePreview] = useState("");
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (selectedSlide) {
      setFormData({
        title: selectedSlide.title || "",
        description: selectedSlide.description || "",
        button_label: selectedSlide.button_label || "",
        button_url: selectedSlide.button_url || "",
        status: selectedSlide.status || "Draft",
        sort_order: selectedSlide.sort_order || 2,
        file: null,
      });
      setImagePreview(selectedSlide.image_url || "");
    } else {
      setFormData({
        ...emptySlideForm,
        sort_order: totalSlides + 2,
      });
      setImagePreview("");
    }
    setFormError("");
    setUploadError("");
    setIsDragActive(false);
  }, [selectedSlide, totalSlides, open]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFormError("");
  };

  const handleFileProcess = (file) => {
    if (!file) return;
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setUploadError("Only JPEG, PNG, or WebP images are allowed.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Image must be 5MB or smaller.");
      return;
    }
    setUploadError("");
    setFormData((prev) => ({ ...prev, file }));
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFileProcess(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    const title = formData.title.trim();
    if (!title) {
      setFormError("Headline is required.");
      return;
    }

    if (!selectedSlide && !formData.file && !imagePreview) {
      setUploadError("Please upload a slide image.");
      return;
    }

    try {
      await onSubmit({
        ...formData,
        title,
        description: formData.description.trim(),
        button_label: formData.button_label.trim(),
        button_url: formData.button_url.trim(),
      });
    } catch (err) {
      setFormError(err.message || "Unable to save promotion slide.");
    }
  };

  return (
    <Dialog
      open={open}
      onClose={saving ? undefined : onClose}
      TransitionComponent={Transition}
      keepMounted
      fullWidth
      maxWidth={false}
      PaperProps={{
        sx: {
          width: "min(100% - 24px, 490px)",
          maxWidth: "490px",
          maxHeight: "calc(100% - 32px)",
          display: "flex",
          flexDirection: "column",
          borderRadius: 3,
          overflow: "hidden",
          backgroundColor: theme.palette.background.paper,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.75,
          px: 2.5,
          py: 1.75,
          color: theme.palette.text.primary,
          fontSize: 16,
          fontWeight: 700,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <ViewCarouselOutlinedIcon sx={{ color: "#ef3340", fontSize: 20 }} />
        {selectedSlide ? "Edit Promotion Slide" : "Add Promotion Slide"}
        <Button
          aria-label="Close promotion slide dialog"
          onClick={onClose}
          disabled={saving}
          sx={{
            minWidth: 28,
            width: 28,
            height: 28,
            ml: "auto",
            p: 0,
            color: theme.palette.text.secondary,
          }}
        >
          <CloseIcon sx={{ fontSize: 18 }} />
        </Button>
      </DialogTitle>

      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", minHeight: 0 }}
      >
        <DialogContent
          dividers
          sx={{
            p: { xs: 2, sm: 2.5 },
            minHeight: 0,
            overflowY: "auto",
          }}
        >
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}

          <Stack spacing={2.25}>
            {/* Headline */}
            <TextField
              label="Headline"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              fullWidth
              size="small"
              inputProps={{ maxLength: 200 }}
              placeholder="e.g., Annual Fine Arts Gala"
            />

            {/* Description */}
            <TextField
              label="Description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              multiline
              minRows={3}
              fullWidth
              size="small"
              placeholder="Provide context or a brief overview for buyers..."
            />

            {/* Button Label and Link */}
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <TextField
                label="Button label (optional)"
                name="button_label"
                value={formData.button_label}
                onChange={handleChange}
                fullWidth
                size="small"
                inputProps={{ maxLength: 60 }}
                placeholder="e.g., Explore Exhibition"
              />
              <TextField
                label="Button link (optional)"
                name="button_url"
                value={formData.button_url}
                onChange={handleChange}
                fullWidth
                size="small"
                placeholder="/buyer/shop"
              />
            </Stack>

            {/* Status and Sort Order */}
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <FormControl fullWidth size="small">
                <InputLabel>Visibility</InputLabel>
                <Select
                  label="Visibility"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                >
                  <MenuItem value="Draft">Draft</MenuItem>
                  <MenuItem value="Published">Published</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth size="small">
                <InputLabel>Display Order</InputLabel>
                <Select
                  label="Display Order"
                  name="sort_order"
                  value={formData.sort_order}
                  onChange={handleChange}
                >
                  {Array.from(
                    { length: Math.max(totalSlides + (selectedSlide ? 0 : 1), 3) },
                    (_, i) => i + 2,
                  ).map((pos) => (
                    <MenuItem key={pos} value={pos}>
                      Position {pos}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>

            {/* DropZone for Slide Image */}
            <Box>
              <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: "block", mb: 0.75 }}>
                Slide Cover Image
              </Typography>
              <input
                ref={fileInputRef}
                hidden
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
              />
              <DropZone
                isDragActive={isDragActive}
                hasError={Boolean(uploadError)}
                onClick={() => fileInputRef.current?.click()}
                onDragEnter={() => setIsDragActive(true)}
                onDragLeave={() => setIsDragActive(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragActive(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleFileProcess(file);
                }}
                onDragOver={(e) => e.preventDefault()}
              >
                {imagePreview ? (
                  <Box sx={{ width: "100%", textAlign: "center" }}>
                    <Box
                      component="img"
                      src={imagePreview}
                      alt="Slide preview"
                      sx={{
                        width: "100%",
                        maxHeight: 180,
                        objectFit: "cover",
                        borderRadius: 1.5,
                        mb: 1.25,
                        border: "1px solid",
                        borderColor: "divider",
                      }}
                    />
                  </Box>
                ) : (
                  <>
                    <CloudUploadOutlinedIcon sx={{ fontSize: 36, color: "text.secondary", mb: 0.75 }} />
                    <Typography variant="body2" fontWeight={700}>
                      Upload promotion cover image
                    </Typography>
                    <Typography variant="caption" color="text.secondary" align="center" sx={{ mt: 0.5 }}>
                      PNG, JPG, or WEBP up to 5MB. Recommended landscape 16:9 ratio.
                    </Typography>
                  </>
                )}
              </DropZone>
              <Button
                type="button"
                fullWidth
                variant="outlined"
                onClick={() => fileInputRef.current?.click()}
                sx={{
                  mt: 1.5,
                  minHeight: 48,
                  borderRadius: 1,
                  textTransform: "none",
                  fontWeight: 700,
                }}
              >
                Choose file
              </Button>
              {uploadError && (
                <Typography variant="caption" color="error.main" sx={{ mt: 0.5, display: "block" }}>
                  {uploadError}
                </Typography>
              )}
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 2.5, py: 1.75, flexShrink: 0 }}>
          <Button onClick={onClose} disabled={saving} color="inherit">
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={saving}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
            sx={{
              fontWeight: 700,
              textTransform: "none",
              borderRadius: 2,
              px: 2.5,
              bgcolor: theme.palette.error.main,
              color: "#fff",
              "&:hover": {
                bgcolor: theme.palette.error.dark,
              },
            }}
          >
            {saving ? "Saving..." : selectedSlide ? "Save Changes" : "Create Slide"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
