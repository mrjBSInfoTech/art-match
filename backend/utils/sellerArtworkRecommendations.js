const EMPTY_VALUES = new Set([
  "", "none", "null", "undefined", "unknown", "n a", "not applicable",
  "no feature detected", "no features detected", "no medium detected",
  "no mediums detected", "no color detected", "no colors detected",
]);

const ALIASES = new Map(Object.entries({
  "digital art": "digital", "digital painting": "digital",
  "oil painting": "oil", "oil paint": "oil",
  "charcoal painting": "charcoal", "pencil painting": "pencil",
  "pastels": "pastel", "pastel painting": "pastel",
  "soft pastel": "pastel", "soft pastels": "pastel",
  "chalk pastel": "pastel", "chalk pastels": "pastel",
  "oil pastels": "oil pastel",
  "acrylic painting": "acrylic", "acrylic paint": "acrylic",
  "watercolour": "watercolor", "water color": "watercolor",
  "watercolor painting": "watercolor", "watercolour painting": "watercolor",
  "landscapes": "landscape", "landscape painting": "landscape",
  "portraits": "portrait", "portrait painting": "portrait",
  "abstract art": "abstract", "abstract painting": "abstract",
  "minimalist": "minimalism", "minimalist art": "minimalism",
  "impressionist": "impressionism", "surrealist": "surrealism",
  "photo": "photography", "photograph": "photography", "photos": "photography",
  "sculptures": "sculpture", "prints": "print", "paintings": "painting",
  "animals": "animal", "flowers": "flower", "trees": "tree",
  "buildings": "building", "people": "person", "faces": "face",
  "grey": "gray",
}));

const normalizeTag = (value) => {
  if (typeof value !== "string") return "";
  const text = value.normalize("NFKC").toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
  return EMPTY_VALUES.has(text) ? "" : ALIASES.get(text) || text;
};

