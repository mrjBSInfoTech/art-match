/**
 * Measures how similar two artworks are using Cosine Similarity.
 *
 * Each artwork is given as an object of { buyerId: score }, for example:
 *   artworkA = { 1: 4, 2: 2 }
 *   artworkB = { 1: 5, 2: 2, 3: 4 }
 *
 * Returns a number from 0 (nothing in common) to 1 (very similar).
 */
export function cosineSimilarity(artworkAScores = {}, artworkBScores = {}) {
  let dotProduct = 0;
  let sumSquaresA = 0;
  let sumSquaresB = 0;

  // Step 1: Add up squared scores for Artwork A,
  // and multiply scores for buyers who interacted with BOTH A and B.
  for (const [buyerId, scoreA] of Object.entries(artworkAScores)) {
    const a = Number(scoreA) || 0;
    sumSquaresA += a * a;

    if (Object.prototype.hasOwnProperty.call(artworkBScores, buyerId)) {
      const b = Number(artworkBScores[buyerId]) || 0;
      dotProduct += a * b;
    }
  }

  // Step 2: Add up squared scores for Artwork B.
  for (const scoreB of Object.values(artworkBScores)) {
    const b = Number(scoreB) || 0;
    sumSquaresB += b * b;
  }

  // If either artwork has no scores, or no shared buyers, similarity is 0.
  if (dotProduct === 0 || sumSquaresA === 0 || sumSquaresB === 0) {
    return 0;
  }

  const magnitudeA = Math.sqrt(sumSquaresA);
  const magnitudeB = Math.sqrt(sumSquaresB);

  return dotProduct / (magnitudeA * magnitudeB);
}