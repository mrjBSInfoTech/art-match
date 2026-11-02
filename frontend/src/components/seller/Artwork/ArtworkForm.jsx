import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  FormControlLabel,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Slide,
  Switch,
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
  isArtworkStockable,
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
import ProductOptionsFields from "./ProductOptionsFields";
import ArtworkImage from "../../common/ArtworkImage";
import {
  createEmptyProductOption,
  getProductOptionsErrors,
  getProductOptionsFromArtwork,
  getProductOptionsPayload,
  getProductOptionsStartingPrice,
  getProductOptionsTotalQuantity,
} from "../../../utils/productOptions";

const STYLE_OPTIONS = [
  "Abstract",
  "Realism",
  "Surrealism",
  "Impressionism",
  "Portrait",
  "Landscape",
  "Still Life",
  "Photography",
  "Digital Art",
  "Sculpture",
  "Minimalism",
  "Pop Art",
];
const CUSTOM_STYLE_VALUE = "__custom_style__";

const getArtworkStyleFormValues = (genre = "") => {
  const style = String(genre || "");
  return STYLE_OPTIONS.includes(style)
    ? { genre: style, custom_style: "" }
    : { genre: style ? CUSTOM_STYLE_VALUE : "", custom_style: style };
};

const createEmptyArtworkForm = () => ({
  title: "",
  art_type: "",
  exact_art_type: "",
  product: "",
  product_type: "Premade",
  art_size: "",
  genre: "",
  custom_style: "",
  price: "",
  description: "",
  care_instructions: "",
  image: "",
  file: null,
  product_sample_image: "",
  product_sample_file: null,
  remove_product_sample: false,
  date_created: "",
  ...getArtworkDetailDefaults(),
  ...getArtworkScanDefaults(),
  product_price_mode: "shared",
  product_options: [],
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
  const isCustomizable = formData.product_type === "Customize";
  const isPremadeProductType = formData.product_type === "Premade";
  const isStockable = isArtworkStockable(formData.stockable);
  const isProductArtwork = formData.art_type === "product" && !isCustomizable;
  const isManualProductPricing = isProductArtwork && formData.product_price_mode === "manual";
  const productStockTotal = getProductOptionsTotalQuantity(formData.product_options);
  const productStartingPrice = getProductOptionsStartingPrice(formData.product_options);
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
  const [productOptionErrors, setProductOptionErrors] = useState({});

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
        ...getArtworkStyleFormValues(initialDraft.genre || initialDraft.color_used || ""),
        ...getArtworkDetailsFromArtwork(initialDraft),
        ...(initialDraft.art_type === "product"
          ? { product_options: getProductOptionsFromArtwork(initialDraft) }
          : {}),
        ...(selectedArtwork ? getArtworkScanFromArtwork(initialDraft) : getArtworkScanDefaults()),
      });
      setImagePreview(initialDraft.image || null);
    } else if (selectedArtwork) {
      setFormData({
        ...createEmptyArtworkForm(),
        title: selectedArtwork.title || "",
        art_size: selectedArtwork.art_size || "",
        art_type: selectedArtwork.art_type || "",
        exact_art_type: selectedArtwork.exact_art_type || "",
        product: getArtworkFormOptions(selectedArtwork.art_type)?.product || selectedArtwork.product || "",
        product_type: selectedArtwork.product_type || "Premade",
        ...getArtworkStyleFormValues(selectedArtwork.genre || selectedArtwork.color_used || ""),
        price: selectedArtwork.price || "",
        description: selectedArtwork.description || "",
        care_instructions: selectedArtwork.care_instructions || "",
        image: selectedArtwork.image || "",
        file: null,
        product_sample_image: selectedArtwork.product_sample_image || "",
        product_sample_file: null,
        remove_product_sample: false,
        date_created: selectedArtwork.date_created || "",
        ...getArtworkDetailsFromArtwork(selectedArtwork),
        ...(selectedArtwork.art_type === "product"
          ? { product_options: getProductOptionsFromArtwork(selectedArtwork) }
          : {}),
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
    setProductOptionErrors({});
  }, [selectedArtwork, open, initialDraft]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    const fieldValue = type === "checkbox" ? checked : value;
    setFormData((prev) => {
      const next = changeArtworkFormField(
        prev, name, name === "mediums_used" && fieldValue === "" ? null : fieldValue,
      );
      return {
        ...next,
        ...(name === "product_type" ? {
          stock_available: fieldValue === "Customize" || fieldValue === "Digital" ? "" : prev.stock_available,
          stockable: fieldValue === "Premade" ? isArtworkStockable(prev.stockable) : true,
          remove_product_sample: fieldValue !== "Customize",
        } : {}),
        ...(name === "stockable" && !fieldValue ? {
          stock_available: "",
        } : {}),
        ...(name === "art_type" ? {
          custom_style: "",
          product_options: fieldValue === "product"
            ? [createEmptyProductOption(), createEmptyProductOption()]
            : [],
          product_price_mode: "shared",
        } : {}),
        ...(name === "product" ? { custom_style: "" } : {}),
        ...(isProductArtwork && next.product_type !== "Customize" ? {
          stock_available: getProductOptionsTotalQuantity(next.product_options),
        } : {}),
        artwork_details: undefined,
      };
    });
    if (name === "art_type" || name === "product") {
      setFeatureInput("");
      setFeatureError("");
      setMaterialInput("");
      setDetailErrors({});
      setProductOptionErrors({});
    } else {
      setDetailErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        if (name === "stockable" && !fieldValue) {
          delete next.stock_available;
        }
        return next;
      });
    }
    setError("");
  };

  const addFeatures = (value) => {
    const additions = normalizeArtworkFeatures(value);
    if (!additions.length) {
      setFeatureError("Enter a feature name.");
      return false;
    }
    const features = normalizeArtworkFeatures([...(formData.feature_scanned || []), ...additions]);
    const errors = getArtworkScanErrors({ ...formData, feature_scanned: features });
    if (errors.feature_scanned) {
      setFeatureError(errors.feature_scanned);
      return false;
    }
    setFormData((prev) => ({
      ...prev,
      feature_scanned: normalizeArtworkFeatures([...(prev.feature_scanned || []), ...additions]),
    }));
    setFeatureError("");
    setError("");
    return true;
  };

  const handleAddFeature = () => {
    if (addFeatures(featureInput)) setFeatureInput("");
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
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type.toLowerCase())) {
      setUploadError("Choose a JPEG, PNG, or WebP image.");
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

  const handleSampleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = "";

    if (file.size > 2 * 1024 * 1024) {
      setUploadError("Product sample images must be 2MB or smaller.");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(String(file.type || "").toLowerCase())) {
      setUploadError("Choose a JPEG, PNG, or WebP product sample image.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((prev) => ({
        ...prev,
        product_sample_image: reader.result,
        product_sample_file: file,
        remove_product_sample: false,
      }));
      setUploadError("");
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveSampleImage = () => {
    setFormData((prev) => ({
      ...prev,
      product_sample_image: "",
      product_sample_file: null,
      remove_product_sample: true,
    }));
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
    if (formData.art_type === "customize" && !formData.exact_art_type.trim()) {
      setError("Enter the exact art type.");
      return;
    }
    if (!["Premade", "Digital", "Customize"].includes(formData.product_type)) {
      setError("Choose a product type.");
      return;
    }
    const product = typeOptions?.product || formData.product;
    if (!product.trim()) {
      setError("Product type is required");
      return;
    }
    if (isProductArtwork) {
      const errors = getProductOptionsErrors(formData.product_options, formData.product_price_mode);
      setProductOptionErrors(errors);
      if (Object.keys(errors).length) {
        setError(Object.values(errors).find((value) => typeof value === "string")
          || "Check the product details.");
        return;
      }
    } else {
      setProductOptionErrors({});
    }
    if (!formData.art_size.trim()) {
      setError("Art size is required");
      return;
    }
    const artworkStyle = formData.genre === CUSTOM_STYLE_VALUE
      ? formData.custom_style.trim()
      : formData.genre.trim();
    if (!artworkStyle) {
      setError("Style is required");
      return;
    }
    if (!isManualProductPricing &&
        (!Number.isFinite(Number(formData.price)) || Number(formData.price) <= 0)) {
      setError("Price must be greater than zero");
      return;
    }
    if (isPremadeProductType && !isProductArtwork && isStockable) {
      const stock = Number(formData.stock_available);
      if (!Number.isSafeInteger(stock) || stock < 0) {
        setError("Stock must be a whole number of 0 or more.");
        return;
      }
    }
    if (isManualProductPricing && !productStartingPrice) {
      setError("Enter a valid price for each product.");
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
      genre: artworkStyle,
      custom_style: undefined,
      ...(isCustomizable || !isStockable || formData.product_type === "Digital" ? { stock_available: "" } : {}),
      ...(!isStockable ? { stockable: false } : {}),
      ...(isProductArtwork ? { stock_available: productStockTotal } : {}),
      ...(isCustomizable ? { product_options: [] } : {}),
      product,
      material_composition: materialInput.trim()
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
      const artworkDetails = {
        ...getArtworkDetailsPayload(draft),
        ...(draft.art_type === "product" && !isCustomizable ? {
          product_price_mode: draft.product_price_mode,
          product_options: getProductOptionsPayload(
            draft.product_options,
            draft.product_price_mode,
          ),
        } : {}),
      };
      const submission = {
        ...draft,
        ...getArtworkDetailDefaults(),
        ...artworkDetails,
        ...(!isStockable ? { stock_available: "", stockable: false } : {}),
        ...(draft.art_type === "product" && !isCustomizable
          ? { product_options: draft.product_options }
          : {}),
        artwork_details: artworkDetails,
        ...getArtworkScanDefaults(),
        ...getArtworkScanPayload(draft),
        price: isManualProductPricing ? productStartingPrice : Number(formData.price),
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
          <FormControl fullWidth required>
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
          {formData.art_type === "customize" && (
            <TextField
              required
              fullWidth
              label="Exact art type"
              name="exact_art_type"
              value={formData.exact_art_type}
              onChange={handleChange}
              inputProps={{ maxLength: 100 }}
              helperText="Specify what kind of artwork you are listing."
            />
          )}
          <FormControl fullWidth required>
            <InputLabel>Product type</InputLabel>
            <Select
              label="Product type"
              name="product_type"
              value={formData.product_type}
              onChange={handleChange}
            >
              <MenuItem value="Premade">Premade</MenuItem>
              <MenuItem value="Digital">Digital</MenuItem>
              <MenuItem value="Customize">Customize</MenuItem>
            </Select>
          </FormControl>
          {isCustomizable && (
            <>
              <Box>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                  Product sample (optional)
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  Show buyers a reference image of the customized product. JPEG, PNG, or WebP up to 2MB.
                </Typography>
                {formData.product_sample_image && (
                  <ArtworkImage
                    image={formData.product_sample_image}
                    alt="Product sample preview"
                    sx={{
                      width: "100%",
                      maxHeight: 220,
                      objectFit: "contain",
                      borderRadius: 1,
                      mb: 1.5,
                    }}
                  />
                )}
                <Stack direction="row" spacing={1}>
                  <Button variant="outlined" component="label" fullWidth>
                    {formData.product_sample_image ? "Replace sample image" : "Choose sample image"}
                    <input
                      hidden
                      accept="image/jpeg,image/png,image/webp"
                      type="file"
                      onChange={handleSampleFileChange}
                    />
                  </Button>
                  {formData.product_sample_image && (
                    <Button variant="text" color="error" onClick={handleRemoveSampleImage}>
                      Remove
                    </Button>
                  )}
                </Stack>
              </Box>
            </>
          )}
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
              <ArtworkImage
                image={imagePreview}
                alt="Preview"
                sx={{ width: "100%", height: 160, maxWidth: "100%", objectFit: "contain" }}
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
              accept="image/jpeg,image/png,image/webp"
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
              required
              label="Artwork title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              fullWidth
              sx={{ gridColumn: "1 / -1" }}
            />

            {/* Mixed media can be either flat artwork or a physical object. */}
            {hasArtType && needsProductChoice && (
              <FormControl fullWidth required sx={{ gridColumn: "1 / -1" }}>
                <InputLabel>Product subtype</InputLabel>
                <Select
                  label="Product subtype"
                  name="product"
                  value={formData.product}
                  onChange={handleChange}
                  required
                >
                  {productOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {isProductArtwork && (
              <ProductOptionsFields
                options={formData.product_options}
                priceMode={formData.product_price_mode}
                errors={productOptionErrors}
                onChange={(options) => {
                  setFormData((prev) => ({
                    ...prev,
                    product_options: options,
                    stock_available: getProductOptionsTotalQuantity(options),
                  }));
                  setProductOptionErrors({});
                  setError("");
                }}
                onPriceModeChange={(priceMode) => {
                  setFormData((prev) => ({ ...prev, product_price_mode: priceMode }));
                  setProductOptionErrors({});
                  setError("");
                }}
              />
            )}

            {showDetails && isPremadeProductType && (
              <Box sx={{ gridColumn: "1 / -1", border: `1px solid ${theme.palette.divider}`, borderRadius: 2, p: 1.5 }}>
                <FormControlLabel
                  control={(
                    <Switch
                      checked={isStockable}
                      onChange={(event) => handleChange({
                        target: {
                          name: "stockable",
                          type: "checkbox",
                          checked: event.target.checked,
                        },
                      })}
                    />
                  )}
                  label="Stockable"
                  sx={{ m: 0 }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                  {isStockable
                    ? "This item will appear in the inventory list."
                    : "This item will stay out of the inventory list."}
                </Typography>
              </Box>
            )}

            {showDetails && !isCustomizable && isPremadeProductType && isStockable && (
              <TextField
                required
                fullWidth
                label="Stock available"
                name="stock_available"
                type="number"
                value={isProductArtwork ? productStockTotal : formData.stock_available}
                onChange={handleChange}
                disabled={isProductArtwork}
                error={Boolean(detailErrors.stock_available)}
                helperText={isProductArtwork
                  ? "Calculated from the quantities of all product options."
                  : detailErrors.stock_available || "Enter a whole number of available units."}
                slotProps={{ htmlInput: { min: 0, step: 1 } }}
              />
            )}

            {showDetails && (
              <TextField
                label={typeOptions?.sizeLabel || (formData.product === "3d_object" ? "Object dimensions" : "Artwork dimensions")}
                helperText={typeOptions?.sizeHint || (formData.product === "3d_object" ? "Width x height x depth, including units" : "Width x height, including units")}
                required
                name="art_size"
                value={formData.art_size}
                onChange={handleChange}
                fullWidth
              />
            )}

            {showDetails && (
              <>
                <FormControl fullWidth sx={{ gridColumn: "1 / -1" }}>
                  <InputLabel id="artwork-style-label">Style</InputLabel>
                  <Select
                    labelId="artwork-style-label"
                    label="Style"
                    name="genre"
                    value={formData.genre || ""}
                    onChange={(event) => handleChange({ target: { name: "genre", value: event.target.value } })}
                    MenuProps={{ PaperProps: { sx: { maxHeight: 300 } } }}
                  >
                    <MenuItem value=""><em>Select a style</em></MenuItem>
                    {STYLE_OPTIONS.map((style) => (
                      <MenuItem key={style} value={style}>{style}</MenuItem>
                    ))}
                    <MenuItem value={CUSTOM_STYLE_VALUE}>None of the Above</MenuItem>
                  </Select>
                </FormControl>
                {formData.genre === CUSTOM_STYLE_VALUE && (
                  <TextField
                    label="Specify your style"
                    name="custom_style"
                    value={formData.custom_style || ""}
                    onChange={handleChange}
                    required
                    fullWidth
                    sx={{ gridColumn: "1 / -1" }}
                  />
                )}
              </>
            )}

            {showDetails && (
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
                onSelectFeature={addFeatures}
                featureError={featureError}
                isEditing={Boolean(selectedArtwork)}
              />
            )}

            <TextField
              required
              label="Price"
              sx={{ gridColumn: "1 / -1" }}
              name="price"
              type="number"
              slotProps={{ htmlInput: { min: 0.01, step: 0.01 } }}
              value={isManualProductPricing ? productStartingPrice : formData.price}
              onChange={handleChange}
              disabled={isManualProductPricing}
              helperText={isManualProductPricing
                ? "Set individually in each product; this shows the lowest product price."
                : ""}
              fullWidth
            />

            <TextField
              required
              label="Description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              fullWidth
              multiline
              rows={3}
              sx={{ gridColumn: "1 / -1" }}
            />

            <TextField
              label="How to Handle with Care"
              name="care_instructions"
              value={formData.care_instructions}
              onChange={handleChange}
              fullWidth
              multiline
              rows={3}
              placeholder="Example: Keep away from direct sunlight, avoid moisture, and store upright in a dust-free sleeve."
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
