import db from "../database/db.js";
import { normalizeTrackingUrl, normalizeShipmentTracking } from "./parcelShipment.js";
import { publishReturnUpdated } from "./chatEvents.js";
import { createPayMongoRefund, retrievePayoutRefund } from "./paymongoPayouts.js";
import { refreshSellerPayoutEligibility } from "./payoutEligibility.js";
import { revokeCertificateAccessForReturn } from "./certificates.js";

export const RETURN_REASONS = Object.freeze([
  "Damaged artwork", "Wrong artwork received", "Artwork not as described",
  "Missing item / component", "Shipping damage", "Other",
]);
const conflictingStatuses = ["Requested", "Approved", "Return Shipped", "Received", "Completed"];
const activeStatuses = new Set(["Requested", "Approved", "Return Shipped", "Received"]);
const expiredMessage = "The 4-day return period for this order has expired.";

export class ReturnError extends Error {
  constructor(status, message) { super(message); this.name = "ReturnError"; this.status = status; }
}
const fail = (status, message) => { throw new ReturnError(status, message); };
const query = async (executor, sql, params = []) => (await executor.query(sql, params))[0];
const idValue = (value, label) => {
  if (!["number", "string"].includes(typeof value) || !/^\d+$/.test(String(value))) fail(400, `Invalid ${label}.`);
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) fail(400, `Invalid ${label}.`);
  return id;
};
const ownerColumn = (role) => {
  if (role === "buyer") return "customer_id";
  if (role === "seller") return "seller_id";
  fail(403, "Only the order buyer and seller can access return requests.");
};
const trimmedText = (value, minimum, maximum, label) => {
  if (typeof value !== "string" || value.trim().length < minimum || value.trim().length > maximum) {
    fail(400, `${label} must be ${minimum}–${maximum} characters.`);
  }
  return value.trim();
};

const returnSelectSql = `SELECT r.*, CONCAT('AM-', LPAD(o.order_id, 6, '0')) AS order_number,
    DATE_ADD(o.delivered_at, INTERVAL 4 DAY) AS return_deadline,
    o.payment_method AS order_payment_method,
    o.payment_status AS order_payment_status,
    CONCAT(st.first_name, ' ', st.last_name) AS seller_name,
    NULLIF(TRIM(st.address), '') AS seller_address,
    ri.order_item_id, ri.quantity AS return_quantity,
    i.artwork_id, i.title, i.image, i.unit_price,
    rf.refund_id, rf.provider_refund_id, rf.amount AS refund_amount, rf.status AS provider_refund_status
  FROM marketplace_return_request r
  JOIN marketplace_order o ON o.order_id = r.order_id
  LEFT JOIN student st ON st.student_id = r.seller_id
  JOIN conversation c ON c.conversation_id = r.conversation_id
    AND c.customer_id = r.customer_id AND c.student_id = r.seller_id
  LEFT JOIN marketplace_return_item ri ON ri.return_request_id = r.return_request_id
  LEFT JOIN marketplace_order_item i ON i.order_item_id = ri.order_item_id AND i.order_id = r.order_id
  LEFT JOIN seller_order_refund rf ON rf.return_request_id = r.return_request_id`;

function resolveRefundStatus(row) {
  if (row.provider_refund_status === "Succeeded" || row.order_payment_status === "Refunded") return "Refunded";
  if (row.provider_refund_status === "Pending") return "Processing";
  if (row.provider_refund_status === "Failed") return "Failed";
  if (row.status === "Rejected" || row.status === "Cancelled") return "Not Applicable";
  if (row.status === "Completed" || row.status === "Received") return "Pending Refund Confirmation";
  return "Awaiting Return";
}

