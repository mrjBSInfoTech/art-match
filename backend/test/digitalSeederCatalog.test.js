import assert from "node:assert/strict";
import test from "node:test";
import { DIGITAL_SELLER_PROFILES } from "../database/seeders/digitalCatalog.js";
import { PAINTING_SELLER_PROFILES } from "../database/seeders/paintingsCatalog.js";
import { SCULPTURE_SELLER_PROFILES } from "../database/seeders/sculpturesCatalog.js";
import { PRODUCT_SELLER_PROFILES } from "../database/seeders/productsCatalog.js";
import { parseSeedCliArgs, validateCatalogItem } from "../database/seeders/sellerCatalogSeeder.js";

test("digital seller catalog has 3 sellers with 20 valid artworks and storefronts each", () => {
  assert.equal(DIGITAL_SELLER_PROFILES.length, 3);

  const seenTitles = new Set();
  for (const profile of DIGITAL_SELLER_PROFILES) {
    assert.ok(profile.shopName.trim().length > 0 && profile.shopName.length <= 60);
    assert.ok(profile.shopDescription.trim().length >= 40);
    assert.ok(Array.isArray(profile.specialties) && profile.specialties.length >= 1 && profile.specialties.length <= 3);
    assert.equal(profile.artworks.length, 20);

    for (const item of profile.artworks) {
      assert.ok(!seenTitles.has(item.title), `Duplicate title: ${item.title}`);
      seenTitles.add(item.title);
      assert.ok(Number.isFinite(item.price) && item.price > 0);
      assert.ok(item.description.trim().length >= 30);
      assert.ok(item.care_instructions.trim().length >= 15);
      assert.ok(item.color_used.trim().length > 0);
      assert.ok(item.art_size.trim().length > 0);
      assert.ok(item.feature_scanned.trim().length > 0);

      const validated = validateCatalogItem(item);
      assert.equal(validated.artType, "Digital");
      assert.equal(validated.productType, "Digital");
      assert.ok(validated.validatedDetails.resolution_width > 0);
      assert.ok(validated.validatedDetails.resolution_height > 0);
      assert.ok(validated.validatedDetails.file_format);
      assert.ok(validated.validatedDetails.color_profile);
    }
  }
});

test("painting seller catalog splits Acrylic+Oil, Watercolor+Pastel, and Charcoal+Pencil (20 each)", () => {
  assert.equal(PAINTING_SELLER_PROFILES.length, 3);
  const expectedMediumPairs = [
    ["Acrylic", "Oil"],
    ["Watercolor", "Pastel"],
    ["Charcoal", "Pencil"],
  ];
  const seenTitles = new Set(
    DIGITAL_SELLER_PROFILES.flatMap((profile) => profile.artworks.map((item) => item.title)),
  );

  PAINTING_SELLER_PROFILES.forEach((profile, index) => {
    assert.equal(profile.folder, `paintings/seller-${index + 1}`);
    assert.ok(profile.shopName.trim().length > 0 && profile.shopName.length <= 60);
    assert.ok(profile.shopDescription.trim().length >= 40);
    assert.ok(Array.isArray(profile.specialties) && profile.specialties.length >= 1 && profile.specialties.length <= 3);
    assert.equal(profile.artworks.length, 20);

    const counts = new Map();
    for (const item of profile.artworks) {
      assert.ok(!seenTitles.has(item.title), `Duplicate title: ${item.title}`);
      seenTitles.add(item.title);
      assert.ok(item.assetFolder.startsWith(profile.folder), `Missing assetFolder on ${item.title}`);
      assert.ok(expectedMediumPairs[index].includes(item.mediums_used), `Unexpected medium: ${item.mediums_used}`);
      counts.set(item.mediums_used, (counts.get(item.mediums_used) || 0) + 1);
      assert.equal(item.stock_quantity, 1);

      const validated = validateCatalogItem(item);
      assert.equal(validated.artType, "Painting");
      assert.equal(validated.productType, "Premade");
      assert.equal(validated.validatedDetails.stockable, true);
      assert.equal(validated.validatedDetails.stock_available, 1);
      assert.equal(typeof validated.validatedDetails.is_fragile, "boolean");
      assert.equal(typeof validated.validatedDetails.humidity_sensitive, "boolean");
      assert.equal(typeof validated.validatedDetails.light_sensitive, "boolean");
      assert.ok(validated.validatedDetails.material_composition.length >= 1);
    }

    assert.equal(counts.get(expectedMediumPairs[index][0]), 10);
    assert.equal(counts.get(expectedMediumPairs[index][1]), 10);
  });
});

