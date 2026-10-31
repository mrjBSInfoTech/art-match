import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateProductOptionsTotal,
  normalizeProductDetails,
  validateProductOptionSelections,
} from "./productOptions.js";

const optionList = [
  { id: "small", name: "Small", description: "Small size", image: null, quantity: 3, price: 12.5 },
  { id: "large", name: "Large", description: "Large size", image: "large.webp", quantity: 2, price: 20 },
];

test("Product options require at least two unique, purchasable options", () => {
  assert.throws(() => normalizeProductDetails({ product_price_mode: "shared", product_options: [optionList[0]] }), /at least two/);
  assert.throws(() => normalizeProductDetails({
    product_price_mode: "shared",
    product_options: [optionList[0], { ...optionList[1], id: "small" }],
  }), /unique id/);
});

test("manual options preserve seller fields and require positive prices", () => {
  const details = normalizeProductDetails({ product_price_mode: "manual", product_options: optionList });
  assert.equal(details.product_options[1].price, 20);
  assert.throws(() => normalizeProductDetails({
    product_price_mode: "manual",
    product_options: [optionList[0], { ...optionList[1], price: 0 }],
  }), /positive price/);
});

test("selection prices are canonical for shared/manual mode and reject unknown IDs", () => {
  const selections = [{ id: "small", quantity: 2 }, { id: "large", quantity: 1 }];
  const shared = validateProductOptionSelections(selections, optionList, "shared", 15);
  assert.deepEqual(shared.map(({ unit_price }) => unit_price), [15, 15]);
  const manual = validateProductOptionSelections(selections, optionList, "manual", 12.5);
  assert.deepEqual(manual.map(({ unit_price }) => unit_price), [12.5, 20]);
  assert.equal(calculateProductOptionsTotal(manual), 45);
  assert.throws(() => validateProductOptionSelections([{ id: "unknown", quantity: 1 }], optionList, "manual", 1), /no longer available/);
});
