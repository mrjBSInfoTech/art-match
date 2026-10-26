import express from "express";
import db from "../../database/db.js";
import { randomUUID } from "node:crypto";
import {
  createPayMongoCheckoutSession,
  pesosToCentavos,
  getPayMongoPaymentMethodTypes,
  retrievePayMongoCheckoutSession,
  expirePayMongoCheckoutSession,
  PayMongoError,
} from "../../utils/paymongo.js";
import { readParcelPhoto } from "../../utils/parcelPhotoStorage.js";
import { authenticateBuyer } from "../../middleware/buyerAuthMiddleware.js";
import {
  recordRecommendationInteraction,
  getRecommendationSessionIdFromRequest,
} from "../../utils/recommendationInteractions.js";
import { getArtworkAvailability, getCompletedOrderCondition, getArtworkSoldQuantitySql } from "../../utils/artworkAvailability.js";
import { getCommissionRate } from "../../database/paymentSplits.js";
import { buildPaymentSplit, validateSplits } from "../../utils/paymentSplit.js";

const router = express.Router();

/*
 * Delivery is arranged by the seller through a third-party courier
 * (J&T, Lalamove, etc.), so ArtMatch does not quote, collect or calculate a
 * shipping fee. The buyer pays exactly the price of the artworks.
 */
const SHIPPING_FEE = 0;

const paymentMethods = new Set(["paymongo", "cod"]);

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
        paymentReference: row.payment_reference,
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
    o.payment_reference,
    o.paymongo_checkout_url,
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

  LEFT JOIN artwork_reviews r
    ON r.order_item_id =
       i.order_item_id
`;

router.get("/", authenticateBuyer, async (req, res) => {
  res.set("Cache-Control", "no-store");
  try {
    const rows = await query(
      db.promise(),

      `${ordersSql}
         WHERE o.customer_id = ?
           AND (o.payment_method <> 'paymongo' OR o.payment_status IN ('Paid', 'Refunded'))
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

router.get("/payments/methods", authenticateBuyer, async (_req, res) => {
  res.set("Cache-Control", "no-store");
  try {
    return res.json({
      payment_method_types: await getPayMongoPaymentMethodTypes(),
      supported_payment_method_types: ["card", "gcash", "paymaya", "qrph"],
    });
  } catch (error) {
    return res.status(error instanceof PayMongoError ? error.status : 503).json({
      message: error instanceof PayMongoError ? error.message : "Unable to load available payment methods. Please try again.",
    });
  }
});

