const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const normalize = (value) => String(value || "").trim().toLowerCase();

export class ArtworkScanValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ArtworkScanValidationError";
    this.status = 400;
  }
}

export function usesFeaturesOnly(artType, product) {
  const type = normalize(artType);
  return ["photography", "photo", "image", "print"].includes(type)
    || (["auto", "physical"].includes(type) && normalize(product) === "image");
}

function parseFeatures(rawFeatures) {
  let features = rawFeatures;
  if (typeof features === "string") {
    try {
      features = JSON.parse(features);
    } catch {
      throw new ArtworkScanValidationError("Custom features must be a valid JSON array.");
    }
  }
  if (!Array.isArray(features) || features.length > 50) {
    throw new ArtworkScanValidationError("Custom features must contain no more than 50 tags.");
  }
  const seen = new Set();
  const tags = [];
  for (const value of features) {
    if (typeof value !== "string" || !value.trim() || value.trim().length > 100) {
      throw new ArtworkScanValidationError("Each custom feature must contain 1 to 100 characters.");
    }
    const tag = value.trim();
    const key = tag.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      tags.push(tag);
    }
  }
  const joined = tags.join(", ");
  if (joined.length > 1000) {
    throw new ArtworkScanValidationError("Custom features must total 1000 characters or fewer.");
  }
  // An explicit empty selection is distinct from an omitted override.
  return joined || "None";
}

export function parseArtworkScanOverrides(body, artType, product) {
  const overrides = {};
  if (hasOwn(body, "mediums_used") && body.mediums_used !== undefined) {
    if (typeof body.mediums_used !== "string" || !body.mediums_used.trim()
      || body.mediums_used.trim().length > 1000) {
      throw new ArtworkScanValidationError("Choose a medium of 1000 characters or fewer, or None.");
    }
    const medium = body.mediums_used.trim();
    overrides.mediums_used = usesFeaturesOnly(artType, product) || medium.toLowerCase() === "none"
      ? "None"
      : medium;
  }
  if (hasOwn(body, "feature_scanned") && body.feature_scanned !== undefined) {
    overrides.feature_scanned = parseFeatures(body.feature_scanned);
  }
  return overrides;
}

export function applyArtworkScanOverrides(defaults, overrides) {
  return {
    feature_scanned: hasOwn(overrides, "feature_scanned")
      ? overrides.feature_scanned
      : defaults.feature_scanned ?? null,
    mediums_used: hasOwn(overrides, "mediums_used")
      ? overrides.mediums_used
      : defaults.mediums_used ?? null,
  };
}

export function resolveArtworkScanUpdate(overrides, artType, product, currentArtwork) {
  const update = { ...overrides };
  const categoryChanged = normalize(currentArtwork.art_type) !== normalize(artType)
    || normalize(currentArtwork.product) !== normalize(product);
  if (categoryChanged) {
    if (!hasOwn(update, "feature_scanned")) update.feature_scanned = "None";
    if (!hasOwn(update, "mediums_used")) {
      update.mediums_used = ["digital", "digital art"].includes(normalize(artType)) ? "Digital" : "None";
    }
  }
  if (usesFeaturesOnly(artType, product)) update.mediums_used = "None";
  return update;
}
