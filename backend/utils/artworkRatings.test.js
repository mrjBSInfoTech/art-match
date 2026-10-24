import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateBayesianRating, getArtworkRatingSummary, getArtworkRatingSignal,
  getArtworkRatingSql, RATING_PRIOR_MEAN, RATING_PRIOR_WEIGHT,
} from "./artworkRatings.js";

test("Bayesian prior reduces low-count skew and keeps unreviewed artworks neutral", () => {
  assert.equal(RATING_PRIOR_MEAN, 3.5);
  assert.equal(RATING_PRIOR_WEIGHT, 5);
  assert.equal(calculateBayesianRating(0, 0), 3.5);
  assert.equal(calculateBayesianRating(5, 1), 3.75);
  assert.equal(calculateBayesianRating(90, 20), 4.3);
  assert.ok(calculateBayesianRating(90, 20) > calculateBayesianRating(5, 1));
  assert.equal(calculateBayesianRating(4, 1), 3.583333);
});

test("invalid aggregate values never produce NaN or a misleading rating", () => {
  for (const [sum, count] of [[NaN, 1], [Infinity, 1], [-1, 1], [6, 1], [5, -1], [5, 1.2], [5, Infinity]]) {
    assert.equal(calculateBayesianRating(sum, count), 3.5);
  }
});

test("empty summary reports no public average, zero distribution and neutral ranking", () => {
  for (const value of [[], null, undefined, {}, { rating_count: "0", rating_sum: null }]) {
    const summary = getArtworkRatingSummary(value);
    assert.equal(summary.total_reviews, 0);
    assert.equal(summary.average_rating, null);
    assert.equal(summary.ranking_rating, 3.5);
    assert.deepEqual(summary.rating_counts, { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
    assert.deepEqual(summary.distribution.map((entry) => entry.stars), [5, 4, 3, 2, 1]);
    assert.ok(summary.distribution.every((entry) => entry.count === 0 && entry.percentage === 0));
  }
});

test("raw reviews and grouped driver-string counts produce identical summaries", () => {
  const reviews = [{ rating: 5 }, { rating: "5" }, { rating: 4 }, { rating: 1 }];
  const grouped = [{ rating: "5", count: "2" }, { rating: 4, count: "1" }, { rating: 1, count: 1 }];
  const summary = getArtworkRatingSummary(reviews);
  assert.deepEqual(summary, getArtworkRatingSummary(grouped));
  assert.equal(summary.average_rating, 3.75);
  assert.equal(summary.bayesian_rating, 3.611111);
  assert.equal(summary.total_reviews, 4);
  assert.deepEqual(summary.rating_counts, { 1: 1, 2: 0, 3: 0, 4: 1, 5: 2 });
  assert.deepEqual(summary.distribution.map(({ percentage }) => percentage), [50, 25, 0, 0, 25]);
});

test("SQL aggregates and grouped reviews share the same rating calculation", () => {
  const aggregate = {
    rating_count: "4", rating_sum: "15", average_rating: "3.75",
    rating_1_count: "1", rating_2_count: "0", rating_3_count: "0", rating_4_count: "1", rating_5_count: "2",
  };
  assert.deepEqual(getArtworkRatingSummary(aggregate), getArtworkRatingSummary([5, 5, 4, 1]));
  assert.equal(getArtworkRatingSummary({ rating_count: "20", rating_sum: "90" }).ranking_rating, 4.3);
  assert.equal(getArtworkRatingSummary({ total_reviews: "20", average_rating: "4.5" }).ranking_rating, 4.3);
});

test("summaries remain stable when passed through catalog and recommendation normalization", () => {
  const complete = getArtworkRatingSummary([5, 5, 4, 1]);
  assert.deepEqual(getArtworkRatingSummary(complete), complete);
  const compact = getArtworkRatingSummary({ rating_count: 20, rating_sum: 90 });
  assert.equal(getArtworkRatingSummary(compact).ranking_rating, compact.ranking_rating);
  assert.equal(getArtworkRatingSignal(compact), getArtworkRatingSignal({ rating_count: 20, rating_sum: 90 }));
});

test("invalid raw stars and malformed group counts are excluded", () => {
  const summary = getArtworkRatingSummary([
    { rating: 5 }, { rating: 0 }, { rating: 6 }, { rating: 2.5 }, { rating: null },
    { rating: 4, count: -2 }, { rating: 3, count: "bad" }, { rating: "NaN" }, null,
  ]);
  assert.equal(summary.count, 1);
  assert.equal(summary.average, 5);
  assert.equal(summary.weighted_average, 3.75);
});

test("review signal is centered, bounded and neutral for unreviewed artwork", () => {
  assert.equal(getArtworkRatingSignal({}), 0);
  assert.equal(getArtworkRatingSignal({ rating_count: 0, rating_sum: 0 }), 0);
  assert.equal(getArtworkRatingSignal({ rating_count: 2, rating_sum: 7 }), 0);
  const positive = getArtworkRatingSignal({ rating_count: 10000, rating_sum: 50000 });
  assert.ok(positive > 0 && positive <= 0.25);
  assert.equal(getArtworkRatingSignal({ rating_count: 10000, rating_sum: 10000 }), -0.25);
  assert.ok(getArtworkRatingSignal({ rating_count: 20, rating_sum: 90 }) >
    getArtworkRatingSignal({ rating_count: 1, rating_sum: 5 }));
  assert.ok(getArtworkRatingSignal({ rating_count: 10000, rating_sum: 50000 }, 100) <= 0.25);
  assert.equal(getArtworkRatingSignal({ rating_count: 10000, rating_sum: 50000 }, -1), 0);
});

test("grouped SQL uses canonical reviews without multiplying catalog rows", () => {
  const sql = getArtworkRatingSql();
  assert.match(sql.join, /FROM artwork_reviews/);
  assert.match(sql.join, /GROUP BY artwork_id/);
  assert.match(sql.join, /rating_stats\.artwork_id = a\.artwork_id/);
  assert.match(sql.join, /rating BETWEEN 1 AND 5/);
  assert.match(sql.select, /AS rating_count/);
  assert.match(sql.select, /AS average_rating/);
  assert.match(sql.select, /17\.5/);
  assert.match(sql.select, /AS ranking_rating/);
  for (let stars = 1; stars <= 5; stars += 1) assert.match(sql.select, new RegExp(`AS rating_${stars}_count`));
  const custom = getArtworkRatingSql({ artworkAlias: "art", aggregateAlias: "reviews" });
  assert.match(custom.join, /reviews\.artwork_id = art\.artwork_id/);
  for (const value of ["a;DROP TABLE artwork", "a.b", "a`", "a b", ""]) {
    assert.throws(() => getArtworkRatingSql({ artworkAlias: value }), /Invalid rating SQL alias/);
    assert.throws(() => getArtworkRatingSql({ aggregateAlias: value }), /Invalid rating SQL alias/);
  }
});
