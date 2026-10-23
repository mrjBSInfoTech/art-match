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
import { useTheme } from "@mui/material/styles";
import { styled } from "@mui/material/styles";
// Icons
import CloseIcon from "@mui/icons-material/Close";
import PaletteOutlinedIcon from "@mui/icons-material/PaletteOutlined";
import { ART_TYPES, ART_STYLES } from "../../../constants/artworkOptions";
import { changeArtworkFormField, getArtworkFormOptions } from "../../../utils/artworkFormOptions";
import {
  getArtworkDetailCategory,
  getArtworkDetailDefaults,
  getArtworkDetailsErrors,
  getArtworkDetailsFromArtwork,
  getArtworkDetailsPayload,
} from "../../../utils/artworkDetails";
import {
  getArtworkScanDefaults,
  getArtworkScanErrors,
  getArtworkScanFromArtwork,
  getArtworkScanPayload,
  normalizeArtworkFeatures,
} from "../../../utils/artworkScanAttributes";
import ArtworkScanFields from "./ArtworkScanFields";
import ArtworkDetailsFields from "./ArtworkDetailsFields";

const createEmptyArtworkForm = () => ({
  title: "",
  art_type: "",
  product: "",
  art_size: "",
  genre: "",
  price: "",
  description: "",
  image: "",
  file: null,
  date_created: "",
  ...getArtworkDetailDefaults(),
  ...getArtworkScanDefaults(),
});

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

