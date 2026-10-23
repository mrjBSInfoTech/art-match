export function getArtworkAvailability(
  stockAvailable,
  soldQuantity = 0,
  markedSold = false,
) {
  const stock = Number(stockAvailable);
  const sold = Number(soldQuantity);
  if (markedSold) {
    return {
      hasStockTracking:
        stockAvailable !== null &&
        stockAvailable !== undefined &&
        stockAvailable !== "" &&
        Number.isSafeInteger(stock) &&
        stock >= 0,
      remainingStock: 0,
      isSoldOut: true,
    };
  }

  const hasStockTracking =
    stockAvailable !== null &&
    stockAvailable !== undefined &&
    stockAvailable !== "" &&
    Number.isSafeInteger(stock) &&
    stock >= 0;
  const purchased = Number.isFinite(sold) && sold > 0 ? sold : 0;

  if (!hasStockTracking) {
    return {
      hasStockTracking: false,
      remainingStock: null,
      isSoldOut: purchased > 0,
    };
  }

  const remainingStock = Math.max(0, stock - purchased);
  return {
    hasStockTracking: true,
    remainingStock,
    isSoldOut: remainingStock === 0,
  };
}
