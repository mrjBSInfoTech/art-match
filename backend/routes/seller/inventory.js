import express from "express";
import db from "../../database/db.js";
import { authenticateSeller } from "../../middleware/sellerAuthMiddleware.js";
import {
  getArtworkSoldQuantitySql,
  getCompletedOrderCondition,
} from "../../utils/artworkAvailability.js";
import { logSellerAudit } from "../../utils/auditLogger.js";
import {
  calculateStockAdjustment,
  getSelectedOptionSoldQuantities,
  MAX_STOCK_QUANTITY,
  parseStockAdjustment,
  parseStockQuantity,
  serializeInventoryOptions,
} from "../../utils/inventoryStock.js";

const router = express.Router();

function readArtworkDetails(rawDetails) {
  if (rawDetails && typeof rawDetails === "object" && !Array.isArray(rawDetails)) {
    return { ...rawDetails };
  }

  if (typeof rawDetails !== "string" || !rawDetails.trim()) return {};

  try {
    const details = JSON.parse(rawDetails);
    return details && typeof details === "object" && !Array.isArray(details)
      ? details
      : {};
  } catch {
    return {};
  }
}

function getInventoryProductOptions(details) {
  return Array.isArray(details.product_options) ? details.product_options : [];
}

function serializeInventoryProduct(row, soldOptionQuantities = new Map()) {
  const details = readArtworkDetails(row.artwork_details);
  const recordedStock = parseStockQuantity(details.stock_available);
  const soldQuantity = Number.isSafeInteger(Number(row.sold_quantity))
    ? Math.max(0, Number(row.sold_quantity))
    : 0;
  const productOptions = serializeInventoryOptions(
    getInventoryProductOptions(details),
    row.artwork_id,
    soldOptionQuantities,
  );

  return {
    artwork_id: row.artwork_id,
    title: row.title,
    price: row.price,
    image: row.image,
    art_type: row.art_type,
    product: row.product,
    artwork_details: details,
    stock_quantity: recordedStock === null
      ? 0
      : Math.max(0, recordedStock - soldQuantity),
    sold_quantity: soldQuantity,
    product_options: productOptions,
  };
}

function getSellerId(req) {
  return req.user?.student_id || req.user?.id || null;
}

async function loadOptionSoldQuantities(executor, sellerId, artworkId = null) {
  const artworkFilter = artworkId === null ? "" : "AND oi.artwork_id = ?";
  const params = artworkId === null ? [sellerId] : [sellerId, artworkId];
  const [rows] = await executor.query(
    `SELECT oi.artwork_id, oi.selected_products
     FROM marketplace_order_item oi
     JOIN marketplace_order o ON o.order_id = oi.order_id
     JOIN artwork a ON a.artwork_id = oi.artwork_id
     WHERE a.student_id = ?
       AND oi.selected_products IS NOT NULL
       ${artworkFilter}
       AND ${getCompletedOrderCondition("o")}`,
    params,
  );
  return getSelectedOptionSoldQuantities(rows);
}

router.get("/", authenticateSeller, async (req, res) => {
  const sellerId = getSellerId(req);
  if (!sellerId) {
    return res.status(403).json({ message: "Unable to identify seller" });
  }

  try {
    const [rows] = await db.promise().query(
      `SELECT
         a.artwork_id,
         a.title,
         a.price,
         a.image,
         a.art_type,
         a.product,
         a.artwork_details,
         ${getArtworkSoldQuantitySql("a")} AS sold_quantity
       FROM artwork a
       WHERE a.student_id = ?
         AND LOWER(TRIM(a.art_type)) = 'product'
       ORDER BY a.artwork_id DESC`,
      [sellerId],
    );
    const soldOptionQuantities = await loadOptionSoldQuantities(db.promise(), sellerId);
    res.set("Cache-Control", "no-store");
    return res.json(rows.map((row) => serializeInventoryProduct(row, soldOptionQuantities)));
  } catch (error) {
    console.error("Seller inventory query error:", error);
    return res.status(500).json({ message: "Unable to load inventory" });
  }
});

