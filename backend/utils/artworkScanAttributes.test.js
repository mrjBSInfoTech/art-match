import assert from "node:assert/strict";
import test from "node:test";
import {
  ArtworkScanValidationError,
  applyArtworkScanOverrides,
  parseArtworkScanOverrides,
  resolveArtworkScanUpdate,
  usesFeaturesOnly,
} from "./artworkScanAttributes.js";

test("omitted scan fields remain automatic while explicit empty features clear", () => {
  assert.deepEqual(parseArtworkScanOverrides({}, "Painting", "painting"), {});
  assert.deepEqual(parseArtworkScanOverrides({ mediums_used: undefined, feature_scanned: undefined }, "Painting", "painting"), {});
  assert.deepEqual(parseArtworkScanOverrides({ feature_scanned: "[]" }, "Painting", "painting"), { feature_scanned: "None" });
  assert.deepEqual(parseArtworkScanOverrides({ mediums_used: " none " }, "Painting", "painting"), { mediums_used: "None" });
});

test("manual selections beat scan results, including an explicit empty selection", () => {
  const scanned = { feature_scanned: "Landscape", mediums_used: "Oil" };
  assert.deepEqual(applyArtworkScanOverrides(scanned, {}), scanned);
  assert.deepEqual(applyArtworkScanOverrides(scanned, parseArtworkScanOverrides({ mediums_used: " Pastel ", feature_scanned: "[]" }, "Painting", "painting")), {
    feature_scanned: "None", mediums_used: "Pastel",
  });
  assert.deepEqual(applyArtworkScanOverrides({}, { mediums_used: "None" }), { feature_scanned: null, mediums_used: "None" });
});

test("features trim and deduplicate case-insensitively and legacy medium strings survive", () => {
  assert.deepEqual(parseArtworkScanOverrides({
    mediums_used: " Acrylic, Oil ",
    feature_scanned: JSON.stringify([" Floral ", "Geometric", "floral"]),
  }, "Painting", "painting"), { mediums_used: "Acrylic, Oil", feature_scanned: "Floral, Geometric" });
});

test("features-only policy includes Photography, Print and legacy image categories", () => {
  for (const [type, product] of [["Photography", "image"], ["Photo", "image"], ["Print", "image"], ["Image", "image"], ["Physical", "image"], ["Auto", "image"]]) {
    assert.equal(usesFeaturesOnly(type, product), true);
    assert.deepEqual(parseArtworkScanOverrides({ mediums_used: "Oil" }, type, product), { mediums_used: "None" });
  }
  assert.equal(usesFeaturesOnly("Architecture", "painting"), false);
  assert.equal(usesFeaturesOnly("Digital", "painting"), false);
  assert.equal(parseArtworkScanOverrides({ mediums_used: "Pencil" }, "Digital", "painting").mediums_used, "Pencil");
});

test("invalid scan attributes fail with 400 before persistence", () => {
  for (const medium of [null, 1, false, [], {}, "", " ", "x".repeat(1001)]) {
    assert.throws(() => parseArtworkScanOverrides({ mediums_used: medium }, "Painting", "painting"), (error) => error instanceof ArtworkScanValidationError && error.status === 400);
  }
  for (const features of ["{", "null", "{}", '"Floral"', null, 5, {}, [4], [" "], ["x".repeat(101)], Array.from({ length: 51 }, (_, index) => String(index)), Array.from({ length: 11 }, (_, index) => `${index}${"x".repeat(99)}`)]) {
    assert.throws(() => parseArtworkScanOverrides({ feature_scanned: features }, "Painting", "painting"), ArtworkScanValidationError);
  }
});

test("same-category updates preserve omitted counterparts", () => {
  const current = { art_type: "Painting", product: "painting" };
  assert.deepEqual(resolveArtworkScanUpdate({}, " painting ", "painting", current), {});
  assert.deepEqual(resolveArtworkScanUpdate({ mediums_used: "Oil" }, "Painting", "painting", current), { mediums_used: "Oil" });
  assert.deepEqual(resolveArtworkScanUpdate({ feature_scanned: "Floral" }, "Painting", "painting", current), { feature_scanned: "Floral" });
});

test("type and product changes clear obsolete attributes while explicit selections win", () => {
  const current = { art_type: "Painting", product: "painting" };
  assert.deepEqual(resolveArtworkScanUpdate({}, "Digital", "painting", current), { feature_scanned: "None", mediums_used: "Digital" });
  assert.deepEqual(resolveArtworkScanUpdate({}, "Sculpture", "3d_object", current), { feature_scanned: "None", mediums_used: "None" });
  assert.deepEqual(resolveArtworkScanUpdate({}, "Painting", "3d_object", current), { feature_scanned: "None", mediums_used: "None" });
  assert.deepEqual(resolveArtworkScanUpdate({ mediums_used: "Pencil", feature_scanned: "Geometric" }, "Digital", "painting", current), { feature_scanned: "Geometric", mediums_used: "Pencil" });
  assert.deepEqual(resolveArtworkScanUpdate({ mediums_used: "Oil" }, "Photography", "image", current), { mediums_used: "None", feature_scanned: "None" });
  assert.deepEqual(resolveArtworkScanUpdate({}, "Photography", "image", { art_type: "Photography", product: "image" }), { mediums_used: "None" });
});
