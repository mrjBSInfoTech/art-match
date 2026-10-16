import test from "node:test";
import assert from "node:assert/strict";
import { scoreArtworkSearch } from "./artworkSearch.js";

test("partial queries include every title and feature match without incidental substrings", () => {
  const artworks = [
    { id: 1, title: "Animal Kingdom" },
    { id: 2, title: "Forest", feature_scanned: '["trees", "animals"]' },
    { id: 3, title: "Botanical Garden", feature_scanned: "flowers" },
    { id: 4, title: "Ocean", feature_scanned: null },
    { id: 5, title: "Wildlife", feature_scanned: ["animal portrait"] },
  ];
  const matches = artworks.filter((artwork) => scoreArtworkSearch(artwork, "ani") >= 0);
  assert.deepEqual(matches.map(({ id }) => id), [1, 2, 5]);
  assert(scoreArtworkSearch(artworks[0], "ani") > scoreArtworkSearch(artworks[1], "ani"));
});

test("all query words must match, including across different artwork fields", () => {
  const artwork = { title: "Animal Kingdom", mediums_used: "Acrylic", feature_scanned: "animals", color_used: "#1464ed" };
  assert(scoreArtworkSearch(artwork, "ANI acry blue") >= 0);
  assert(scoreArtworkSearch(artwork, "ani watercolor") < 0);
  assert(scoreArtworkSearch(artwork, "ani red") < 0);
});

test("search handles missing values, punctuation, accents, and empty queries", () => {
  assert(scoreArtworkSearch({ title: "Caf\u00e9: Animals" }, "CAFE ani") >= 0);
  assert(scoreArtworkSearch({}, "ani") < 0);
  assert.equal(scoreArtworkSearch({}, "  "), 0);
  assert(scoreArtworkSearch({}, "!!!") < 0);
});