// JSON columns can arrive decoded, encoded, or double encoded from MySQL.
// Scanned metadata is also stored as comma-separated text in older records.
const parseTags = (input, arraysOnly = false) => {
  let value = input;
  for (let depth = 0; depth < 2 && typeof value === "string"; depth += 1) {
    const trimmed = value.trim();
    if (!/^[\[{"]/.test(trimmed)) break;
    try {
      value = JSON.parse(trimmed);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(value)) {
    if (arraysOnly || typeof value !== "string") return [];
    value = value.split(/[,;|]+/);
  }
  const tags = new Map();
  for (const item of value) {
    const key = normalizeTag(item);
    if (key && !tags.has(key)) tags.set(key, item.trim());
  }
  return [...tags].map(([key, label]) => ({ key, label }));
};

const ATTRIBUTES = [
  ["genre", 4], ["feature_scanned", 3], ["mediums_used", 3],
  ["art_type", 2], ["color_used", 0.5],
];

// Keep Oil Pastel distinct from Oil so that actual Oil works rank first.
// Related materials can still supply recommendations when no exact match exists.
const RELATED_MEDIUMS = new Map([
  ["oil", new Set(["pastel", "oil pastel"])],
  ["pastel", new Set(["oil", "oil pastel"])],
  ["oil pastel", new Set(["oil", "pastel"])],
]);

const compareRecommendations = (first, second) => {
  if (first.recommendation_priority !== second.recommendation_priority) {
    return first.recommendation_priority - second.recommendation_priority;
  }
  if (second.ranking_score !== first.ranking_score) return second.ranking_score - first.ranking_score;
  const firstDate = Date.parse(first.date_created) || 0;
  const secondDate = Date.parse(second.date_created) || 0;
  return secondDate - firstDate || second.artwork_id - first.artwork_id;
};

const positiveId = (value) => {
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (typeof value === "string" && !/^\d+$/.test(value.trim())) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
};

export const rankSellerRelatedArtworks = ({
  sellerId, specialties, sellerArtworks = [], candidates = [], topK = 8,
}) => {
  const sourceSellerId = positiveId(sellerId);
  if (!sourceSellerId) return [];

  const sourceSpecialties = parseTags(specialties, true);
  const sourceAttributes = new Map(ATTRIBUTES.map(([field]) => [field, new Set()]));
  const sourceIds = new Set();
  for (const artwork of sellerArtworks) {
    if (!artwork || positiveId(artwork.student_id) !== sourceSellerId) continue;
    const artworkId = positiveId(artwork.artwork_id);
    if (artworkId) sourceIds.add(artworkId);
    for (const [field] of ATTRIBUTES) {
      parseTags(artwork[field]).forEach(({ key }) => sourceAttributes.get(field).add(key));
    }
  }

  const rankedById = new Map();
  for (const artwork of candidates) {
    if (!artwork || typeof artwork !== "object") continue;
    const artworkId = positiveId(artwork.artwork_id);
    const artistId = positiveId(artwork.student_id);
    if (!artworkId || !artistId || artistId === sourceSellerId || sourceIds.has(artworkId)) continue;

    const candidateSpecialties = parseTags(artwork.seller_specialties, true);
    const attributes = new Map(ATTRIBUTES.map(([field]) => [field, parseTags(artwork[field])]));
    const artworkTags = new Set([...attributes.values()].flat().map(({ key }) => key));
    const candidateTags = new Set([...candidateSpecialties.map(({ key }) => key), ...artworkTags]);
    const matchedSpecialties = sourceSpecialties.filter(({ key }) => candidateTags.has(key));
    const artworkSpecialties = sourceSpecialties.filter(({ key }) => artworkTags.has(key));
    const mediumTags = new Set(attributes.get("mediums_used").map(({ key }) => key));
    const mediumSpecialties = sourceSpecialties.filter(({ key }) => mediumTags.has(key));
    const relatedSpecialties = sourceSpecialties.filter(({ key }) =>
      [...(RELATED_MEDIUMS.get(key) || [])].some((medium) => mediumTags.has(medium)));
    const matchedAttributes = {};
    let score = Math.min(matchedSpecialties.length, 3) * 5;
    for (const [field, weight] of ATTRIBUTES) {
      const matches = attributes.get(field).filter(({ key }) => sourceAttributes.get(field).has(key));
      if (!matches.length) continue;
      matchedAttributes[field] = matches.map(({ label }) => label);
      score += Math.min(matches.length, 3) * weight;
    }
    // A shared color supports an actual specialty/type/subject/material match;
    // color alone would fill the section with otherwise unrelated artwork.
    if (!matchedSpecialties.length && !relatedSpecialties.length &&
      !Object.keys(matchedAttributes).some((field) => field !== "color_used")) continue;

    // Specialty matches are strict tiers: similarity points must never push an
    // unrelated medium or an artist's profile label ahead of the artwork itself.
    const priority = mediumSpecialties.length ? 0
      : artworkSpecialties.length ? 1
        : relatedSpecialties.length ? 2
          : matchedSpecialties.length ? 3 : 4;

    const ranked = {
      ...artwork,
      artwork_id: artworkId,
      student_id: artistId,
      seller_specialties: candidateSpecialties.map(({ label }) => label),
      matched_specialties: matchedSpecialties.map(({ label }) => label),
      related_specialties: relatedSpecialties.map(({ label }) => label),
      matched_attributes: matchedAttributes,
      recommendation_source: matchedSpecialties.length || relatedSpecialties.length
        ? "seller_specialties" : "seller_artworks",
      recommendation_priority: priority,
      ranking_score: score,
    };
    const previous = rankedById.get(artworkId);
    if (!previous || compareRecommendations(ranked, previous) < 0) rankedById.set(artworkId, ranked);
  }

  return [...rankedById.values()].sort(compareRecommendations)
    .slice(0, topK).map((artwork, index) => ({ ...artwork, rank: index + 1 }));
};
