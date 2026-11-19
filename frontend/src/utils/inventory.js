import { alpha } from "@mui/material/styles";

export const LOW_STOCK_THRESHOLD = 5;
export const MAX_STOCK_QUANTITY = 2_147_483_647;

export function isStockableInventoryProduct(product) {
  const detailsStockable = product.artwork_details?.stockable;
  const productType = String(product.product_type || "").trim().toLowerCase();
  if (productType === "digital" || productType === "customize") return false;

  if (detailsStockable === undefined || detailsStockable === null) {
    return String(product.art_type || "").trim().toLowerCase() === "product";
  }

  return !(
    detailsStockable === false ||
    String(detailsStockable).trim().toLowerCase() === "false" ||
    detailsStockable === "0" ||
    detailsStockable === 0
  );
}

export function toStockQuantity(value) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 0 ? number : 0;
}

export function getStockStatus(quantity) {
  const stock = toStockQuantity(quantity);
  if (stock === 0) return "out-of-stock";
  if (stock <= LOW_STOCK_THRESHOLD) return "low-stock";
  return "in-stock";
}

export function getStockStatusLabel(quantity) {
  switch (getStockStatus(quantity)) {
    case "out-of-stock":
      return "Out of Stock";
    case "low-stock":
      return "Low Stock";
    default:
      return "In Stock";
  }
}

export function getStockStatusLabelByKey(status) {
  switch (status) {
    case "out-of-stock":
      return "Out of Stock";
    case "low-stock":
      return "Low Stock";
    default:
      return "In Stock";
  }
}

export function getOptionStockQuantity(option) {
  return toStockQuantity(option?.stock_quantity ?? option?.remaining_stock ?? option?.quantity);
}

export function getProductOptionStatusCounts(product) {
  const options = Array.isArray(product?.product_options) ? product.product_options : [];
  if (!options.length) return null;

  return options.reduce(
    (counts, option) => {
      const status = getStockStatus(getOptionStockQuantity(option));
      if (status === "out-of-stock") counts.outOfStock += 1;
      else if (status === "low-stock") counts.lowStock += 1;
      else counts.inStock += 1;
      return counts;
    },
    { inStock: 0, lowStock: 0, outOfStock: 0, total: options.length },
  );
}

export function getProductOptionStatusBadges(product) {
  const counts = getProductOptionStatusCounts(product);
  if (!counts) return [];

  return [
    { status: "in-stock", count: counts.inStock, label: `${counts.inStock} In Stock` },
    { status: "low-stock", count: counts.lowStock, label: `${counts.lowStock} Low Stock` },
    { status: "out-of-stock", count: counts.outOfStock, label: `${counts.outOfStock} Out of Stock` },
  ].filter((entry) => entry.count > 0);
}

export function productHasStockStatus(product, targetStatus) {
  const options = Array.isArray(product?.product_options) ? product.product_options : [];
  if (options.length > 0) {
    return options.some(
      (option) => getStockStatus(getOptionStockQuantity(option)) === targetStatus,
    );
  }
  return getStockStatus(product?.stock_quantity) === targetStatus;
}

export function getStockPillStyle(theme, status) {
  const isDark = theme.palette.mode === "dark";
  const shade = isDark ? "light" : "dark";
  const paletteKey =
    status === "in-stock"
      ? "success"
      : status === "low-stock"
        ? "warning"
        : "error";
  const baseColor = theme.palette[paletteKey]?.main || theme.palette.text.secondary;

  return {
    bgcolor: alpha(baseColor, isDark ? 0.18 : 0.12),
    color: theme.palette[paletteKey]?.[shade] || baseColor,
    border: "1px solid",
    borderColor: alpha(baseColor, 0.35),
  };
}
