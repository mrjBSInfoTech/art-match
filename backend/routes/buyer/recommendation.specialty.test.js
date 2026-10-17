import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

// Exercise the actual route helpers without opening a database connection.
const source = readFileSync(new URL("./recommendation.js", import.meta.url), "utf8")
  .replace(/^import .*;\r?\n/gm, "")
  .replace("export default router;", "");
const setup = (query = async () => [[]]) => {
  const context = vm.createContext({
    express: { Router: () => ({ get() {}, post() {} }) },
    db: { promise: () => ({ query }) },
    process: { env: {} },
  });
  vm.runInContext(`${source}\n globalThis.helpers = {
    parseSellerSpecialties, getSpecialtyPreferences, getSpecialtyMatch,
    selectSpecialtyCandidates, rerankRecommendationCandidates,
    getActivityRecencyWeight, getRecentActivityBoost,
  };`, context);
  return context.helpers;
};
const plain = (value) => JSON.parse(JSON.stringify(value));
const artwork = (id, specialties = ["Landscape"]) => ({
  artwork_id: id, student_id: 1, seller_specialties: specialties,
});

test("recent activity fades by action order and age without a permanent floor", () => {
  const { getActivityRecencyWeight: weight } = setup();
  const now = Date.parse("2026-10-17T00:00:00Z");
  const event = { created_at: new Date(now).toISOString() };
  assert.equal(weight(event, 0, now), 1);
  assert.equal(weight(event, 1, now), 0.75);
  assert.equal(weight({ created_at: "2026-10-10T00:00:00Z" }, 0, now), 0.5);
  assert.ok(weight(event, 20, now) < 0.01);
});

test("new interest moves ahead of an older recommendation while retaining both", () => {
  const helpers = setup();
  const recommendations = helpers.rerankRecommendationCandidates({
    artworks: [
      { ...artwork(1), title: "Landscape", genre: "Landscape" },
      { ...artwork(2, ["Portrait"]), title: "Portrait", genre: "Portrait" },
    ],
    sasrecByArtworkId: new Map(), preferenceEvents: [], specialtyPreferences: new Map(),
    recentActivity: [
      { event_type: "search", search_query: "portrait", created_at: new Date().toISOString() },
      { event_type: "search", search_query: "landscape", created_at: new Date().toISOString() },
    ],
    artistAffinity: new Map(), popularityByArtworkId: new Map(),
    recencyRankByArtworkId: new Map([[1, 1], [2, 2]]), topK: 2,
  });
  assert.deepEqual(plain(recommendations.map((item) => item.artwork_id)), [2, 1]);
  assert.ok(recommendations[0].recent_activity_boost > recommendations[1].recent_activity_boost);
});

test("recent browsing matches metadata and removal cancels the older strong action", () => {
  const { getRecentActivityBoost: boost } = setup();
  const candidate = { ...artwork(2), genre: "Landscape", feature_scanned: "animals, water" };
  const favorite = { ...artwork(1), event_type: "favorite", genre: "Landscape", feature_scanned: "animals" };
  assert.equal(boost(candidate, [favorite]), 6);
  assert.equal(boost(candidate, [{ ...favorite, event_type: "unfavorite" }, favorite]), 0);
  assert.equal(boost(candidate, []), 0);
});

test("animal search and detail activity match scanned subjects, including viewed candidates", () => {
  const helpers = setup();
  const recommendations = helpers.rerankRecommendationCandidates({
    artworks: [
      { ...artwork(1), title: "Flower", feature_scanned: "flowers" },
      { ...artwork(2), title: "Bird", feature_scanned: "animals" },
      { ...artwork(3), title: "Fish", feature_scanned: "animals, water" },
    ],
    sasrecByArtworkId: new Map(),
    preferenceEvents: [{ event_type: "search", search_query: "animals" }],
    recentActivity: [{ ...artwork(99), event_type: "favorite", feature_scanned: "animals" }],
    specialtyPreferences: new Map(), artistAffinity: new Map(), popularityByArtworkId: new Map(),
    seenArtworkIds: new Set([2, 3]),
    recencyRankByArtworkId: new Map([[1, 1], [2, 2], [3, 3]]), topK: 20,
  });
  assert.equal(recommendations.length, 3);
  assert.equal(recommendations[0].artwork_id, 2);
  assert.equal(recommendations[1].artwork_id, 3);
  assert.ok(recommendations[0].preference_boost > 0);
  assert.equal(recommendations[0].recent_activity_boost, 6);
  assert.equal(recommendations[0].previously_seen, true);
  assert.equal(recommendations[0].seen_penalty, 0.75);
  assert.equal(recommendations[2].recent_activity_boost, 3);
});

