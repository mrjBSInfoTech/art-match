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
