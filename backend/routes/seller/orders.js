import express from "express";
import db from "../../database/db.js";
import { authenticateSeller } from "../../middleware/sellerAuthMiddleware.js";

const router = express.Router();
const allowedTransitions = {
  Pending: new Set(["Confirmed", "Cancelled"]),
  Confirmed: new Set(["Packed"]),
  Packed: new Set(["Shipped"]),
  Shipped: new Set(["Delivered"]),
};

router.get("/", authenticateSeller, (req, res) => {
  db.query(
    `SELECT
       o.order_id, CONCAT('AM-', LPAD(o.order_id, 6, '0')) AS order_number,
       o.created_at, o.status, o.payment_method, o.subtotal, o.shipping_fee,
       o.total_amount, o.buyer_name, o.buyer_email, o.shipping_street,
       o.shipping_barangay, o.shipping_city, o.shipping_province,
       o.shipping_region, o.shipping_postal_code, i.order_item_id,
       i.artwork_id, i.title, i.artist_name, i.image, i.unit_price, i.quantity
     FROM marketplace_order o
     LEFT JOIN marketplace_order_item i ON i.order_id = o.order_id
     WHERE o.seller_id = ?
     ORDER BY o.created_at DESC, o.order_id DESC, i.order_item_id`,
    [req.user.student_id],
    (err, rows) => {
      if (err) {
        console.error("Seller order list error:", err);
        return res.status(500).json({ message: "Unable to load orders" });
      }
      const orders = new Map();
      rows.forEach((row) => {
        let order = orders.get(row.order_id);
        if (!order) {
          order = {
            orderId: row.order_id,
            id: row.order_number,
            date: row.created_at,
            status: row.status,
            payment: row.payment_method,
            subtotal: Number(row.subtotal),
            shipping: Number(row.shipping_fee),
            total: Number(row.total_amount),
            customer: row.buyer_name,
            email: row.buyer_email,
            address: [
              row.shipping_street,
              row.shipping_barangay,
              row.shipping_city,
              row.shipping_province,
              row.shipping_region,
              row.shipping_postal_code,
            ].filter(Boolean).join(", "),
            items: [],
          };
          orders.set(row.order_id, order);
        }
        if (row.order_item_id) {
          order.items.push({
            id: row.order_item_id,
            artworkId: row.artwork_id,
            title: row.title,
            artist: row.artist_name,
            image: row.image,
            qty: row.quantity,
            price: Number(row.unit_price),
          });
        }
      });
      res.json([...orders.values()]);
    },
  );
});

router.put("/:id/status", authenticateSeller, (req, res) => {
  const requestedStatus = String(req.body.status || "");
  db.query(
    "SELECT status FROM marketplace_order WHERE order_id = ? AND seller_id = ? LIMIT 1",
    [req.params.id, req.user.student_id],
    (findError, rows) => {
      if (findError) return res.status(500).json({ message: "Unable to update order" });
      if (!rows.length) return res.status(404).json({ message: "Order not found" });
      const currentStatus = rows[0].status;
      if (!allowedTransitions[currentStatus]?.has(requestedStatus)) {
        return res.status(400).json({ message: `Cannot move an order from ${currentStatus} to ${requestedStatus}` });
      }
      db.query(
        "UPDATE marketplace_order SET status = ? WHERE order_id = ? AND seller_id = ? AND status = ?",
        [requestedStatus, req.params.id, req.user.student_id, currentStatus],
        (updateError, result) => {
          if (updateError) return res.status(500).json({ message: "Unable to update order" });
          if (!result.affectedRows) return res.status(409).json({ message: "Order status changed; refresh and try again" });
          res.json({ message: "Order status updated", status: requestedStatus });
        },
      );
    },
  );
});

export default router;