test("specialties accept decoded/encoded arrays and safely ignore invalid values", () => {
  const { parseSellerSpecialties: parse } = setup();
  for (const value of [null, undefined, "{bad", '"Landscape"', {}]) {
    assert.deepEqual(plain(parse(value)), []);
  }
  assert.deepEqual(plain(parse(["Landscape", "landscape", 2, " Watercolor "])),
    ["landscape", "Watercolor"]);
  for (const value of [["Landscape", 2, " Watercolor "],
    '["Landscape","Watercolor"]', JSON.stringify('["Landscape","Watercolor"]')]) {
    assert.deepEqual(plain(parse(value)), ["Landscape", "Watercolor"]);
  }
});

test("behavior, partial search/filter matches and negative totals build a normalized profile", async () => {
  const calls = [];
  const helpers = setup(async (sql, params) => {
    calls.push({ sql, params });
    return sql.includes("SUM(CASE") ? [[
      { specialties: '["Landscape Painting"]', specialty_score: 3.5 },
      { specialties: ["Portrait"], specialty_score: -4 },
    ]] : [[{ specialties: ["Landscape Painting", "Watercolor Painting", "Portrait"] }]];
  });
  const preferences = await helpers.getSpecialtyPreferences({
    customerId: 7, sessionId: "guest-1",
    preferenceEvents: [
      { event_type: "search", search_query: "LANDSCAPE" },
      { event_type: "filter", filter_value: "Watercolor" },
    ],
  });
  assert.ok(preferences.get("landscape painting") > 3.5);
  assert.ok(preferences.get("watercolor painting") > 0);
  assert.equal(preferences.has("portrait"), false);
  assert.equal(calls.length, 2);
  assert.deepEqual(plain(calls[0].params), [7, "guest-1"]);
  assert.match(calls[0].sql, /customer_id IS NULL/);
  assert.match(calls[0].sql, /WHEN 'unfavorite' THEN -3 WHEN 'remove_cart' THEN -4/);
});

test("guest identity and no activity produce no specialty personalization", async () => {
  const calls = [];
  const helpers = setup(async (sql, params) => { calls.push({ sql, params }); return [[]]; });
  const preferences = await helpers.getSpecialtyPreferences({
    customerId: null, sessionId: "fresh-guest", preferenceEvents: [],
  });
  assert.equal(preferences.size, 0);
  assert.equal(calls.length, 1);
  assert.deepEqual(plain(calls[0].params), ["fresh-guest"]);
  assert.match(calls[0].sql, /customer_id IS NULL/);
  assert.equal(helpers.getSpecialtyMatch(artwork(1), preferences).specialty_boost, 0);
});

test("ML pool narrows to 60 for top 20 with matches first and nonmatches as padding", () => {
  const helpers = setup();
  const artworks = Array.from({ length: 100 }, (_, index) =>
    artwork(index + 1, index >= 70 ? ["Landscape"] : ["Portrait"]));
  const selected = helpers.selectSpecialtyCandidates(artworks, new Map([["landscape", 6]]), 20);
  assert.equal(selected.matchedCandidates, 30);
  assert.equal(selected.artworkIds.length, 60);
  assert.equal(selected.artworkIds[0], 71);
  assert.equal(selected.artworkIds[30], 1);
  assert.equal(artworks.length, 100);
});

test("sparse matches, small catalogs and empty profiles retain the full candidate pool", () => {
  const helpers = setup();
  const artworks = Array.from({ length: 100 }, (_, index) =>
    artwork(index + 1, index === 99 ? ["Landscape"] : []));
  assert.equal(helpers.selectSpecialtyCandidates(artworks, new Map([["landscape", 5]]), 20).artworkIds.length, 100);
  assert.equal(helpers.selectSpecialtyCandidates(artworks, new Map(), 20).artworkIds.length, 100);
  assert.equal(helpers.selectSpecialtyCandidates([artwork(1)], new Map([["landscape", 5]]), 1).artworkIds.length, 1);
});

test("unmapped artwork receives specialty fallback and bounded boost; SASRec remains stronger", () => {
  const helpers = setup();
  const recommendations = helpers.rerankRecommendationCandidates({
    artworks: [artwork(1), artwork(2), artwork(3, ["Portrait"])],
    sasrecByArtworkId: new Map([[2, { rank: 1, score: 0.1 }]]),
    preferenceEvents: [], specialtyPreferences: new Map([["landscape", 1000]]),
    artistAffinity: new Map(), popularityByArtworkId: new Map(),
    recencyRankByArtworkId: new Map([[1, 1], [2, 2], [3, 3]]), topK: 3,
  });
  assert.equal(recommendations[0].artwork_id, 2);
  assert.equal(recommendations[0].recommendation_source, "sasrec_specialty_reranked");
  const unmapped = recommendations.find((item) => item.artwork_id === 1);
  assert.equal(unmapped.sasrec_rank, null);
  assert.equal(unmapped.specialty_boost, 4);
  assert.equal(unmapped.recommendation_source, "specialty_fallback");
  assert.deepEqual(plain(unmapped.matched_specialties), ["Landscape"]);
  assert.equal(recommendations[2].specialty_boost, 0);
});
