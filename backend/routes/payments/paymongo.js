import express from "express";
import {
  createHmac,
  timingSafeEqual,
} from "node:crypto";

import db from "../../database/db.js";

import {
  recordRecommendationInteraction,
} from "../../utils/recommendationInteractions.js";

const router = express.Router();

/*
 * Compare two hexadecimal signatures safely.
 */
const signaturesMatch = (
  expected,
  received,
) => {
  if (!expected || !received) {
    return false;
  }

  const expectedBuffer =
    Buffer.from(expected, "hex");

  const receivedBuffer =
    Buffer.from(received, "hex");

  if (
    expectedBuffer.length !==
    receivedBuffer.length
  ) {
    return false;
  }

  return timingSafeEqual(
    expectedBuffer,
    receivedBuffer,
  );
};

/*
 * Verify that the webhook really came
 * from PayMongo.
 */
const verifyPayMongoSignature = (
  req,
) => {
  const webhookSecret = String(
    process.env
      .PAYMONGO_WEBHOOK_SECRET ||
      "",
  ).trim();

  if (!webhookSecret) {
    throw new Error(
      "PAYMONGO_WEBHOOK_SECRET is missing from backend/.env",
    );
  }

  const signatureHeader =
    req.get("Paymongo-Signature");

  if (!signatureHeader) {
    return false;
  }

  if (!req.rawBody) {
    throw new Error(
      "Raw webhook body is missing",
    );
  }

  /*
   * Example:
   *
   * t=123456,
   * te=test_signature,
   * li=live_signature
   */
  const parts = {};

  signatureHeader
    .split(",")
    .forEach((part) => {
      const [
        key,
        ...valueParts
      ] = part.trim().split("=");

      parts[key] =
        valueParts.join("=");
    });

  const timestamp =
    parts.t;

  const testSignature =
    parts.te;

  const liveSignature =
    parts.li;

  if (!timestamp) {
    return false;
  }

  /*
   * PayMongo signs:
   *
   * timestamp.rawJsonBody
   */
  const signedPayload =
    `${timestamp}.${req.rawBody.toString(
      "utf8",
    )}`;

  const expectedSignature =
    createHmac(
      "sha256",
      webhookSecret,
    )
      .update(signedPayload)
      .digest("hex");

  /*
   * Test mode uses te.
   * Live mode uses li.
   *
   * We allow whichever valid signature
   * PayMongo supplied.
   */
  return (
    signaturesMatch(
      expectedSignature,
      testSignature,
    ) ||
    signaturesMatch(
      expectedSignature,
      liveSignature,
    )
  );
};

/*
 * POST
 *
 * /api/payments/paymongo/webhook
 */
