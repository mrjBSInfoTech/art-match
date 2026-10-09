import express from "express";
import db from "../../database/db.js";
import { authenticateBuyer } from "../../middleware/buyerAuthMiddleware.js";
import {
  recordRecommendationInteraction,
  getRecommendationSessionIdFromRequest,
} from "../../utils/recommendationInteractions.js";

const router = express.Router();

const SHIPPING_FEE = 150;

const paymentMethods = new Set(["gcash", "cod", "bank"]);

const query = async (executor, sql, params = []) => {
  const [rows] = await executor.query(sql, params);

  return rows;
};

const groupOrderRows = (rows) => {
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

        address: [
          row.shipping_street,
          row.shipping_barangay,
          row.shipping_city,
          row.shipping_province,
          row.shipping_region,
          row.shipping_postal_code,
        ]
          .filter(Boolean)
          .join(", "),

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

        sellerId: row.seller_id,

        image: row.image,

        qty: row.quantity,

        price: Number(row.unit_price),

        review: row.review_id
          ? {
              id: row.review_id,

              rating: Number(row.review_rating),

              comment: row.review_comment,

              createdAt: row.review_created_at,
            }
          : null,
      });
    }
  });

  return [...orders.values()];
};

const ordersSql = `
  SELECT
    o.order_id,
    CONCAT(
      'AM-',
      LPAD(o.order_id, 6, '0')
    ) AS order_number,

    o.created_at,
    o.status,
    o.payment_method,
    o.subtotal,
    o.shipping_fee,
    o.total_amount,
    o.buyer_name,
    o.shipping_street,
    o.shipping_barangay,
    o.shipping_city,
    o.shipping_province,
    o.shipping_region,
    o.shipping_postal_code,
    o.seller_id,

    i.order_item_id,
    i.artwork_id,
    i.title,
    i.artist_name,
    i.image,
    i.unit_price,
    i.quantity,

    r.review_id,
    r.rating AS review_rating,
    r.comment AS review_comment,
    r.created_at AS review_created_at

  FROM marketplace_order o

  LEFT JOIN marketplace_order_item i
    ON i.order_id = o.order_id

  LEFT JOIN artwork_review r
    ON r.order_item_id =
       i.order_item_id
`;

router.get("/", authenticateBuyer, async (req, res) => {
  try {
    const rows = await query(
      db.promise(),

      `${ordersSql}
         WHERE o.customer_id = ?
         ORDER BY
           o.created_at DESC,
           o.order_id DESC,
           i.order_item_id`,

      [req.user.customer_id],
    );

    return res.json(groupOrderRows(rows));
  } catch (error) {
    console.error("Buyer order list error:", error);

    return res.status(500).json({
      message: "Unable to load orders",
    });
  }
});

