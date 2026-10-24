import express from "express";
import db from "../../database/db.js";
import { authenticateBuyer } from "../../middleware/buyerAuthMiddleware.js";
import { getArtworkRatingSummary } from "../../utils/artworkRatings.js";

const router = express.Router();
const query = (sql, params = []) => new Promise((resolve, reject) => {
  db.query(sql, params, (error, rows) => error ? reject(error) : resolve(rows));
});
const positiveInteger = (value) => {
  if (!["number", "string"].includes(typeof value) || String(value).trim() === "") return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
};
const requireBuyerIdentity = (req, res, next) => {
  // Legacy authentication maps generic JWT IDs to customer_id. Keep seller and
  // admin claims from being attributed to a buyer with the same numeric ID.
  if (req.user?.student_id != null || req.user?.admin_id != null
    || !positiveInteger(req.user?.customer_id)) {
    return res.status(403).json({ message: "Only buyer accounts can review artwork" });
  }
  return next();
};

const verifiedArtwork = async (artworkId) => {
  const rows = await query(`
    SELECT a.artwork_id FROM artwork a
    JOIN artupload au ON au.artwork_id = a.artwork_id
    LEFT JOIN accregistration ac ON ac.student_id = a.student_id
    WHERE a.artwork_id = ? AND LOWER(TRIM(au.request_status)) = 'verified'
      AND (ac.register_status IS NULL OR LOWER(TRIM(ac.register_status)) = 'verified')
    LIMIT 1
  `, [artworkId]);
  return rows.length > 0;
};

router.get("/artwork/:artworkId", async (req, res) => {
  res.set("Cache-Control", "no-store");
  const artworkId = positiveInteger(req.params.artworkId);
  const page = req.query.page === undefined ? 1 : positiveInteger(req.query.page);
  const limit = req.query.limit === undefined ? 10 : positiveInteger(req.query.limit);
  if (!artworkId || !page || !limit || limit > 50 || !Number.isSafeInteger((page - 1) * limit)) {
    return res.status(400).json({ message: "Invalid review pagination or artwork" });
  }
  try {
    if (!await verifiedArtwork(artworkId)) return res.status(404).json({ message: "Artwork not found" });
    const aggregates = await query(`
      SELECT COUNT(*) AS rating_count, COALESCE(SUM(rating), 0) AS rating_sum,
        SUM(rating = 1) AS rating_1_count, SUM(rating = 2) AS rating_2_count,
        SUM(rating = 3) AS rating_3_count, SUM(rating = 4) AS rating_4_count,
        SUM(rating = 5) AS rating_5_count
      FROM artwork_reviews WHERE artwork_id = ? AND rating BETWEEN 1 AND 5 AND rating = FLOOR(rating)
    `, [artworkId]);
    const summary = getArtworkRatingSummary(aggregates[0] || {});
    const rows = await query(`
      SELECT r.review_id, r.rating, r.comment, r.created_at,
        COALESCE(NULLIF(TRIM(CONCAT_WS(' ', c.first_name, c.last_name)), ''),
                 NULLIF(TRIM(o.buyer_name), ''), 'Buyer') AS reviewer_name
      FROM artwork_reviews r
      LEFT JOIN customer c ON c.customer_id = r.customer_id
      LEFT JOIN marketplace_order o ON o.order_id = r.order_id
      WHERE r.artwork_id = ? AND r.rating BETWEEN 1 AND 5 AND r.rating = FLOOR(r.rating)
      ORDER BY r.created_at DESC, r.review_id DESC LIMIT ? OFFSET ?
    `, [artworkId, limit, (page - 1) * limit]);
    return res.json({
      artwork_id: artworkId, summary,
      reviews: rows.map((row) => ({
        id: row.review_id, rating: Number(row.rating), comment: row.comment || null,
        reviewer_name: row.reviewer_name, created_at: row.created_at,
      })),
      pagination: { page, limit, total: summary.total_reviews, pages: Math.ceil(summary.total_reviews / limit) },
    });
  } catch (error) {
    console.error("Artwork review list error:", error);
    return res.status(500).json({ message: "Unable to load artwork reviews" });
  }
});

