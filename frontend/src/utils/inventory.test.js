import assert from "node:assert/strict";
import test from "node:test";
import { isStockableInventoryProduct } from "./inventory.js";

test("legacy physical product listings are visible without a stockable flag", () => {
  assert.equal(isStockableInventoryProduct({ art_type: "product" }), true);
  assert.equal(
    isStockableInventoryProduct({
      art_type: "product",
      product_type: "Premade",
      artwork_details: {},
    }),
    true,
  );
});

test("digital, customizable, and explicitly non-stockable listings stay excluded", () => {
  assert.equal(
    isStockableInventoryProduct({ art_type: "product", product_type: "Digital" }),
    false,
  );
  assert.equal(
    isStockableInventoryProduct({ art_type: "product", product_type: "Customize" }),
    false,
  );
  assert.equal(
    isStockableInventoryProduct({
      art_type: "product",
      artwork_details: { stockable: false },
    }),
    false,
  );
  assert.equal(
    isStockableInventoryProduct({
      art_type: "product",
      artwork_details: { stockable: "false" },
    }),
    false,
  );
});

test("unmarked non-product artwork is not inferred as restockable", () => {
  assert.equal(isStockableInventoryProduct({ art_type: "painting" }), false);
});
