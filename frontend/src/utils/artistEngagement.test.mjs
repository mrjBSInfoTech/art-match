import assert from "node:assert/strict";
import test from "node:test";
import { formatArtistRating } from "./artistEngagement.js";

test("artist ratings display one decimal place with numeric rounding", () => {
  assert.equal(formatArtistRating(4), "4.0");
  assert.equal(formatArtistRating(4.333), "4.3");
  assert.equal(formatArtistRating(4.666), "4.7");
  assert.equal(formatArtistRating(5), "5.0");
});

test("artists without a rating display zero instead of a placeholder score", () => {
  assert.equal(formatArtistRating(null), "0.0");
  assert.equal(formatArtistRating(undefined), "0.0");
});
