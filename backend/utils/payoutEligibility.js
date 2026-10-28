// Eligibility deliberately has no provider HTTP calls. Reading earnings can
// release a hold, but can never move money or retry a failed transfer.
const query = async (executor, sql, params = []) => (await executor.query(sql, params))[0];
const protectedStatuses = new Set(["Processing", "Paid"]);
const activeReturnStatuses = new Set(["Requested", "Approved", "Return Shipped", "Received"]);

export function payoutToCentavos(value, { allowZero = true } = {}) {
  if (!["string", "number"].includes(typeof value) || String(value).trim() === "") {
    throw new Error("Invalid payout accounting amount.");
  }
  const amount = Number(value);
  const cents = Math.round(amount * 100);
  if (!Number.isFinite(amount) || !Number.isSafeInteger(cents) || cents < 0 ||
      (!allowZero && cents === 0) || Math.abs(amount * 100 - cents) > 0.000001) {
    throw new Error("Invalid payout accounting amount.");
  }
  return cents;
}

const positiveId = (value) => {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0 || !/^\d+$/.test(String(value))) {
    throw new Error("Invalid payout order identity.");
  }
  return id;
};

const safeAdd = (left, right) => {
  const sum = left + right;
  if (!Number.isSafeInteger(sum)) throw new Error("Invalid payout accounting total.");
  return sum;
};

/**
 * Order locks come first, matching return creation and fulfillment. Callers
 * using lock=true must already be inside a transaction. All time comparisons
 * are made by MySQL, not the browser or application host clock.
 *
 * Returns null when no existing order/split exists. nextStatus describes the
 * economic state; canSend also requires an existing Eligible logical record.
 */
