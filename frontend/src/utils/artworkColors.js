export const COLOR_PALETTE = [
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

function colorFamily(hex) {
  const raw = hex.replace("#", "");
  const full = raw.length === 3 ? [...raw].map((c) => c + c).join("") : raw;
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
}

const COLOR_NAMES = COLOR_PALETTE.map(({ name }) => name);

export function getSearchColor(query) {
  const value = query.trim();
  const named = COLOR_NAMES.find((name) => name.toLowerCase() === value.toLowerCase());
  if (named) return named;
  if (/^#(?:[a-f\d]{6}|[a-f\d]{3})$/i.test(value)) {
    return COLOR_PALETTE.find(({ hex }) => hex.toLowerCase() === value.toLowerCase())?.name || colorFamily(value);
  }
  return null;
}

export function artworkMatchesColor(colors, name) {
  const value = Array.isArray(colors) ? colors.join(", ") : String(colors || "");
  const hexes = value.match(/#(?:[a-f\d]{6}|[a-f\d]{3})\b/gi) || [];
  if (hexes.length) return hexes.some((hex) => colorFamily(hex) === name);
  return new RegExp(`\\b${name}\\b`, "i").test(value);
}
