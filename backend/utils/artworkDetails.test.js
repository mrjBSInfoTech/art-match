import assert from "node:assert/strict";
import test from "node:test";
import {
  ArtworkDetailsValidationError,
  getArtworkDetailsCategory,
  resolveArtworkDetails,
  validateArtworkDetails,
} from "./artworkDetails.js";

const painting = {
  is_fragile: true,
  humidity_sensitive: false,
  light_sensitive: true,
  material_composition: [" Oil on canvas ", "Acrylic", "oil ON canvas"],
};
const product = { stock_available: 0, material_composition: ["Resin", "Sterling silver"] };
const digital = {
  resolution_width: 3000,
  resolution_height: 2000,
  file_format: "PNG",
  color_profile: "sRGB",
};

test("category follows art type before product, including digital's painting product", () => {
  for (const [type, selectedProduct, expected] of [
    ["Digital", "painting", "digital"],
    ["Digital Art", "painting", "digital"],
    ["Photography", "image", "digital"],
    ["Photo", "painting", "digital"],
    ["Painting", "painting", "fine_art"],
    ["Architecture", "painting", "fine_art"],
    ["Print", "image", "fine_art"],
    ["Sculpture", "3d_object", "product"],
    ["Product", "3d_object", "product"],
    ["Mixed Media", "painting", "fine_art"],
    ["Mixed Media", "3d_object", "product"],
    ["Mixed Media", "", null],
    ["Mixed Media", "image", null],
    ["Unknown", "image", null],
    ["Physical", "painting", "fine_art"],
    ["Physical", "image", "digital"],
    ["Physical", "3d_object", "product"],
    ["", "painting", null],
  ]) {
    assert.equal(getArtworkDetailsCategory(type, selectedProduct), expected, `${type} / ${selectedProduct}`);
  }
});

test("fine art trims and deduplicates composition while removing hidden category fields", () => {
  assert.deepEqual(validateArtworkDetails(JSON.stringify({ ...painting, ...digital, stock_available: 9 }), "Painting", "painting"), {
    is_fragile: true,
    humidity_sensitive: false,
    light_sensitive: true,
    material_composition: ["Oil on canvas", "Acrylic"],
  });
});

test("stock can be zero and only product fields are persisted", () => {
  assert.deepEqual(validateArtworkDetails({ ...painting, ...digital, ...product }, "Sculpture", "3d_object"), product);
  for (const stock of [-1, 1.5, "3", null, true, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => validateArtworkDetails({ ...product, stock_available: stock }, "Product", "3d_object"), ArtworkDetailsValidationError);
  }
});

test("Product artworks require at least two valid options and retain their details", () => {
  const productArtwork = {
    stock_available: 8,
    material_composition: ["Resin"],
    product_price_mode: "shared",
    product_options: [
      { id: "keychain", name: "Keychain", description: "Handmade keychain", quantity: 5, image: null },
      { id: "pin", name: "Pin", description: "Enamel pin", quantity: 3, image: "pin.webp" },
    ],
  };
  assert.deepEqual(validateArtworkDetails(productArtwork, "Product", "3d_object"), productArtwork);
  assert.equal(validateArtworkDetails({
    ...productArtwork,
    stock_available: 999,
  }, "Product", "3d_object").stock_available, 8);
  const manualArtwork = {
    ...productArtwork,
    stock_available: 8,
    product_price_mode: "manual",
    product_options: productArtwork.product_options.map((option, index) => ({
      ...option,
      price: index === 0 ? 12.5 : 20,
    })),
  };
  assert.deepEqual(validateArtworkDetails(manualArtwork, "Product", "3d_object"), manualArtwork);
  assert.throws(() => validateArtworkDetails({
    ...productArtwork,
    product_options: [productArtwork.product_options[0]],
  }, "Product", "3d_object"), /at least two/);
  assert.deepEqual(
    validateArtworkDetails(productArtwork, "Sculpture", "3d_object"),
    { stock_available: 8, material_composition: ["Resin"] },
  );
});

