import assert from "node:assert/strict";
import test from "node:test";
import {
  getArtworkDetailsErrors,
  getArtworkDetailsPayload,
} from "./artworkDetails.js";

test("premade artwork payload includes materials and stock", () => {
  const formData = {
    art_type: "painting",
    product: "painting",
    product_type: "Premade",
    is_fragile: false,
    humidity_sensitive: false,
    light_sensitive: false,
    material_composition: [" Canvas "],
    stock_available: "4",
  };
  assert.deepEqual(getArtworkDetailsPayload(formData), {
    is_fragile: false,
    humidity_sensitive: false,
    light_sensitive: false,
    material_composition: ["Canvas"],
    stock_available: 4,
  });
  assert.deepEqual(getArtworkDetailsErrors(formData), {});
});

test("customizable artwork omits stock and does not validate it", () => {
  const formData = {
    art_type: "sculpture",
    product: "3d_object",
    product_type: "Customize",
    material_composition: ["Wood"],
    stock_available: "",
  };
  assert.deepEqual(getArtworkDetailsPayload(formData), {
    material_composition: ["Wood"],
  });
  assert.deepEqual(getArtworkDetailsErrors(formData), {});
});

test("premade stock must be a nonnegative whole number", () => {
  const formData = {
    art_type: "painting",
    product_type: "Premade",
    material_composition: ["Canvas"],
    stock_available: "1.5",
  };
  assert.equal(
    getArtworkDetailsErrors(formData).stock_available,
    "Enter stock as a whole number of 0 or more.",
  );
});