router.post(
  "/webhook",
  async (req, res) => {

    console.log(
      ">>> PAYMONGO WEBHOOK REACHED <<<",
      req.body?.data?.type,
    );
    /*
     * =================================
     * 1. VERIFY PAYMONGO
     * =================================
     */
    let signatureValid = false;

    try {
      signatureValid =
        verifyPayMongoSignature(req);
    } catch (error) {
      console.error(
        "PayMongo signature error:",
        error.message,
      );

      return res.status(500).json({
        message:
          "Unable to verify webhook",
      });
    }

    if (!signatureValid) {
      console.warn(
        "Rejected invalid PayMongo webhook signature",
      );

      return res.status(401).json({
        message:
          "Invalid PayMongo signature",
      });
    }

    /*
     * =================================
     * 2. READ PAYMONGO EVENT
     * =================================
     *
     * PayMongo currently documents
     * checkout webhook payloads as:
     *
     * body.data.type
     * body.data.data
     *
     * Some PayMongo event responses also
     * use:
     *
     * body.data.attributes.type
     * body.data.attributes.data
     *
     * Supporting both makes the handler
     * safer across their event formats.
     */
    const body = req.body;

    const eventData = body?.data;

    /*
    * Support both PayMongo webhook
    * envelope formats.
    */
    const eventType =
      eventData?.type === "event"
        ? eventData?.attributes?.type
        : eventData?.type ||
          eventData?.attributes?.type;

    const session =
      eventData?.data ||
      eventData?.attributes?.data;

    /*
     * We only care about successful
     * Hosted Checkout payments.
     */
    if (
      eventType !==
      "checkout_session.payment.paid"
    ) {
      return res.status(200).json({
        received: true,
        ignored: true,
      });
    }

    const checkoutSessionId =
      session?.id;

    const sessionAttributes =
      session?.attributes || {};

    const paymentReference =
      sessionAttributes
        .reference_number;

    const payments =
      Array.isArray(
        sessionAttributes.payments,
      )
        ? sessionAttributes.payments
        : [];

    /*
     * PayMongo says several payment
     * attempts can exist in a Checkout
     * Session, but only one should have
     * status "paid".
     */
    const paidPayment =
      payments.find(
        (payment) =>
          payment?.attributes?.status ===
          "paid",
      );

    const paymongoPaymentId =
      paidPayment?.id;

    const paymentChannel =
      paidPayment?.attributes?.source
        ?.type || null;

    const paymongoPaidAt =
      Number(
        paidPayment?.attributes
          ?.paid_at,
      );

    const paidAt =
      Number.isFinite(
        paymongoPaidAt,
      ) &&
      paymongoPaidAt > 0
        ? new Date(
            paymongoPaidAt * 1000,
          )
        : new Date();

    if (
      !checkoutSessionId ||
      !paymentReference ||
      !paymongoPaymentId
    ) {
      console.error(
        "Incomplete PayMongo paid webhook",
      );

      return res.status(400).json({
        message:
          "Incomplete PayMongo payment data",
      });
    }

    /*
     * =================================
     * 3. UPDATE DATABASE
     * =================================
     */
    let connection;

    try {
      connection =
        await db
          .promise()
          .getConnection();

      await connection
        .beginTransaction();

      /*
       * Find ALL ArtMatch seller orders
       * connected to this ONE PayMongo
       * Checkout Session.
       */
      const [orders] =
        await connection.query(
          `SELECT
             order_id,
             customer_id,
             payment_status

           FROM marketplace_order

           WHERE
             payment_method = 'paymongo'
             AND payment_reference = ?
             AND paymongo_checkout_session_id = ?

           FOR UPDATE`,
          [
            paymentReference,
            checkoutSessionId,
          ],
        );

      /*
       * Unknown reference:
       *
       * acknowledge it so PayMongo does
       * not keep retrying forever.
       */
      if (!orders.length) {
        await connection.rollback();

        console.warn(
          "PayMongo webhook did not match an ArtMatch order:",
          paymentReference,
        );

        return res.status(200).json({
          received: true,
          matched: false,
        });
      }

      /*
       * This makes the webhook idempotent.
       *
       * If PayMongo sends the exact same
       * event again, we don't create
       * duplicate purchase effects.
       */
      const unpaidOrders =
        orders.filter(
          (order) =>
            order.payment_status !==
            "Paid",
        );

      if (!unpaidOrders.length) {
        await connection.commit();

        return res.status(200).json({
          received: true,
          already_processed: true,
        });
      }

      const unpaidOrderIds =
        unpaidOrders.map(
          (order) =>
            order.order_id,
        );

      /*
       * Mark the matching orders Paid.
       *
       * Order fulfillment status stays:
       *
       * Pending
       *
       * Seller fulfillment is separate.
       */
      await connection.query(
        `UPDATE marketplace_order

         SET
           payment_status = 'Paid',
           paymongo_payment_id = ?,
           paymongo_payment_method = ?,
           paid_at = ?

         WHERE
           order_id IN (?)`,
        [
          paymongoPaymentId,
          paymentChannel,
          paidAt,
          unpaidOrderIds,
        ],
      );

      /*
       * Get the artworks that have just
       * become actual purchases.
       */
      const [purchasedItems] =
        await connection.query(
          `SELECT
             o.customer_id,
             oi.artwork_id

           FROM marketplace_order o

           JOIN marketplace_order_item oi
             ON oi.order_id =
                o.order_id

           WHERE
             o.order_id IN (?)
             AND o.status <> 'Cancelled'`,
          [unpaidOrderIds],
        );

      /*
       * Record purchase interactions only
       * AFTER PayMongo confirmed payment.
       */
      for (
        const item of purchasedItems
      ) {
        await recordRecommendationInteraction({
          executor:
            connection,

          customerId:
            item.customer_id,

          artworkId:
            item.artwork_id,

          eventType:
            "purchase",

          sourcePage:
            "paymongo_webhook",
        });
      }

      /*
       * =================================
       * 4. REMOVE PAID ARTWORK FROM CART
       * =================================
       *
       * We only remove artworks that
       * belonged to this payment.
       *
       * If the buyer added something new
       * to the cart while paying, that new
       * item stays in the cart.
       */
      const customerId =
        orders[0].customer_id;

      const artworkIds = [
        ...new Set(
          purchasedItems
            .map(
              (item) =>
                Number(
                  item.artwork_id,
                ),
            )
            .filter(
              (id) =>
                Number.isInteger(id) &&
                id > 0,
            ),
        ),
      ];

      if (artworkIds.length) {
        await connection.query(
          `DELETE ci

           FROM cart_item ci

           JOIN add_cart ac
             ON ac.add_to_id =
                ci.add_to_id

           WHERE
             ac.customer_id = ?
             AND ci.artwork_id IN (?)`,
          [
            customerId,
            artworkIds,
          ],
        );
      }

      /*
       * Recalculate the remaining cart
       * total instead of blindly setting
       * it to zero.
       */
      await connection.query(
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

           WHERE
             ci.add_to_id =
             ac.add_to_id
         )

         WHERE
           ac.customer_id = ?`,
        [customerId],
      );

      await connection.commit();

      console.log(
        "PayMongo payment confirmed:",
        paymentReference,
        paymongoPaymentId,
      );

      /*
       * PayMongo requires a successful
       * 2xx response.
       */
      return res.status(200).json({
        received: true,
        payment_status: "Paid",
      });
    } catch (error) {
      if (connection) {
        await connection
          .rollback()
          .catch(() => {});
      }

      console.error(
        "PayMongo webhook processing error:",
        error,
      );

      return res.status(500).json({
        message:
          "Unable to process PayMongo webhook",
      });
    } finally {
      connection?.release();
    }
  },
);

export default router;
