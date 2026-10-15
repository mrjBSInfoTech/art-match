export const PRICE_LIMIT = 10000;

export function readPriceRange(params) {
  const read = (key, fallback) => {
    const raw = params.get(key);
    const value = raw === null || raw.trim() === "" ? NaN : Number(raw);
    return Number.isFinite(value) ? Math.min(PRICE_LIMIT, Math.max(0, value)) : fallback;
  };
  return [read("minPrice", 0), read("maxPrice", PRICE_LIMIT)].sort((a, b) => a - b);
}

export function matchesPriceRange(price, minimum, maximum) {
  if (minimum === 0 && maximum === PRICE_LIMIT) return true;
  if (price === null || price === undefined || String(price).trim() === "") return false;
  const value = Number(price);
  return Number.isFinite(value) && value >= minimum && (maximum === PRICE_LIMIT || value <= maximum);
}

export function formatPriceRange([minimum, maximum]) {
  const format = (value) => `\u20b1${value.toLocaleString("en-PH")}`;
  return `${format(minimum)} - ${format(maximum)}${maximum === PRICE_LIMIT ? "+" : ""}`;
}
