import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { rankSellerRelatedArtworks } from "../../utils/sellerArtworkRecommendations.js";

const artwork = (id, values = {}) => ({
  artwork_id: id, student_id: 9, title: `Artwork ${id}`, price: 100,
  image: "artwork.jpg", seller_specialties: [], ...values,
});

test("saved specialties recommend matching artists or metadata without source artworks", () => {
  const recommendations = rankSellerRelatedArtworks({
    sellerId: "007", specialties: JSON.stringify('["Digital Art","Watercolour"]'),
    candidates: [
      artwork(1, { art_type: "digital" }),
      artwork(2, { mediums_used: "Watercolor, Pencil" }),
      artwork(3, { seller_specialties: '["DIGITAL PAINTING"]' }),
      artwork(4, { seller_specialties: ["Sculpture"] }),
    ],
  });
  assert.deepEqual(recommendations.map((item) => item.artwork_id), [2, 1, 3]);
  assert.deepEqual(recommendations[0].matched_specialties, ["Watercolour"]);
  assert.deepEqual(recommendations[2].matched_specialties, ["Digital Art"]);
  assert.equal(recommendations[0].recommendation_source, "seller_specialties");
  assert.equal(recommendations[0].image, "artwork.jpg");
});

test("actual Oil and related Pastel mediums precede artist labels and generic artwork similarity", () => {
  const candidates = [
    artwork(1, { mediums_used: "Oil Painting", date_created: "2020-01-01" }),
    artwork(2, { mediums_used: "Soft Pastels", date_created: "2026-02-01" }),
    artwork(3, { mediums_used: '["Oil Pastels"]', date_created: "2026-01-01" }),
    artwork(4, {
      seller_specialties: ["Oil"], mediums_used: "Acrylic", genre: "Landscape, Portrait, Abstract",
      feature_scanned: "animal, flower, tree", art_type: "Painting", color_used: "Red, Blue, Green",
    }),
    artwork(5, {
      mediums_used: "Acrylic", genre: "Landscape, Portrait, Abstract", art_type: "Painting",
      feature_scanned: "animal, flower, tree", color_used: "Red, Blue, Green",
    }),
    artwork(6, { mediums_used: "Acrylic" }),
    artwork(7, { student_id: 7, mediums_used: "Oil" }),
    artwork(8, { seller_specialties: ["Pastels"], mediums_used: "Acrylic" }),
  ];
  const rank = (items) => rankSellerRelatedArtworks({
    sellerId: 7, specialties: ["Oil Painting"],
    sellerArtworks: [artwork(20, {
      student_id: 7, mediums_used: "Oil", genre: "Landscape, Portrait, Abstract",
      feature_scanned: "animal, flower, tree", art_type: "Painting", color_used: "Red, Blue, Green",
    })], candidates: items,
  });
  const recommendations = rank(candidates);
  assert.deepEqual(recommendations.map((item) => item.artwork_id), [1, 2, 3, 4, 5]);
  assert.deepEqual(rank([...candidates].reverse()).map((item) => item.artwork_id), [1, 2, 3, 4, 5]);
  assert.ok(recommendations[0].ranking_score < recommendations[4].ranking_score);
  assert.deepEqual(recommendations.map((item) => item.recommendation_priority), [0, 2, 2, 3, 4]);
  assert.deepEqual(recommendations[0].matched_specialties, ["Oil Painting"]);
  assert.deepEqual(recommendations[1].related_specialties, ["Oil Painting"]);
  assert.equal(recommendations[1].recommendation_source, "seller_specialties");
  assert.equal(recommendations[4].recommendation_source, "seller_artworks");
});

test("Pastel aliases and Oil Pastel aliases retain exact material priority", () => {
  for (const [specialty, exactMedium, relatedMedium] of [
    ["Pastels", "Soft Pastel", "Oil Painting"],
    ["Oil Pastels", "Oil Pastel", "Oil Paint"],
  ]) {
    const recommendations = rankSellerRelatedArtworks({
      sellerId: 7, specialties: [specialty],
      candidates: [artwork(1, { mediums_used: exactMedium }), artwork(2, { mediums_used: relatedMedium })],
    });
    assert.deepEqual(recommendations.map((item) => item.artwork_id), [1, 2]);
    assert.deepEqual(recommendations[0].matched_specialties, [specialty]);
    assert.deepEqual(recommendations[1].related_specialties, [specialty]);
  }
});

