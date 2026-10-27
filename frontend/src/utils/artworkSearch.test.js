import assert from "node:assert/strict";
import test from "node:test";
import { scoreArtworkSearch } from "./artworkSearch.js";

const artwork = {
  title: "Red Hair",
  art_type: "Painting",
  genre: "Modern",
  mediums_used: "Oil",
  materials_used: "Canvas",
  feature_scanned: "portraits",
  color_used: "#f52245",
  artist: "Ava Reyes",
};

test("searches title, artist, type, style, materials, mediums, and features", () => {
  for (const query of ["Red Hair", "Ava", "Painting", "Modern", "Canvas", "Oil", "portraits"]) {
    assert.ok(scoreArtworkSearch(artwork, query) >= 0, `expected "${query}" to match`);
  }
});

test("matches all terms in a query across artwork fields", () => {
  assert.ok(scoreArtworkSearch(artwork, "modern oil portrait") >= 0);
  assert.equal(scoreArtworkSearch(artwork, "modern watercolor portrait"), -1);
});

test("supports artwork metadata stored as arrays", () => {
  assert.ok(scoreArtworkSearch({
    title: "Blue Garden",
    materials_used: ["linen", "acrylic"],
    features: ["flowers", "trees"],
  }, "linen flowers") >= 0);
});
