import { artworkMatchesColor } from "./artworkColors.js";

const normalize = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

const getValues = (value) => {
  if (Array.isArray(value)) return value.flatMap(getValues);
  if (typeof value !== "string") return value == null ? [] : [String(value)];

  const trimmed = value.trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return parsed.flatMap(getValues);
  } catch {
    // Stored legacy values are comma-separated strings, not JSON.
  }

  return trimmed.split(",");
};

const matchesAnyValue = (values, selected) => {
  const normalizedValues = values.flatMap(getValues).map(normalize);
  return selected.some((option) => normalizedValues.includes(normalize(option)));
};

export function matchesArtworkCategoryFilters(artwork, filters) {
  const artTypes = filters.artTypes || [];
  const styles = filters.styles || [];
  const materials = filters.materials || [];
  const colors = filters.colors || [];

  return (
    (!artTypes.length ||
      matchesAnyValue([artwork.art_type, artwork.product], artTypes)) &&
    (!styles.length || matchesAnyValue([artwork.genre], styles)) &&
    (!materials.length ||
      matchesAnyValue([artwork.mediums_used, artwork.materials_used], materials)) &&
    (!colors.length ||
      colors.some((color) => artworkMatchesColor(artwork.color_used, color)))
  );
}
