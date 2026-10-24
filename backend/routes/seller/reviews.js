import express from "express";
import db from "../../database/db.js";
import { authenticateSeller } from "../../middleware/sellerAuthMiddleware.js";

const router = express.Router();

router.get("/", authenticateSeller, (req, res) => {
  db.query(
    `SELECT r.review_id, r.order_id, r.order_item_id, r.rating, r.comment,
            r.created_at,
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
        createdAt: row.created_at,
        reviewerName: row.reviewer_name,
        artworkId: row.artwork_id,
        artworkTitle: row.artwork_title,
        artworkImage: row.artwork_image,
      })));
    },
  );
});

export default router;
