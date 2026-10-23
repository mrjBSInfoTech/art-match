import assert from "node:assert/strict";
import test from "node:test";
import { matchesArtworkCategoryFilters } from "./artworkCategoryFilters.js";

const artwork = {
  art_type: "Painting",
  product: "Painting",
  genre: "Modern",
  mediums_used: "Oil, Acrylic",
  color_used: "Red, Blue",
};

test("matches any selected option within a category group", () => {
  assert.equal(
    matchesArtworkCategoryFilters(artwork, {
      artTypes: ["Sculpture", "Painting"],
    }),
    true,
  );
});

test("requires selected options from separate groups to all match", () => {
  assert.equal(
    matchesArtworkCategoryFilters(artwork, {
      artTypes: ["Painting"],
      styles: ["Abstract"],
      materials: ["Oil"],
    }),
    false,
  );
  assert.equal(
    matchesArtworkCategoryFilters(artwork, {
      artTypes: ["Painting"],
      styles: ["Modern"],
      materials: ["Oil"],
    }),
    true,
  );
});

test("matches legacy JSON and comma-separated material values", () => {
  assert.equal(
    matchesArtworkCategoryFilters(
      { art_type: "Digital", genre: "Pop Art", mediums_used: '["Digital","Acrylic"]' },
      { artTypes: ["Digital"], styles: ["Pop Art"], materials: ["Acrylic"] },
    ),
    true,
  );
});

test("matches any selected color and allows an empty selection", () => {
  assert.equal(
    matchesArtworkCategoryFilters(artwork, { colors: ["Green", "Blue"] }),
    true,
  );
  assert.equal(matchesArtworkCategoryFilters(artwork, {}), true);
});
