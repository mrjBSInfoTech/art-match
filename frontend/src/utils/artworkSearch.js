import { artworkMatchesColor, getSearchColor } from "./artworkColors.js";
import { matchTwoDimensionalType } from "./artworkType.js";

const normalize = (value) => String(value ?? "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^\p{L}\p{N}]+/gu, " ")
  .trim();

// A negative score excludes an artwork; zero preserves catalog order without a query.
export function scoreArtworkSearch(artwork, query) {
  if (!query.trim()) return 0;
  const color = getSearchColor(query);
  if (color) return artworkMatchesColor(artwork.color_used, color) ? 1 : -1;
  const typeMatch = matchTwoDimensionalType(artwork, query);
  if (typeMatch !== null) return typeMatch ? 1 : -1;

  const phrase = normalize(query);
  if (!phrase) return -1;
  const fields = [
    [artwork.title, 8],
    [artwork.mediums_used, 6],
    [artwork.feature_scanned, 6],
    [artwork.genre, 5],
    [artwork.art_type, 5],
    [artwork.product, 5],
    [artwork.artist || artwork.student_name, 4],
    [artwork.shop_name, 4],
    [artwork.description, 2],
    [artwork.color_used, 2],
    [artwork.art_size, 2],
    [artwork.artwork_id ?? artwork.id, 1],
  ].map(([value, weight]) => [normalize(value), weight]);
  const tokens = [...new Set(phrase.split(" "))];
  let score = 0;
  for (const token of tokens) {
    // Match whole words or their beginnings: "ani" finds "animals", not "botanical".
    const matches = fields.filter(([text]) =>
      text.split(" ").some((word) => word.startsWith(token)),
    );
    const tokenColor = getSearchColor(token);
    if (!matches.length && !(tokenColor && artworkMatchesColor(artwork.color_used, tokenColor))) {
      return -1;
    }
    score += Math.max(1, ...matches.map(([, weight]) => weight));
  }
  for (const [text, weight] of fields) {
    if (text.includes(phrase)) score += weight;
    if (text === phrase) score += weight;
  }
  return score;
}