test("duplicate artwork IDs keep the strongest material match regardless of input order", () => {
  const candidates = [
    artwork(1, { mediums_used: "Oil" }),
    artwork(1, { seller_specialties: ["Oil"], mediums_used: "Acrylic" }),
  ];
  for (const items of [candidates, [...candidates].reverse()]) {
    const recommendations = rankSellerRelatedArtworks({ sellerId: 7, specialties: ["Oil"], candidates: items });
    assert.equal(recommendations.length, 1);
    assert.equal(recommendations[0].mediums_used, "Oil");
    assert.equal(recommendations[0].recommendation_priority, 0);
  }
});

test("artwork context ranks style, subjects and material above art type alone", () => {
  const recommendations = rankSellerRelatedArtworks({
    sellerId: 7, specialties: [],
    sellerArtworks: [artwork(20, {
      student_id: "7", art_type: "Painting", genre: "Minimalist",
      feature_scanned: '["Animals", "Flowers"]', mediums_used: "Oil Painting",
      color_used: "Red, Grey",
    })],
    candidates: [
      artwork(1, { art_type: "Painting", color_used: "Red" }),
      artwork(2, {
        art_type: "Painting", genre: "Minimalism", feature_scanned: "animal; flower",
        mediums_used: ["Oil"], color_used: '["Red", "gray"]',
      }),
      artwork(3, { art_type: "Photography", color_used: "Red" }),
      artwork(4, { feature_scanned: "Flowers" }),
    ],
  });
  assert.deepEqual(recommendations.map((item) => item.artwork_id), [2, 4, 1]);
  assert.deepEqual(recommendations[0].matched_attributes.feature_scanned, ["animal", "flower"]);
  assert.deepEqual(recommendations[0].matched_attributes.color_used, ["Red", "gray"]);
  assert.equal(recommendations[0].recommendation_source, "seller_artworks");
});

test("same seller, source artworks, malformed IDs and duplicate IDs cannot enter recommendations", () => {
  const recommendations = rankSellerRelatedArtworks({
    sellerId: 7, specialties: ["Landscape", "landscape"],
    sellerArtworks: [artwork(4, { student_id: 7 })],
    candidates: [
      artwork(1, { student_id: "007", genre: "Landscape" }),
      artwork(4, { genre: "Landscape" }),
      artwork(0, { genre: "Landscape" }),
      artwork("1.2", { genre: "Landscape" }),
      artwork(2, { student_id: null, genre: "Landscape" }),
      artwork("003", { genre: "Landscape" }),
      artwork(3, { genre: "Landscape" }),
      null,
    ],
  });
  assert.equal(recommendations.length, 1);
  assert.equal(recommendations[0].artwork_id, 3);
  assert.deepEqual(recommendations[0].matched_specialties, ["Landscape"]);
  assert.equal(recommendations[0].rank, 1);
});

test("empty or malformed metadata never supplies a match or arbitrary fallback", () => {
  for (const specialties of [null, "", "[broken", "{}", 4, [null, 2, " "]]) {
    assert.deepEqual(rankSellerRelatedArtworks({
      sellerId: 7, specialties,
      sellerArtworks: [artwork(1, {
        student_id: 7, genre: null, art_type: "", mediums_used: "No medium detected",
        feature_scanned: "No feature detected", color_used: "N/A",
      })],
      candidates: [artwork(2, {
        art_type: "", mediums_used: "No medium detected", feature_scanned: "No feature detected",
      })],
    }), []);
  }
  // The shared generic word "Painting" must not equate different specialties.
  assert.deepEqual(rankSellerRelatedArtworks({
    sellerId: 7, specialties: ["Oil Painting"],
    candidates: [artwork(1, { seller_specialties: ["Acrylic Painting"] })],
  }), []);
});

