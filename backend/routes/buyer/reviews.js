import express from "express";
import db from "../../database/db.js";
import { authenticateBuyer } from "../../middleware/buyerAuthMiddleware.js";

const router = express.Router();

router.post("/", authenticateBuyer, (req, res) => {
  const orderItemId = Number(req.body.order_item_id);
  const rating = Number(req.body.rating);
  const comment = String(req.body.comment || "").trim();

  if (!Number.isInteger(orderItemId) || orderItemId <= 0) {
    return res.status(400).json({ message: "A valid purchased item is required" });
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ message: "Rating must be between 1 and 5" });
  }
  if (!comment || comment.length > 600) {
    return res.status(400).json({ message: "Review must be between 1 and 600 characters" });
  }

  db.query(
    `INSERT INTO artwork_review
       (order_id, order_item_id, customer_id, seller_id, artwork_id, rating, comment)
     SELECT o.order_id, oi.order_item_id, o.customer_id, o.seller_id,
            oi.artwork_id, ?, ?
     FROM marketplace_order o
     JOIN marketplace_order_item oi ON oi.order_id = o.order_id
     WHERE oi.order_item_id = ?
       AND o.customer_id = ?
       AND o.status = 'Delivered'`,
    [rating, comment, orderItemId, req.user.customer_id],
    (error, result) => {
      if (error?.code === "ER_DUP_ENTRY") {
        return res.status(409).json({ message: "You have already reviewed this purchased item" });
      }
      if (error) {
        console.error("Buyer artwork review error:", error);
        return res.status(500).json({ message: "Unable to submit review" });
      }
      if (!result.affectedRows) {
        return res.status(403).json({ message: "Reviews are available only for your delivered purchases" });
      }
      res.status(201).json({
        message: "Review submitted",
        review: {
          reviewId: result.insertId,
          orderItemId,
          rating,
          comment,
          createdAt: new Date().toISOString(),
        },
      });
    },
  );
});

export default router;