function ArtworkForm({ open, handleClose, onSubmit, selectedArtwork = null, initialDraft = null }) {
  const [formData, setFormData] = useState(createEmptyArtworkForm);
  const typeOptions = getArtworkFormOptions(formData.art_type);
  const hasArtType = Boolean(formData.art_type);
  const needsProductChoice = !typeOptions || Boolean(typeOptions.productOptions);
  const showDetails = hasArtType && (!needsProductChoice || Boolean(formData.product));
  const detailCategory = getArtworkDetailCategory(formData.art_type, typeOptions?.product || formData.product);
  const productOptions = typeOptions?.productOptions || [
    { value: "painting", label: "Painting" },
    { value: "image", label: "Image / Photograph" },
    { value: "3d_object", label: "3D Object" },
  ];
  const theme = useTheme();
  const [error, setError] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [featureInput, setFeatureInput] = useState("");
  const [featureError, setFeatureError] = useState("");
  const [materialInput, setMaterialInput] = useState("");
  const [detailErrors, setDetailErrors] = useState({});

  const uploadReminder = formData.art_type === "digital"
    ? "Upload the complete digital artwork without app controls or borders. Its medium will be set to Digital automatically."
    : formData.art_type === "architecture"
      ? "Upload a clear, straight-on image of the complete architectural drawing. Its features, colors, and 2D mediums will be detected from the image."
    : ["photography", "print"].includes(formData.art_type)
      ? "Upload the complete photograph or print. Colors and image features will be detected; no medium will be assigned."
      : formData.art_type === "painting" || formData.product === "painting"
        ? "Take a straight-on photo of the entire painting and crop out the surrounding background. A scanner app such as CamScanner can help make the painting fill the image."
        : formData.art_type
          ? "Upload a clear, well-lit image of the physical artwork. Use a plain background and keep other objects out of the frame."
          : "";

  useEffect(() => {
    if (!open) return;
    if (initialDraft) {
      setFormData({
        ...createEmptyArtworkForm(),
        ...initialDraft,
        ...getArtworkDetailsFromArtwork(initialDraft),
        ...(selectedArtwork ? getArtworkScanFromArtwork(initialDraft) : getArtworkScanDefaults()),
      });
      setImagePreview(initialDraft.image || null);
    } else if (selectedArtwork) {
      setFormData({
        ...createEmptyArtworkForm(),
        title: selectedArtwork.title || "",
        art_size: selectedArtwork.art_size || "",
        art_type: selectedArtwork.art_type || "",
        product: getArtworkFormOptions(selectedArtwork.art_type)?.product || selectedArtwork.product || "",
        genre: selectedArtwork.genre || selectedArtwork.color_used || "",
        price: selectedArtwork.price || "",
        description: selectedArtwork.description || "",
        image: selectedArtwork.image || "",
        file: null,
        date_created: selectedArtwork.date_created || "",
        ...getArtworkDetailsFromArtwork(selectedArtwork),
        ...getArtworkScanFromArtwork(selectedArtwork),
      });
      setImagePreview(selectedArtwork.image || null);
    } else {
      setFormData(createEmptyArtworkForm());
      setImagePreview(null);
    }
    setError("");
    setUploadError("");
    setIsSubmitting(false);
    setFeatureInput("");
    setFeatureError("");
    setMaterialInput("");
    setDetailErrors({});
  }, [selectedArtwork, open, initialDraft]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    const fieldValue = type === "checkbox" ? checked : value;
    setFormData((prev) => ({
      ...changeArtworkFormField(prev, name, name === "mediums_used" && fieldValue === "" ? null : fieldValue),
      artwork_details: undefined,
    }));
    if (name === "art_type" || name === "product") {
      setFeatureInput("");
      setFeatureError("");
      setMaterialInput("");
      setDetailErrors({});
    } else {
      setDetailErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
    setError("");
  };

  const handleAddFeature = () => {
    const additions = normalizeArtworkFeatures(featureInput);
    if (!additions.length) {
      setFeatureError("Enter a feature name.");
      return;
    }
    const features = normalizeArtworkFeatures([...(formData.feature_scanned || []), ...additions]);
    const errors = getArtworkScanErrors({ ...formData, feature_scanned: features });
    if (errors.feature_scanned) {
      setFeatureError(errors.feature_scanned);
      return;
    }
    setFormData((prev) => ({
      ...prev,
      feature_scanned: normalizeArtworkFeatures([...(prev.feature_scanned || []), ...additions]),
    }));
    setFeatureInput("");
    setFeatureError("");
    setError("");
  };

  const handleRemoveFeature = (feature) => {
    setFormData((prev) => ({
      ...prev,
      feature_scanned: (prev.feature_scanned || []).filter((value) => value !== feature),
    }));
    setFeatureError("");
    setError("");
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setUploadError(
        `File size exceeds 2MB limit. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB`,
      );
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
    if (!formData.art_type) {
      setError("Art type is required");
      return;
    }
    const product = typeOptions?.product || formData.product;
    if (!product.trim()) {
      setError("Product type is required");
      return;
    }
    if (!formData.art_size.trim()) {
      setError("Art size is required");
      return;
    }
    if (!formData.genre.trim()) {
      setError("Style is required");
      return;
    }
    if (!Number.isFinite(Number(formData.price)) || Number(formData.price) <= 0) {
      setError("Price must be greater than zero");
      return;
    }
    if (!selectedArtwork && !formData.file) {
      setError("Artwork image is required");
      return;
    }

    const additions = selectedArtwork ? normalizeArtworkFeatures(featureInput) : [];
    if (selectedArtwork && featureInput.trim() && !additions.length) {
      setFeatureError("Enter a feature name.");
      return;
    }
    const draft = {
      ...formData,
      product,
      material_composition: ["fine_art", "product"].includes(detailCategory) && materialInput.trim()
        ? [...formData.material_composition, materialInput.trim()]
        : formData.material_composition,
      ...(selectedArtwork ? {
        feature_scanned: featureInput.trim()
          ? normalizeArtworkFeatures([...(formData.feature_scanned || []), ...additions])
          : formData.feature_scanned,
      } : getArtworkScanDefaults()),
    };
    const detailsErrors = getArtworkDetailsErrors(draft);
    setDetailErrors(detailsErrors);
    if (Object.keys(detailsErrors).length) {
      setError(Object.values(detailsErrors)[0]);
      return;
    }
    const scanErrors = getArtworkScanErrors(draft);
    setFeatureError(scanErrors.feature_scanned || "");
    if (Object.keys(scanErrors).length) {
      setError(Object.values(scanErrors)[0]);
      return;
    }

    try {
      setIsSubmitting(true);
      const artworkDetails = getArtworkDetailsPayload(draft);
      const submission = {
        ...draft,
        ...getArtworkDetailDefaults(),
        ...artworkDetails,
        artwork_details: artworkDetails,
        ...getArtworkScanDefaults(),
        ...getArtworkScanPayload(draft),
        price: Number(formData.price),
      };
      setFormData(submission);
      setFeatureInput("");
      setMaterialInput("");
      await onSubmit(submission);
    } catch (submissionError) {
      setError(submissionError.message || "Unable to open artwork confirmation");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      TransitionComponent={Transition}
      keepMounted
      PaperProps={{
        sx: {
          width: "min(100% - 24px, 470px)",
          maxWidth: "470px",
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
        <PaletteOutlinedIcon sx={{ color: "#ef3340", fontSize: 20 }} />
        {selectedArtwork ? "Edit Artwork" : "Add Artwork"}
        <Button
          aria-label="Close artwork information"
          onClick={handleClose}
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
      <DialogContent dividers>
        {uploadError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {uploadError}
          </Alert>
        )}

        <Stack spacing={2.5}>
          {/* Art Type Selection */}
          <FormControl fullWidth>
            <InputLabel>Art Type</InputLabel>
            <Select
              label="Art Type"
              name="art_type"
              value={formData.art_type}
              onChange={handleChange}
            >
              {formData.art_type &&
                !ART_TYPES.some((type) => type.toLowerCase() === formData.art_type) && (
                  <MenuItem value={formData.art_type}>
                    {formData.art_type === "physical" ? "Physical (legacy)" : formData.art_type}
                  </MenuItem>
                )}
              {ART_TYPES.map((type) => (
                <MenuItem key={type} value={type.toLowerCase()}>
                  {type}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {!hasArtType && (
            <Typography variant="body2" color="text.secondary">
              Choose an art type to see its size and style fields.
            </Typography>
          )}
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
              <Box
                component="img"
                src={imagePreview}
                alt="Preview"
                sx={{ maxWidth: "100%", maxHeight: 160, objectFit: "contain" }}
              />
            ) : (
              <>
                <Typography variant="h6" fontWeight={700}>
                  Upload artwork image
                </Typography>
                <Typography color="text.secondary">
                  PNG, JPG, or WEBP up to 2MB. Uploads are optimized to WebP
                  at 98% of the original dimensions.
                </Typography>
              </>
            )}
          </DropZone>
          <Button variant="outlined" component="label" sx={{ width: "100%" }}>
            Choose file
            <input
              hidden
              accept="image/*"
              type="file"
              onChange={handleFileChange}
            />
          </Button>

          {uploadReminder && (
            <Alert severity="info" aria-live="polite">
              <Typography component="span" fontWeight={700}>
                Image reminder: {" "}
              </Typography>
              {uploadReminder}
            </Alert>
          )}

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "repeat(2, minmax(0, 1fr))" },
              alignItems: "start",
              "& > *": { minWidth: 0 },
              gap: 2,
            }}
          >
            <TextField
              label="Artwork title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              fullWidth
              sx={{ gridColumn: "1 / -1" }}
            />

            {/* Mixed media can be either flat artwork or a physical object. */}
            {hasArtType && needsProductChoice && (
              <FormControl fullWidth sx={{ gridColumn: "1 / -1" }}>
                <InputLabel>Product Type</InputLabel>
                <Select
                  label="Product Type"
                  name="product"
                  value={formData.product}
                  onChange={handleChange}
                >
                  {productOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {showDetails && (
              <TextField
                label={typeOptions?.sizeLabel || (formData.product === "3d_object" ? "Object dimensions" : "Artwork dimensions")}
                helperText={typeOptions?.sizeHint || (formData.product === "3d_object" ? "Width x height x depth, including units" : "Width x height, including units")}
                name="art_size"
                value={formData.art_size}
                onChange={handleChange}
                fullWidth
              />
            )}

            {showDetails && (
               <FormControl fullWidth>
                <InputLabel>Style</InputLabel>
                <Select
                  label="Style"
                  name="genre"
                  value={formData.genre}
                  onChange={handleChange}
                >
                  {formData.genre && !ART_STYLES.includes(formData.genre) && (
                    <MenuItem value={formData.genre}>{formData.genre}</MenuItem>
                  )}
                  {ART_STYLES.map((style) => (
                    <MenuItem key={style} value={style}>
                      {style}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {showDetails && detailCategory && (
              <ArtworkDetailsFields
                category={detailCategory}
                formData={formData}
                errors={detailErrors}
                onChange={handleChange}
                materialInput={materialInput}
                onMaterialInputChange={(value) => {
                  setMaterialInput(value);
                  setDetailErrors((prev) => {
                    const next = { ...prev };
                    delete next.material_composition;
                    return next;
                  });
                  setError("");
                }}
              />
            )}

            {selectedArtwork && showDetails && (
              <ArtworkScanFields
                formData={formData}
                onMediumChange={handleChange}
                onRemoveFeature={handleRemoveFeature}
                featureInput={featureInput}
                onFeatureInputChange={(value) => {
                  setFeatureInput(value);
                  setFeatureError("");
                  setError("");
                }}
                onAddFeature={handleAddFeature}
                featureError={featureError}
                isEditing={Boolean(selectedArtwork)}
              />
            )}

            <TextField
              label="Price"
              sx={{ gridColumn: "1 / -1" }}
              name="price"
              type="number"
              slotProps={{ htmlInput: { min: 0.01, step: 0.01 } }}
              value={formData.price}
              onChange={handleChange}
              fullWidth
            />

            <TextField
              label="Description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              fullWidth
              multiline
              rows={3}
              sx={{ gridColumn: "1 / -1" }}
            />
          </Box>
        </Stack>
      </DialogContent>
      {error && (
        <Box sx={{ px: 3, pt: 2 }}>
          <Alert severity="error">{error}</Alert>
        </Box>
      )}
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} disabled={isSubmitting} color="text.secondary">
          Cancel
        </Button>
        <Button
          variant="contained"
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          sx={{
            borderRadius: 1.5,
            px: 2.5,
            textTransform: "none",
            fontWeight: 700,
            color: "#fff",
          }}
        >
          {isSubmitting && (
            <CircularProgress size={18} color="inherit" sx={{ mr: 1 }} />
          )}
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