router.get("/artwork/:artworkId/eligibility", authenticateBuyer, requireBuyerIdentity, async (req, res) => {
  res.set("Cache-Control", "no-store");
  const artworkId = positiveInteger(req.params.artworkId);
  if (!artworkId) return res.status(400).json({ message: "A valid artwork is required" });
  try {
    if (!await verifiedArtwork(artworkId)) return res.status(404).json({ message: "Artwork not found" });
    return res.json({ can_review: true, order_item_id: null, reason: "eligible" });
  } catch (error) {
    console.error("Artwork review eligibility error:", error);
    return res.status(500).json({ message: "Unable to check review eligibility" });
  }
});

router.post("/", authenticateBuyer, requireBuyerIdentity, async (req, res) => {
  const orderItemId = req.body.order_item_id == null ? null : positiveInteger(req.body.order_item_id);
  const artworkId = req.body.artwork_id == null ? null : positiveInteger(req.body.artwork_id);
  const rating = positiveInteger(req.body.rating);
  if ((req.body.order_item_id != null && !orderItemId) || (req.body.artwork_id != null && !artworkId)
    || (!orderItemId && !artworkId)) {
    return res.status(400).json({ message: "A valid purchased item or artwork is required" });
  }
  if (!rating || rating > 5) return res.status(400).json({ message: "Rating must be between 1 and 5" });
  if (req.body.comment != null && typeof req.body.comment !== "string") {
    return res.status(400).json({ message: "Review comment must be text" });
  }
  const comment = req.body.comment?.trim() || null;
  if (comment && comment.length > 600) return res.status(400).json({ message: "Review must be 600 characters or fewer" });
  try {
    let result;
    if (!orderItemId) {
      // Public discussion belongs to the authenticated buyer and the artwork's
      // real seller. Insert only while the artwork is publicly visible.
      result = await query(`
        INSERT INTO artwork_reviews
          (order_id, order_item_id, customer_id, seller_id, artwork_id, rating, comment)
        SELECT NULL, NULL, ?, s.student_id, a.artwork_id, ?, ?
        FROM artwork a
        JOIN student s ON s.student_id = a.student_id
        LEFT JOIN accregistration ac ON ac.student_id = a.student_id
        WHERE a.artwork_id = ?
          AND (ac.register_status IS NULL OR LOWER(TRIM(ac.register_status)) = 'verified')
          AND EXISTS (
            SELECT 1 FROM artupload au WHERE au.artwork_id = a.artwork_id
              AND LOWER(TRIM(au.request_status)) = 'verified'
          )
        LIMIT 1
      `, [req.user.customer_id, rating, comment, artworkId]);
      if (!result.affectedRows) return res.status(404).json({ message: "Artwork not found" });
    } else {
      // Existing order reviews keep their delivered-purchase authorization and
      // unique order-item association for the buyer's Orders page.
      result = await query(`
        INSERT INTO artwork_reviews
          (order_id, order_item_id, customer_id, seller_id, artwork_id, rating, comment)
        SELECT o.order_id, oi.order_item_id, o.customer_id, o.seller_id, oi.artwork_id, ?, ?
        FROM marketplace_order o
        JOIN marketplace_order_item oi ON oi.order_id = o.order_id
        WHERE oi.order_item_id = ? AND o.customer_id = ? AND o.status = 'Delivered'
          AND (? IS NULL OR oi.artwork_id = ?)
      `, [rating, comment, orderItemId, req.user.customer_id, artworkId, artworkId]);
      if (!result.affectedRows) return res.status(403).json({ message: "Reviews are available only for your delivered purchases" });
    }
    return res.status(201).json({
      message: "Review submitted",
      review: { reviewId: result.insertId, orderItemId, artworkId, rating, comment, createdAt: new Date().toISOString() },
    });
  } catch (error) {
    if (orderItemId && error?.code === "ER_DUP_ENTRY") return res.status(409).json({ message: "You have already reviewed this purchased item" });
    console.error("Buyer artwork review error:", error);
    return res.status(500).json({ message: "Unable to submit review" });
  }
});

export default router;
