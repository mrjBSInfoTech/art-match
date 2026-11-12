const isTrueValue = (value) =>
  value === true ||
  value === 1 ||
  (typeof value === "string" &&
    ["1", "true", "sold out", "sold_out", "unavailable"].includes(
      value.trim().toLowerCase(),
    ));

export function isArtworkSoldOut(artwork) {
  if (!artwork) return false;

  if (
    isTrueValue(artwork.is_sold_out) ||
    isTrueValue(artwork.is_sold) ||
    (typeof artwork.status === "string" &&
      artwork.status.trim().toLowerCase() === "sold")
  ) {
    return true;
  }

  const stockAvailable = artwork.stock_available;
  const soldQuantity = Number(artwork.sold_quantity);
  if (
    stockAvailable !== null &&
    stockAvailable !== undefined &&
    stockAvailable !== "" &&
    Number.isSafeInteger(Number(stockAvailable)) &&
    Number(stockAvailable) >= 0
  ) {
    return Number(stockAvailable) - (Number.isFinite(soldQuantity) ? soldQuantity : 0) <= 0;
  }

  return isTrueValue(artwork.availability) || isTrueValue(artwork.stock_status);
}

export function getArtworkRemainingStock(artwork) {
  if (!artwork || isArtworkSoldOut(artwork)) return 0;

  const productType = String(artwork.product_type || "").trim().toLowerCase();
  if (productType === "customize") return null;

  let details = artwork.artwork_details;
  if (typeof details === "string") {
    try {
      details = JSON.parse(details);
    } catch {
      details = null;
    }
  }

  const options = Array.isArray(artwork.product_options)
    ? artwork.product_options
    : Array.isArray(details?.product_options)
      ? details.product_options
      : null;

  if (options && options.length > 0) {
    return options.reduce((sum, opt) => {
      const optStock = Number(opt.remaining_stock ?? opt.stock_quantity ?? opt.quantity);
      return Number.isSafeInteger(optStock) && optStock > 0 ? sum + optStock : sum;
    }, 0);
  }

  const stockRaw = artwork.stock_available ?? details?.stock_available;
  if (
    stockRaw !== null &&
    stockRaw !== undefined &&
    stockRaw !== "" &&
    Number.isSafeInteger(Number(stockRaw)) &&
    Number(stockRaw) >= 0
  ) {
    const stock = Number(stockRaw);
    const sold = Number(artwork.sold_quantity);
    const purchased = Number.isFinite(sold) && sold > 0 ? sold : 0;
    return Math.max(0, stock - purchased);
  }

  return 1;
}
