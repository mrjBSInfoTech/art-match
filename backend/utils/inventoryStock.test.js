import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateStockAdjustment,
  getSelectedOptionSoldQuantities,
  MAX_STOCK_QUANTITY,
  parseStockAdjustment,
  serializeInventoryOptions,
} from "./inventoryStock.js";

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