test("digital details use positive integer dimensions and exclude physical attributes", () => {
  assert.deepEqual(validateArtworkDetails({ ...painting, ...product, ...digital, file_format: " png " }, "Digital", "painting"), digital);
  for (const dimension of [0, -100, 0.5, "100", Number.MAX_SAFE_INTEGER + 1]) {
    for (const field of ["resolution_width", "resolution_height"]) {
      assert.throws(() => validateArtworkDetails({ ...digital, [field]: dimension }, "Digital", "painting"), ArtworkDetailsValidationError);
    }
  }
});

test("Photography supports RAW and rejects Digital-only formats", () => {
  assert.equal(validateArtworkDetails({ ...digital, file_format: "RAW" }, "Photography", "image").file_format, "RAW");
  assert.equal(validateArtworkDetails({ ...digital, file_format: "RAW" }, "Physical", "image").file_format, "RAW");
  for (const format of ["SVG", "PDF", "PSD"]) {
    assert.throws(() => validateArtworkDetails({ ...digital, file_format: format }, "Photography", "image"), ArtworkDetailsValidationError);
  }
  assert.equal(validateArtworkDetails({ ...digital, file_format: "PSD" }, "Digital", "painting").file_format, "PSD");
  for (const invalid of ["GIF", "", null, 7]) {
    assert.throws(() => validateArtworkDetails({ ...digital, file_format: invalid }, "Digital", "painting"), ArtworkDetailsValidationError);
  }
  assert.throws(() => validateArtworkDetails({ ...digital, color_profile: "unknown" }, "Digital", "painting"), ArtworkDetailsValidationError);
});

test("malformed JSON, nonobjects, invalid booleans and material constraints fail as 400 errors", () => {
  for (const invalid of ["{", "null", "[]", "7", null, [], 7, false]) {
    assert.throws(() => validateArtworkDetails(invalid, "Painting", "painting"), (error) => error instanceof ArtworkDetailsValidationError && error.status === 400);
  }
  for (const flag of ["is_fragile", "humidity_sensitive", "light_sensitive"]) {
    for (const value of ["false", "true", 0, 1, null, undefined]) {
      assert.throws(() => validateArtworkDetails({ ...painting, [flag]: value }, "Painting", "painting"), ArtworkDetailsValidationError);
    }
  }
  for (const tags of [undefined, [], [" "], ["x".repeat(101)], [3], new Array(11).fill("Oil")]) {
    assert.throws(() => validateArtworkDetails({ ...painting, material_composition: tags }, "Painting", "painting"), ArtworkDetailsValidationError);
  }
});

test("legacy creation can omit details and unknown category cannot retain unrelated metadata", () => {
  assert.equal(resolveArtworkDetails({ artType: "Painting", product: "painting" }), null);
  assert.equal(validateArtworkDetails({ ...painting, ...digital }, "", ""), null);
  assert.throws(() => validateArtworkDetails("{", "", ""), ArtworkDetailsValidationError);
});

test("legacy updates preserve details only while art type and product are unchanged", () => {
  const currentArtwork = { art_type: "Painting", product: "painting", artwork_details: painting };
  assert.deepEqual(resolveArtworkDetails({ artType: " painting ", product: "Painting", currentArtwork }), painting);
  assert.deepEqual(resolveArtworkDetails({ artType: "Painting", product: "painting", currentArtwork: { ...currentArtwork, artwork_details: JSON.stringify(painting) } }), painting);
  assert.equal(resolveArtworkDetails({ artType: "Architecture", product: "painting", currentArtwork }), null);
  assert.equal(resolveArtworkDetails({ artType: "Painting", product: "3d_object", currentArtwork }), null);
  assert.deepEqual(resolveArtworkDetails({ rawDetails: product, artType: "Sculpture", product: "3d_object", currentArtwork }), product);
});
