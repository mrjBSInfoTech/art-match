import { normalizeProductDetails, ProductOptionsError } from "./productOptions.js";

const DIGITAL_FORMATS = new Set(["PNG", "JPEG", "WEBP", "TIFF", "SVG", "PDF", "PSD"]);
const PHOTO_FORMATS = new Set(["JPEG", "PNG", "WEBP", "TIFF", "RAW"]);
const COLOR_PROFILES = new Set(["sRGB", "Adobe RGB", "Display P3", "ProPhoto RGB", "CMYK"]);
const PRODUCT_TYPES = new Map([
  ["premade", "Premade"],
  ["digital", "Digital"],
  ["customize", "Customize"],
]);

const normalize = (value) => String(value || "").trim().toLowerCase();

export class ArtworkDetailsValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ArtworkDetailsValidationError";
    this.status = 400;
  }
}

export function normalizeArtworkProductSettings(body) {
  const rawType = body.product_type;
  const productType = PRODUCT_TYPES.get(String(rawType).trim().toLowerCase());
  if (!productType) {
    throw new ArtworkDetailsValidationError("Choose a valid product type.");
  }
  return { productType, paymentMode: "straight", upfrontPercentage: null };
}

export function normalizeExactArtworkType(artType, value) {
  const isCustomArtType = normalize(artType) === "customize";
  if (!isCustomArtType) {
    if (value != null && String(value).trim()) {
      throw new ArtworkDetailsValidationError(
        "Exact art type can only be provided for Customize.",
      );
    }
    return null;
  }
  if (typeof value !== "string") {
    throw new ArtworkDetailsValidationError("Enter the exact art type.");
  }
  const exactType = value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim();
  if (!exactType || exactType.length > 100) {
    throw new ArtworkDetailsValidationError(
      "Exact art type must contain 1 to 100 characters.",
    );
  }
  return exactType;
}

export function getArtworkDetailsCategory(artType, product) {
  const type = normalize(artType);
  const selectedProduct = normalize(product);
  if (!type) return null;
  if (["digital", "digital art", "photography", "photo"].includes(type)) return "digital";
  if (["painting", "architecture", "print"].includes(type)) return "fine_art";
  if (["sculpture", "product"].includes(type)) return "product";
  if (["mixed media", "physical"].includes(type)) {
    if (selectedProduct === "3d_object") return "product";
    if (selectedProduct === "painting") return "fine_art";
    if (type === "physical" && selectedProduct === "image") return "digital";
  }
  return null;
}

function readObject(rawDetails) {
  let details = rawDetails;
  if (typeof details === "string") {
    try {
      details = JSON.parse(details);
    } catch {
      throw new ArtworkDetailsValidationError("Artwork details must be valid JSON.");
    }
  }
  if (!details || typeof details !== "object" || Array.isArray(details)) {
    throw new ArtworkDetailsValidationError("Artwork details must be an object.");
  }
  return details;
}

function materialTags(value) {
  if (!Array.isArray(value) || value.length === 0 || value.length > 10) {
    throw new ArtworkDetailsValidationError("Choose between 1 and 10 material composition tags.");
  }
  const seen = new Set();
  const tags = [];
  for (const item of value) {
    if (typeof item !== "string" || !item.trim() || item.trim().length > 100) {
      throw new ArtworkDetailsValidationError("Each material composition tag must contain 1 to 100 characters.");
    }
    const tag = item.trim();
    if (!seen.has(tag.toLowerCase())) {
      tags.push(tag);
      seen.add(tag.toLowerCase());
    }
  }
  return tags;
}

function booleanFlag(details, key, label) {
  if (typeof details[key] !== "boolean") {
    throw new ArtworkDetailsValidationError(`${label} must be true or false.`);
  }
  return details[key];
}

function integerValue(value, minimum, label) {
  if (!Number.isSafeInteger(value) || value < minimum) {
    throw new ArtworkDetailsValidationError(`${label} must be a whole number of at least ${minimum}.`);
  }
  return value;
}