function groupReturns(rows) {
  const grouped = new Map();
  for (const row of rows) {
    if (!grouped.has(row.return_request_id)) {
      grouped.set(row.return_request_id, {
        return_request_id: row.return_request_id, order_id: row.order_id,
        order_number: row.order_number, conversation_id: row.conversation_id,
        customer_id: row.customer_id, seller_id: row.seller_id,
        seller_name: row.seller_name ?? null, seller_address: row.seller_address ?? null,
        payment_method: row.order_payment_method ?? null,
        payment_status: row.order_payment_status ?? null,
        reason: row.reason, details: row.details, status: row.status,
        seller_response: row.seller_response, requested_at: row.requested_at,
        decision_at: row.decision_at, return_shipped_at: row.return_shipped_at,
        received_at: row.received_at, completed_at: row.completed_at,
        return_deadline: row.return_deadline,
        return_courier: row.return_courier ?? null,
        return_tracking_number: row.return_tracking_number ?? null,
        return_tracking_url: row.return_tracking_url,
        evidence_photo_count: (() => {
          try {
            const photos = typeof row.evidence_photos === "string" ? JSON.parse(row.evidence_photos) : row.evidence_photos;
            return Array.isArray(photos) ? photos.length : 0;
          } catch { return 0; }
        })(),
        refund_id: row.refund_id ?? null,
        provider_refund_id: row.provider_refund_id ?? null,
        refund_amount: row.refund_amount != null ? Number(row.refund_amount) : null,
        provider_refund_status: row.provider_refund_status ?? null,
        refund_status: resolveRefundStatus(row),
        created_at: row.created_at, updated_at: row.updated_at, items: [],
      });
    }
    const entry = grouped.get(row.return_request_id);
    if (row.provider_refund_status === "Succeeded") {
      entry.refund_id = row.refund_id;
      entry.provider_refund_id = row.provider_refund_id;
      entry.refund_amount = row.refund_amount != null ? Number(row.refund_amount) : null;
      entry.provider_refund_status = row.provider_refund_status;
      entry.refund_status = "Refunded";
    }
    if (row.order_item_id && !entry.items.some((item) => item.order_item_id === row.order_item_id)) {
      entry.items.push({
        order_item_id: row.order_item_id, artwork_id: row.artwork_id,
        title: row.title, image: row.image, quantity: row.return_quantity,
      });
    }
  }
  return [...grouped.values()];
}

export async function listReturnRequests(executor, role, actorId, filters = {}) {
  const column = ownerColumn(role);
  const accountId = idValue(actorId, "account");
  const clauses = [`r.${column} = ?`, "o.customer_id = r.customer_id", "o.seller_id = r.seller_id"];
  const params = [accountId];
  if (filters.conversationId !== undefined) {
    const conversationId = idValue(filters.conversationId, "conversation");
    // Membership is checked even when there are no requests, independent of blocks.
    const conversation = await query(executor,
      `SELECT conversation_id FROM conversation WHERE conversation_id = ? AND ${role === "buyer" ? "customer_id" : "student_id"} = ?`,
      [conversationId, accountId]);
    if (!conversation.length) fail(404, "Conversation not found.");
    clauses.push("r.conversation_id = ?"); params.push(conversationId);
  }
  if (filters.requestId !== undefined) {
    clauses.push("r.return_request_id = ?"); params.push(idValue(filters.requestId, "return request"));
  }
  if (filters.orderId !== undefined) {
    clauses.push("r.order_id = ?"); params.push(idValue(filters.orderId, "order"));
  }
  const rows = await query(executor, `${returnSelectSql} WHERE ${clauses.join(" AND ")}
    ORDER BY r.requested_at DESC, r.return_request_id DESC, ri.return_item_id`, params);
  const requests = groupReturns(rows);
  if (filters.requestId !== undefined && !requests.length) fail(404, "Return request not found.");
  return requests;
}

