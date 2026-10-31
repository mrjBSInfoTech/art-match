import test from "node:test";
import assert from "node:assert/strict";

// Test color and price filter logic isolated
const COLOR_PALETTE = [
  { hex: "#f52245", name: "Red" },
  { hex: "#ffe3bb", name: "Beige" },
  { hex: "#1464ed", name: "Blue" },
  { hex: "#16b978", name: "Green" },
  { hex: "#965020", name: "Brown" },
  { hex: "#151632", name: "Navy" },
  { hex: "#f5f1ea", name: "White" },
  { hex: "#1f1f1f", name: "Black" },
  { hex: "#808080", name: "Gray" },
  { hex: "#ff8c00", name: "Orange" },
  { hex: "#ffdd00", name: "Yellow" },
  { hex: "#00cddd", name: "Cyan" },
  { hex: "#a020f0", name: "Purple" },
  { hex: "#ff69b4", name: "Pink" },
];

const colorFamilyFromHex = (hex) => {
  if (!hex || typeof hex !== "string") return "";
  const raw = hex.replace("#", "");
  const full = raw.length === 3 ? [...raw].map((c) => c + c).join("") : raw;
  if (full.length !== 6) return "";
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const lightness = (max + min) / 2;
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));
  if (min >= 0.88) return "White";
  if (saturation < 0.1) return lightness < 0.2 ? "Black" : lightness > 0.85 ? "White" : "Gray";
  let hue = delta === 0 ? 0 : max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
  hue = (hue * 60 + 360) % 360;
  if (hue < 20 || hue >= 340) return "Red";
  if (hue < 50) return lightness < 0.5 ? "Brown" : lightness > 0.75 ? "Beige" : "Orange";
  if (hue < 70) return "Yellow";
  if (hue < 165) return "Green";
  if (hue < 195) return "Cyan";
  if (hue < 260) return lightness < 0.25 ? "Navy" : "Blue";
  if (hue < 290) return "Purple";
  return "Pink";
};

const artworkMatchesColor = (artworkColors, targetColor) => {
  if (!targetColor) return false;
  const value = Array.isArray(artworkColors) ? artworkColors.join(", ") : String(artworkColors || "");
  if (!value) return false;
  const target = String(targetColor).trim().toLowerCase();

  const targetName =
    COLOR_PALETTE.find(
      (c) => c.name.toLowerCase() === target || c.hex.toLowerCase() === target,
    )?.name?.toLowerCase() || target;

  const wordRegex = new RegExp(`(^|[^a-zA-Z])${targetName}([^a-zA-Z]|$)`, "i");
  if (wordRegex.test(value)) return true;

  const hexes = value.match(/#(?:[a-f\d]{6}|[a-f\d]{3})\b/gi) || [];
  return hexes.some((hex) => {
    const family = colorFamilyFromHex(hex);
    return family && family.toLowerCase() === targetName;
  });
};

test("artworkMatchesColor identifies red from hex code #f52245 and word 'Red'", () => {
  assert.equal(artworkMatchesColor("#f52245", "Red"), true);
  assert.equal(artworkMatchesColor("#f52245", "red"), true);
  assert.equal(artworkMatchesColor("Red, Green, White", "Red"), true);
  assert.equal(artworkMatchesColor("Blue, Yellow", "Red"), false);
  assert.equal(artworkMatchesColor("#1464ed", "Red"), false);
  assert.equal(artworkMatchesColor("#1464ed", "Blue"), true);
});

test("artworkMatchesColor handles comma separated hex strings and palette colors", () => {
  assert.equal(artworkMatchesColor("#1464ed, #f52245", "Red"), true);
  assert.equal(artworkMatchesColor("#1464ed, #f52245", "Blue"), true);
  assert.equal(artworkMatchesColor("#16b978", "Green"), true);
});

test("price filter checks bounds accurately", () => {
  const matchesPrice = (price, minPrice, maxPrice) => {
    const num = Number(price);
    return (
      Number.isFinite(num) &&
      (minPrice === null || num >= minPrice) &&
      (maxPrice === null || num <= maxPrice)
    );
  };

  assert.equal(matchesPrice(500, 100, 1000), true);
  assert.equal(matchesPrice(100, 100, 1000), true);
  assert.equal(matchesPrice(1000, 100, 1000), true);
  assert.equal(matchesPrice(50, 100, 1000), false);
  assert.equal(matchesPrice(1500, 100, 1000), false);
  assert.equal(matchesPrice(2500, 1000, null), true);
});