// An unpaid checkout is a payment attempt, not a placed purchase. Its owner can
// inspect it here while buyer/seller Orders contain only actual placed orders.
router.get("/payments/:reference", authenticateBuyer, async (req, res) => {
  res.set("Cache-Control", "no-store");
  const reference = req.params.reference;
  if (typeof reference !== "string" || !/^AM-[A-Za-z0-9-]{1,97}$/.test(reference)) {
    return res.status(400).json({ message: "Invalid payment reference." });
  }
  try {
    const rows = await query(db.promise(), `${ordersSql}
      WHERE o.customer_id = ? AND o.payment_reference = ? AND o.payment_method = 'paymongo'
      ORDER BY o.order_id, i.order_item_id`, [req.user.customer_id, reference]);
    if (!rows.length) return res.status(404).json({ message: "Checkout not found." });
    const orders = groupOrderRows(rows);
    const all = (status) => orders.every((order) => order.paymentStatus === status);
    const paymentStatus = all("Paid") ? "Paid"
      : orders.some((order) => order.paymentStatus === "Refunded") ? "Refunded"
        : all("Expired") ? "Expired" : all("Failed") ? "Failed" : "Pending";
    return res.json({
      payment_reference: reference,
      payment_status: paymentStatus,
      status: orders.every((order) => order.status === "Cancelled") ? "Cancelled" : "Pending",
      checkout_url: paymentStatus === "Pending" || paymentStatus === "Failed" ? rows[0].paymongo_checkout_url : null,
      artwork_ids: [...new Set(rows.map((row) => Number(row.artwork_id)).filter((id) => Number.isSafeInteger(id) && id > 0))],
      orders,
    });
  } catch (error) {
    console.error("Buyer checkout status error:", error.code || error.name);
    return res.status(500).json({ message: "Unable to check payment status. Please try again." });
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
  const requestedArtworkIds = req.body.artwork_ids;
  if (requestedArtworkIds !== undefined && (!Array.isArray(requestedArtworkIds) ||
    !requestedArtworkIds.length || requestedArtworkIds.some((id) => !Number.isSafeInteger(id) || id <= 0))) {
    return res.status(400).json({ message: "Select at least one valid artwork to checkout" });
  }
  const selectedArtworkIds = requestedArtworkIds === undefined ? null : [...new Set(requestedArtworkIds)];

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
    // Use the same merchant capability check for the initial checkout and its
    // displayed options. Never advertise an unavailable method as payable.
    const enabledChannels = isPayMongo ? await getPayMongoPaymentMethodTypes() : [];
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
         EXISTS (SELECT 1 FROM artupload au WHERE au.artwork_id = a.artwork_id
           AND LOWER(au.request_status) = 'verified') AS is_verified,

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
       ${selectedArtworkIds ? "AND ci.artwork_id IN (?)" : ""}

       ORDER BY
         a.student_id,
         a.artwork_id

       FOR UPDATE`,

      selectedArtworkIds ? [cartId, selectedArtworkIds] : [cartId],
    );

    if (selectedArtworkIds && (items.length !== selectedArtworkIds.length ||
      selectedArtworkIds.some((id) => !items.some((item) => Number(item.artwork_id) === id)))) {
      await connection.rollback();
      return res.status(400).json({ message: "Some selected artworks are no longer in your cart. Please review your selection." });
    }

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
        ${getCompletedOrderCondition("o")}

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
          String(item.status || "").toLowerCase() !== "available" || !Number(item.is_verified) || getArtworkAvailability(
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

    // Validate even COD prices and prevent repeat attempts from creating another
    // payable session for the same buyer/artwork. Resume or expire the old group.
    items.forEach(item => pesosToCentavos(item.price));
    const pendingGroups = await query(connection,
      `SELECT DISTINCT o.payment_reference FROM marketplace_order o
       JOIN marketplace_order_item oi ON oi.order_id = o.order_id
       WHERE o.customer_id = ? AND o.payment_method = 'paymongo'
         AND o.payment_status IN ('Pending', 'Failed') AND o.status <> 'Cancelled'
         AND oi.artwork_id IN (?) FOR UPDATE`,
      [req.user.customer_id, items.map(item => item.artwork_id)],
    );
    if (pendingGroups.length) {
      await connection.rollback();
      return res.status(409).json({
        message: "These artworks already have an unfinished payment. Continue or cancel that payment here before starting a new checkout.",
        payment_reference: pendingGroups[0].payment_reference,
        can_resume: true,
      });
    }

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
      const subtotal = sellerItems.reduce((sum, item) => sum + pesosToCentavos(item.price), 0) / 100;

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
          subtotal,
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

        sellerId,

        subtotal,

        total: subtotal + SHIPPING_FEE,
      });
    }

    /*
     * One payment, several sellers. Record how every seller's share is
     * derived so the payout is fixed at order time and cannot drift with a
     * later price change. Rows start as Held and are released on payment.
     */
    const { splits, totals: splitTotals } = buildPaymentSplit(createdOrders, {
      commissionRate: getCommissionRate(),
    });

    const splitProblems = validateSplits(
      splits,
      splitTotals,
      createdOrders.reduce((sum, created) => sum + created.total, 0),
    );
    if (splitProblems.length) {
      await connection.rollback();
      console.error(
        "Payment split failed validation:",
        splitProblems,
        JSON.stringify({ splits, createdOrders, splitTotals }),
      );
      return res.status(500).json({ message: "Unable to compute seller payments." });
    }

    for (const split of splits) {
      await connection.query(
        `INSERT INTO seller_payment_split
           (order_id, seller_id, payment_reference, gross_amount, commission_rate,
            commission_amount, processing_fee_amount, net_amount, payout_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           payment_reference = VALUES(payment_reference)`,
        [
          split.orderId,
          split.sellerId,
          paymentReference || null,
          split.grossAmount,
          split.commissionRate,
          split.commissionAmount,
          split.processingFeeAmount,
          split.netAmount,
          isPayMongo ? "Held" : "Eligible",
        ],
      );
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

      // No shipping line item: the courier is arranged outside ArtMatch.

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

        // Let PayMongo display the complete enabled set. A legacy client-side
        // payment_channel must never pin Hosted Checkout to one method.
        paymentMethodTypes: enabledChannels,

        successUrl: `${frontendUrl}/buyer/checkout?payment=success&reference=${encodeURIComponent(paymentReference)}&artwork_ids=${items.map((item) => item.artwork_id).join(",")}`,

        cancelUrl: `${frontendUrl}/buyer/checkout?payment=cancelled&reference=${encodeURIComponent(paymentReference)}&artwork_ids=${items.map((item) => item.artwork_id).join(",")}`,

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
           paymongo_checkout_session_id = ?, paymongo_checkout_url = ?

         WHERE
           payment_reference = ?
           AND customer_id = ?`,

        [
          checkoutSession.checkoutSessionId,

          checkoutSession.checkoutUrl,

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

        artwork_ids: items.map((item) => item.artwork_id),
      });
    }

    /*
     * =================================================
     * CASH ON DELIVERY
     * =================================================
     *
     * COD does not need PayMongo.
     * Remove only the artworks included in this order.
     */
    await query(
      connection,

      `DELETE FROM cart_item
       WHERE add_to_id = ? AND artwork_id IN (?)`,

      [cartId, items.map((item) => item.artwork_id)],
    );

    await query(
      connection,

      `UPDATE add_cart ac
       SET total_price = (
         SELECT COALESCE(SUM(a.price), 0)
         FROM cart_item ci
         JOIN artwork a ON a.artwork_id = ci.artwork_id
         WHERE ci.add_to_id = ac.add_to_id
       )
       WHERE ac.add_to_id = ?`,

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

    console.error("Buyer checkout error:", error.code || error.name);

    return res.status(error instanceof PayMongoError ? error.status : 500).json({
      message: error instanceof PayMongoError ? error.message : "Unable to place your order",
    });
  } finally {
    connection?.release();
  }
});