// The database supplies time and eligibility. React only displays this result.
export async function attachOrderReturns(executor, orders, role, actorId) {
  if (!orders.length) return orders;
  const column = ownerColumn(role);
  const accountId = idValue(actorId, "account");
  const ids = orders.map((order) => idValue(order.orderId, "order"));
  const rows = await query(executor, `SELECT order_id, delivered_at,
      DATE_ADD(delivered_at, INTERVAL 4 DAY) AS return_deadline,
      (status = 'Delivered' AND delivered_at IS NOT NULL
        AND CURRENT_TIMESTAMP >= delivered_at
        AND CURRENT_TIMESTAMP <= DATE_ADD(delivered_at, INTERVAL 4 DAY)) AS in_return_window,
      GREATEST(0, TIMESTAMPDIFF(SECOND, CURRENT_TIMESTAMP,
        DATE_ADD(delivered_at, INTERVAL 4 DAY))) AS return_seconds_remaining
    FROM marketplace_order WHERE ${column} = ? AND order_id IN (?)`, [accountId, ids]);
  const metadata = new Map(rows.map((row) => [Number(row.order_id), row]));
  const returnRows = await query(executor, `${returnSelectSql}
    WHERE r.${column} = ? AND r.order_id IN (?) AND o.customer_id = r.customer_id AND o.seller_id = r.seller_id
    ORDER BY r.requested_at DESC, r.return_request_id DESC, ri.return_item_id`, [accountId, ids]);
  const requests = groupReturns(returnRows);
  return orders.map((order) => {
    const meta = metadata.get(Number(order.orderId));
    const returns = requests.filter((request) => Number(request.order_id) === Number(order.orderId));
    const conflicts = new Set(returns.filter((request) => conflictingStatuses.includes(request.status))
      .flatMap((request) => request.items.map((item) => Number(item.order_item_id))));
    const items = (order.items || []).map((item) => ({
      ...item, returnEligible: Boolean(meta?.in_return_window) && !conflicts.has(Number(item.id)),
    }));
    return {
      ...order, deliveredAt: meta?.delivered_at ?? null, returnDeadline: meta?.return_deadline ?? null,
      returnWindowOpen: Boolean(meta?.in_return_window),
      returnEligible: Boolean(meta?.in_return_window) && items.some((item) => item.returnEligible),
      returnDaysRemaining: meta?.return_seconds_remaining == null ? null : Math.ceil(Number(meta.return_seconds_remaining) / 86400),
      returns, activeReturn: returns.find((request) => activeStatuses.has(request.status)) || returns[0] || null,
      items,
    };
  });
}

async function transaction(work) {
  const connection = await db.promise().getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally { connection.release(); }
}

async function notify(executor, role, accountId, type, message, orderId) {
  await query(executor, `INSERT INTO account_notifications
    (role, account_id, notification_type, message, order_id) VALUES (?, ?, ?, ?, ?)`,
  [role, accountId, type, message, orderId]);
}

function publish(request) {
  // A disconnected live client must not turn a committed action into an error.
  try {
    publishReturnUpdated(request.seller_id, request.customer_id, request.conversation_id,
      request.return_request_id, request.order_id, request.status);
  } catch (error) { console.error("Return live update error:", error.code || error.name); }
}

