import { pesosToCentavos } from "./paymongo.js";
import { getArtworkAvailability, getCompletedOrderCondition } from "./artworkAvailability.js";
import { recordRecommendationInteraction } from "./recommendationInteractions.js";

const query = async (executor, sql, params = []) => (await executor.query(sql, params))[0];

export class PayMongoReconciliationError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "PayMongoReconciliationError";
    this.status = status;
  }
}

const fail = (status, message) => {
  throw new PayMongoReconciliationError(status, message);
};

export async function reconcilePaidCheckout(
  connection,
  session,
  expectedLivemode,
  { recordInteraction = recordRecommendationInteraction, sourcePage = "paymongo_webhook" } = {},
) {
  const attributes = session?.attributes;
  const paidPayments = Array.isArray(attributes?.payments)
    ? attributes.payments.filter((payment) => payment?.attributes?.status === "paid")
    : [];
  const payment = paidPayments[0];
  const details = payment?.attributes;
  const reference = attributes?.reference_number;
  if (session?.type !== "checkout_session" || typeof session?.id !== "string" ||
      typeof reference !== "string" || !reference || reference.length > 100 ||
      paidPayments.length !== 1 || typeof payment?.id !== "string" || !payment.id ||
      details.currency !== "PHP" || !Number.isSafeInteger(details.amount) || details.amount <= 0 ||
      (attributes.livemode !== undefined && attributes.livemode !== expectedLivemode) ||
      (details.livemode !== undefined && details.livemode !== expectedLivemode)) {
    fail(400, "Invalid PayMongo payment data");
  }
  const channel = typeof details.source?.type === "string" ? details.source.type.slice(0, 50) : null;
  const timestamp = Number(details.paid_at);
  const paidAt = Number.isFinite(timestamp) && timestamp > 0 ? new Date(timestamp * 1000) : new Date();
  if (Number.isNaN(paidAt.getTime())) fail(400, "Invalid payment timestamp");

  const orders = await query(connection,
    `SELECT order_id, customer_id, seller_id, payment_method, payment_reference,
            paymongo_checkout_session_id, payment_status, paymongo_payment_id,
            total_amount, status
     FROM marketplace_order WHERE payment_reference = ?
     ORDER BY order_id FOR UPDATE`,
    [reference],
  );
  if (!orders.length || orders.some((order) =>
    order.payment_method !== "paymongo" || order.payment_reference !== reference ||
    order.paymongo_checkout_session_id !== session.id ||
    Number(order.customer_id) !== Number(orders[0].customer_id))) {
    fail(400, "Payment does not match an ArtMatch checkout");
  }
  const expectedAmount = orders.reduce((sum, order) => sum + pesosToCentavos(order.total_amount), 0);
  if (!Number.isSafeInteger(expectedAmount) || details.amount !== expectedAmount) {
    fail(400, "Payment amount does not match checkout total");
  }
  if (orders.some((order) => order.payment_status === "Refunded" ||
      (order.paymongo_payment_id && order.paymongo_payment_id !== payment.id))) {
    fail(409, "Payment conflicts with the recorded payment");
  }

  const unpaidIds = orders.filter((order) => order.payment_status !== "Paid").map((order) => order.order_id);
  if (!unpaidIds.length) return { payment_status: "Paid", already_processed: true, requires_refund_review: false };

  const activeIds = orders.filter((order) => unpaidIds.includes(order.order_id) && order.status !== "Cancelled")
    .map((order) => order.order_id);
  let requiresRefundReview = false;
  if (activeIds.length) {
    const items = await query(connection,
      `SELECT oi.artwork_id, oi.quantity, a.status, a.is_sold,
         EXISTS (SELECT 1 FROM artupload au WHERE au.artwork_id = a.artwork_id
           AND LOWER(au.request_status) = 'verified') AS is_verified,
         JSON_UNQUOTE(JSON_EXTRACT(a.artwork_details, '$.stock_available')) AS stock_available
       FROM marketplace_order_item oi LEFT JOIN artwork a ON a.artwork_id = oi.artwork_id
       WHERE oi.order_id IN (?) ORDER BY oi.artwork_id FOR UPDATE`,
      [activeIds],
    );
    const artworkIds = [...new Set(items.map((item) => item.artwork_id).filter(Boolean))];
    const purchases = artworkIds.length ? await query(connection,
      `SELECT oi.artwork_id, oi.quantity FROM marketplace_order_item oi
       JOIN marketplace_order o ON o.order_id = oi.order_id
       WHERE oi.artwork_id IN (?) AND oi.order_id NOT IN (?)
         AND ${getCompletedOrderCondition("o")} FOR UPDATE`,
      [artworkIds, unpaidIds],
    ) : [];
    const sold = new Map();
    for (const purchase of purchases) {
      sold.set(String(purchase.artwork_id), (sold.get(String(purchase.artwork_id)) || 0) + Number(purchase.quantity));
    }
    const requested = new Map();
    for (const item of items) {
      requested.set(String(item.artwork_id), (requested.get(String(item.artwork_id)) || 0) + Number(item.quantity));
    }
    requiresRefundReview = !items.length || items.some((item) => {
      const availability = getArtworkAvailability(item.stock_available, sold.get(String(item.artwork_id)) || 0, Number(item.is_sold) === 1);
      const quantity = requested.get(String(item.artwork_id));
      return !item.artwork_id || !Number(item.is_verified) || String(item.status || "").toLowerCase() !== "available" ||
        !Number.isSafeInteger(quantity) || quantity <= 0 || availability.isSoldOut ||
        (!availability.hasStockTracking && quantity > 1) ||
        (availability.hasStockTracking && availability.remainingStock < quantity);
    });
    if (requiresRefundReview) {
      await connection.query("UPDATE marketplace_order SET status = 'Cancelled' WHERE order_id IN (?)", [unpaidIds]);
    }
  }
  await connection.query(
    `UPDATE marketplace_order SET payment_status = 'Paid', paymongo_payment_id = ?,
       paymongo_payment_method = ?, paid_at = ? WHERE order_id IN (?)`,
    [payment.id, channel, paidAt, unpaidIds],
  );
  await connection.query(
    `UPDATE seller_payment_split s
       JOIN marketplace_order o ON o.order_id = s.order_id
     SET s.payout_status = 'Held',
         s.eligible_at = NULL,
         s.payment_reference = COALESCE(s.payment_reference, o.payment_reference)
     WHERE s.order_id IN (?) AND s.payout_status = 'Held'`,
    [unpaidIds],
  );
  const purchasedItems = await query(connection,
    `SELECT o.customer_id, oi.artwork_id FROM marketplace_order o
     JOIN marketplace_order_item oi ON oi.order_id = o.order_id
     WHERE o.order_id IN (?) AND o.status <> 'Cancelled'`,
    [unpaidIds],
  );
  for (const item of purchasedItems) {
    await recordInteraction({
      executor: connection, customerId: item.customer_id, artworkId: item.artwork_id,
      eventType: "purchase", sourcePage,
    });
  }
  const purchasedArtworkIds = [...new Set(purchasedItems.map((item) => Number(item.artwork_id))
    .filter((id) => Number.isSafeInteger(id) && id > 0))];
  const customerId = orders[0].customer_id;
  if (purchasedArtworkIds.length) {
    await connection.query(
      `DELETE ci FROM cart_item ci JOIN add_cart ac ON ac.add_to_id = ci.add_to_id
       WHERE ac.customer_id = ? AND ci.artwork_id IN (?)`,
      [customerId, purchasedArtworkIds],
    );
  }
  await connection.query(
    `UPDATE add_cart ac SET total_price = (
       SELECT COALESCE(SUM(a.price * ci.quantity), 0) FROM cart_item ci
       JOIN artwork a ON a.artwork_id = ci.artwork_id WHERE ci.add_to_id = ac.add_to_id
     ) WHERE ac.customer_id = ?`,
    [customerId],
  );
  return {
    payment_status: "Paid",
    already_processed: false,
    requires_refund_review: requiresRefundReview,
    sellerTransactions: orders
      .filter((order) => unpaidIds.includes(order.order_id))
      .map((order) => ({
        sellerId: order.seller_id,
        orderId: order.order_id,
        totalAmount: order.total_amount,
        paymentReference: reference,
      })),
  };
}