const paymentGroup = async (connection, customerId, reference) => {
  if (typeof reference !== "string" || !reference || reference.length > 100) {
    throw new PayMongoError("Invalid payment reference", 400);
  }
  const orders = await query(connection,
    `SELECT order_id, customer_id, payment_method, payment_status, payment_reference,
       paymongo_checkout_session_id, paymongo_checkout_url, status, total_amount
     FROM marketplace_order WHERE customer_id = ? AND payment_reference = ?
       AND payment_method = 'paymongo' ORDER BY order_id FOR UPDATE`, [customerId, reference],
  );
  if (!orders.length) throw new PayMongoError("Checkout not found", 404);
  if (orders.some(order => ["Paid", "Refunded"].includes(order.payment_status))) {
    throw new PayMongoError("This checkout has already been paid. Cancellation requires a refund through support.", 409);
  }
  if (orders.some(order => !["Pending", "Cancelled"].includes(order.status))) {
    throw new PayMongoError("This checkout needs support review before it can be changed.", 409);
  }
  if (orders.some(order => order.paymongo_checkout_session_id !== orders[0].paymongo_checkout_session_id)) {
    throw new PayMongoError("This checkout has inconsistent payment sessions. Please contact support.", 409);
  }
  return orders;
};

const providerSession = async orders => {
  const sessionId = orders[0].paymongo_checkout_session_id;
  if (!sessionId) throw new PayMongoError("This checkout has no payment session. Please contact support.", 409);
  const session = await retrievePayMongoCheckoutSession(sessionId);
  if (session.attributes.reference_number !== orders[0].payment_reference) {
    throw new PayMongoError("The payment session does not match this checkout.", 409);
  }
  if ((session.attributes.payments || []).some(payment => payment.attributes?.status === "paid")) {
    throw new PayMongoError("PayMongo has received this payment. Please wait for payment verification and refresh your orders.", 409);
  }
  return session;
};

const cancelGroup = async (connection, customerId, reference) => {
  const orders = await paymentGroup(connection, customerId, reference);
  if (orders.every(order => order.status === "Cancelled" && order.payment_status === "Expired")) return;
  let session = await providerSession(orders);
  if ((session.attributes.payments || []).some(payment => ["pending", "processing"].includes(payment.attributes?.status))) {
    throw new PayMongoError("A payment is still processing. Please wait before cancelling this checkout.", 409);
  }
  if (session.attributes.status !== "expired") {
    try {
      session = await expirePayMongoCheckoutSession(session.id);
    } catch (error) {
      // An expiry request can race another request or payment. Only a provider-
      // confirmed expired session permits local cancellation/replacement.
      if (error.providerStatus !== 400) throw error;
      session = await providerSession(orders);
      if (session.attributes.status !== "expired") {
        throw new PayMongoError("PayMongo cannot cancel this checkout while payment is active or processing. Please refresh your orders.", 409);
      }
    }
  }
  if (session.attributes.status !== "expired") throw new PayMongoError("Payment session could not be expired", 409);
  await query(connection,
    `UPDATE marketplace_order SET status = 'Cancelled', payment_status = 'Expired'
     WHERE order_id IN (?) AND payment_status <> 'Paid'`, [orders.map(order => order.order_id)],
  );
};

