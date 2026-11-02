import express from "express";
import db from "../../database/db.js";
import { authenticateSeller } from "../../middleware/sellerAuthMiddleware.js";

const router = express.Router();

router.get("/", authenticateSeller, (req, res) => {
  db.query(
    `SELECT r.review_id, r.order_id, r.order_item_id, r.rating, r.comment,
            r.seller_response, r.seller_response_at, r.created_at,
            COALESCE(NULLIF(TRIM(CONCAT_WS(' ', c.first_name, c.last_name)), ''),
                     NULLIF(TRIM(o.buyer_name), ''), 'Buyer') AS reviewer_name,
            COALESCE(r.artwork_id, oi.artwork_id) AS artwork_id,
            COALESCE(oi.title, a.title) AS artwork_title,
            COALESCE(oi.image, a.image) AS artwork_image
     FROM artwork_reviews r
     LEFT JOIN marketplace_order o ON o.order_id = r.order_id
     LEFT JOIN marketplace_order_item oi ON oi.order_item_id = r.order_item_id
     LEFT JOIN customer c ON c.customer_id = r.customer_id
     LEFT JOIN artwork a ON a.artwork_id = r.artwork_id
     WHERE r.seller_id = ?
     ORDER BY r.created_at DESC, r.review_id DESC`,
    [req.user.student_id],
    (error, rows) => {
      if (error) {
        console.error("Seller artwork reviews error:", error);
        return res.status(500).json({ message: "Unable to load buyer reviews" });
      }
      res.json(rows.map((row) => ({
        id: row.review_id,
        orderId: row.order_id,
        orderItemId: row.order_item_id,
        rating: Number(row.rating),
        comment: row.comment,
        sellerResponse: row.seller_response,
        sellerResponseAt: row.seller_response_at,
        createdAt: row.created_at,
        reviewerName: row.reviewer_name,
        artworkId: row.artwork_id,
        artworkTitle: row.artwork_title,
        artworkImage: row.artwork_image,
      })));
    },
  );
});

router.put("/:reviewId/response", authenticateSeller, (req, res) => {
  const reviewId = Number(req.params.reviewId);
  const response = req.body?.response;
  if (!Number.isSafeInteger(reviewId) || reviewId <= 0) {
    return res.status(400).json({ message: "A valid review is required" });
  }
  if (typeof response !== "string" || !response.trim() || response.trim().length > 600) {
    return res.status(400).json({ message: "Response must contain 1 to 600 characters" });
  }

  db.query(
    `UPDATE artwork_reviews
     SET seller_response = ?, seller_response_at = CURRENT_TIMESTAMP
     WHERE review_id = ? AND seller_id = ?`,
    [response.trim(), reviewId, req.user.student_id],
    (error, result) => {
      if (error) {
        console.error("Seller review response error:", error);
        return res.status(500).json({ message: "Unable to save review response" });
      }

      if (!result.affectedRows) {
        return db.query(
          "SELECT review_id FROM artwork_reviews WHERE review_id = ? AND seller_id = ?",
          [reviewId, req.user.student_id],
          (lookupError, rows) => {
            if (lookupError) {
              console.error("Seller review response lookup error:", lookupError);
              return res.status(500).json({ message: "Unable to save review response" });
            }
            if (!rows.length) {
              return res.status(404).json({ message: "Review not found" });
            }
            return res.json({
              message: "Response saved",
              response: response.trim(),
              respondedAt: new Date().toISOString(),
            });
          },
        );
      }

      return res.json({
        message: "Response saved",
        response: response.trim(),
        respondedAt: new Date().toISOString(),
      });
    },
  );
});

export default router;