export async function createReturnRequest(customerId, body = {}, evidencePhotos = []) {
  const buyerId = idValue(customerId, "buyer");
  const orderId = idValue(body.order_id, "order");
  if (!Array.isArray(body.order_item_ids) || !body.order_item_ids.length) fail(400, "Select at least one item to return.");
  if (body.order_item_ids.length > 100) fail(400, "Select no more than 100 order items.");
  const itemIds = body.order_item_ids.map((value) => idValue(value, "order item"));
  if (new Set(itemIds).size !== itemIds.length) fail(400, "Select each order item only once.");
  if (!RETURN_REASONS.includes(body.reason)) fail(400, "Choose a valid return reason.");
  const details = trimmedText(body.details, 10, 1000, "Return details");
  const request = await transaction(async (connection) => {
    // All return mutations lock the seller order first, serializing duplicate
    // submissions and decisions involving the same purchased items.
    const orders = await query(connection, `SELECT order_id, customer_id, seller_id, status, delivered_at,
        EXISTS(SELECT 1 FROM seller_payment_split payout WHERE payout.order_id=marketplace_order.order_id
          AND payout.payout_status IN ('Processing','Paid')) AS payout_reserved,
        (CURRENT_TIMESTAMP >= delivered_at AND CURRENT_TIMESTAMP <= DATE_ADD(delivered_at, INTERVAL 4 DAY)) AS in_return_window
      FROM marketplace_order WHERE order_id = ? AND customer_id = ? FOR UPDATE`, [orderId, buyerId]);
    if (!orders.length) fail(404, "Order not found.");
    const order = orders[0];
    if (order.status !== "Delivered") fail(409, "Only delivered orders can be returned.");
    if (!order.delivered_at) fail(409, "The delivery timestamp is unavailable. Contact support about this order.");
    if (!order.in_return_window) fail(409, expiredMessage);
    // Both operations lock the order first. At the exact four-day boundary,
    // an already reserved transfer and a new return cannot both commit.
    if (order.payout_reserved) fail(409, "A seller payout has already been reserved for this order. Contact support about a return.");
    const items = await query(connection, `SELECT order_item_id, quantity FROM marketplace_order_item
      WHERE order_id = ? AND order_item_id IN (?)`, [orderId, itemIds]);
    if (items.length !== itemIds.length) fail(400, "Selected items must belong to this order.");
    if (items.some((item) => !Number.isSafeInteger(Number(item.quantity)) || Number(item.quantity) <= 0)) {
      fail(409, "This order contains an invalid item quantity. Contact support.");
    }
    const conflicts = await query(connection, `SELECT ri.order_item_id FROM marketplace_return_item ri
      JOIN marketplace_return_request r ON r.return_request_id = ri.return_request_id
      WHERE r.order_id = ? AND ri.order_item_id IN (?) AND r.status IN (?)`, [orderId, itemIds, conflictingStatuses]);
    if (conflicts.length) fail(409, "This item already has an active or completed return request.");
    // Transactional return rights do not depend on social chat blocks. Reuse
    // the existing unique seller/buyer pair; ordinary message rules stay intact.
    await query(connection, `INSERT INTO conversation (student_id, customer_id) VALUES (?, ?)
      ON DUPLICATE KEY UPDATE conversation_id = LAST_INSERT_ID(conversation_id)`, [order.seller_id, buyerId]);
    const conversations = await query(connection,
      "SELECT conversation_id FROM conversation WHERE student_id = ? AND customer_id = ?", [order.seller_id, buyerId]);
    const conversationId = conversations[0].conversation_id;
    // Preserve hidden message history while making the transactional thread accessible.
    await query(connection, `UPDATE conversation_read_state SET deleted_at = NULL
      WHERE conversation_id = ? AND ((account_type = 'buyer' AND account_id = ?)
        OR (account_type = 'seller' AND account_id = ?))`, [conversationId, buyerId, order.seller_id]);
    // Check the clock again at insertion, including the exact deadline itself.
    const result = await query(connection, `INSERT INTO marketplace_return_request
      (order_id, conversation_id, customer_id, seller_id, reason, details)
      SELECT order_id, ?, customer_id, seller_id, ?, ? FROM marketplace_order
      WHERE order_id = ? AND customer_id = ? AND status = 'Delivered'
        AND CURRENT_TIMESTAMP >= delivered_at AND CURRENT_TIMESTAMP <= DATE_ADD(delivered_at, INTERVAL 4 DAY)`,
    [conversationId, body.reason, details, orderId, buyerId]);
    if (!result.affectedRows) fail(409, expiredMessage);
    for (const item of items) {
      await query(connection, `INSERT INTO marketplace_return_item (return_request_id, order_item_id, quantity)
        VALUES (?, ?, ?)`, [result.insertId, item.order_item_id, item.quantity]);
    }
    if (Array.isArray(evidencePhotos) && evidencePhotos.length) {
      await query(connection, "UPDATE marketplace_return_request SET evidence_photos = ? WHERE return_request_id = ?",
        [JSON.stringify(evidencePhotos), result.insertId]);
    }
    await notify(connection, "seller", order.seller_id, "return_requested",
      `Buyer requested a return for order AM-${String(orderId).padStart(6, "0")}.`, orderId);
    return (await listReturnRequests(connection, "buyer", buyerId, { requestId: result.insertId }))[0];
  });
  publish(request);
  return request;
}