// Project only the active category's fields; seller-supplied materials do not
// replace the separately scanned mediums or features.
export function validateArtworkDetails(rawDetails, artType, product, productType = "Premade") {
  const details = readObject(rawDetails);
  const category = getArtworkDetailsCategory(artType, product);
  const isCustomizable = normalize(productType) === "customize";
  const isPremade = normalize(productType) === "premade";
  const hasStockable = Object.hasOwn(details, "stockable") && details.stockable !== undefined;
  const stockable = hasStockable
    ? booleanFlag(details, "stockable", "Stockable")
    : true;
  if (isCustomizable && (
    Object.hasOwn(details, "stock_available")
    || Object.hasOwn(details, "product_options")
  )) {
    throw new ArtworkDetailsValidationError(
      "Customizable artwork cannot include stock or product option quantities.",
    );
  }
  const commonDetails = {
    material_composition: materialTags(details.material_composition),
    ...(isPremade && hasStockable ? { stockable } : {}),
  };
  if (isPremade && !(category === "product" && normalize(artType) === "product") && stockable) {
    commonDetails.stock_available = integerValue(details.stock_available, 0, "Stock available");
  }
  if (isPremade && stockable && Object.hasOwn(details, "max_order_quantity") && details.max_order_quantity !== null && details.max_order_quantity !== undefined && String(details.max_order_quantity).trim() !== "") {
    commonDetails.max_order_quantity = integerValue(details.max_order_quantity, 1, "Max quantity per order");
  }
  if (category === "fine_art") {
    return {
      is_fragile: booleanFlag(details, "is_fragile", "Fragility"),
      humidity_sensitive: booleanFlag(details, "humidity_sensitive", "Humidity sensitivity"),
      light_sensitive: booleanFlag(details, "light_sensitive", "Light sensitivity"),
      ...commonDetails,
    };
  }
  if (category === "product") {
    if (normalize(artType) !== "product") {
      return commonDetails;
    }
    if (!isPremade) {
      return commonDetails;
    }
    let options;
    try {
      options = normalizeProductDetails({
        product_price_mode: details.product_price_mode || "shared",
        product_options: details.product_options,
      });
    } catch (error) {
      if (error instanceof ProductOptionsError) {
        throw new ArtworkDetailsValidationError(error.message);
      }
      throw error;
    }
    const stockAvailable = options.product_options.reduce(
      (total, option) => total + option.quantity,
      0,
    );
    if (!Number.isSafeInteger(stockAvailable)) {
      throw new ArtworkDetailsValidationError("Combined product quantity is too large.");
    }
    return {
      ...commonDetails,
      stock_available: stockAvailable,
      product_price_mode: options.product_price_mode,
      product_options: options.product_options,
    };
  }
  if (category === "digital") {
    const formats = ["photography", "photo", "physical"].includes(normalize(artType))
      ? PHOTO_FORMATS
      : DIGITAL_FORMATS;
    const format = typeof details.file_format === "string"
      ? details.file_format.trim().toUpperCase()
      : "";
    const profile = typeof details.color_profile === "string"
      ? details.color_profile.trim()
      : "";
    if (!formats.has(format)) {
      throw new ArtworkDetailsValidationError("Choose a supported file format for the selected art type.");
    }
    if (!COLOR_PROFILES.has(profile)) {
      throw new ArtworkDetailsValidationError("Choose a supported color profile.");
    }
    return {
      ...commonDetails,
      resolution_width: integerValue(details.resolution_width, 1, "Resolution width"),
      resolution_height: integerValue(details.resolution_height, 1, "Resolution height"),
      file_format: format,
      color_profile: profile,
    };
  }
  return commonDetails;
}

export function resolveArtworkDetails({
  rawDetails,
  artType,
  product,
  productType = "Premade",
  currentArtwork = null,
}) {
  let details = rawDetails;
  if (details === undefined && currentArtwork
      && normalize(currentArtwork.art_type) === normalize(artType)
      && normalize(currentArtwork.product) === normalize(product)) {
    details = currentArtwork.artwork_details;
  }
  if (details === undefined || details === null) {
    throw new ArtworkDetailsValidationError("Artwork materials and stock details are required.");
  }
  return validateArtworkDetails(details, artType, product, productType);
}