export async function loadPayoutEligibility(executor, orderId, { lock = false } = {}) {
  const id = positiveId(orderId);
  const [order] = await query(executor, `SELECT o.*, CURRENT_TIMESTAMP AS db_now,
      DATE_ADD(o.delivered_at, INTERVAL 7 DAY) AS payout_eligible_at,
      (o.delivered_at IS NOT NULL AND CURRENT_TIMESTAMP >= DATE_ADD(o.delivered_at, INTERVAL 7 DAY)) AS payout_hold_elapsed
    FROM marketplace_order o WHERE o.order_id = ?${lock ? " FOR UPDATE" : ""}`, [id]);
  if (!order) return null;
  const [split] = await query(executor, `SELECT * FROM seller_payment_split
    WHERE order_id = ?${lock ? " FOR UPDATE" : ""}`, [id]);
  if (!split) return null;
  const items = await query(executor, `SELECT order_item_id, order_id, unit_price, quantity
    FROM marketplace_order_item WHERE order_id = ? ORDER BY order_item_id`, [id]);
  const returnRows = await query(executor, `SELECT r.return_request_id, r.order_id, r.customer_id, r.seller_id, r.status,
      ri.order_item_id, ri.quantity AS return_quantity
    FROM marketplace_return_request r
    LEFT JOIN marketplace_return_item ri ON ri.return_request_id = r.return_request_id
    WHERE r.order_id = ? ORDER BY r.return_request_id, ri.return_item_id`, [id]);
  const refunds = await query(executor, `SELECT refund_id, order_id, return_request_id, provider_refund_id,
      provider_payment_id, amount, status FROM seller_order_refund WHERE order_id = ? ORDER BY refund_id`, [id]);
  const result = {
    order, split, items, returns: [], refunds,
    nextStatus: "Held", holdReason: null, grossAmountCentavos: 0,
    refundAmountCentavos: 0, payoutAmountCentavos: 0,
    eligibleAt: order.payout_eligible_at ?? null, canSend: false,
  };
  const finish = (status, reason = null) => {
    result.nextStatus = protectedStatuses.has(split.payout_status) || split.payout_status === "Reversed" ? split.payout_status : status;
    result.holdReason = reason;
    result.canSend = result.nextStatus === "Eligible" && split.payout_status === "Eligible";
    return result;
  };

  if (order.payment_method !== "paymongo") return finish("Cancelled", "Cash on Delivery is settled outside PayMongo payouts.");
  if (order.payment_status === "Refunded") {
    try { result.grossAmountCentavos = payoutToCentavos(split.gross_amount); }
    catch { return finish("Held", "Order accounting requires administrator review."); }
    result.refundAmountCentavos = result.grossAmountCentavos;
    return finish("Cancelled", "The buyer payment was fully refunded.");
  }
  if (order.payment_status !== "Paid") return finish("Held", "Waiting for confirmed buyer payment.");

  try {
    const gross = payoutToCentavos(split.gross_amount, { allowZero: false });
    const net = payoutToCentavos(split.net_amount);
    const commission = payoutToCentavos(split.commission_amount);
    const fee = payoutToCentavos(split.processing_fee_amount);
    const subtotal = payoutToCentavos(order.subtotal, { allowZero: false });
    const shipping = payoutToCentavos(order.shipping_fee);
    const total = payoutToCentavos(order.total_amount, { allowZero: false });
    result.grossAmountCentavos = gross;
    // Current ArtMatch policy charges no shipping or commission and attributes
    // no gateway fee. Unexpected historical policies need explicit review,
    // not a guessed partial-refund fee allocation.
    if (Number(split.seller_id) !== Number(order.seller_id) || split.currency !== "PHP" ||
        gross !== total || total !== safeAdd(subtotal, shipping) ||
        gross !== safeAdd(safeAdd(net, commission), fee) || shipping || commission || fee) {
      return finish("Held", "Order accounting requires administrator review.");
    }
    const itemMap = new Map();
    let itemTotal = 0;
    if (!items.length) return finish("Held", "Order item accounting requires administrator review.");
    for (const item of items) {
      const itemId = positiveId(item.order_item_id);
      const quantity = Number(item.quantity);
      const unitPrice = payoutToCentavos(item.unit_price, { allowZero: false });
      const amount = unitPrice * quantity;
      if (Number(item.order_id) !== id || itemMap.has(itemId) || !Number.isSafeInteger(quantity) || quantity <= 0 || !Number.isSafeInteger(amount)) {
        return finish("Held", "Order item accounting requires administrator review.");
      }
      itemTotal = safeAdd(itemTotal, amount);
      itemMap.set(itemId, { quantity, unitPrice });
    }
    if (itemTotal !== subtotal) return finish("Held", "Order item accounting requires administrator review.");
    result.payoutAmountCentavos = net;
    const groupedReturns = new Map();
    for (const row of returnRows) {
      const returnId = positiveId(row.return_request_id);
      let request = groupedReturns.get(returnId);
      if (!request) {
        request = { return_request_id: returnId, status: row.status, returned_amount_centavos: 0, succeeded_refund_centavos: 0, item_ids: [] };
        groupedReturns.set(returnId, request);
      }
      if (Number(row.order_id) !== id || Number(row.customer_id) !== Number(order.customer_id) ||
          Number(row.seller_id) !== Number(order.seller_id)) {
        return finish("Held", "Return accounting requires administrator review.");
      }
      if (row.order_item_id != null) {
        const itemId = positiveId(row.order_item_id);
        const item = itemMap.get(itemId);
        const quantity = Number(row.return_quantity);
        if (!item || !Number.isSafeInteger(quantity) || quantity <= 0 || quantity > item.quantity || request.item_ids.includes(itemId)) {
          return finish("Held", "Return item accounting requires administrator review.");
        }
        request.item_ids.push(itemId);
        request.returned_amount_centavos = safeAdd(request.returned_amount_centavos, item.unitPrice * quantity);
      }
    }
    result.returns = [...groupedReturns.values()];
    let pendingRefund = false;
    const providerRefundIds = new Set();
    for (const refund of refunds) {
      const amount = payoutToCentavos(refund.amount, { allowZero: false });
      const request = refund.return_request_id == null ? null : groupedReturns.get(Number(refund.return_request_id));
      if (Number(refund.order_id) !== id || !refund.provider_refund_id || providerRefundIds.has(refund.provider_refund_id) ||
          !order.paymongo_payment_id || refund.provider_payment_id !== order.paymongo_payment_id ||
          (refund.return_request_id != null && !request) || !["Pending", "Succeeded", "Failed"].includes(refund.status)) {
        return finish("Held", "Refund evidence requires administrator review.");
      }
      providerRefundIds.add(refund.provider_refund_id);
      if (refund.status === "Pending") pendingRefund = true;
      if (refund.status === "Succeeded") {
        result.refundAmountCentavos = safeAdd(result.refundAmountCentavos, amount);
        if (request) request.succeeded_refund_centavos = safeAdd(request.succeeded_refund_centavos, amount);
      }
    }
    if (result.refundAmountCentavos > gross || result.returns.some((request) =>
      request.succeeded_refund_centavos > request.returned_amount_centavos)) {
      result.payoutAmountCentavos = 0;
      return finish("Held", "Refund amounts require administrator review.");
    }
    result.payoutAmountCentavos = Math.max(0, net - result.refundAmountCentavos);
    if (result.payoutAmountCentavos === 0) return finish("Cancelled", "The buyer payment was fully refunded.");
    if (pendingRefund) return finish("Held", "A buyer refund is still processing.");
    if (result.returns.some((request) => activeReturnStatuses.has(request.status))) {
      return finish("Held", "A return request is unresolved.");
    }
    if (result.returns.some((request) => request.status === "Completed" &&
      (!request.returned_amount_centavos || request.succeeded_refund_centavos < request.returned_amount_centavos))) {
      return finish("Held", "Returned items are awaiting verified refund resolution.");
    }
    if (result.returns.some((request) => ![...activeReturnStatuses, "Completed", "Rejected", "Cancelled"].includes(request.status))) {
      return finish("Held", "Return status requires administrator review.");
    }
    if (order.status !== "Delivered") return finish("Held", "Waiting for order delivery.");
    if (!order.delivered_at) return finish("Held", "The delivery timestamp is unavailable. Administrator review is required.");
    if (!Number(order.payout_hold_elapsed)) return finish("Held", "Your earnings are held until the 7-day return period ends.");
    return finish("Eligible");
  } catch {
    result.payoutAmountCentavos = 0;
    return finish("Held", "Order accounting requires administrator review.");
  }
}

