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
import { ART_TYPES, DIGITAL_ART_TYPES } from "../../../constants/artworkOptions";
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

const DIGITAL_ALLOWED_ART_TYPES_LOWER = (
  DIGITAL_ART_TYPES || ["Digital", "Photography", "Print", "Architecture", "Customize"]
).map((t) => t.toLowerCase());

const getArtworkStyleFormValues = (genre = "") => {
  const style = String(genre || "");
  return STYLE_OPTIONS.includes(style)
    ? { genre: style, custom_style: "" }
    : { genre: style ? CUSTOM_STYLE_VALUE : "", custom_style: style };
};

const getUploadReminderMessage = (productType, artType, productSubtype) => {
  if (!artType) return "";

  if (productType === "Digital" || artType === "digital") {
    if (artType === "architecture") {
      return "Upload a high-resolution digital export of your architectural blueprint or CAD drawing without UI toolbars or watermarks. Its features, colors, and digital details will be scanned automatically.";
    }
    if (artType === "photography") {
      return "Upload the original high-resolution digital photograph without frames or borders. Colors and visual features will be extracted directly from the image.";
    }
    if (artType === "print") {
      return "Upload the clean digital print master file without background mockups or borders. Colors and artwork features will be detected automatically.";
    }
    if (artType === "customize") {
      return "Upload a clean digital showcase or reference illustration without app controls or borders. Buyers will use this as a visual reference for their custom digital order.";
    }
    return "Upload the complete exported digital artwork file without drawing app controls, canvas borders, or watermarks. Its medium will be set to Digital automatically.";
  }

  if (productType === "Customize") {
    if (artType === "sculpture" || productSubtype === "3d_object") {
      return "Upload a clear, well-lit reference photo of your custom 3D sculpture or craft style on a plain background. Keep unrelated clutter out of the frame so the AI scanner isolates the subject cleanly.";
    }
    if (artType === "product") {
      return "Upload a clear reference photo of your customizable merchandise (such as custom keychains, pins, or knitted items) on a clean surface so buyers and the scanner can see the craft details clearly.";
    }
    if (artType === "painting" || productSubtype === "painting") {
      return "Upload a straight-on portfolio sample of your painting style, cropped tightly to the canvas edges without background walls or frames.";
    }
    return "Upload a clear, well-lit portfolio example representing this custom commission offering. Avoid busy backgrounds so its colors, mediums, and features are scanned accurately.";
  }

  // Premade physical artworks & products
  switch (artType) {
    case "painting":
      return "Take a straight-on, evenly lit photo of the entire painting and crop out surrounding walls or frames. A scanner app can help make the canvas fill the frame cleanly.";
    case "sculpture":
      return "Take a sharp, well-lit photo of the physical sculpture or statue against a plain, solid background. The AI background remover will isolate the 3D piece to scan its material medium and colors.";
    case "product":
      return "Place the premade physical merchandise (keychains, pins, pottery, or textile crafts) on a clean, flat background with bright lighting. Keep hands and extra props out of the frame for accurate scanning.";
    case "architecture":
      return "Upload a clear, straight-on scan or photo of the physical architectural drawing or model. Its structural features, colors, and mediums will be detected from the image.";
    case "photography":
    case "print":
      return "Upload a flat, glare-free image of the physical print or photograph without frames or shadows. Colors and visual features will be detected automatically.";
    case "mixed media":
      if (productSubtype === "3d_object") {
        return "Upload a well-lit photo of the 3D mixed-media piece against a plain backdrop so its physical materials, textures, and colors can be isolated and scanned.";
      }
      if (productSubtype === "painting") {
        return "Take a straight-on photo of the mixed-media canvas and crop out the background so the surface textures, mediums, and colors are captured accurately.";
      }
      return "Upload a clear, straight-on image of the mixed-media piece on a neutral background so its combined materials and features can be detected.";
    default:
      return "Upload a clear, well-lit image of the physical artwork against a plain background, keeping other objects out of the frame.";
  }
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
  const isDigitalProductType = formData.product_type === "Digital" || formData.art_type === "digital";
  const isCustomizable = formData.product_type === "Customize";
  const isPremadeProductType = formData.product_type === "Premade" && !isDigitalProductType;

  // Filter available Art Types based on Product Type (exclude 3D/physical-only types when Digital is picked)
  const availableArtTypes = isDigitalProductType
    ? ART_TYPES.filter((type) => DIGITAL_ALLOWED_ART_TYPES_LOWER.includes(type.toLowerCase()))
    : ART_TYPES;

  // Filter available Product Types based on Art Type (Digital art type cannot be Premade physical stock)
  const availableProductTypes = formData.art_type === "digital"
    ? ["Digital", "Customize"]
    : ["Premade", "Digital", "Customize"];

  const typeOptions = getArtworkFormOptions(formData.art_type);
  const hasArtType = Boolean(formData.art_type);

  // Filter out 3D Object subtype when Digital product type is active
  const baseProductOptions = typeOptions?.productOptions || [
    { value: "painting", label: "Painting" },
    { value: "image", label: "Image / Photograph" },
    { value: "3d_object", label: "3D Object" },
  ];
  const productOptions = isDigitalProductType
    ? baseProductOptions.filter((option) => option.value !== "3d_object")
    : baseProductOptions;

  const needsProductChoice = !isDigitalProductType && (!typeOptions || Boolean(typeOptions.productOptions));
  const showDetails = hasArtType && (!needsProductChoice || Boolean(formData.product));
  const effectiveProductSubtype = isDigitalProductType
    ? (typeOptions?.product && typeOptions.product !== "3d_object" ? typeOptions.product : "image")
    : (typeOptions?.product || formData.product);
  const detailCategory = getArtworkDetailCategory(formData.art_type, effectiveProductSubtype);

  // Stockable and physical product options only apply to Premade physical items
  const isStockable = isPremadeProductType && isArtworkStockable(formData.stockable);
  const isProductArtwork = formData.art_type === "product" && isPremadeProductType;
  const isManualProductPricing = isProductArtwork && formData.product_price_mode === "manual";
  const productStockTotal = getProductOptionsTotalQuantity(formData.product_options);
  const productStartingPrice = getProductOptionsStartingPrice(formData.product_options);

  const availableStyleOptions = isDigitalProductType
    ? STYLE_OPTIONS.filter((style) => style !== "Sculpture")
    : STYLE_OPTIONS;

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

  const uploadReminder = getUploadReminderMessage(
    formData.product_type,
    formData.art_type,
    effectiveProductSubtype,
  );

  useEffect(() => {
    if (!open) return;
    if (initialDraft) {
      const initialArtType = initialDraft.art_type || "";
      const initialProductType = initialArtType === "digital" && initialDraft.product_type === "Premade"
        ? "Digital"
        : (initialDraft.product_type || "Premade");
      setFormData({
        ...createEmptyArtworkForm(),
        ...initialDraft,
        product_type: initialProductType,
        ...getArtworkStyleFormValues(initialDraft.genre || initialDraft.color_used || ""),
        ...getArtworkDetailsFromArtwork(initialDraft),
        ...(initialProductType !== "Premade" ? { stockable: false, stock_available: "" } : {}),
        ...(initialDraft.art_type === "product" && initialProductType === "Premade"
          ? { product_options: getProductOptionsFromArtwork(initialDraft) }
          : { product_options: [] }),
        ...(selectedArtwork ? getArtworkScanFromArtwork(initialDraft) : getArtworkScanDefaults()),
      });
      setImagePreview(initialDraft.image || null);
    } else if (selectedArtwork) {
      const selectedArtType = selectedArtwork.art_type || "";
      const selectedProductType = selectedArtType === "digital" && (!selectedArtwork.product_type || selectedArtwork.product_type === "Premade")
        ? "Digital"
        : (selectedArtwork.product_type || "Premade");
      setFormData({
        ...createEmptyArtworkForm(),
        title: selectedArtwork.title || "",
        art_size: selectedArtwork.art_size || "",
        art_type: selectedArtType,
        exact_art_type: selectedArtwork.exact_art_type || "",
        product: getArtworkFormOptions(selectedArtType)?.product || selectedArtwork.product || "",
        product_type: selectedProductType,
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
        ...(selectedProductType !== "Premade" ? { stockable: false, stock_available: "" } : {}),
        ...(selectedArtType === "product" && selectedProductType === "Premade"
          ? { product_options: getProductOptionsFromArtwork(selectedArtwork) }
          : { product_options: [] }),
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
    const sanitizedValue = name === "material_composition"
      ? (Array.isArray(fieldValue)
          ? fieldValue.map((item) => (typeof item === "string" ? item.trim() : (item?.label || item?.value || ""))).filter(Boolean)
          : (typeof fieldValue === "string" && fieldValue.trim() ? [fieldValue.trim()] : []))
      : fieldValue;

    setFormData((prev) => {
      const next = changeArtworkFormField(
        prev,
        name,
        name === "mediums_used" && sanitizedValue === "" ? null : sanitizedValue,
      );

      // 1. Handle Product Type transitions cleanly so previous Premade/Stockable state never leaks
      if (name === "product_type") {
        const switchingToDigital = sanitizedValue === "Digital";
        const switchingToCustomize = sanitizedValue === "Customize";
        const switchingToPremade = sanitizedValue === "Premade";

        // If switching to Digital and current art_type is physical/3D-only, reset or switch to "digital"
        const nextArtType = switchingToDigital && next.art_type && !DIGITAL_ALLOWED_ART_TYPES_LOWER.includes(next.art_type)
          ? "digital"
          : next.art_type;

        const nextTypeOpts = getArtworkFormOptions(nextArtType);
        const nextProductSubtype = switchingToDigital
          ? (nextTypeOpts?.product && nextTypeOpts.product !== "3d_object" ? nextTypeOpts.product : "image")
          : (nextTypeOpts?.product || (next.product === "3d_object" && switchingToDigital ? "image" : next.product));

        return {
          ...next,
          ...getArtworkDetailDefaults(),
          material_composition: prev.material_composition || [],
          art_type: nextArtType,
          product: nextProductSubtype,
          genre: switchingToDigital && next.genre === "Sculpture" ? "" : next.genre,
          stockable: switchingToPremade ? true : false,
          stock_available: "",
          product_options: switchingToPremade && nextArtType === "product"
            ? (prev.product_options?.length ? prev.product_options : [createEmptyProductOption(), createEmptyProductOption()])
            : [],
          product_price_mode: "shared",
          remove_product_sample: !switchingToCustomize,
          ...(switchingToDigital ? { mediums_used: "Digital" } : {}),
          artwork_details: undefined,
        };
      }

      // 2. Handle Art Type transitions (e.g., picking "digital" Art Type forces non-Premade product_type & clears stock)
      if (name === "art_type") {
        const isSelectingDigitalArt = sanitizedValue === "digital";
        const nextProductType = isSelectingDigitalArt && prev.product_type === "Premade"
          ? "Digital"
          : prev.product_type;
        const isNextPremade = nextProductType === "Premade" && !isSelectingDigitalArt;
        const nextTypeOpts = getArtworkFormOptions(sanitizedValue);

        return {
          ...next,
          ...getArtworkDetailDefaults(),
          material_composition: prev.material_composition || [],
          product_type: nextProductType,
          product: isSelectingDigitalArt
            ? (nextTypeOpts?.product || "image")
            : (nextTypeOpts?.product || ""),
          custom_style: "",
          genre: isSelectingDigitalArt && prev.genre === "Sculpture" ? "" : prev.genre,
          stockable: isNextPremade ? true : false,
          stock_available: "",
          product_options: isNextPremade && sanitizedValue === "product"
            ? [createEmptyProductOption(), createEmptyProductOption()]
            : [],
          product_price_mode: "shared",
          ...(isSelectingDigitalArt ? { mediums_used: "Digital" } : {}),
          artwork_details: undefined,
        };
      }

      // 3. Handle Stockable toggle
      if (name === "stockable") {
        return {
          ...next,
          stockable: Boolean(sanitizedValue),
          stock_available: sanitizedValue ? prev.stock_available : "",
          artwork_details: undefined,
        };
      }

      // 4. Default field update
      const isCurrentlyPremadeProduct = next.art_type === "product" && next.product_type === "Premade";
      return {
        ...next,
        ...(name === "product" ? { custom_style: "" } : {}),
        ...(isCurrentlyPremadeProduct ? {
          stock_available: getProductOptionsTotalQuantity(next.product_options),
        } : {}),
        artwork_details: undefined,
      };
    });

    if (name === "art_type" || name === "product" || name === "product_type") {
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
      if (name === "material_composition") {
        setError((prev) => (prev === "Add at least one material or composition." ? "" : prev));
      }
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
    if (formData.art_type === "digital" && formData.product_type === "Premade") {
      setError("Digital artworks cannot use the Premade physical product type.");
      return;
    }
    const product = effectiveProductSubtype;
    if (!product || !product.trim()) {
      setError("Product subtype is required");
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

    // Explicitly sanitize stockable & stock_available for non-Premade or non-stockable items
    // so getArtworkDetailsErrors never complains about missing stock on Digital or Customize items
    const shouldCarryStock = isPremadeProductType && isStockable;
    const userMaterials = Array.isArray(formData.material_composition)
      ? formData.material_composition
      : (typeof formData.material_composition === "string" && formData.material_composition.trim()
          ? formData.material_composition.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean)
          : []);
    const pendingMaterial = materialInput.trim();
    const combinedMaterials = pendingMaterial && !userMaterials.some((m) => m.toLowerCase() === pendingMaterial.toLowerCase())
      ? [...userMaterials, pendingMaterial]
      : userMaterials;
    const resolvedMaterials = isDigitalProductType
      ? (combinedMaterials.length ? combinedMaterials : ["Digital"])
      : combinedMaterials;

    const draft = {
      ...formData,
      genre: artworkStyle,
      custom_style: undefined,
      stockable: shouldCarryStock,
      stock_available: shouldCarryStock
        ? (isProductArtwork ? productStockTotal : formData.stock_available)
        : "",
      product_options: isProductArtwork ? formData.product_options : [],
      product_price_mode: isProductArtwork ? formData.product_price_mode : "shared",
      product,
      material_composition: resolvedMaterials,
      ...(selectedArtwork ? {
        feature_scanned: featureInput.trim()
          ? normalizeArtworkFeatures([...(formData.feature_scanned || []), ...additions])
          : formData.feature_scanned,
      } : getArtworkScanDefaults()),
    };

    const rawDetailsErrors = getArtworkDetailsErrors(draft);
    const detailsErrors = { ...rawDetailsErrors };
    if (!shouldCarryStock) {
      delete detailsErrors.stock_available;
      delete detailsErrors.stockable;
    }
    if (isDigitalProductType || detailCategory === "digital") {
      delete detailsErrors.material_composition;
    }
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
        ...(!shouldCarryStock ? { stockable: false, stock_available: "" } : {}),
        ...(isProductArtwork ? {
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
        ...(!shouldCarryStock ? { stock_available: "", stockable: false } : {}),
        ...(isProductArtwork
          ? { product_options: draft.product_options }
          : { product_options: [] }),
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
          {/* Product Type Selection */}
          <FormControl fullWidth required>
            <InputLabel>Product type</InputLabel>
            <Select
              label="Product type"
              name="product_type"
              value={formData.product_type}
              onChange={handleChange}
            >
              {availableProductTypes.map((prodType) => (
                <MenuItem key={prodType} value={prodType}>
                  {prodType}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Art Type Selection (Filtered by Product Type) */}
          <FormControl fullWidth required>
            <InputLabel>Art Type</InputLabel>
            <Select
              label="Art Type"
              name="art_type"
              value={formData.art_type}
              onChange={handleChange}
            >
              {formData.art_type &&
                !availableArtTypes.some((type) => type.toLowerCase() === formData.art_type) && (
                  <MenuItem value={formData.art_type}>
                    {formData.art_type === "physical" ? "Physical (legacy)" : formData.art_type}
                  </MenuItem>
                )}
              {availableArtTypes.map((type) => (
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
              helperText={
                isDigitalProductType
                  ? "Specify what kind of digital artwork you are listing (e.g., Character Illustration, Vector Art, Pixel Art)."
                  : "Specify what kind of artwork you are listing."
              }
            />
          )}

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
                Image reminder:{" "}
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

            {/* Subtype selection for physical mixed media or custom types (excludes 3D when Digital is selected) */}
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

            {showDetails && isPremadeProductType && isStockable && (
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
                label={
                  isDigitalProductType
                    ? "Canvas / image dimensions"
                    : (typeOptions?.sizeLabel || (effectiveProductSubtype === "3d_object" ? "Object dimensions" : "Artwork dimensions"))
                }
                helperText={
                  isDigitalProductType
                    ? "Width x height in pixels (px), inches, or cm (e.g., 3000 x 4000 px)"
                    : (typeOptions?.sizeHint || (effectiveProductSubtype === "3d_object" ? "Width x height x depth, including units" : "Width x height, including units"))
                }
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
                    {availableStyleOptions.map((style) => (
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
                formData={{
                  ...formData,
                  material_composition: Array.isArray(formData.material_composition)
                    ? formData.material_composition
                    : (typeof formData.material_composition === "string" && formData.material_composition.trim()
                        ? formData.material_composition.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean)
                        : []),
                }}
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
                  setError((prev) => (prev === "Add at least one material or composition." ? "" : prev));
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

            {!isDigitalProductType && (
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
            )}
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