router.patch("/:artworkId/stock", authenticateSeller, async (req, res) => {
  const sellerId = getSellerId(req);
  const artworkId = Number(req.params.artworkId);
  const adjustment = parseStockAdjustment(req.body?.direction, req.body?.quantity);

  if (!sellerId) {
    return res.status(403).json({ message: "Unable to identify seller" });
  }

  if (!Number.isInteger(artworkId) || artworkId <= 0) {
    return res.status(400).json({ message: "A valid product is required" });
  }

  if (!adjustment) {
    return res.status(400).json({
      message: `Provide an add or reduce action and a whole-number amount from 1 to ${MAX_STOCK_QUANTITY.toLocaleString()}.`,
    });
  }

  const selectSql = `
    SELECT
      a.artwork_id,
      a.title,
      a.price,
      a.image,
      a.art_type,
      a.product,
      a.artwork_details,
      ${getArtworkSoldQuantitySql("a")} AS sold_quantity
    FROM artwork a
    WHERE a.artwork_id = ?
      AND a.student_id = ?
      AND LOWER(TRIM(a.art_type)) = 'product'
    LIMIT 1
  `;

  let connection;
  let transactionOpen = false;
  try {
    connection = await db.promise().getConnection();
    await connection.beginTransaction();
    transactionOpen = true;

    const [rows] = await connection.query(
      `${selectSql.trim()} FOR UPDATE`,
      [artworkId, sellerId],
    );
    const product = rows?.[0];
    if (!product) {
      await connection.rollback();
      transactionOpen = false;
      return res.status(404).json({ message: "Product inventory was not found" });
    }

    const soldQuantity = Number.isSafeInteger(Number(product.sold_quantity))
      ? Math.max(0, Number(product.sold_quantity))
      : 0;
    const details = readArtworkDetails(product.artwork_details);
    const recordedStock = parseStockQuantity(details.stock_available);
    if (recordedStock === null) {
      await connection.rollback();
      transactionOpen = false;
      return res.status(409).json({
        message: "This product has an invalid stock value. Refresh inventory and try again.",
      });
    }
    if (getInventoryProductOptions(details).length > 0) {
      await connection.rollback();
      transactionOpen = false;
      return res.status(400).json({
        message: "Adjust stock for each product option from its inventory details.",
      });
    }

    let updatedStock;
    try {
      updatedStock = calculateStockAdjustment(
        recordedStock,
        soldQuantity,
        adjustment.direction,
        adjustment.quantity,
      );
    } catch (stockError) {
      await connection.rollback();
      transactionOpen = false;
      return res.status(400).json({ message: stockError.message });
    }

    details.stock_available = updatedStock.recordedStock;
    const [result] = await connection.query(
      `UPDATE artwork
       SET artwork_details = ?
       WHERE artwork_id = ?
         AND student_id = ?
         AND LOWER(TRIM(art_type)) = 'product'`,
      [JSON.stringify(details), artworkId, sellerId],
    );

    if (!result.affectedRows) {
      await connection.rollback();
      transactionOpen = false;
      return res.status(404).json({ message: "Product inventory was not found" });
    }

    await connection.commit();
    transactionOpen = false;

    await logSellerAudit(req.user, {
      action: "UPDATE_PRODUCT_STOCK",
      information: `Stock for product ID ${artworkId} (${product.title}) was ${adjustment.direction === "add" ? "increased" : "reduced"} by ${adjustment.quantity}.`,
    });

    return res.json({
      message: "Stock adjusted successfully",
      product: serializeInventoryProduct({
        ...product,
        artwork_details: details,
      }),
    });
  } catch (error) {
    if (transactionOpen) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("Seller inventory rollback error:", rollbackError);
      }
    }
    console.error("Seller inventory adjustment error:", error);
    return res.status(500).json({ message: "Unable to update inventory" });
  } finally {
    connection?.release();
  }
});

