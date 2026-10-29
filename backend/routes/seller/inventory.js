import express from "express";
import db from "../../database/db.js";
import { authenticateSeller } from "../../middleware/sellerAuthMiddleware.js";
import { getArtworkSoldQuantitySql } from "../../utils/artworkAvailability.js";
import { logSellerAudit } from "../../utils/auditLogger.js";

const router = express.Router();

const MAX_STOCK_QUANTITY = 2_147_483_647;

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

function parseStockQuantity(value) {
  const text = typeof value === "number" || typeof value === "string"
    ? String(value).trim()
    : "";

  if (!/^(?:0|[1-9]\d*)$/.test(text)) return null;

  const quantity = Number(text);
  return Number.isSafeInteger(quantity) && quantity <= MAX_STOCK_QUANTITY
    ? quantity
    : null;
}

function serializeInventoryProduct(row) {
  const details = readArtworkDetails(row.artwork_details);
  const recordedStock = parseStockQuantity(details.stock_available);
  const soldQuantity = Number.isSafeInteger(Number(row.sold_quantity))
    ? Math.max(0, Number(row.sold_quantity))
    : 0;

  return {
    artwork_id: row.artwork_id,
    title: row.title,
    price: row.price,
    image: row.image,
    art_type: row.art_type,
    product: row.product,
    stock_quantity: recordedStock === null
      ? 0
      : Math.max(0, recordedStock - soldQuantity),
    sold_quantity: soldQuantity,
  };
}

function getSellerId(req) {
  return req.user?.student_id || req.user?.id || null;
}

router.get("/", authenticateSeller, (req, res) => {
  const sellerId = getSellerId(req);
  if (!sellerId) {
    return res.status(403).json({ message: "Unable to identify seller" });
  }

  const sql = `
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
    WHERE a.student_id = ?
      AND LOWER(TRIM(a.art_type)) = 'product'
    ORDER BY a.artwork_id DESC
  `;

  db.query(sql, [sellerId], (error, rows) => {
    if (error) {
      console.error("Seller inventory query error:", error);
      return res.status(500).json({ message: "Unable to load inventory" });
    }

    res.set("Cache-Control", "no-store");
    return res.json(rows.map(serializeInventoryProduct));
  });
});

router.patch("/:artworkId/stock", authenticateSeller, (req, res) => {
  const sellerId = getSellerId(req);
  const artworkId = Number(req.params.artworkId);
  const requestedStock = parseStockQuantity(req.body?.stock_quantity);

  if (!sellerId) {
    return res.status(403).json({ message: "Unable to identify seller" });
  }

  if (!Number.isInteger(artworkId) || artworkId <= 0) {
    return res.status(400).json({ message: "A valid product is required" });
  }

  if (requestedStock === null) {
    return res.status(400).json({
      message: `Stock must be a whole number from 0 to ${MAX_STOCK_QUANTITY.toLocaleString()}.`,
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

  db.query(selectSql, [artworkId, sellerId], (selectError, rows) => {
    if (selectError) {
      console.error("Seller inventory product lookup error:", selectError);
      return res.status(500).json({ message: "Unable to update inventory" });
    }

    const product = rows?.[0];
    if (!product) {
      return res.status(404).json({ message: "Product inventory was not found" });
    }

    const soldQuantity = Number.isSafeInteger(Number(product.sold_quantity))
      ? Math.max(0, Number(product.sold_quantity))
      : 0;
    const recordedStock = requestedStock + soldQuantity;

    if (!Number.isSafeInteger(recordedStock) || recordedStock > MAX_STOCK_QUANTITY) {
      return res.status(400).json({
        message: "Stock cannot be increased because it exceeds the supported limit.",
      });
    }

    const details = readArtworkDetails(product.artwork_details);
    details.stock_available = recordedStock;

    db.query(
      `UPDATE artwork
       SET artwork_details = ?
       WHERE artwork_id = ?
         AND student_id = ?
         AND LOWER(TRIM(art_type)) = 'product'`,
      [JSON.stringify(details), artworkId, sellerId],
      async (updateError, result) => {
        if (updateError) {
          console.error("Seller inventory update error:", updateError);
          return res.status(500).json({ message: "Unable to update inventory" });
        }

        if (!result.affectedRows) {
          return res.status(404).json({ message: "Product inventory was not found" });
        }

        await logSellerAudit(req.user, {
          action: "UPDATE_PRODUCT_STOCK",
          information: `Stock for product ID ${artworkId} (${product.title}) was set to ${requestedStock}.`,
        });

        return res.json({
          message: "Stock updated successfully",
          product: serializeInventoryProduct({
            ...product,
            artwork_details: details,
          }),
        });
      },
    );
  });
});

export default router;
