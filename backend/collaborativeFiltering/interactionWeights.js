/**
 * Point values for buyer actions when there is no star review yet.
 * Stronger actions get higher points (on a 1 to 5 scale).
 */
export const INTERACTION_WEIGHTS = {
  favorite: 2,
  cart: 3,
  purchase: 4,
};

/**
 * Checks that a star review is a valid number between 1 and 5.
 * Returns 0 if the rating is missing or invalid.
 */
export function getRatingScore(rating) {
  const stars = Number(rating);
  if (!Number.isFinite(stars) || stars < 1 || stars > 5) {
    return 0;
  }
  return stars;
}

/**
 * Picks the final preference score (1 to 5) for one buyer on one artwork.
 * - If the buyer left a star review, we trust their exact star rating.
 * - Otherwise, we take their strongest action (Favorite = 2, Cart = 3, Purchase = 4).
 */
export function computePreferenceScore({
  favorited = false,
  inCart = false,
  purchased = false,
  rating = 0,
} = {}) {
  const starScore = getRatingScore(rating);
  if (starScore > 0) {
    return starScore;
  }

  let score = 0;
  if (favorited) score = Math.max(score, INTERACTION_WEIGHTS.favorite);
  if (inCart) score = Math.max(score, INTERACTION_WEIGHTS.cart);
  if (purchased) score = Math.max(score, INTERACTION_WEIGHTS.purchase);
  return score;
}