test("sculpture seller catalog has 2 sculptors (ceramic+metal and recycle+wood) with 20 valid 3D listings each", () => {
  assert.equal(SCULPTURE_SELLER_PROFILES.length, 2);
  const seenTitles = new Set([
    ...DIGITAL_SELLER_PROFILES,
    ...PAINTING_SELLER_PROFILES,
  ].flatMap((profile) => profile.artworks.map((item) => item.title)));

  SCULPTURE_SELLER_PROFILES.forEach((profile, index) => {
    assert.equal(profile.folder, `sculpture/seller-${index + 1}`);
    assert.ok(profile.shopName.trim().length > 0 && profile.shopName.length <= 60);
    assert.ok(profile.shopDescription.trim().length >= 40);
    assert.ok(Array.isArray(profile.specialties) && profile.specialties.length >= 1 && profile.specialties.length <= 3);
    assert.equal(profile.artworks.length, 20);

    for (const item of profile.artworks) {
      assert.ok(!seenTitles.has(item.title), `Duplicate title: ${item.title}`);
      seenTitles.add(item.title);
      assert.ok(item.assetFolder.startsWith(profile.folder), `Missing assetFolder on ${item.title}`);
      assert.equal(item.stock_quantity, 1);

      const validated = validateCatalogItem(item);
      assert.equal(validated.artType, "Sculpture");
      assert.equal(validated.product, "3d_object");
      assert.equal(validated.productType, "Premade");
      assert.equal(validated.validatedDetails.stockable, true);
      assert.equal(validated.validatedDetails.stock_available, 1);
      assert.ok(validated.validatedDetails.material_composition.length >= 1);
    }
  });
});

test("product seller catalog has 2 merch/craft sellers (keychain and yarn) with 20 products x 3 variants each", () => {
  assert.equal(PRODUCT_SELLER_PROFILES.length, 2);
  const expectedProductFolders = [
    "products/seller-1/keychain",
    "products/seller-2/yarn",
  ];
  const seenTitles = new Set([
    ...DIGITAL_SELLER_PROFILES,
    ...PAINTING_SELLER_PROFILES,
    ...SCULPTURE_SELLER_PROFILES,
  ].flatMap((profile) => profile.artworks.map((item) => item.title)));

  PRODUCT_SELLER_PROFILES.forEach((profile, index) => {
    assert.ok(profile.shopName.trim().length > 0 && profile.shopName.length <= 60);
    assert.ok(profile.shopDescription.trim().length >= 40);
    assert.ok(Array.isArray(profile.specialties) && profile.specialties.length >= 1 && profile.specialties.length <= 3);
    assert.equal(profile.artworks.length, 20);

    for (const item of profile.artworks) {
      assert.ok(!seenTitles.has(item.title), `Duplicate title: ${item.title}`);
      seenTitles.add(item.title);
      assert.equal(item.assetFolder, expectedProductFolders[index]);

      const validated = validateCatalogItem(item);
      assert.equal(validated.artType, "Product");
      assert.equal(validated.product, "3d_object");
      assert.equal(validated.productType, "Premade");
      assert.equal(validated.validatedDetails.product_price_mode, "manual");

      const options = validated.validatedDetails.product_options;
      assert.equal(options.length, 3);
      const expectedTotal = options.reduce((sum, opt) => sum + opt.quantity, 0);
      const minVariantPrice = Math.min(...options.map((opt) => opt.price));
      assert.equal(validated.validatedDetails.stock_available, expectedTotal);
      assert.equal(item.price, minVariantPrice);
      assert.equal(new Set(options.map((opt) => opt.price)).size, 3);
    }
  });
});

test("CLI parser reads --dry-run, --artworks, --offset, --student-ids, and defaults", () => {
  const withDefaults = parseSeedCliArgs([], { offset: 3 });
  assert.equal(withDefaults.offset, 3);
  assert.equal(withDefaults.artworksPerSeller, 20);
  assert.equal(withDefaults.gcashNumber, "999999990001");
  assert.equal(withDefaults.sellerPassword, "ArtMatch@2026");
  assert.equal(withDefaults.sellerPasswordExplicit, false);

  const options = parseSeedCliArgs([
    "--dry-run",
    "--artworks=20",
    "--offset=3",
    "--student-ids=10,11,12",
    "--gcash=09171234567",
    "--seller-password=CustomSeed99!",
    "mysql://root:pass@host:3306/railway",
  ]);
  assert.equal(options.dryRun, true);
  assert.equal(options.artworksPerSeller, 20);
  assert.equal(options.offset, 3);
  assert.deepEqual(options.studentIds, [10, 11, 12]);
  assert.equal(options.gcashNumber, "09171234567");
  assert.equal(options.sellerPassword, "CustomSeed99!");
  assert.equal(options.sellerPasswordExplicit, true);
  assert.equal(options.url, "mysql://root:pass@host:3306/railway");
});
