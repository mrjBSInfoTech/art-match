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

function hexToLab(hex) {
  const raw = hex.replace("#", "");
  const full = raw.length === 3 ? [...raw].map((c) => c + c).join("") : raw;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255)
    .map((channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));
  const x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  const y = r * 0.2126 + g * 0.7152 + b * 0.0722;
  const z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  const transform = (value) => value > 0.008856 ? Math.cbrt(value) : 7.787 * value + 16 / 116;
  const [fx, fy, fz] = [x, y, z].map(transform);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

function isCloseToPaletteColor(hex, name) {
  const paletteColor = COLOR_PALETTE.find((color) => color.name === name);
  if (!paletteColor) return false;
  const sourceLab = hexToLab(hex);
  const targetLab = hexToLab(paletteColor.hex);
  const distance = Math.sqrt(sourceLab.reduce(
    (total, channel, index) => total + (channel - targetLab[index]) ** 2,
    0,
  ));
  return distance <= 35;
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
  const hasNamedColor = new RegExp(`\\b${name}\\b`, "i").test(value);
  return hasNamedColor || hexes.some(
    (hex) => colorFamily(hex) === name || isCloseToPaletteColor(hex, name),
  );
}
