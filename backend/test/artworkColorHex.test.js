import assert from "node:assert/strict";
import test from "node:test";
import { DIGITAL_SELLER_PROFILES } from "../database/seeders/digitalCatalog.js";
import { PAINTING_SELLER_PROFILES } from "../database/seeders/paintingsCatalog.js";
import { SCULPTURE_SELLER_PROFILES } from "../database/seeders/sculpturesCatalog.js";
import { PRODUCT_SELLER_PROFILES } from "../database/seeders/productsCatalog.js";
import {
  colorNamesToHexString,
  ensureHexArtworkColors,
  hasNonHexColor,
  normalizeHexCode,
  resolveColorNameToHex,
} from "../utils/artworkColorHex.js";

test("converts named colors and preserves existing hex codes without duplicates", () => {
  assert.equal(normalizeHexCode("#abc"), "#AABBCC");
  assert.equal(resolveColorNameToHex("Midnight Blue"), "#191970");
  assert.equal(resolveColorNameToHex("Crimson Red"), "#DC143C");
  assert.equal(
    colorNamesToHexString("Midnight Blue, #191970, Crimson Red, #f52245"),
    "#191970, #DC143C, #F52245",
  );
  assert.equal(
    colorNamesToHexString(JSON.stringify(["Forest Green", "#ff0"])),
    "#228B22, #FFFF00",
  );
  assert.equal(hasNonHexColor("#191970, #DC143C"), false);
  assert.equal(hasNonHexColor("#191970, Charcoal"), true);
});

test("converts every color_used value in all seeder catalogs to valid #RRGGBB hex codes", () => {
  const profiles = [
    ...DIGITAL_SELLER_PROFILES,
    ...PAINTING_SELLER_PROFILES,
    ...SCULPTURE_SELLER_PROFILES,
    ...PRODUCT_SELLER_PROFILES,
  ];
  for (const profile of profiles) {
    for (const artwork of profile.artworks) {
      const converted = colorNamesToHexString(artwork.color_used);
      assert.ok(converted.length > 0, `Empty colors for ${artwork.title}`);
      assert.equal(
        hasNonHexColor(converted),
        false,
        `Non-hex color remained for ${artwork.title}: ${converted}`,
      );
    }
  }
});

test("ensureHexArtworkColors updates only rows with non-hex colors", async () => {
  const rows = [
    { artwork_id: 1, color_used: "Midnight Blue, Crimson Red" },
    { artwork_id: 2, color_used: "#191970, #DC143C" },
    { artwork_id: 3, color_used: "Aged Bronze, #00e5ff" },
  ];
  const updates = [];
  const executor = {
    async query(sql, params = []) {
      if (sql.startsWith("SELECT artwork_id, color_used")) {
        return [rows];
      }
      if (sql.startsWith("UPDATE artwork SET color_used")) {
        updates.push({ id: params[1], color_used: params[0] });
        const row = rows.find((item) => item.artwork_id === params[1]);
        if (row) row.color_used = params[0];
        return [{ affectedRows: 1 }];
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    },
  };

  const firstRun = await ensureHexArtworkColors(executor);
  assert.deepEqual(firstRun, { checked: 3, updated: 2 });
  assert.deepEqual(updates, [
    { id: 1, color_used: "#191970, #DC143C" },
    { id: 3, color_used: "#7B5E3B, #00E5FF" },
  ]);

  const secondRun = await ensureHexArtworkColors(executor);
  assert.deepEqual(secondRun, { checked: 3, updated: 0 });
});
