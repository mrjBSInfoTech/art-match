export const MAX_STOCK_QUANTITY = 2_147_483_647;

export function parseStockQuantity(value) {
  const text =
    typeof value === "number" || typeof value === "string" ? String(value).trim() : "";
  if (!/^(?:0|[1-9]\d*)$/.test(text)) return null;

  const quantity = Number(text);
  return Number.isSafeInteger(quantity) && quantity <= MAX_STOCK_QUANTITY
    ? quantity
    : null;
}

export function parseStockAdjustment(direction, value) {
  const text =
    typeof value === "number" || typeof value === "string" ? String(value).trim() : "";
  if (direction !== "add" && direction !== "reduce") return null;
  if (!/^[1-9]\d*$/.test(text)) return null;

  const quantity = Number(text);
  return Number.isSafeInteger(quantity) && quantity <= MAX_STOCK_QUANTITY
    ? { direction, quantity }
    : null;
}

export function calculateStockAdjustment(
  recordedStock,
  soldQuantity,
  direction,
  quantity,
) {
  if (
    !Number.isSafeInteger(recordedStock) ||
    recordedStock < 0 ||
    !Number.isSafeInteger(soldQuantity) ||
    soldQuantity < 0 ||
    !Number.isSafeInteger(quantity) ||
    quantity <= 0 ||
    (direction !== "add" && direction !== "reduce")
  ) {
    throw new TypeError("Invalid stock adjustment.");
  }

  const currentAvailable = Math.max(0, recordedStock - soldQuantity);
  if (direction === "reduce" && quantity > currentAvailable) {
    throw new RangeError("The reduction exceeds the available stock.");
  }

  const availableStock =
    direction === "add" ? currentAvailable + quantity : currentAvailable - quantity;
  const nextRecordedStock = availableStock + soldQuantity;
  if (
    !Number.isSafeInteger(nextRecordedStock) ||
    nextRecordedStock > MAX_STOCK_QUANTITY
  ) {
    throw new RangeError("Stock cannot exceed the supported limit.");
  }

  return { availableStock, recordedStock: nextRecordedStock };
}

export function getSelectedOptionSoldQuantities(rows) {
  const sold = new Map();
  for (const row of rows) {
    let selections = row.selected_products;
    if (typeof selections === "string") {
      try {
        selections = JSON.parse(selections);
      } catch {
        continue;
      }
    }
    if (!Array.isArray(selections)) continue;

    for (const selection of selections) {
      const id = typeof selection?.id === "string" ? selection.id.trim() : "";
      const quantity = Number(selection?.quantity);
      if (!id || !Number.isSafeInteger(quantity) || quantity <= 0) continue;

      const key = `${row.artwork_id}:${id}`;
      sold.set(key, (sold.get(key) || 0) + quantity);
    }
  }
  return sold;
}

export function serializeInventoryOptions(options, artworkId, soldQuantities) {
  return options.map((option) => {
    const soldQuantity = soldQuantities.get(`${artworkId}:${option.id}`) || 0;
    const recordedQuantity = parseStockQuantity(option.quantity) ?? 0;
    return {
      ...option,
      sold_quantity: soldQuantity,
      stock_quantity: Math.max(0, recordedQuantity - soldQuantity),
    };
  });
}