export async function transitionReturnRequest(role, actorId, returnId, action, body = {}) {
  const column = ownerColumn(role);
  const accountId = idValue(actorId, "account");
  const requestId = idValue(returnId, "return request");
  const rules = {
    cancel: { role: "buyer", from: "Requested", to: "Cancelled", error: "This return request can no longer be cancelled." },
    approve: { role: "seller", from: "Requested", to: "Approved", error: "Only a requested return can be approved." },
    reject: { role: "seller", from: "Requested", to: "Rejected", error: "Only a requested return can be rejected." },
    shipped: { role: "buyer", from: "Approved", to: "Return Shipped", error: "This return must be approved before it can be shipped." },
    receive: { role: "seller", from: "Return Shipped", to: "Completed", error: "Only a shipped return can be confirmed as received." },
  };
  const rule = rules[action];
  if (!rule || rule.role !== role) fail(403, `Only the ${rule?.role || "authorized account"} can perform this return action.`);
  let response = null;
  let trackingUrl = null;
  let returnCourier = null;
  let returnTrackingNumber = null;
  if (action === "reject") response = trimmedText(body.seller_response, 1, 1000, "Seller response");
  if (action === "approve" && body.seller_response != null && body.seller_response !== "") {
    response = trimmedText(body.seller_response, 1, 1000, "Seller response");
  }
  if (action === "shipped") {
    const rawTrackingUrl = body.return_tracking_url !== undefined ? body.return_tracking_url : body.tracking_url;
    const rawCourier = body.return_courier !== undefined ? body.return_courier : body.courier;
    const rawTrackingNumber = body.return_tracking_number !== undefined ? body.return_tracking_number : body.tracking_number;
    if (rawTrackingUrl != null && typeof rawTrackingUrl !== "string") fail(400, "Enter a valid HTTP or HTTPS tracking link.");
    if ((rawCourier != null && String(rawCourier).trim() !== "") || (rawTrackingNumber != null && String(rawTrackingNumber).trim() !== "")) {
      if (typeof normalizeShipmentTracking === "function") {
        try {
          const shipment = normalizeShipmentTracking({
            courier: rawCourier,
            trackingNumber: rawTrackingNumber,
            trackingUrl: rawTrackingUrl || "",
          });
          returnCourier = shipment.courier;
          returnTrackingNumber = shipment.trackingNumber;
          trackingUrl = shipment.trackingUrl;
        } catch (error) {
          fail(400, error.message);
        }
      } else {
        returnCourier = String(rawCourier || "").trim() || null;
        returnTrackingNumber = String(rawTrackingNumber || "").trim() || null;
        try { trackingUrl = normalizeTrackingUrl(rawTrackingUrl); }
        catch (error) { fail(400, error.message); }
      }
    } else {
      try { trackingUrl = normalizeTrackingUrl(rawTrackingUrl); }
      catch (error) { fail(400, error.message); }
    }
  }
  let request = await transaction(async (connection) => {
    const candidates = await query(connection,
      `SELECT order_id FROM marketplace_return_request WHERE return_request_id = ? AND ${column} = ?`, [requestId, accountId]);
    if (!candidates.length) fail(404, "Return request not found.");
    const orders = await query(connection,
      `SELECT order_id FROM marketplace_order WHERE order_id = ? AND ${column} = ? FOR UPDATE`, [candidates[0].order_id, accountId]);
    if (!orders.length) fail(404, "Return request not found.");
    const requests = await query(connection,
      `SELECT * FROM marketplace_return_request WHERE return_request_id = ? AND ${column} = ? FOR UPDATE`, [requestId, accountId]);
    const current = requests[0];
    if (!current) fail(404, "Return request not found.");
    if (current.status !== rule.from) fail(409, rule.error);
    if (action === "approve" || action === "reject") {
      await query(connection, `UPDATE marketplace_return_request SET status = ?, decision_at = CURRENT_TIMESTAMP,
        seller_response = ? WHERE return_request_id = ? AND status = 'Requested'`, [rule.to, response, requestId]);
    } else if (action === "shipped") {
      if (returnCourier !== null || returnTrackingNumber !== null) {
        await query(connection, `UPDATE marketplace_return_request SET status = 'Return Shipped',
          return_shipped_at = CURRENT_TIMESTAMP, return_tracking_url = ?,
          return_courier = ?, return_tracking_number = ?
          WHERE return_request_id = ? AND status = 'Approved'`, [trackingUrl, returnCourier, returnTrackingNumber, requestId]);
      } else {
        await query(connection, `UPDATE marketplace_return_request SET status = 'Return Shipped',
          return_shipped_at = CURRENT_TIMESTAMP, return_tracking_url = ?
          WHERE return_request_id = ? AND status = 'Approved'`, [trackingUrl, requestId]);
      }
    } else if (action === "receive") {
      await query(connection, `UPDATE marketplace_return_request SET status = 'Received', received_at = CURRENT_TIMESTAMP
        WHERE return_request_id = ? AND status = 'Return Shipped'`, [requestId]);
      await query(connection, `UPDATE marketplace_return_request SET status = 'Completed', completed_at = CURRENT_TIMESTAMP
        WHERE return_request_id = ? AND status = 'Received'`, [requestId]);
      if (typeof revokeCertificateAccessForReturn === "function") {
        await revokeCertificateAccessForReturn(connection, requestId);
      }
    } else {
      await query(connection, "UPDATE marketplace_return_request SET status = 'Cancelled' WHERE return_request_id = ? AND status = 'Requested'", [requestId]);
    }
    const number = `AM-${String(current.order_id).padStart(6, "0")}`;
    const messages = {
      cancel: `Buyer cancelled the return request for order ${number}.`,
      approve: `Your return request for order ${number} was approved.`,
      reject: `Your return request for order ${number} was rejected.`,
      shipped: `The return for order ${number} has been marked as shipped.`,
      receive: `The seller confirmed receipt of your returned item for order ${number}. Return completed.`,
    };
    const targetRole = role === "buyer" ? "seller" : "buyer";
    const targetId = targetRole === "buyer" ? current.customer_id : current.seller_id;
    await notify(connection, targetRole, targetId,
      `return_${action === "receive" ? "completed" : action === "approve" ? "approved" : action === "reject" ? "rejected" : action === "cancel" ? "cancelled" : "shipped"}`,
      messages[action], current.order_id);
    return (await listReturnRequests(connection, role, accountId, { requestId }))[0];
  });
  if (action === "receive" && typeof createPayMongoRefund === "function") {
    try {
      request = await processOrderReturnRefund(role, accountId, requestId, { strict: false });
    } catch (error) {
      console.error("Automatic return refund error:", error.code || error.message);
    }
  }
  publish(request);
  return request;
}