/** Refresh economic balances only. No transfers, automatic retries or timers. */
export async function refreshSellerPayoutEligibility(executor, { sellerId, orderId } = {}) {
  const clauses = ["o.payment_method = 'paymongo'", "o.payment_status IN ('Paid', 'Refunded')"];
  const params = [];
  if (sellerId != null) { clauses.push("o.seller_id = ?"); params.push(positiveId(sellerId)); }
  if (orderId != null) { clauses.push("o.order_id = ?"); params.push(positiveId(orderId)); }
  const orders = await query(executor, `SELECT o.order_id FROM marketplace_order o
    JOIN seller_payment_split s ON s.order_id = o.order_id WHERE ${clauses.join(" AND ")}
    ORDER BY o.order_id`, params);
  const results = [];
  for (const row of orders) {
    const result = await loadPayoutEligibility(executor, row.order_id);
    if (!result) continue;
    const previousStatus = result.split.payout_status;
    if (!protectedStatuses.has(previousStatus)) {
      const persistedStatus = previousStatus === "Failed" && result.nextStatus !== "Cancelled" ? "Failed" : result.nextStatus;
      await query(executor, `UPDATE seller_payment_split
        SET payout_status = ?, refund_amount = ?, payout_amount = ?, hold_reason = ?, eligible_at = ?
        WHERE split_id = ? AND payout_status = ? AND payout_status NOT IN ('Processing', 'Paid')`,
      [persistedStatus, result.refundAmountCentavos / 100, result.payoutAmountCentavos / 100,
        result.holdReason, result.eligibleAt, result.split.split_id, previousStatus]);
      result.split.payout_status = persistedStatus;
      result.split.refund_amount = result.refundAmountCentavos / 100;
      result.split.payout_amount = result.payoutAmountCentavos / 100;
      result.split.hold_reason = result.holdReason;
      result.split.eligible_at = result.eligibleAt;
      result.canSend = persistedStatus === "Eligible" && result.nextStatus === "Eligible";
    }
    results.push(result);
  }
  return results;
}
