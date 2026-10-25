import { isArtworkSoldOut } from "./artworkAvailability.js";

const EMPTY_TAGS = new Set([
  "", "none", "null", "undefined", "unknown", "n a", "na", "not applicable",
  "not available", "no medium detected", "no mediums detected", "no style",
  "no style detected", "no genre", "no genre detected",
]);

const TAG_ALIASES = new Map(Object.entries({
  "oil painting": "oil", "oil paint": "oil",
  "acrylic painting": "acrylic", "acrylic paint": "acrylic",
  "watercolour": "watercolor", "water color": "watercolor",
  "watercolor painting": "watercolor", "watercolour painting": "watercolor",
  "pastels": "pastel", "pastel painting": "pastel",
  "soft pastel": "pastel", "soft pastels": "pastel",
  "chalk pastel": "pastel", "chalk pastels": "pastel",
  "oil pastels": "oil pastel",
  "charcoal painting": "charcoal", "pencil painting": "pencil",
  "digital art": "digital", "digital painting": "digital",
  "landscapes": "landscape", "landscape painting": "landscape",
  "portraits": "portrait", "portrait painting": "portrait",
  "abstract art": "abstract", "abstract painting": "abstract",
  "minimalist": "minimalism", "minimalist art": "minimalism",
  "impressionist": "impressionism", "surrealist": "surrealism",
}));

const positiveId = (value) => {
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (typeof value === "string" && !/^\d+$/.test(value.trim())) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
};

const text = (value) => typeof value === "string" ? value.trim() : "";

const parseTags = (input) => {
  let value = input;
  // MySQL JSON values can arrive as arrays, JSON text, or double-encoded text.
  for (let depth = 0; depth < 2 && typeof value === "string"; depth += 1) {
    const trimmed = value.trim();
    if (!["[", "{", '"'].includes(trimmed[0])) break;
    try {
      value = JSON.parse(trimmed);
    } catch {
      return new Map();
    }
  }
  const values = Array.isArray(value)
    ? value
    : typeof value === "string" ? value.split(/[,;|]+/) : [];
  const tags = new Map();
  for (const item of values) {
    if (typeof item !== "string") continue;
    const normalized = item.normalize("NFKC").toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
    if (EMPTY_TAGS.has(normalized)) continue;
    const key = TAG_ALIASES.get(normalized) || normalized;
    if (!tags.has(key)) tags.set(key, item.trim());
  }
  return tags;
};

const sharedCount = (first, second) =>
  [...first.keys()].filter((key) => second.has(key)).length;

const compareMatchStrength = (first, second) =>
  first.tier - second.tier || second.mediumMatches - first.mediumMatches ||
  second.styleMatches - first.styleMatches;

export function getArtworkRelatedArtists(artwork, candidates, limit = 6) {
  const artworkId = positiveId(artwork?.artwork_id ?? artwork?.id);
  const sellerId = positiveId(artwork?.student_id ?? artwork?.artist_id);
  if (!artworkId || !sellerId || !Array.isArray(candidates) ||
    !Number.isSafeInteger(limit) || limit <= 0) return [];

  const sourceStyles = parseTags(artwork.genre);
  const sourceMediums = parseTags(artwork.mediums_used);
  if (!sourceStyles.size && !sourceMediums.size) return [];

  const eligibleArtworks = new Map();
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== "object") continue;
    const candidateId = positiveId(candidate.artwork_id ?? candidate.id);
    const artistId = positiveId(candidate.student_id ?? candidate.artist_id);
    if (!candidateId || !artistId || candidateId === artworkId || artistId === sellerId) continue;
    // In the buyer catalog, `status` describes seller registration. Availability
    // comes from stock and sold flags rather than that registration field.
    if (isArtworkSoldOut({ ...candidate, status: undefined })) continue;

    const styles = parseTags(candidate.genre);
    const mediums = parseTags(candidate.mediums_used);
    const styleMatches = sharedCount(sourceStyles, styles);
    const mediumMatches = sharedCount(sourceMediums, mediums);
    const match = {
      artwork: candidate, artworkId: candidateId, artistId, styles, mediums,
      styleMatches, mediumMatches,
      tier: mediumMatches && styleMatches ? 0 : mediumMatches ? 1 : styleMatches ? 2 : 3,
    };
    const previous = eligibleArtworks.get(candidateId);
    if (!previous || compareMatchStrength(match, previous) < 0) {
      eligibleArtworks.set(candidateId, match);
    }
  }

  const artists = new Map();
  for (const match of eligibleArtworks.values()) {
    if (!artists.has(match.artistId)) {
      artists.set(match.artistId, { artistId: match.artistId, works: 0, matches: [] });
    }
    const artist = artists.get(match.artistId);
    artist.works += 1;
    if (match.tier < 3) artist.matches.push(match);
  }

  const relatedArtists = [...artists.values()].filter((artist) => artist.matches.length);
  for (const artist of relatedArtists) {
    artist.matches.sort((first, second) =>
      compareMatchStrength(first, second) || first.artworkId - second.artworkId);
  }
  relatedArtists.sort((first, second) =>
    compareMatchStrength(first.matches[0], second.matches[0]) ||
    second.matches.length - first.matches.length || first.artistId - second.artistId);

  return relatedArtists.slice(0, limit).map((artist) => {
    const firstArtwork = artist.matches[0].artwork;
    const artistName = [text(firstArtwork.first_name), text(firstArtwork.last_name)]
      .filter(Boolean).join(" ") || text(firstArtwork.artist) || "Unknown Artist";
    const specialties = new Map();
    for (const match of artist.matches) {
      for (const [key, label] of [...match.mediums, ...match.styles]) {
        if (!specialties.has(key)) specialties.set(key, label);
      }
    }
    return {
      student_id: artist.artistId,
      name: text(firstArtwork.shop_name) || artistName,
      artistName,
      department: text(firstArtwork.course) || "Independent Artist",
      profile_image: text(firstArtwork.profile_image),
      bio: text(firstArtwork.shop_description),
      specialties: [...specialties.values()],
      works: artist.works,
      artworks: artist.matches.slice(0, 3).map((match) => match.artwork),
    };
  });
}
