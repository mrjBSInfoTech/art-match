import assert from "node:assert/strict";
import test from "node:test";
import {
  buildColdStartRecommendationResponse,
  getFollowedArtistBoost,
  hasActiveRecommendationSignals,
  mergeFollowedArtistPreferences,
  selectSasrecSeedArtworkIds,
} from "../utils/recommendationSignals.js";
import { rerankRecommendationCandidates } from "../routes/buyer/recommendation.js";

test("cold-start and orphan cancellations have no activity and return empty recommendations", () => {
  assert.equal(
    hasActiveRecommendationSignals({
      artworkIds: [],
      preferenceEvents: [],
      recentActivity: [],
      artistAffinity: new Map(),
      specialtyPreferences: new Map(),
      followedArtists: [],
    }),
    false,
  );

  assert.equal(
    hasActiveRecommendationSignals({
      artworkIds: [],
      preferenceEvents: [],
      recentActivity: [
        { event_type: "unfavorite", artwork_id: 10 },
        { event_type: "remove_cart", artwork_id: 11 },
      ],
      artistAffinity: new Map(),
      specialtyPreferences: new Map(),
      followedArtists: [],
    }),
    false,
  );

  const emptyResponse = buildColdStartRecommendationResponse({
    personalizationAllowed: true,
    eligibleCandidates: 12,
    availableUnseen: 12,
  });
  assert.equal(emptyResponse.mode, "no_activity");
  assert.equal(emptyResponse.cold_start, true);
  assert.equal(emptyResponse.has_activity, false);
  assert.deepEqual(emptyResponse.recommendations, []);

  const optedOutResponse = buildColdStartRecommendationResponse({
    personalizationAllowed: false,
    eligibleCandidates: 12,
    availableUnseen: 12,
  });
  assert.equal(optedOutResponse.mode, "personalization_disabled");
  assert.deepEqual(optedOutResponse.recommendations, []);
});

test("following an artist alone activates personalized signals and merges specialties", () => {
  const followedArtists = [
    {
      student_id: 42,
      created_at: new Date().toISOString(),
      seller_specialties: ["Watercolor", "Portraits"],
    },
  ];

  const merged = mergeFollowedArtistPreferences({
    artistAffinity: new Map(),
    specialtyPreferences: new Map(),
    followedArtists,
  });

  assert.equal(
    hasActiveRecommendationSignals({
      artworkIds: [],
      preferenceEvents: [],
      recentActivity: [],
      artistAffinity: merged.artistAffinity,
      specialtyPreferences: merged.specialtyPreferences,
      followedArtists,
    }),
    true,
  );
  assert.ok((merged.artistAffinity.get(42) ?? 0) >= 5);
  assert.ok((merged.specialtyPreferences.get("watercolor") ?? 0) > 1);
  assert.ok(getFollowedArtistBoost(42, merged.followedArtistById) >= 6);
  assert.equal(getFollowedArtistBoost(99, merged.followedArtistById), 0);

  const seeds = selectSasrecSeedArtworkIds({
    artworkIds: [],
    preferenceEvents: [],
    followedArtistById: merged.followedArtistById,
    candidateArtworks: [
      { artwork_id: 101, student_id: 99 },
      { artwork_id: 202, student_id: 42 },
      { artwork_id: 203, student_id: 42 },
    ],
  });
  assert.deepEqual(seeds, [202, 203]);
});

test("rerankRecommendationCandidates boosts artworks from followed artists above unrelated popular works", () => {
  const followedArtists = [
    {
      student_id: 42,
      created_at: new Date().toISOString(),
      seller_specialties: ["Acrylic"],
    },
  ];
  const {
    artistAffinity,
    specialtyPreferences,
    followedArtistById,
  } = mergeFollowedArtistPreferences({
    artistAffinity: new Map(),
    specialtyPreferences: new Map(),
    followedArtists,
  });

  const artworks = [
    {
      artwork_id: 1,
      student_id: 99,
      title: "Popular Unrelated Work",
      genre: "Abstract",
      art_type: "Canvas",
      product: "Original",
      seller_specialties: ["Sculpture"],
      rating_count: 20,
      rating_sum: 100,
    },
    {
      artwork_id: 2,
      student_id: 42,
      title: "Followed Artist Work",
      genre: "Landscape",
      art_type: "Paint",
      product: "Original",
      seller_specialties: ["Acrylic"],
      rating_count: 0,
      rating_sum: 0,
    },
  ];

  const ranked = rerankRecommendationCandidates({
    artworks,
    sasrecByArtworkId: new Map(),
    preferenceEvents: [],
    specialtyPreferences,
    recentActivity: [],
    seenArtworkIds: new Set(),
    artistAffinity,
    followedArtistById,
    popularityByArtworkId: new Map([
      [1, 50],
      [2, 0],
    ]),
    recencyRankByArtworkId: new Map([
      [1, 1],
      [2, 10],
    ]),
    topK: 4,
  });

  assert.equal(ranked[0].artwork_id, 2);
  assert.equal(ranked[0].is_followed_artist, true);
  assert.ok(ranked[0].follow_boost >= 6);
  assert.equal(ranked[0].recommendation_source, "followed_artist_reranked");
  assert.equal(ranked[1].artwork_id, 1);
  assert.equal(ranked[1].is_followed_artist, false);
  assert.equal(ranked[1].follow_boost, 0);
});

