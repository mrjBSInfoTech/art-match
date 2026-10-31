import assert from "node:assert/strict";
import test from "node:test";
import {
  getProductOptionsErrors,
  getProductOptionsFromArtwork,
  getProductOptionsPayload,
  getProductOptionsStartingPrice,
  getProductOptionsTotalQuantity,
} from "./productOptions.js";

const options = [
  { id: "small", name: "Small print", description: "A small print", quantity: "3", image: null },
  { id: "large", name: "Large print", description: "A large print", quantity: "2", image: "large.webp" },
];

test("product artworks require at least two complete options", () => {
  assert.equal(getProductOptionsErrors(options).product_options, undefined);
  assert.match(getProductOptionsErrors(options.slice(0, 1)).product_options, /at least two/);
  assert.ok(getProductOptionsErrors([
    ...options.slice(0, 1),
    { ...options[1], quantity: "0" },
  ])[1].quantity);
  assert.ok(getProductOptionsErrors([
    ...options.slice(0, 1),
    { ...options[1], description: "" },
  ])[1].description);
});

test("saved product options are restored and file objects are excluded from JSON payloads", () => {
  const restored = getProductOptionsFromArtwork({
    art_type: "product",
    artwork_details: JSON.stringify({ product_options: options }),
  });
  assert.equal(restored[1].imagePreview, "large.webp");
  const payload = getProductOptionsPayload([
    { ...options[0], imageFile: { name: "upload.jpg" }, imagePreview: "data:image/jpeg;base64,abc" },
  ]);
  assert.deepEqual(payload, [{
    id: "small",
    name: "Small print",
    description: "A small print",
    quantity: 3,
    image: null,
  }]);
});

test("manual prices are required and shared-price mode omits per-option prices", () => {
  const manual = [
    { ...options[0], price: "15.50" },
    { ...options[1], price: "20" },
  ];
  assert.deepEqual(getProductOptionsErrors(manual, "manual"), {});
  assert.ok(getProductOptionsErrors([
    ...manual.slice(0, 1),
    { ...manual[1], price: "0" },
  ], "manual")[1].price);
  assert.equal(getProductOptionsStartingPrice(manual), 15.5);
  assert.deepEqual(
    getProductOptionsPayload(manual, "shared").map((option) => "price" in option),
    [false, false],
  );
  assert.deepEqual(
    getProductOptionsPayload(manual, "manual").map((option) => option.price),
    [15.5, 20],
  );
});

test("product stock is the sum of valid product quantities", () => {
  assert.equal(getProductOptionsTotalQuantity(options), 5);
  assert.equal(getProductOptionsTotalQuantity([
    ...options,
    { quantity: "invalid" },
  ]), 5);
});