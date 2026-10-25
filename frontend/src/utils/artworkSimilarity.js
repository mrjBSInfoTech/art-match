const normalizeValues = (value) => {
  const values = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];

  return new Set(
    values
      .map((item) =>
        String(item)
          .trim()
          .toLowerCase()
          .replace(/[_-]+/g, " ")
          .replace(/\s+/g, " "),
      )
      .filter(Boolean),
  );
};

const sharedValueCount = (first, second) => {
  const firstValues = normalizeValues(first);
  const secondValues = normalizeValues(second);
  return [...firstValues].filter((value) => secondValues.has(value)).length;
};

const getSimilarityScore = (artwork, candidate) => {
  let score = 0;
  score += sharedValueCount(artwork.genre, candidate.genre) * 5;
  score += sharedValueCount(artwork.art_type, candidate.art_type) * 4;
  score += sharedValueCount(artwork.product, candidate.product) * 3;
  score += sharedValueCount(artwork.mediums_used, candidate.mediums_used) * 2;
  score += sharedValueCount(artwork.feature_scanned, candidate.feature_scanned);
  score += sharedValueCount(artwork.color_used, candidate.color_used);

  const artistId = artwork.student_id ?? artwork.artist_id;
  const candidateArtistId = candidate.student_id ?? candidate.artist_id;
  if (artistId != null && String(artistId) === String(candidateArtistId)) {
    score += 2;
  }

  return score;
};

export const getSimilarArtworks = (artwork, artworks, limit = 4) => {
  if (!artwork || !Array.isArray(artworks)) return [];

  const artworkId = artwork.artwork_id ?? artwork.id;
  return artworks
    .filter((candidate) => {
      const candidateId = candidate.artwork_id ?? candidate.id;
      return candidateId != null && String(candidateId) !== String(artworkId);
    })
    .map((candidate, index) => ({
      candidate,
      index,
      score: getSimilarityScore(artwork, candidate),
    }))
    .filter(({ score }) => score > 0)
    .sort((first, second) => second.score - first.score || first.index - second.index)
    .slice(0, limit)
    .map(({ candidate }) => candidate);
};
