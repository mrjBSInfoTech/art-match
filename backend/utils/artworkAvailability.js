// COD reserves stock when ordered. Online checkout reserves stock only after
// the verified payment webhook commits Paid; abandoned attempts remain available.
export function getCompletedOrderCondition(orderAlias = "o") {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(orderAlias)) {
    throw new TypeError("Invalid order SQL alias");
  }
  return `(${orderAlias}.status <> 'Cancelled' AND (
    ${orderAlias}.payment_method = 'cod'
    OR (${orderAlias}.payment_method = 'paymongo' AND ${orderAlias}.payment_status = 'Paid')
  ))`;
}

export function getArtworkSoldQuantitySql(artworkAlias = "a") {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(artworkAlias)) {
    throw new TypeError("Invalid artwork SQL alias");
  }
  return `COALESCE((
    SELECT SUM(availability_item.quantity)
    FROM marketplace_order_item availability_item
    JOIN marketplace_order availability_order
      ON availability_order.order_id = availability_item.order_id
    WHERE availability_item.artwork_id = ${artworkAlias}.artwork_id
      AND ${getCompletedOrderCondition("availability_order")}
  ), 0)`;
}

export function getArtworkSoldOutSql(artworkAlias = "a") {
  const soldQuantity = getArtworkSoldQuantitySql(artworkAlias);
  const stock = `JSON_UNQUOTE(JSON_EXTRACT(${artworkAlias}.artwork_details, '$.stock_available'))`;
  const numericStock = `(${stock} + 0)`;
  // JSON null, blank text, fractions and invalid/unsafe stock are untracked,
  // matching getArtworkAvailability instead of coercing them to zero stock.
  const hasStockTracking = `(CHAR_LENGTH(${stock}) > 0
      AND ${stock} REGEXP '^[[:space:]]*[+-]?([0-9]+([.][0-9]*)?|[.][0-9]+)([eE][+-]?[0-9]+)?[[:space:]]*$'
      AND ${numericStock} >= 0 AND ${numericStock} <= 9007199254740991
      AND FLOOR(${numericStock}) = ${numericStock})`;
  return `(CASE
    WHEN COALESCE(${artworkAlias}.is_sold, 0) = 1
      OR LOWER(COALESCE(${artworkAlias}.status, '')) = 'sold' THEN 1
    WHEN ${hasStockTracking}
      THEN ${numericStock} <= ${soldQuantity}
    ELSE ${soldQuantity} > 0
  END)`;
}

export function getArtworkAvailability(
  stockAvailable,
  soldQuantity = 0,
  markedSold = false,
) {
  const stockText = ["number", "string"].includes(typeof stockAvailable)
    ? String(stockAvailable).trim() : "";
  const stock = Number(stockText);
  const sold = Number(soldQuantity);
  const hasStockTracking = stockText !== "" &&
    /^[+-]?(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)(?:[eE][+-]?[0-9]+)?$/.test(stockText) &&
    Number.isSafeInteger(stock) && stock >= 0;
  if (markedSold) {
    return {
      hasStockTracking,
      remainingStock: 0,
      isSoldOut: true,
    };
  }

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