router.post("/checkout", authenticateBuyer, async (req, res) => {
  const recommendationSessionId = getRecommendationSessionIdFromRequest(req);

  const addressId = Number(req.body.address_id);

  const paymentMethod = String(req.body.payment_method || "").toLowerCase();

  if (!Number.isInteger(addressId) || addressId <= 0) {
    return res.status(400).json({
      message: "A valid shipping address is required",
    });
  }

  if (!paymentMethods.has(paymentMethod)) {
    return res.status(400).json({
      message: "Choose a valid payment method",
    });
  }

  let connection;

  try {
    connection = await db.promise().getConnection();

    await connection.beginTransaction();

    const carts = await query(
      connection,

      `SELECT add_to_id
         FROM add_cart
         WHERE customer_id = ?
         FOR UPDATE`,

      [req.user.customer_id],
    );

    if (!carts.length) {
      await connection.rollback();

      return res.status(400).json({
        message: "Your cart is empty",
      });
    }

    const items = await query(
      connection,

      `SELECT
           a.artwork_id,
           a.student_id,
           a.title,
           a.price,
           a.image,

           CONCAT(
             s.first_name,
             ' ',
             s.last_name
           ) AS artist_name

         FROM cart_item ci

         JOIN artwork a
           ON a.artwork_id =
              ci.artwork_id

         JOIN student s
           ON s.student_id =
              a.student_id

         WHERE ci.add_to_id = ?

         ORDER BY
           a.student_id,
           a.artwork_id

         FOR UPDATE`,

      [carts[0].add_to_id],
    );

    if (!items.length) {
      await connection.rollback();

      return res.status(400).json({
        message: "Your cart is empty",
      });
    }

    const unavailable = await query(
      connection,

      `SELECT DISTINCT
             oi.artwork_id

           FROM marketplace_order_item oi

           JOIN marketplace_order o
             ON o.order_id =
                oi.order_id

           WHERE
             oi.artwork_id IN (?)
             AND
             o.status <> 'Cancelled'

           FOR UPDATE`,

      [items.map((item) => item.artwork_id)],
    );

    if (unavailable.length) {
      const unavailableIds = new Set(
        unavailable.map((item) => item.artwork_id),
      );

      await query(
        connection,

        `DELETE FROM cart_item
           WHERE
             add_to_id = ?
             AND artwork_id IN (?)`,

        [carts[0].add_to_id, [...unavailableIds]],
      );

      await connection.commit();

      return res.status(409).json({
        message:
          "Some artwork in your cart has already been purchased. Your cart was updated; please review it and try again.",

        unavailable_artwork_ids: [...unavailableIds],
      });
    }

    const addresses = await query(
      connection,

      `SELECT
             street_name,
             barangay,
             city,
             province,
             region,
             postal_code

           FROM address

           WHERE
             address_id = ?
             AND customer_id = ?

           FOR UPDATE`,

      [addressId, req.user.customer_id],
    );

    if (!addresses.length) {
      await connection.rollback();

      return res.status(400).json({
        message: "The selected shipping address is not available",
      });
    }

    const buyers = await query(
      connection,

      `SELECT
             first_name,
             last_name,
             email

           FROM customer

           WHERE customer_id = ?`,

      [req.user.customer_id],
    );

    if (!buyers.length) {
      await connection.rollback();

      return res.status(404).json({
        message: "Buyer account not found",
      });
    }

    const address = addresses[0];

    const buyer = buyers[0];

    const buyerName = [buyer.first_name, buyer.last_name]
      .filter(Boolean)
      .join(" ");

    const bySeller = new Map();

    items.forEach((item) => {
      const sellerItems = bySeller.get(item.student_id) || [];

      sellerItems.push(item);

      bySeller.set(item.student_id, sellerItems);
    });

    const createdOrders = [];

    for (const [sellerId, sellerItems] of bySeller) {
      const subtotal = sellerItems.reduce(
        (sum, item) => sum + Number(item.price),

        0,
      );

      const [result] = await connection.query(
        `INSERT INTO marketplace_order
             (
               customer_id,
               seller_id,
               buyer_name,
               buyer_email,
               payment_method,
               shipping_street,
               shipping_barangay,
               shipping_city,
               shipping_province,
               shipping_region,
               shipping_postal_code,
               subtotal,
               shipping_fee,
               total_amount
             )
             VALUES (
               ?, ?, ?, ?, ?,
               ?, ?, ?, ?, ?,
               ?, ?, ?, ?
             )`,

        [
          req.user.customer_id,
          sellerId,
          buyerName,
          buyer.email,
          paymentMethod,

          address.street_name,
          address.barangay,
          address.city,
          address.province,
          address.region,
          address.postal_code,

          subtotal,
          SHIPPING_FEE,
          subtotal + SHIPPING_FEE,
        ],
      );

      for (const item of sellerItems) {
        /*
         * First create the real
         * purchased order item.
         */
        await connection.query(
          `INSERT INTO marketplace_order_item
             (
               order_id,
               artwork_id,
               title,
               artist_name,
               image,
               unit_price,
               quantity
             )
             VALUES (
               ?, ?, ?, ?, ?, ?, 1
             )`,

          [
            result.insertId,
            item.artwork_id,
            item.title,
            item.artist_name,
            item.image,
            item.price,
          ],
        );

        /*
         * Only after the real
         * purchase insert succeeds
         * do we record the
         * recommendation event.
         *
         * This uses the SAME
         * database transaction.
         */
        await recordRecommendationInteraction({
          executor: connection,

          customerId: req.user.customer_id,

          artworkId: item.artwork_id,

          sessionId: recommendationSessionId,

          eventType: "purchase",

          sourcePage: "checkout",
        });
      }

      createdOrders.push({
        orderId: result.insertId,

        id: `AM-${String(result.insertId).padStart(6, "0")}`,

        total: subtotal + SHIPPING_FEE,
      });
    }

    await query(
      connection,

      `DELETE FROM cart_item
         WHERE add_to_id = ?`,

      [carts[0].add_to_id],
    );

    await query(
      connection,

      `UPDATE add_cart
         SET total_price = 0
         WHERE add_to_id = ?`,

      [carts[0].add_to_id],
    );

    await connection.commit();

    return res.status(201).json({
      message: "Order placed successfully",

      orders: createdOrders,
    });
  } catch (error) {
    if (connection) {
      await connection.rollback().catch(() => {});
    }

    console.error("Buyer checkout error:", error);

    return res.status(500).json({
      message: "Unable to place your order",
    });
  } finally {
    connection?.release();
  }
});

router.put("/:id/cancel", authenticateBuyer, async (req, res) => {
  try {
    const result = await query(
      db.promise(),

      `UPDATE marketplace_order
         SET status = 'Cancelled'
         WHERE
           order_id = ?
           AND customer_id = ?
           AND status = 'Pending'`,

      [req.params.id, req.user.customer_id],
    );

    if (!result.affectedRows) {
      return res.status(409).json({
        message: "Only pending orders can be cancelled",
      });
    }

    return res.json({
      message: "Order cancelled",
    });
  } catch (error) {
    console.error("Buyer order cancellation error:", error);

    return res.status(500).json({
      message: "Unable to cancel order",
    });
  }
});

export default router;