test("equal scores use creation date then artwork ID and respect the requested count", () => {
  const candidates = [
    artwork(1, { genre: "Portrait", date_created: "2026-01-01" }),
    artwork(2, { genre: "Portrait", date_created: "2026-02-01" }),
    artwork(3, { genre: "Portrait", date_created: "2026-02-01" }),
  ];
  const rank = (items) => rankSellerRelatedArtworks({
    sellerId: 7, specialties: ["Portrait"], candidates: items, topK: 2,
  }).map((item) => item.artwork_id);
  assert.deepEqual(rank(candidates), [3, 2]);
  assert.deepEqual(rank([...candidates].reverse()), [3, 2]);
});

const routeSource = readFileSync(new URL("./recommendation.js", import.meta.url), "utf8")
  .replace(/^import .*;\r?\n/gm, "")
  .replace("export default router;", "");

const setupRoute = (query) => {
  const routes = new Map();
  const context = vm.createContext({
    express: { Router: () => ({ get(path, handler) { routes.set(path, handler); }, post() {} }) },
    db: { promise: () => ({ query }) }, process: { env: {} }, console,
    rankSellerRelatedArtworks,
  });
  vm.runInContext(routeSource, context);
  return async (sellerId = "7", topK) => {
    const response = { status: 200, body: null };
    const res = {
      set() {}, status(value) { response.status = value; return this; },
      json(value) { response.body = value; return this; },
    };
    await routes.get("/seller/:sellerId")({ params: { sellerId }, query: { top_k: topK } }, res);
    return response;
  };
};

test("seller endpoint validates IDs and bounded counts before querying the database", async () => {
  const route = setupRoute(() => { throw new Error("Must not query"); });
  for (const id of ["0", "-1", "1.5", "1e2", "garbage", "9007199254740992"]) {
    assert.equal((await route(id)).status, 400);
  }
  for (const topK of ["0", "21", "all", "2.5", ["8"], "1e1"]) {
    assert.equal((await route("7", topK)).status, 400);
  }
});

test("seller endpoint uses approved context and available candidate filters without ML calls", async () => {
  const queries = [];
  const route = setupRoute(async (sql, params) => {
    queries.push({ sql, params });
    if (sql.includes("FROM student s")) return [[{ student_id: 7, specialties: '["Landscape"]' }]];
    if (sql.includes("SELECT DISTINCT")) return [[{ artwork_id: 1 }, { artwork_id: 2 }, { artwork_id: 3 }]];
    if (sql.includes("a.artwork_id IN")) return [[
      artwork(1, { student_id: 7, genre: "Landscape" }),
      artwork(2, { genre: "Landscape" }),
      artwork(3, { genre: "Portrait" }),
    ]];
    return [[]];
  });
  const response = await route("007", "1");
  assert.equal(response.status, 200);
  assert.equal(response.body.mode, "seller_related");
  assert.equal(response.body.seller_id, 7);
  assert.deepEqual(response.body.recommendations.map((item) => item.artwork_id), [2]);
  assert.ok(queries.every(({ sql }) => sql.includes("?") || sql.includes("SELECT DISTINCT")));
  const sourceQuery = queries.find(({ sql }) => sql.includes("WHERE a.student_id = ?"));
  assert.match(sourceQuery.sql, /au.request_status\) = 'verified'/);
  const candidateQuery = queries.find(({ sql }) => sql.includes("SELECT DISTINCT"));
  assert.match(candidateQuery.sql, /'available'/);
  assert.match(candidateQuery.sql, /a.is_sold/);
  assert.match(candidateQuery.sql, /register_status/);
  assert.match(candidateQuery.sql, /au.request_status/);
});

test("unknown sellers return 404 and known sellers with no matches return an empty list", async () => {
  assert.equal((await setupRoute(async () => [[]])()).status, 404);
  const route = setupRoute(async (sql) => sql.includes("FROM student s")
    ? [[{ student_id: 7, specialties: null }]] : [[]]);
  const response = await route();
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.recommendations, []);
});
