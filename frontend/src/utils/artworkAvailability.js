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
