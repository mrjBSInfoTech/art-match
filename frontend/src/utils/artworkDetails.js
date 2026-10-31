export const ARTWORK_FILE_FORMATS = {
  digital: ["PNG", "JPEG", "WEBP", "TIFF", "SVG", "PDF", "PSD"],
  photography: ["JPEG", "PNG", "WEBP", "TIFF", "RAW"],
};

export const ARTWORK_COLOR_PROFILES = [
  "sRGB", "Adobe RGB", "Display P3", "ProPhoto RGB", "CMYK",
];

const normalized = (value) => String(value || "").trim().toLowerCase();
const isPhotography = (artType) => ["photography", "photo"].includes(normalized(artType));

export function getArtworkDetailCategory(artType, product) {
  const type = normalized(artType);
  const productType = normalized(product);
  if (!type) return null;
  if (["digital", "digital art", "photography", "photo"].includes(type)) return "digital";
  if (["painting", "architecture", "print"].includes(type)) return "fine_art";
  if (["sculpture", "product"].includes(type)) return "product";
  if (type === "mixed media") {
    if (productType === "painting") return "fine_art";
    if (productType === "3d_object") return "product";
  }
  if (type === "physical") {
    if (productType === "image") return "digital";
    if (productType === "painting") return "fine_art";
    if (productType === "3d_object") return "product";
  }
  return null;
}

export function getArtworkDetailDefaults() {
  return {
    is_fragile: false,
    humidity_sensitive: false,
    light_sensitive: false,
    material_composition: [],
    stock_available: "",
    resolution_width: "",
    resolution_height: "",
    file_format: "",
    color_profile: "",
  };
}

function materialTags(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  return value.flatMap((tag) => {
    if (typeof tag !== "string") return [];
    const trimmed = tag.trim();
    const key = trimmed.toLowerCase();
    if (!trimmed || seen.has(key)) return [];
    seen.add(key);
    return [trimmed];
  });
}

function integerValue(value) {
  if (typeof value !== "string" && typeof value !== "number") return null;
  if (typeof value === "string" && !value.trim()) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) ? number : null;
}

const booleanValue = (value) => value === true || value === 1 || value === "true" || value === "1";
const trimmedString = (value) => typeof value === "string" ? value.trim() : "";

export function getArtworkDetailsPayload(formData) {
  const category = getArtworkDetailCategory(formData.art_type, formData.product);
  if (category === "fine_art") {
    return {
      is_fragile: booleanValue(formData.is_fragile),
      humidity_sensitive: booleanValue(formData.humidity_sensitive),
      light_sensitive: booleanValue(formData.light_sensitive),
      material_composition: materialTags(formData.material_composition),
    };
  }
  if (category === "product") {
    return {
      material_composition: materialTags(formData.material_composition),
      stock_available: integerValue(formData.stock_available) ?? formData.stock_available ?? "",
    };
  }
  if (category === "digital") {
    return {
      resolution_width: integerValue(formData.resolution_width) ?? formData.resolution_width ?? "",
      resolution_height: integerValue(formData.resolution_height) ?? formData.resolution_height ?? "",
      file_format: trimmedString(formData.file_format).toUpperCase(),
      color_profile: trimmedString(formData.color_profile),
    };
  }
  return {};
}

export function getArtworkDetailsFromArtwork(artwork = {}) {
  let details = artwork.artwork_details;
  if (typeof details === "string") {
    try {
      details = JSON.parse(details);
    } catch {
      details = null;
    }
  }
  if (!details || typeof details !== "object" || Array.isArray(details)) details = artwork;
  return {
    ...getArtworkDetailDefaults(),
    ...getArtworkDetailsPayload({ ...details, art_type: artwork.art_type, product: artwork.product }),
    ...(Array.isArray(details.product_options) ? {
      product_price_mode: details.product_price_mode || "shared",
      product_options: details.product_options,
    } : {}),
  };
}

export function getArtworkDetailsErrors(formData) {
  const category = getArtworkDetailCategory(formData.art_type, formData.product);
  const errors = {};
  if (category === "fine_art" || category === "product") {
    const tags = materialTags(formData.material_composition);
    if (!tags.length) errors.material_composition = "Add at least one material or composition.";
    else if (tags.length > 10) errors.material_composition = "Add no more than 10 materials.";
    else if (tags.some((tag) => tag.length > 100)) {
      errors.material_composition = "Each material must be 100 characters or fewer.";
    } else if (formData.material_composition.some((tag) => typeof tag !== "string")) {
      errors.material_composition = "Each material must be text.";
    }
  }
  if (category === "fine_art") {
    for (const field of ["is_fragile", "humidity_sensitive", "light_sensitive"]) {
      if (typeof formData[field] !== "boolean") errors[field] = "Choose whether this applies to your artwork.";
    }
  }
  if (category === "product") {
    const stock = integerValue(formData.stock_available);
    if (stock === null || stock < 0) errors.stock_available = "Enter stock as a whole number of 0 or more.";
  }
  if (category === "digital") {
    for (const field of ["resolution_width", "resolution_height"]) {
      const dimension = integerValue(formData[field]);
      if (dimension === null || dimension <= 0) errors[field] = "Enter a positive whole number of pixels.";
    }
    const formats = isPhotography(formData.art_type) || normalized(formData.art_type) === "physical"
      ? ARTWORK_FILE_FORMATS.photography : ARTWORK_FILE_FORMATS.digital;
    if (!formats.includes(trimmedString(formData.file_format).toUpperCase())) {
      errors.file_format = "Choose a supported file format.";
    }
    if (!ARTWORK_COLOR_PROFILES.includes(trimmedString(formData.color_profile))) {
      errors.color_profile = "Choose a color profile.";
    }
  }
  return errors;
}