export async function processOrderReturnRefund(role, actorId, returnId, { strict = true } = {}) {
  const column = ownerColumn(role);
  const accountId = idValue(actorId, "account");
  const requestId = idValue(returnId, "return request");
  const executor = db.promise();
  const rows = await query(executor,
    `SELECT r.return_request_id, r.order_id, r.customer_id, r.seller_id, r.status,
            o.payment_method, o.payment_status, o.paymongo_payment_id, o.total_amount,
            COALESCE(SUM(ROUND(i.unit_price * 100) * ri.quantity), 0) AS returned_centavos
       FROM marketplace_return_request r
       JOIN marketplace_order o ON o.order_id = r.order_id
       JOIN marketplace_return_item ri ON ri.return_request_id = r.return_request_id
       JOIN marketplace_order_item i ON i.order_item_id = ri.order_item_id AND i.order_id = o.order_id
      WHERE r.return_request_id = ? AND r.${column} = ?
      GROUP BY r.return_request_id`,
    [requestId, accountId],
  );
  if (!rows.length) fail(404, "Return request not found.");
  const target = rows[0];
  if (target.status !== "Completed") {
    if (strict) fail(409, "Confirm receipt of the returned product before processing a refund.");
    return (await listReturnRequests(executor, role, accountId, { requestId }))[0];
  }
  const existingRefunds = await query(executor,
    "SELECT * FROM seller_order_refund WHERE return_request_id = ? ORDER BY refund_id DESC",
    [requestId],
  );
  const succeeded = existingRefunds.find((item) => item.status === "Succeeded");
  if (succeeded) {
    return (await listReturnRequests(executor, role, accountId, { requestId }))[0];
  }
  const hasPayMongoPayment = target.payment_method === "paymongo" && /^pay_[A-Za-z0-9_-]+$/.test(target.paymongo_payment_id || "");
  if (!hasPayMongoPayment) {
    if (strict) {
      fail(409, target.payment_method === "paymongo"
        ? "This order does not have a verified PayMongo payment ID to refund."
        : "Cash on Delivery orders do not have an online PayMongo payment to refund.");
    }
    return (await listReturnRequests(executor, role, accountId, { requestId }))[0];
  }
  if (target.payment_status === "Refunded") {
    return (await listReturnRequests(executor, role, accountId, { requestId }))[0];
  }
  const amountCentavos = Number(target.returned_centavos);
  if (!Number.isSafeInteger(amountCentavos) || amountCentavos <= 0) {
    if (strict) fail(409, "Invalid return refund amount.");
    return (await listReturnRequests(executor, role, accountId, { requestId }))[0];
  }

  let providerRefund = null;
  const pendingRefund = existingRefunds.find((item) => item.status === "Pending" && /^ref_[A-Za-z0-9_-]+$/.test(item.provider_refund_id || ""));
  try {
    if (pendingRefund && typeof retrievePayoutRefund === "function") {
      providerRefund = await retrievePayoutRefund(pendingRefund.provider_refund_id);
    } else {
      providerRefund = await createPayMongoRefund({
        paymentId: target.paymongo_payment_id,
        amountCentavos,
        reason: "requested_by_customer",
        notes: `ArtMatch return request #${requestId} for order AM-${String(target.order_id).padStart(6, "0")}`,
        idempotencyKey: `AM-RET-REF-${requestId}`,
      });
    }
  } catch (error) {
    if (strict) fail(error.status || 502, error.message || "Unable to process refund with PayMongo.");
    throw error;
  }

  const mappedStatus = providerRefund.status === "succeeded"
    ? "Succeeded"
    : providerRefund.status === "failed"
      ? "Failed"
      : "Pending";

  await transaction(async (connection) => {
    await query(connection, "SELECT order_id FROM marketplace_order WHERE order_id = ? FOR UPDATE", [target.order_id]);
    await query(connection,
      `INSERT INTO seller_order_refund (order_id, return_request_id, provider_refund_id, provider_payment_id, amount, status)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE status = VALUES(status), amount = VALUES(amount)`,
      [target.order_id, requestId, providerRefund.id, providerRefund.paymentId, providerRefund.amountCentavos / 100, mappedStatus],
    );
    if (mappedStatus === "Succeeded") {
      const totals = await query(connection,
        `SELECT COALESCE(SUM(ROUND(amount * 100)), 0) AS refunded_centavos
           FROM seller_order_refund WHERE order_id = ? AND status = 'Succeeded'`,
        [target.order_id],
      );
      const totalOrderCentavos = Math.round(Number(target.total_amount) * 100);
      if (Number(totals[0]?.refunded_centavos || 0) >= totalOrderCentavos) {
        await query(connection,
          "UPDATE marketplace_order SET payment_status = 'Refunded' WHERE order_id = ? AND payment_method = 'paymongo'",
          [target.order_id],
        );
      }
      await notify(connection, "buyer", target.customer_id, "return_refunded",
        `Your refund of PHP ${(providerRefund.amountCentavos / 100).toFixed(2)} for order AM-${String(target.order_id).padStart(6, "0")} has been confirmed.`,
        target.order_id);
    }
  });

  if (typeof refreshSellerPayoutEligibility === "function") {
    await refreshSellerPayoutEligibility(executor, { orderId: target.order_id }).catch(() => {});
  }
  return (await listReturnRequests(executor, role, accountId, { requestId }))[0];
}
