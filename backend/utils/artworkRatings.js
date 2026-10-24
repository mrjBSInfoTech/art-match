// Five neutral prior reviews keep a single five-star review from outranking
// an artwork with a substantial, consistently positive review history.
export const RATING_PRIOR_MEAN = 3.5;
export const RATING_PRIOR_WEIGHT = 5;

const safeCount = (value) => {
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 0 ? number : 0;
};
const round = (value, decimals) => Number(value.toFixed(decimals));

export function calculateBayesianRating(sum, count) {
  const reviews = safeCount(count);
  const total = Number(sum);
  if (!reviews || !Number.isFinite(total) || total < reviews || total > reviews * 5) {
    return RATING_PRIOR_MEAN;
  }
  return round((total + RATING_PRIOR_WEIGHT * RATING_PRIOR_MEAN) /
    (reviews + RATING_PRIOR_WEIGHT), 6);
}

/** Accept raw reviews, grouped {rating, count} rows, or one SQL aggregate row. */
export function getArtworkRatingSummary(input = []) {
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let count = 0;
  let sum = 0;
  if (Array.isArray(input)) {
    for (const row of input) {
      const rating = Number(typeof row === "object" && row !== null ? row.rating : row);
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) continue;
      const quantity = typeof row === "object" && row !== null && row.count !== undefined
        ? safeCount(row.count) : 1;
      counts[rating] += quantity;
    }
    count = Object.values(counts).reduce((total, quantity) => total + quantity, 0);
    sum = Object.entries(counts).reduce((total, [rating, quantity]) => total + Number(rating) * quantity, 0);
  } else if (input && typeof input === "object") {
    const declaredCount = safeCount(input.rating_count ?? input.total_reviews ?? input.count);
    let hasDistribution = Object.keys(counts).some((rating) =>
      input[`rating_${rating}_count`] !== undefined || input.rating_counts?.[rating] !== undefined);
    for (const rating of Object.keys(counts)) {
      counts[rating] = safeCount(input[`rating_${rating}_count`] ?? input.rating_counts?.[rating]);
    }
    const distributionCount = Object.values(counts).reduce((total, quantity) => total + quantity, 0);
    // Catalog consumers may only carry aggregate sum/count, with no breakdown.
    // Re-normalizing that summary must preserve its review count and score.
    hasDistribution = hasDistribution && (distributionCount > 0 || declaredCount === 0);
    if (hasDistribution) {
      count = distributionCount;
      sum = Object.entries(counts).reduce((total, [rating, quantity]) => total + Number(rating) * quantity, 0);
    } else {
      count = declaredCount;
      sum = Number(input.rating_sum ?? input.sum ??
        Number(input.average_rating ?? input.average) * count);
      if (!Number.isFinite(sum) || sum < count || sum > count * 5) {
        count = 0;
        sum = 0;
      }
    }
  }
  const average = count ? round(sum / count, 2) : null;
  const weighted = calculateBayesianRating(sum, count);
  return {
    count,
    rating_count: count,
    rating_sum: sum,
    average,
    weighted_average: weighted,
    distribution: [5, 4, 3, 2, 1].map((stars) => ({
      stars, count: counts[stars], percentage: count ? round(counts[stars] / count * 100, 2) : 0,
    })),
    total_reviews: count,
    average_rating: average,
    rating_counts: counts,
    bayesian_rating: weighted,
    ranking_rating: weighted,
    prior_mean: RATING_PRIOR_MEAN,
    prior_weight: RATING_PRIOR_WEIGHT,
  };
}

/** A small, centered quality signal; unrated artwork stays exactly neutral. */
export function getArtworkRatingSignal(artwork, maximum = 0.25) {
  const summary = getArtworkRatingSummary(artwork);
  if (!summary.count) return 0;
  const limit = Number.isFinite(maximum) ? Math.min(Math.max(maximum, 0), 0.25) : 0.25;
  return round(Math.max(-1, Math.min(1,
    (summary.ranking_rating - RATING_PRIOR_MEAN) / (5 - RATING_PRIOR_MEAN))) * limit, 6);
}

/** One grouped join avoids duplicated artworks and per-artwork review queries. */
export function getArtworkRatingSql({ artworkAlias = "a", aggregateAlias = "rating_stats" } = {}) {
  for (const alias of [artworkAlias, aggregateAlias]) {
    if (typeof alias !== "string" || !/^[a-z_][a-z\d_]*$/i.test(alias)) throw new Error("Invalid rating SQL alias.");
  }
  return {
    join: `LEFT JOIN (
      SELECT artwork_id, COUNT(*) AS rating_count, SUM(rating) AS rating_sum,
             AVG(rating) AS average_rating,
             ${[1, 2, 3, 4, 5].map((rating) => `SUM(CASE WHEN rating = ${rating} THEN 1 ELSE 0 END) AS rating_${rating}_count`).join(",\n             ")}
      FROM artwork_reviews
      WHERE rating BETWEEN 1 AND 5 AND rating = FLOOR(rating)
      GROUP BY artwork_id
    ) ${aggregateAlias} ON ${aggregateAlias}.artwork_id = ${artworkAlias}.artwork_id`,
    select: `COALESCE(${aggregateAlias}.rating_count, 0) AS rating_count,
             COALESCE(${aggregateAlias}.rating_sum, 0) AS rating_sum,
             ${aggregateAlias}.average_rating AS average_rating,
             ROUND((COALESCE(${aggregateAlias}.rating_sum, 0) + ${RATING_PRIOR_WEIGHT * RATING_PRIOR_MEAN}) /
               (COALESCE(${aggregateAlias}.rating_count, 0) + ${RATING_PRIOR_WEIGHT}), 6) AS ranking_rating,
             ${[1, 2, 3, 4, 5].map((rating) => `COALESCE(${aggregateAlias}.rating_${rating}_count, 0) AS rating_${rating}_count`).join(",\n             ")}`,
  };
}
