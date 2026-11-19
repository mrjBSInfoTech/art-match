import { getCompletedOrderCondition } from "./artworkAvailability.js";
import { getProductOptions, parseArtworkDetails } from "./productOptions.js";

export const MAX_STOCK_QUANTITY = 2_147_483_647;

export function isLegacyStockableProduct(row = {}) {
  const artType = String(row.art_type || "").trim().toLowerCase();
  const productType = String(row.product_type || "").trim().toLowerCase();
  return (
    artType === "product" &&
    productType !== "digital" &&
    productType !== "customize"
  );
}

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

export async function loadSoldOptionQuantitiesForArtworks(executor, artworkIds = []) {
  const ids = [
    ...new Set(
      (Array.isArray(artworkIds) ? artworkIds : [])
        .map((id) => Number(id))
        .filter((id) => Number.isInteger(id) && id > 0),
    ),
  ];
  if (!ids.length || !executor?.query) return new Map();

  const [rows] = await executor.query(
    `SELECT oi.artwork_id, oi.selected_products
     FROM marketplace_order_item oi
     JOIN marketplace_order o ON o.order_id = oi.order_id
     WHERE oi.artwork_id IN (?)
       AND oi.selected_products IS NOT NULL
       AND ${getCompletedOrderCondition("o")}`,
    [ids],
  );
  return getSelectedOptionSoldQuantities(rows);
}

export function serializeRemainingProductOptions(options, artworkId, soldQuantities) {
  return serializeInventoryOptions(options, artworkId, soldQuantities).map((option) => ({
    ...option,
    remaining_stock: option.stock_quantity,
  }));
}

export function attachArtworkOptionStock(artwork, soldQuantities = new Map()) {
  if (!artwork || typeof artwork !== "object") return artwork;
  const details = parseArtworkDetails(artwork.artwork_details);
  const rawOptions = getProductOptions(details);
  if (!rawOptions.length) return artwork;

  const productOptions = serializeRemainingProductOptions(
    rawOptions,
    artwork.artwork_id,
    soldQuantities,
  );
  const recordedOptionsStock = productOptions.reduce(
    (sum, option) => sum + (parseStockQuantity(option.quantity) ?? 0),
    0,
  );
  const remainingOptionsStock = productOptions.reduce(
    (sum, option) => sum + option.remaining_stock,
    0,
  );
  const nextDetails = {
    ...details,
    ...(details.stock_available == null ? { stock_available: recordedOptionsStock } : {}),
    product_options: productOptions,
  };
  const nextArtworkDetails =
    typeof artwork.artwork_details === "string"
      ? JSON.stringify(nextDetails)
      : nextDetails;

  const isCustomProduct =
    String(artwork.product_type || "").trim().toLowerCase() === "customize";
  const explicitlySold =
    Number(artwork.is_sold) === 1 ||
    String(artwork.status || "").trim().toLowerCase() === "sold";

  return {
    ...artwork,
    artwork_details: nextArtworkDetails,
    product_options: productOptions,
    ...(artwork.stock_available == null ? { stock_available: recordedOptionsStock } : {}),
    ...(Object.hasOwn(artwork, "is_sold_out") && !isCustomProduct
      ? { is_sold_out: explicitlySold || remainingOptionsStock <= 0 ? 1 : 0 }
      : {}),
  };
}

export async function enrichArtworksWithOptionStock(dbOrExecutor, rows = []) {
  const list = Array.isArray(rows) ? rows : [];
  if (!list.length) return list;

  const optionArtworkIds = list
    .filter((row) => getProductOptions(row?.artwork_details).length > 0)
    .map((row) => row.artwork_id);
  if (!optionArtworkIds.length) return list;

  const executor =
    typeof dbOrExecutor?.promise === "function"
      ? dbOrExecutor.promise()
      : dbOrExecutor;
  const soldQuantities = await loadSoldOptionQuantitiesForArtworks(
    executor,
    optionArtworkIds,
  );
  return list.map((row) => attachArtworkOptionStock(row, soldQuantities));
}
