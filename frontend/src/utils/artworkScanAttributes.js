import { ART_2D_MATERIALS, ART_MATERIALS } from "../constants/artworkOptions.js";

const normalized = (value) => String(value ?? "").trim().toLowerCase();
const automaticValues = new Set(["", "pending", "n/a", "na", "null"]);
const emptyFeatureValues = new Set([...automaticValues, "none"]);

function unpackList(value) {
  if (Array.isArray(value)) return value.flatMap(unpackList);
  if (typeof value !== "string") return [];
  const trimmed = value.trim();
  if (trimmed.startsWith("[") || trimmed.startsWith('"')) {
    try {
      return unpackList(JSON.parse(trimmed));
    } catch {
      // Older scan rows can contain plain text that starts with punctuation.
    }
  }
  return trimmed.split(/[,\r\n]+/);
}

function uniqueLabels(value, ignoredValues) {
  const seen = new Set();
  return unpackList(value).flatMap((label) => {
    const trimmed = label.trim();
    const key = normalized(trimmed);
    if (ignoredValues.has(key) || seen.has(key)) return [];
    seen.add(key);
    return [trimmed];
  });
}

export function normalizeArtworkFeatures(value) {
  return uniqueLabels(value, emptyFeatureValues);
}

export function getArtworkScanDefaults() {
  return { mediums_used: null, feature_scanned: null };
}

export function getArtworkMediumOptions(artType, product) {
  const type = normalized(artType);
  const productType = normalized(product);
  if (!type) return [];
  if (["digital", "digital art"].includes(type)) return ["Digital"];
  if (["photography", "photographer", "photo", "image", "print"].includes(type) || productType === "image") return [];
  if (["painting", "architecture"].includes(type)
    || (["mixed media", "physical"].includes(type) && productType === "painting")) {
    return ART_2D_MATERIALS.filter((material) => normalized(material) !== "digital");
  }
  if (["sculpture", "product"].includes(type)
    || (["mixed media", "physical"].includes(type) && productType === "3d_object")) {
    const twoDimensional = new Set(ART_2D_MATERIALS.map(normalized));
    return ART_MATERIALS.filter((material) => !twoDimensional.has(normalized(material)));
  }
  return [];
}

export function getArtworkScanFromArtwork(source = {}) {
  const medium = Object.hasOwn(source, "mediums_used") ? source.mediums_used : source.mediums;
  const features = Object.hasOwn(source, "feature_scanned") ? source.feature_scanned : source.features;
  const mediumLabels = uniqueLabels(medium, emptyFeatureValues);
  const isEmptyMedium = unpackList(medium).some((label) => normalized(label) === "none");
  return {
    mediums_used: mediumLabels.length ? mediumLabels.join(", ") : isEmptyMedium ? "None" : null,
    feature_scanned: features == null || (typeof features === "string" && automaticValues.has(normalized(features)))
      ? null : normalizeArtworkFeatures(features),
  };
}

export function getArtworkScanPayload(data) {
  const payload = {};
  if (data.mediums_used != null && getArtworkMediumOptions(data.art_type, data.product).length) {
    payload.mediums_used = typeof data.mediums_used === "string" ? data.mediums_used.trim() : data.mediums_used;
  }
  if (data.feature_scanned != null) payload.feature_scanned = normalizeArtworkFeatures(data.feature_scanned);
  return payload;
}

export function getArtworkScanErrors(data) {
  const errors = {};
  if (data.mediums_used != null && getArtworkMediumOptions(data.art_type, data.product).length) {
    if (typeof data.mediums_used !== "string" || !data.mediums_used.trim()) {
      errors.mediums_used = "Choose a medium or use automatic scanning.";
    } else if (data.mediums_used.trim().length > 1000) {
      errors.mediums_used = "Medium information must be 1000 characters or fewer.";
    }
  }
  if (data.feature_scanned != null) {
    const value = data.feature_scanned;
    if ((typeof value !== "string" && !Array.isArray(value))
      || (Array.isArray(value) && value.some((feature) => typeof feature !== "string"))) {
      errors.feature_scanned = "Features must be text labels.";
    } else {
      const labels = normalizeArtworkFeatures(value);
      if (labels.length > 50) errors.feature_scanned = "Add no more than 50 features.";
      else if (labels.some((label) => label.length > 100)) errors.feature_scanned = "Each feature must be 100 characters or fewer.";
      else if (labels.join(", ").length > 1000) errors.feature_scanned = "Combined features must be 1000 characters or fewer.";
    }
  }
  return errors;
}
