import { computePreferenceScore } from "./interactionWeights.js";
import { cosineSimilarity } from "./similarity.js";

/**
 * Combines all action rows for each (buyer, artwork) pair
 * and turns them into two easy lookup tables:
 *   - userScores[customerId][artworkId] = score (1 to 5)
 *   - itemScores[artworkId][customerId] = score (1 to 5)
 */
export function buildScoreMatrices(interactionRows = []) {
  const combined = {};

  for (const row of interactionRows) {
    const customerId = String(row.customerId);
    const artworkId = String(row.artworkId);
    const pairKey = `${customerId}:${artworkId}`;

    if (!combined[pairKey]) {
      combined[pairKey] = {
        customerId,
        artworkId,
        favorited: false,
        inCart: false,
        purchased: false,
        rating: 0,
      };
    }

    if (row.favorited) combined[pairKey].favorited = true;
    if (row.inCart) combined[pairKey].inCart = true;
    if (row.purchased) combined[pairKey].purchased = true;
    if (Number(row.rating) > 0) combined[pairKey].rating = Number(row.rating);
  }

  const userScores = {};
  const itemScores = {};

  for (const entry of Object.values(combined)) {
    const score = computePreferenceScore(entry);
    if (score <= 0) continue;

    if (!userScores[entry.customerId]) userScores[entry.customerId] = {};
    if (!itemScores[entry.artworkId]) itemScores[entry.artworkId] = {};

    userScores[entry.customerId][entry.artworkId] = score;
    itemScores[entry.artworkId][entry.customerId] = score;
  }

  return { userScores, itemScores };
}

/**
 * Item-Based Collaborative Filtering recommender.
 *
 * Parameters:
 * - interactionRows: all buyers' favorites, cart items, purchases, and ratings
 * - targetCustomerId: the logged-in buyer's ID (or null for a guest)
 * - availableArtworkIds: currently available (verified, in-stock) artwork IDs
 * - topK: how many artworks to recommend (default: 4)
 */
export function recommendArtworks({
  interactionRows = [],
  targetCustomerId = null,
  availableArtworkIds = [],
  topK = 4,
} = {}) {
  const limit = Math.max(1, Number(topK) || 4);
  const availableIds = availableArtworkIds.map((id) => String(id));
  const { userScores, itemScores } = buildScoreMatrices(interactionRows);

  const buyerKey = targetCustomerId != null ? String(targetCustomerId) : null;
  const buyerHistory = buyerKey ? userScores[buyerKey] || {} : {};
  const buyerArtworkIds = Object.keys(buyerHistory);

  // Skip artworks the buyer already favorited, carted, bought, or rated
  const candidateIds = availableIds.filter(
    (artworkId) => !Object.prototype.hasOwnProperty.call(buyerHistory, artworkId),
  );

  // Part 1: Score every unseen artwork using Item-Based Collaborative Filtering
  const cfMatches = [];

  if (buyerArtworkIds.length > 0) {
    for (const candidateId of candidateIds) {
      const candidateVector = itemScores[candidateId];
      if (!candidateVector) continue;

      let weightedScore = 0;
      let similaritySum = 0;

      // Compare this unseen artwork against every artwork the buyer interacted with
      for (const likedArtworkId of buyerArtworkIds) {
        const likedVector = itemScores[likedArtworkId];
        if (!likedVector) continue;

        const sim = cosineSimilarity(candidateVector, likedVector);
        if (sim > 0) {
          weightedScore += sim * buyerHistory[likedArtworkId];
          similaritySum += sim;
        }
      }

      if (weightedScore > 0) {
        cfMatches.push({
          artworkId: candidateId,
          score: Number(weightedScore.toFixed(4)),
          similaritySum: Number(similaritySum.toFixed(4)),
          strategy: "item_based_cf",
        });
      }
    }

    // Put the highest-scoring recommendations first
    cfMatches.sort(
      (a, b) => b.score - a.score || b.similaritySum - a.similaritySum,
    );
  }

  const recommendations = cfMatches.slice(0, limit);

  // Part 2: Cold-Start Fallback
  // If the buyer is a guest, brand new, or doesn't have enough CF matches yet,
  // fill the remaining spots with the most popular available artworks.
  if (recommendations.length < limit) {
    const chosenIds = new Set(recommendations.map((item) => item.artworkId));

    const popularCandidates = candidateIds
      .filter((artworkId) => !chosenIds.has(artworkId))
      .map((artworkId) => {
        const buyers = itemScores[artworkId] || {};
        const totalPoints = Object.values(buyers).reduce(
          (sum, pts) => sum + pts,
          0,
        );
        return {
          artworkId,
          score: totalPoints,
          similaritySum: 0,
          strategy: "popular_fallback",
        };
      })
      .sort((a, b) => b.score - a.score);

    for (const item of popularCandidates) {
      if (recommendations.length >= limit) break;
      recommendations.push(item);
    }
  }

  return recommendations;
}