router.patch("/:artworkId/options/stock", authenticateSeller, async (req, res) => {
  const sellerId = getSellerId(req);
  const artworkId = Number(req.params.artworkId);
  const optionId = typeof req.body?.option_id === "string" ? req.body.option_id.trim() : "";
  const adjustment = parseStockAdjustment(req.body?.direction, req.body?.quantity);

  if (!sellerId) {
    return res.status(403).json({ message: "Unable to identify seller" });
  }
  if (!Number.isInteger(artworkId) || artworkId <= 0 || !optionId) {
    return res.status(400).json({ message: "A valid artwork and product option are required." });
  }
  if (!adjustment) {
    return res.status(400).json({
      message: `Provide an add or reduce action and a whole-number amount from 1 to ${MAX_STOCK_QUANTITY.toLocaleString()}.`,
    });
  }

  let connection;
  let transactionOpen = false;
  try {
    connection = await db.promise().getConnection();
    await connection.beginTransaction();
    transactionOpen = true;
    const [rows] = await connection.query(
      `SELECT a.artwork_id, a.title, a.price, a.image, a.art_type, a.product,
        a.artwork_details, ${getArtworkSoldQuantitySql("a")} AS sold_quantity
       FROM artwork a
       WHERE a.artwork_id = ? AND a.student_id = ?
         AND LOWER(TRIM(a.art_type)) = 'product'
       LIMIT 1 FOR UPDATE`,
      [artworkId, sellerId],
    );
    const product = rows?.[0];
    if (!product) {
      await connection.rollback();
      transactionOpen = false;
      return res.status(404).json({ message: "Product inventory was not found." });
    }

    const details = readArtworkDetails(product.artwork_details);
    const options = getInventoryProductOptions(details);
    const option = options.find((item) => item.id === optionId);
    if (!option) {
      await connection.rollback();
      transactionOpen = false;
      return res.status(404).json({ message: "Product option was not found." });
    }

    const soldOptionQuantities = await loadOptionSoldQuantities(
      connection,
      sellerId,
      artworkId,
    );
    const soldQuantity = soldOptionQuantities.get(`${artworkId}:${optionId}`) || 0;
    const recordedQuantity = parseStockQuantity(option.quantity);
    if (recordedQuantity === null) {
      await connection.rollback();
      transactionOpen = false;
      return res.status(409).json({
        message: "This product option has an invalid stock value. Refresh inventory and try again.",
      });
    }

    let updatedStock;
    try {
      updatedStock = calculateStockAdjustment(
        recordedQuantity,
        soldQuantity,
        adjustment.direction,
        adjustment.quantity,
      );
    } catch (stockError) {
      await connection.rollback();
      transactionOpen = false;
      return res.status(400).json({ message: stockError.message });
    }

    option.quantity = updatedStock.recordedStock;
    const totalRecordedStock = options.reduce(
      (total, currentOption) => total + Number(currentOption.quantity),
      0,
    );
    if (!Number.isSafeInteger(totalRecordedStock) || totalRecordedStock > MAX_STOCK_QUANTITY) {
      await connection.rollback();
      transactionOpen = false;
      return res.status(400).json({
        message: `Combined product stock cannot exceed ${MAX_STOCK_QUANTITY.toLocaleString()}.`,
      });
    }
    details.stock_available = totalRecordedStock;
    const [result] = await connection.query(
      `UPDATE artwork SET artwork_details = ?
       WHERE artwork_id = ? AND student_id = ?
         AND LOWER(TRIM(art_type)) = 'product'`,
      [JSON.stringify(details), artworkId, sellerId],
    );
    if (!result.affectedRows) {
      await connection.rollback();
      transactionOpen = false;
      return res.status(404).json({ message: "Product inventory was not found." });
    }
    await connection.commit();
    transactionOpen = false;

    await logSellerAudit(req.user, {
      action: "UPDATE_PRODUCT_OPTION_STOCK",
      information: `Stock for ${option.name} in product artwork ID ${artworkId} was ${adjustment.direction === "add" ? "increased" : "reduced"} by ${adjustment.quantity}.`,
    });

    const updatedProduct = {
      ...product,
      artwork_details: details,
      sold_quantity: Number(product.sold_quantity) || 0,
    };
    return res.json({
      message: "Product option stock adjusted successfully.",
      product: serializeInventoryProduct(updatedProduct, soldOptionQuantities),
    });
  } catch (error) {
    if (transactionOpen) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("Seller inventory option rollback error:", rollbackError);
      }
    }
    console.error("Seller product option stock adjustment error:", error);
    return res.status(500).json({ message: "Unable to update product option stock." });
  } finally {
    connection?.release();
  }
});

export default router;
