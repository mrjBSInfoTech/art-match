import assert from "node:assert/strict";
import test from "node:test";
import {
  ArtworkDetailsValidationError,
  getArtworkDetailsCategory,
  normalizeExactArtworkType,
  normalizeArtworkProductSettings,
  resolveArtworkDetails,
  validateArtworkDetails,
} from "./artworkDetails.js";

const painting = {
  is_fragile: true,
  humidity_sensitive: false,
  light_sensitive: true,
  material_composition: [" Oil on canvas ", "Acrylic", "oil ON canvas"],
  stock_available: 5,
};
const product = { stock_available: 0, material_composition: ["Resin", "Sterling silver"] };
const digital = {
  stock_available: 5,
  material_composition: ["Digital"],
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
    material_composition: ["Digital"],
    stock_available: 9,
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

test("artwork details are required even when the art type has no specialized fields", () => {
  assert.throws(() => resolveArtworkDetails({ artType: "Painting", product: "painting" }), ArtworkDetailsValidationError);
  assert.deepEqual(validateArtworkDetails({
    material_composition: ["Mixed media"],
    stock_available: 2,
  }, "Unknown", ""), {
    material_composition: ["Mixed media"],
    stock_available: 2,
  });
  assert.throws(() => validateArtworkDetails("{", "", ""), ArtworkDetailsValidationError);
});

test("legacy updates preserve details only while art type and product are unchanged", () => {
  const currentArtwork = { art_type: "Painting", product: "painting", artwork_details: painting };
  assert.deepEqual(resolveArtworkDetails({ artType: " painting ", product: "Painting", currentArtwork }), {
    ...painting,
    material_composition: ["Oil on canvas", "Acrylic"],
  });
  assert.deepEqual(resolveArtworkDetails({ artType: "Painting", product: "painting", currentArtwork: { ...currentArtwork, artwork_details: JSON.stringify(painting) } }), {
    ...painting,
    material_composition: ["Oil on canvas", "Acrylic"],
  });
  assert.throws(() => resolveArtworkDetails({ artType: "Architecture", product: "painting", currentArtwork }), ArtworkDetailsValidationError);
  assert.throws(() => resolveArtworkDetails({ artType: "Painting", product: "3d_object", currentArtwork }), ArtworkDetailsValidationError);
  assert.deepEqual(resolveArtworkDetails({ rawDetails: product, artType: "Sculpture", product: "3d_object", currentArtwork }), product);
});

test("customizable artwork cannot retain stock, and stage-payment stock is omitted", () => {
  const customized = {
    material_composition: ["Wood"],
    stock_available: 10,
  };
  assert.throws(
    () => validateArtworkDetails(customized, "Sculpture", "3d_object", "Customize"),
    /cannot include stock/,
  );
  assert.deepEqual(
    validateArtworkDetails(
      { material_composition: ["Wood"] },
      "Sculpture",
      "3d_object",
      "Customize",
    ),
    { material_composition: ["Wood"] },
  );
});

test("product payment settings enforce customization percentage boundaries", () => {
  assert.throws(() => normalizeArtworkProductSettings({}), /valid product type/);
  assert.throws(() => normalizeArtworkProductSettings({
    product_type: "Customize",
  }), /mode of payment/);
  assert.deepEqual(normalizeArtworkProductSettings({
    product_type: "Premade",
  }), {
    productType: "Premade",
    paymentMode: "straight",
    upfrontPercentage: null,
  });

  assert.deepEqual(normalizeArtworkProductSettings({
    product_type: " customize ",
    payment_mode: "stage_by_stage",
    upfront_percentage: "1",
  }), {
    productType: "Customize",
    paymentMode: "stage_by_stage",
    upfrontPercentage: 1,
  });
  assert.deepEqual(normalizeArtworkProductSettings({
    product_type: "Customize",
    payment_mode: "stage_by_stage",
    upfront_percentage: "99",
  }), {
    productType: "Customize",
    paymentMode: "stage_by_stage",
    upfrontPercentage: 99,
  });
  for (const percentage of ["", "0", "0.99", "100", "99.999", "abc"]) {
    assert.throws(() => normalizeArtworkProductSettings({
      product_type: "Customize",
      payment_mode: "stage_by_stage",
      upfront_percentage: percentage,
    }), ArtworkDetailsValidationError);
  }
  assert.deepEqual(normalizeArtworkProductSettings({
    product_type: "Digital",
    payment_mode: "straight",
  }), {
    productType: "Digital",
    paymentMode: "straight",
    upfrontPercentage: null,
  });
});

test("exact art type is required and bounded only for Customize", () => {
  assert.equal(normalizeExactArtworkType("Customize", "  paper sculpture  "), "paper sculpture");
  assert.equal(normalizeExactArtworkType("Painting", ""), null);
  for (const value of ["", "  ", 12, "x".repeat(101)]) {
    assert.throws(
      () => normalizeExactArtworkType("customize", value),
      ArtworkDetailsValidationError,
    );
  }
  assert.throws(
    () => normalizeExactArtworkType("Painting", "Oil painting"),
    /only be provided for Customize/,
  );
});
