import test from "node:test";
import assert from "node:assert/strict";
import {
  INTERACTION_WEIGHTS,
  computePreferenceScore,
} from "./interactionWeights.js";
import { cosineSimilarity } from "./similarity.js";
import { buildScoreMatrices, recommendArtworks } from "./recommender.js";

test("computePreferenceScore uses strongest action or exact star rating", () => {
  assert.equal(computePreferenceScore({ favorited: true }), INTERACTION_WEIGHTS.favorite);
  assert.equal(computePreferenceScore({ favorited: true, inCart: true }), INTERACTION_WEIGHTS.cart);
  assert.equal(
    computePreferenceScore({ favorited: true, inCart: true, purchased: true }),
    INTERACTION_WEIGHTS.purchase,
  );
  // Explicit 1-star rating is trusted even though the buyer purchased it
  assert.equal(computePreferenceScore({ purchased: true, rating: 1 }), 1);
  assert.equal(computePreferenceScore({ purchased: true, rating: 5 }), 5);
});

test("cosineSimilarity returns 1 for identical patterns, 0 for no overlap, and a fraction for partial overlap", () => {
  const identical = cosineSimilarity({ 1: 4, 2: 2 }, { 1: 4, 2: 2 });
  assert.ok(Math.abs(identical - 1) < 1e-9);
  assert.equal(cosineSimilarity({ 1: 4 }, { 2: 4 }), 0);

  const partial = cosineSimilarity({ 1: 4, 2: 2 }, { 1: 5, 3: 4 });
  assert.ok(partial > 0 && partial < 1);
});

test("recommendArtworks recommends artworks co-liked by other buyers and skips already-seen or sold-out artworks", () => {
  const interactions = [
    // Buyer 1 liked Artwork 101 and bought Artwork 102
    { customerId: 1, artworkId: 101, favorited: true },
    { customerId: 1, artworkId: 102, purchased: true },
    // Buyer 2 bought Artwork 101 and rated Artwork 102 five stars
    { customerId: 2, artworkId: 101, purchased: true },
    { customerId: 2, artworkId: 102, purchased: true, rating: 5 },
    // Buyer 2 also bought Artwork 104 (which is sold out below)
    { customerId: 2, artworkId: 104, purchased: true },
    // Buyer 4 bought Artwork 103 (unrelated to 101)
    { customerId: 4, artworkId: 103, purchased: true },
    // Target Buyer 3 favorited Artwork 101
    { customerId: 3, artworkId: 101, favorited: true },
  ];

  // Artwork 104 is NOT in availableArtworkIds (simulating sold-out)
  const results = recommendArtworks({
    interactionRows: interactions,
    targetCustomerId: 3,
    availableArtworkIds: [101, 102, 103],
    topK: 2,
  });

  // First recommendation must be Artwork 102 via item-based CF
  assert.equal(results[0].artworkId, "102");
  assert.equal(results[0].strategy, "item_based_cf");
  assert.ok(results[0].score > 0);

  // Already-seen Artwork 101 and sold-out Artwork 104 must NOT appear
  const recommendedIds = results.map((item) => item.artworkId);
  assert.ok(!recommendedIds.includes("101"));
  assert.ok(!recommendedIds.includes("104"));

  // Second slot fills with Artwork 103 via popular fallback
  assert.equal(results[1].artworkId, "103");
  assert.equal(results[1].strategy, "popular_fallback");
});

test("removing a favorite drops the buyer's points when no other interaction exists", () => {
  const before = buildScoreMatrices([
    { customerId: 3, artworkId: 101, favorited: true },
    { customerId: 3, artworkId: 101, inCart: true },
  ]);
  assert.equal(before.userScores["3"]["101"], 3);

  // Buyer removes from cart, leaving only favorite (drops from 3 -> 2)
  const afterCartRemoved = buildScoreMatrices([
    { customerId: 3, artworkId: 101, favorited: true },
  ]);
  assert.equal(afterCartRemoved.userScores["3"]["101"], 2);

  // Buyer unfavorites too (drops to undefined / 0)
  const afterUnfavorite = buildScoreMatrices([]);
  assert.equal(afterUnfavorite.userScores["3"], undefined);
});

test("cold-start guests and new buyers receive popular available artworks", () => {
  const interactions = [
    { customerId: 1, artworkId: 201, favorited: true },
    { customerId: 2, artworkId: 202, purchased: true },
    { customerId: 3, artworkId: 202, rating: 5 },
  ];

  const guestResults = recommendArtworks({
    interactionRows: interactions,
    targetCustomerId: null,
    availableArtworkIds: [201, 202, 203],
    topK: 2,
  });

  assert.equal(guestResults.length, 2);
  assert.equal(guestResults[0].artworkId, "202"); // 4 + 5 = 9 points (most popular)
  assert.equal(guestResults[0].strategy, "popular_fallback");
  assert.equal(guestResults[1].artworkId, "201"); // 2 points
});
