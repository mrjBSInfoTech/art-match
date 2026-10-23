import express from "express";
import db from "../../database/db.js";
import { randomUUID } from "node:crypto";
import {
  createPayMongoCheckoutSession,
  pesosToCentavos,
} from "../../utils/paymongo.js";
import { readParcelPhoto } from "../../utils/parcelPhotoStorage.js";
import { authenticateBuyer } from "../../middleware/buyerAuthMiddleware.js";
import {
  recordRecommendationInteraction,
  getRecommendationSessionIdFromRequest,
} from "../../utils/recommendationInteractions.js";
import { getArtworkAvailability } from "../../utils/artworkAvailability.js";

const router = express.Router();

const SHIPPING_FEE = 150;

const paymentMethods = new Set(["paymongo", "cod"]);

const PAYMONGO_PAYMENT_METHOD_TYPES = ["card", "gcash", "paymaya", "qrph"];

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
        paymentStatus: row.payment_status,
        paymentChannel: row.paymongo_payment_method,
        paidAt: row.paid_at,

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
    o.payment_status,
    o.paymongo_payment_method,
    o.paid_at,
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

router.get("/:id/parcel-photos/:index", authenticateBuyer, async (req, res) => {
  const orderId = Number(req.params.id);
  const photoIndex = Number(req.params.index);
  if (
    !Number.isSafeInteger(orderId) ||
    orderId <= 0 ||
    !Number.isSafeInteger(photoIndex) ||
    photoIndex < 0
  ) {
    return res.status(400).json({ message: "Invalid parcel photo request" });
  }

  try {
    const rows = await query(
      db.promise(),
      `SELECT parcel_photos
       FROM marketplace_order
       WHERE order_id = ? AND customer_id = ?
       LIMIT 1`,
      [orderId, req.user.customer_id],
    );
    if (!rows.length) {
      return res.status(404).json({ message: "Parcel photo not found" });
    }

    const photos = Array.isArray(rows[0].parcel_photos)
      ? rows[0].parcel_photos
      : rows[0].parcel_photos
        ? JSON.parse(rows[0].parcel_photos)
        : [];
    const photo = photos[photoIndex];
    if (
      !photo?.key ||
      !["image/jpeg", "image/png", "image/webp"].includes(photo.contentType)
    ) {
      return res.status(404).json({ message: "Parcel photo not found" });
    }

    const image = await readParcelPhoto(photo, orderId);
    res.set({
      "Cache-Control": "private, max-age=300",
      "Content-Type": photo.contentType,
      "X-Content-Type-Options": "nosniff",
    });
    return res.send(image);
  } catch (error) {
    console.error("Buyer parcel photo fetch failed:", error);
    return res.status(500).json({ message: "Unable to load parcel photo" });
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

  const isPayMongo = paymentMethod === "paymongo";

  /*
   * One PayMongo payment can contain
   * several seller orders.
   *
   * All of those orders will share
   * this same payment reference.
   */
  const paymentReference = isPayMongo ? `AM-${randomUUID()}` : null;

  let connection;

  try {
    connection = await db.promise().getConnection();

    await connection.beginTransaction();

    /*
     * Find the buyer's cart.
     */
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

    const cartId = carts[0].add_to_id;

    /*
     * Load the REAL artwork information
     * directly from MySQL.
     *
     * We never trust prices sent by React.
     */
    const items = await query(
      connection,

      `SELECT
         a.artwork_id,
         a.student_id,
         a.title,
         a.price,
         a.image,

         JSON_UNQUOTE(
           JSON_EXTRACT(
             a.artwork_details,
             '$.stock_available'
           )
         ) AS stock_available,

         a.is_sold,
         a.status,

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

      [cartId],
    );

    if (!items.length) {
      await connection.rollback();

      return res.status(400).json({
        message: "Your cart is empty",
      });
    }

    /*
    * Count only real purchases.
    *
    * COD counts immediately.
    * PayMongo counts only after
    * payment_status becomes Paid.
    */
    const previousPurchases = await query(
      connection,

      `SELECT
         oi.artwork_id,
         oi.quantity

       FROM marketplace_order_item oi

       JOIN marketplace_order o
         ON o.order_id =
            oi.order_id

      WHERE
        oi.artwork_id IN (?)
        AND
        o.status <> 'Cancelled'
        AND (
          o.payment_method = 'cod'
          OR (
            o.payment_method = 'paymongo'
            AND o.payment_status = 'Paid'
          )
        )

      FOR UPDATE`,

      [items.map((item) => item.artwork_id)],
    );

    const soldQuantities = new Map();

    previousPurchases.forEach((purchase) => {
      const artworkId = String(purchase.artwork_id);

      soldQuantities.set(
        artworkId,

        (soldQuantities.get(artworkId) || 0) + Number(purchase.quantity || 0),
      );
    });

    const unavailableIds = items
      .filter(
        (item) =>
          getArtworkAvailability(
            item.stock_available,

            soldQuantities.get(String(item.artwork_id)) || 0,

            Number(item.is_sold) === 1 ||
              String(item.status || "").toLowerCase() === "sold",
          ).isSoldOut,
      )
      .map((item) => item.artwork_id);

    /*
     * Remove artwork that became sold
     * before checkout finished.
     */
    if (unavailableIds.length) {
      await query(
        connection,

        `DELETE FROM cart_item
         WHERE
           add_to_id = ?
           AND artwork_id IN (?)`,

        [cartId, unavailableIds],
      );

      await query(
        connection,

        `UPDATE add_cart ac
         SET total_price = (
           SELECT
             COALESCE(
               SUM(a.price),
               0
             )

           FROM cart_item ci

           JOIN artwork a
             ON a.artwork_id =
                ci.artwork_id

           WHERE ci.add_to_id =
                 ac.add_to_id
         )

         WHERE ac.add_to_id = ?`,

        [cartId],
      );

      await connection.commit();

      return res.status(409).json({
        message:
          "Some artwork in your cart is sold out. Your cart was updated; please review it and try again.",

        unavailable_artwork_ids: unavailableIds,
      });
    }

    /*
     * Load the selected saved address.
     *
     * It must belong to the current
     * logged-in buyer.
     */
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

    /*
     * Load buyer information directly
     * from MySQL.
     */
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

    /*
     * Your existing architecture creates
     * one marketplace_order per seller.
     */
    const bySeller = new Map();

    items.forEach((item) => {
      const sellerItems = bySeller.get(item.student_id) || [];

      sellerItems.push(item);

      bySeller.set(item.student_id, sellerItems);
    });

    const createdOrders = [];

    /*
     * Create one order per seller.
     */
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
            payment_status,
            payment_reference,

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
            ?, ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?
          )`,

        [
          req.user.customer_id,
          sellerId,

          buyerName,
          buyer.email,

          paymentMethod,
          "Pending",
          paymentReference,

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

      /*
       * Copy the artwork information into
       * marketplace_order_item.
       */
      for (const item of sellerItems) {
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
         * COD is already considered an
         * actual placed order.
         *
         * PayMongo is NOT a purchase yet.
         * We wait for the webhook.
         */
        if (!isPayMongo) {
          await recordRecommendationInteraction({
            executor: connection,

            customerId: req.user.customer_id,

            artworkId: item.artwork_id,

            sessionId: recommendationSessionId,

            eventType: "purchase",

            sourcePage: "checkout",
          });
        }
      }

      createdOrders.push({
        orderId: result.insertId,

        id: `AM-${String(result.insertId).padStart(6, "0")}`,

        total: subtotal + SHIPPING_FEE,
      });
    }

    /*
     * =================================================
     * PAYMONGO CHECKOUT
     * =================================================
     */
    if (isPayMongo) {
      /*
       * Convert each artwork into a
       * PayMongo line item.
       */
      const lineItems = items.map((item) => ({
        name: String(item.title || "Artwork").slice(0, 255),

        amount: pesosToCentavos(item.price),

        currency: "PHP",

        quantity: 1,
      }));

      /*
       * Shipping is ₱150 PER SELLER.
       *
       * This matches your current
       * marketplace_order calculation.
       */
      const totalShipping = SHIPPING_FEE * bySeller.size;

      lineItems.push({
        name: "Shipping Fee",

        amount: pesosToCentavos(totalShipping),

        currency: "PHP",

        quantity: 1,
      });

      /*
       * Remove a trailing slash so we do
       * not create URLs containing //.
       */
      const frontendUrl = String(
        process.env.FRONTEND_URL || "http://localhost:5173",
      ).replace(/\/+$/, "");

      /*
       * Ask PayMongo to create the
       * Hosted Checkout Session.
       */
      const checkoutSession = await createPayMongoCheckoutSession({
        lineItems,

        paymentMethodTypes: PAYMONGO_PAYMENT_METHOD_TYPES,

        successUrl: `${frontendUrl}/buyer/profile/orders?payment=success`,

        cancelUrl: `${frontendUrl}/buyer/checkout?payment=cancelled`,

        referenceNumber: paymentReference,

        metadata: {
          customer_id: String(req.user.customer_id),
        },
      });

      /*
       * Store PayMongo's Checkout
       * Session ID on ALL seller orders
       * belonging to this payment.
       */
      await query(
        connection,

        `UPDATE marketplace_order

         SET
           paymongo_checkout_session_id = ?

         WHERE
           payment_reference = ?
           AND customer_id = ?`,

        [
          checkoutSession.checkoutSessionId,

          paymentReference,

          req.user.customer_id,
        ],
      );

      /*
       * Important:
       *
       * DO NOT clear the cart yet.
       *
       * The buyer has not paid yet.
       *
       * Step 4's webhook will confirm
       * the payment first.
       */
      await connection.commit();

      return res.status(201).json({
        message: "PayMongo checkout created",

        payment_method: "paymongo",

        payment_status: "Pending",

        payment_reference: paymentReference,

        checkout_session_id: checkoutSession.checkoutSessionId,

        checkout_url: checkoutSession.checkoutUrl,

        orders: createdOrders,
      });
    }

    /*
     * =================================================
     * CASH ON DELIVERY
     * =================================================
     *
     * COD does not need PayMongo.
     * Keep your existing behavior:
     *
     * order created
     * cart cleared
     */
    await query(
      connection,

      `DELETE FROM cart_item
       WHERE add_to_id = ?`,

      [cartId],
    );

    await query(
      connection,

      `UPDATE add_cart
       SET total_price = 0
       WHERE add_to_id = ?`,

      [cartId],
    );

    await connection.commit();

    return res.status(201).json({
      message: "Order placed successfully",

      payment_method: "cod",

      payment_status: "Pending",

      orders: createdOrders,
    });
  } catch (error) {
    if (connection) {
      await connection.rollback().catch(() => {});
    }

    console.error("Buyer checkout error:", error);

    return res.status(500).json({
      message: error?.message || "Unable to place your order",
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
