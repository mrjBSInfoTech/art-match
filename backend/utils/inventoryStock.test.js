import assert from "node:assert/strict";
import test from "node:test";
import {
  attachArtworkOptionStock,
  calculateStockAdjustment,
  enrichArtworksWithOptionStock,
  getSelectedOptionSoldQuantities,
  isLegacyStockableProduct,
  MAX_STOCK_QUANTITY,
  parseStockAdjustment,
  serializeInventoryOptions,
} from "./inventoryStock.js";

test("legacy physical product listings without stock flags are inventory eligible", () => {
  assert.equal(isLegacyStockableProduct({ art_type: " Product " }), true);
  assert.equal(
    isLegacyStockableProduct({ art_type: "product", product_type: "Premade" }),
    true,
  );
  assert.equal(
    isLegacyStockableProduct({ art_type: "product", product_type: "Digital" }),
    false,
  );
  assert.equal(
    isLegacyStockableProduct({ art_type: "product", product_type: "Customize" }),
    false,
  );
  assert.equal(isLegacyStockableProduct({ art_type: "painting" }), false);
});

test("stock adjustments accept only a direction and a positive whole-number amount", () => {
  assert.deepEqual(parseStockAdjustment("add", "4"), {
    direction: "add",
    quantity: 4,
  });
  assert.deepEqual(parseStockAdjustment("reduce", 2), {
    direction: "reduce",
    quantity: 2,
  });
  assert.equal(parseStockAdjustment("set", 4), null);
  assert.equal(parseStockAdjustment("add", 0), null);
  assert.equal(parseStockAdjustment("reduce", "-1"), null);
  assert.equal(parseStockAdjustment("add", "1.5"), null);
  assert.equal(parseStockAdjustment("add", MAX_STOCK_QUANTITY + 1), null);
});

test("stock additions and reductions adjust available stock and preserve sold units", () => {
  assert.deepEqual(calculateStockAdjustment(12, 5, "add", 3), {
    availableStock: 10,
    recordedStock: 15,
  });
  assert.deepEqual(calculateStockAdjustment(12, 5, "reduce", 3), {
    availableStock: 4,
    recordedStock: 9,
  });
});

test("stock adjustments reject reducing more than available or exceeding the maximum", () => {
  assert.throws(
    () => calculateStockAdjustment(8, 5, "reduce", 4),
    /reduction exceeds the available stock/,
  );
  assert.throws(
    () => calculateStockAdjustment(MAX_STOCK_QUANTITY, 0, "add", 1),
    /supported limit/,
  );
});

test("selected product order quantities are tracked by artwork and option", () => {
  const sold = getSelectedOptionSoldQuantities([
    {
      artwork_id: 14,
      selected_products: JSON.stringify([
        { id: "print", quantity: 2 },
        { id: "sticker", quantity: 1 },
      ]),
    },
    {
      artwork_id: 14,
      selected_products: [{ id: "print", quantity: 3 }],
    },
    {
      artwork_id: 15,
      selected_products: [{ id: "print", quantity: 4 }],
    },
  ]);
  assert.equal(sold.get("14:print"), 5);
  assert.equal(sold.get("14:sticker"), 1);
  assert.equal(sold.get("15:print"), 4);

  assert.deepEqual(
    serializeInventoryOptions(
      [{ id: "print", quantity: 9 }],
      14,
      sold,
    ),
    [{ id: "print", quantity: 9, sold_quantity: 5, stock_quantity: 4 }],
  );
});

test("attachArtworkOptionStock and enrichArtworksWithOptionStock set remaining_stock and stock_quantity", async () => {
  const sold = new Map([["22:opt-a", 50]]);
  const enriched = attachArtworkOptionStock(
    {
      artwork_id: 22,
      art_type: "product",
      product_type: "Premade",
      is_sold_out: 0,
      artwork_details: JSON.stringify({
        product_price_mode: "shared",
        stock_available: 100,
        product_options: [{ id: "opt-a", name: "Edition", quantity: 100 }],
      }),
    },
    sold,
  );
  assert.equal(enriched.product_options[0].remaining_stock, 50);
  assert.equal(enriched.product_options[0].stock_quantity, 50);
  assert.equal(enriched.product_options[0].sold_quantity, 50);
  assert.equal(JSON.parse(enriched.artwork_details).product_options[0].remaining_stock, 50);
  assert.equal(enriched.is_sold_out, 0);

  const mockDb = {
    async query() {
      return [[{
        artwork_id: 22,
        selected_products: JSON.stringify([{ id: "opt-a", quantity: 50 }]),
      }]];
    },
  };
  const [row] = await enrichArtworksWithOptionStock(mockDb, [{
    artwork_id: 22,
    is_sold_out: 0,
    artwork_details: {
      stock_available: 100,
      product_options: [{ id: "opt-a", name: "Edition", quantity: 100 }],
    },
  }]);
  assert.equal(row.product_options[0].remaining_stock, 50);
  assert.equal(row.is_sold_out, 0);
});
