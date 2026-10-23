import assert from "node:assert/strict";
import test from "node:test";
import { getArtworkAvailability } from "./artworkAvailability.js";

test("stock-tracked artwork stays available until all units are purchased", () => {
  assert.deepEqual(getArtworkAvailability("3", 2), {
    hasStockTracking: true,
    remainingStock: 1,
    isSoldOut: false,
  });
});

test("zero stock and fully purchased stock are sold out", () => {
  assert.equal(getArtworkAvailability(0, 0).isSoldOut, true);
  assert.deepEqual(getArtworkAvailability(4, 4), {
    hasStockTracking: true,
    remainingStock: 0,
    isSoldOut: true,
  });
});

test("stock becomes available again when cancelled quantities are excluded", () => {
  assert.equal(getArtworkAvailability(1, 0).isSoldOut, false);
});

test("artwork without stock tracking becomes sold out after purchase", () => {
  assert.equal(getArtworkAvailability(null, 0).isSoldOut, false);
  assert.equal(getArtworkAvailability(null, 1).isSoldOut, true);
});

test("legacy sold marker overrides available stock", () => {
  assert.equal(getArtworkAvailability(5, 0, true).isSoldOut, true);
});
