import express from "express";
import db from "../../database/db.js";
import { getPayMongoMode, verifyPayMongoSignature } from "../../utils/paymongo.js";
import { reconcilePaidCheckout, PayMongoReconciliationError } from "../../utils/paymongoReconciliation.js";
import { recordRecommendationInteraction } from "../../utils/recommendationInteractions.js";
import { logSellerAudit } from "../../utils/auditLogger.js";

const router = express.Router();

router.post("/webhook", async (req, res) => {
  // Current Hosted Checkout envelope and the older Event resource envelope.
  const envelope = req.body?.data;
  const event = envelope?.type === "event" ? envelope.attributes : envelope;
  const session = event?.data;
  const livemode = event?.livemode ?? session?.attributes?.livemode;
  try {
    if (livemode !== getPayMongoMode() || !verifyPayMongoSignature({
      rawBody: req.rawBody, signatureHeader: req.get("Paymongo-Signature"), livemode,
    })) {
      console.warn("Rejected PayMongo webhook: invalid signature or mode");
      return res.status(401).json({ message: "Invalid PayMongo signature or mode" });
    }
  } catch (error) {
    console.error("PayMongo webhook verification unavailable:", error.name);
    return res.status(503).json({ message: "Unable to verify webhook" });
  }
  if (event?.type !== "checkout_session.payment.paid") {
    return res.json({ received: true, ignored: true });
  }

  let connection;
  try {
    connection = await db.promise().getConnection();
    await connection.beginTransaction();
    const result = await reconcilePaidCheckout(connection, session, livemode, {
      recordInteraction: recordRecommendationInteraction,
    });
    await connection.commit();
    const { sellerTransactions = [], ...responseResult } = result;
    for (const sale of sellerTransactions) {
      await logSellerAudit({ student_id: sale.sellerId }, {
        action: "SALE_PAYMENT_RECEIVED",
        information: `Payment was confirmed for order AM-${String(sale.orderId).padStart(6, "0")} (PHP ${Number(sale.totalAmount).toFixed(2)}; reference ${sale.paymentReference}).`,
      });
    }
    console.log("PayMongo payment confirmed:", session.attributes.reference_number, session.id);
    if (result.requires_refund_review) {
      console.warn("Paid checkout requires refund review:", session.attributes.reference_number);
    }
    return res.json({ received: true, ...responseResult });
  } catch (error) {
    if (connection) await connection.rollback().catch(() => {});
    console.error("PayMongo webhook processing failed:", error.code || error.name);
    const status = error instanceof PayMongoReconciliationError ? error.status : 500;
    return res.status(status).json({ message: error instanceof PayMongoReconciliationError ? error.message : "Unable to process PayMongo webhook" });
  } finally {
    connection?.release();
  }
});

export default router;