const paymentAction = handler => async (req, res) => {
  let connection;
  try {
    connection = await db.promise().getConnection();
    await connection.beginTransaction();
    const result = await handler(connection, req);
    await connection.commit();
    res.set("Cache-Control", "no-store");
    return res.json(result);
  } catch (error) {
    if (connection) await connection.rollback().catch(() => {});
    console.error("Buyer payment action failed:", error.code || error.name);
    return res.status(error instanceof PayMongoError ? error.status : 500).json({
      message: error instanceof PayMongoError ? error.message : "Unable to update checkout. Please try again.",
    });
  } finally {
    connection?.release();
  }
};

router.post("/payments/:reference/retry", authenticateBuyer, paymentAction(async (connection, req) => {
  const orders = await paymentGroup(connection, req.user.customer_id, req.params.reference);
  if (orders.some(order => order.status === "Cancelled" || order.payment_status === "Expired")) {
    throw new PayMongoError("This checkout has expired. Return to your cart to place a new order.", 409);
  }
  const items = await query(connection,
    `SELECT oi.artwork_id, oi.quantity, a.status, a.is_sold,
       EXISTS (SELECT 1 FROM artupload au WHERE au.artwork_id = a.artwork_id
         AND LOWER(au.request_status) = 'verified') AS is_verified,
       JSON_UNQUOTE(JSON_EXTRACT(a.artwork_details, '$.stock_available')) AS stock_available,
       ${getArtworkSoldQuantitySql("a")} AS sold_quantity
     FROM marketplace_order_item oi LEFT JOIN artwork a ON a.artwork_id = oi.artwork_id
     WHERE oi.order_id IN (?) ORDER BY oi.artwork_id FOR UPDATE`, [orders.map(order => order.order_id)],
  );
  if (!items.length || items.some(item => String(item.status || "").toLowerCase() !== "available" || !Number(item.is_verified) ||
      getArtworkAvailability(item.stock_available, item.sold_quantity, Number(item.is_sold) === 1).isSoldOut)) {
    throw new PayMongoError("An artwork in this checkout is no longer available. Cancel this checkout and review your cart.", 409);
  }
  const session = await providerSession(orders);
  if (session.attributes.status !== "active") {
    throw new PayMongoError("This payment session has expired. Cancel the checkout and return to your cart.", 409);
  }
  const checkoutUrl = session.attributes.checkout_url || orders[0].paymongo_checkout_url;
  if (!checkoutUrl || !/^https:\/\/checkout\.paymongo\.com\//.test(checkoutUrl)) {
    throw new PayMongoError("PayMongo did not return a valid checkout URL");
  }
  return { checkout_url: checkoutUrl, payment_reference: req.params.reference, payment_status: "Pending" };
}));

router.put("/payments/:reference/cancel", authenticateBuyer, paymentAction(async (connection, req) => {
  await cancelGroup(connection, req.user.customer_id, req.params.reference);
  return { message: "Checkout cancelled. Your cart items were kept.", payment_status: "Expired" };
}));

router.put("/:id/cancel", authenticateBuyer, paymentAction(async (connection, req) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) throw new PayMongoError("Invalid order", 400);
  // Resolve the group first, then use the same group lock order as the webhook.
  const rows = await query(connection,
    `SELECT order_id, payment_method, payment_reference FROM marketplace_order
     WHERE order_id = ? AND customer_id = ?`, [id, req.user.customer_id],
  );
  if (!rows.length) throw new PayMongoError("Order not found", 404);
  if (rows[0].payment_method === "paymongo") {
    await cancelGroup(connection, req.user.customer_id, rows[0].payment_reference);
    return { message: "Checkout cancelled. Your cart items were kept." };
  }
  const result = await query(connection,
    `UPDATE marketplace_order SET status = 'Cancelled' WHERE order_id = ?
     AND customer_id = ? AND payment_method = 'cod' AND status = 'Pending'`, [id, req.user.customer_id],
  );
  if (!result.affectedRows) throw new PayMongoError("Only pending COD orders can be cancelled", 409);
  return { message: "Order cancelled" };
}));

export default router;
