import assert from "node:assert/strict";
import test from "node:test";
import { artworkMatchesColor } from "./artworkColors.js";

test("matches a named color even when another color is stored as a hex value", () => {
  assert.equal(artworkMatchesColor("Red, #1464ed", "Red"), true);
});

test("matches close hex shades across nearby color-family boundaries", () => {
  assert.equal(artworkMatchesColor("#f08a00", "Orange"), true);
  assert.equal(artworkMatchesColor("#ef2d3b", "Red"), true);
});

test("does not match unrelated hex colors", () => {
  assert.equal(artworkMatchesColor("#151632", "Yellow"), false);
});
