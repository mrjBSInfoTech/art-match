import db from "../database/db.js";
import { publishChatMessage } from "./chatEvents.js";

export const CERTIFICATE_LINK_MEDIA_TYPE = "application/vnd.artmatch.certificate-link";

export class CertificateError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "CertificateError";
    this.status = status;
  }
}

const fail = (status, message) => {
  throw new CertificateError(status, message);
};

const query = async (executor, sql, params = []) => (await executor.query(sql, params))[0];

const positiveId = (value, label) => {
  if (!/^\d+$/.test(String(value ?? ""))) fail(400, `Invalid ${label}.`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) fail(400, `Invalid ${label}.`);
  return parsed;
};

const validSvg = (value) => typeof value === "string" &&
  value.length <= 12 * 1024 * 1024 &&
  /^<svg(?:\s|>)/i.test(value.trim()) &&
  !/<\s*(?:script|style|foreignObject|iframe)\b|\son[a-z]+\s*=|javascript\s*:|url\s*\(|<!DOCTYPE|<!ENTITY/i.test(value) &&
  !/\b(?:href|src)\s*=\s*["'](?!data:image\/(?:png|jpeg|webp);base64,)[^"']*["']/i.test(value);

export async function publishCertificate(sellerId, artworkId, certificateId, svg) {
  const ownerId = positiveId(sellerId, "seller");
  const id = positiveId(artworkId, "artwork");
  if (typeof certificateId !== "string" || !/^[A-Za-z0-9-]{1,64}$/.test(certificateId)) {
    fail(400, "Invalid certificate ID.");
  }
  if (!validSvg(svg)) fail(400, "Upload a valid, safe SVG certificate no larger than 12 MB.");

  const [artworks] = await db.promise().query(
    `SELECT a.artwork_id FROM artwork a
     JOIN artupload au ON au.artwork_id = a.artwork_id
     WHERE a.artwork_id = ? AND a.student_id = ?
       AND LOWER(TRIM(au.request_status)) IN ('verified', 'approved')
     LIMIT 1`,
    [id, ownerId],
  );
  if (!artworks.length) fail(404, "Approved artwork not found.");

  const [result] = await db.promise().query(
    `INSERT IGNORE INTO marketplace_certificate (artwork_id, seller_id, certificate_id, certificate_svg)
     VALUES (?, ?, ?, ?)`,
    [id, ownerId, certificateId, svg],
  );
  if (result.affectedRows !== 1) {
    fail(409, "A certificate has already been published for this artwork.");
  }
  return { artworkId: id, certificateId, published: true };
}

export async function getSellerCertificate(sellerId, artworkId) {
  const ownerId = positiveId(sellerId, "seller");
  const id = positiveId(artworkId, "artwork");
  const [rows] = await db.promise().query(
    `SELECT certificate_id, published_at FROM marketplace_certificate
     WHERE artwork_id = ? AND seller_id = ?`,
    [id, ownerId],
  );
  return rows[0]
    ? { artworkId: id, certificateId: rows[0].certificate_id, publishedAt: rows[0].published_at }
    : null;
}

async function deliverOrderItem(orderItemId) {
  const connection = await db.promise().getConnection();
  let publishedEvent;
  try {
    await connection.beginTransaction();
    const [orderItems] = await connection.query(
      `SELECT oi.order_item_id, oi.order_id, oi.artwork_id, oi.title, o.customer_id, o.seller_id
       FROM marketplace_order_item oi
       JOIN marketplace_order o ON o.order_id = oi.order_id
       WHERE oi.order_item_id = ? AND o.status = 'Delivered'
         AND o.delivered_at IS NOT NULL
         AND o.delivered_at <= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 1 DAY)
         AND o.paid_at IS NOT NULL
       FOR UPDATE`,
      [orderItemId],
    );
    if (!orderItems.length) {
      await connection.rollback();
      return false;
    }
    const item = orderItems[0];
    const [sent] = await connection.query(
      "SELECT order_item_id FROM marketplace_certificate_delivery WHERE order_item_id = ?",
      [orderItemId],
    );
    if (sent.length) {
      await connection.rollback();
      return false;
    }
    const [certificates] = await connection.query(
      `SELECT certificate_id FROM marketplace_certificate
       WHERE artwork_id = ? AND seller_id = ?`,
      [item.artwork_id, item.seller_id],
    );
    if (!certificates.length) {
      await connection.rollback();
      return false;
    }
    const [completedReturns] = await connection.query(
      `SELECT r.return_request_id
       FROM marketplace_return_item ri
       JOIN marketplace_return_request r ON r.return_request_id = ri.return_request_id
       WHERE ri.order_item_id = ? AND r.status = 'Completed'
       LIMIT 1`,
      [orderItemId],
    );
    if (completedReturns.length) {
      await connection.rollback();
      return false;
    }

    await connection.query(
      `INSERT INTO conversation (student_id, customer_id) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE conversation_id = LAST_INSERT_ID(conversation_id)`,
      [item.seller_id, item.customer_id],
    );
    const [conversations] = await connection.query(
      "SELECT conversation_id FROM conversation WHERE student_id = ? AND customer_id = ?",
      [item.seller_id, item.customer_id],
    );
    const conversationId = conversations[0].conversation_id;
    await connection.query(
      `UPDATE conversation_read_state SET deleted_at = NULL
       WHERE conversation_id = ? AND (
         (account_type = 'buyer' AND account_id = ?)
         OR (account_type = 'seller' AND account_id = ?)
       )`,
      [conversationId, item.customer_id, item.seller_id],
    );
    const linkPath = `/buyer/certificate/${item.order_item_id}`;
    const [message] = await connection.query(
      `INSERT INTO message (conversation_id, sender_type, message_data, image, media_type)
       VALUES (?, 'seller', ?, ?, ?)`,
      [conversationId, `Your Certificate of Authenticity for "${item.title || "your artwork"}" is ready.`,
        linkPath, CERTIFICATE_LINK_MEDIA_TYPE],
    );
    await connection.query(
      `INSERT INTO marketplace_certificate_delivery
       (order_item_id, order_id, conversation_id, message_id)
       VALUES (?, ?, ?, ?)`,
      [item.order_item_id, item.order_id, conversationId, message.insertId],
    );
    await connection.commit();
    publishedEvent = {
      sellerId: item.seller_id,
      buyerId: item.customer_id,
      conversationId,
      messageId: message.insertId,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
  publishChatMessage(
    publishedEvent.sellerId,
    publishedEvent.buyerId,
    publishedEvent.conversationId,
    publishedEvent.messageId,
  );
  return true;
}

export async function processDueCertificateDeliveries() {
  const [rows] = await db.promise().query(
    `SELECT oi.order_item_id
     FROM marketplace_order_item oi
     JOIN marketplace_order o ON o.order_id = oi.order_id
     JOIN marketplace_certificate c
       ON c.artwork_id = oi.artwork_id AND c.seller_id = o.seller_id
     LEFT JOIN marketplace_certificate_delivery d ON d.order_item_id = oi.order_item_id
     WHERE d.order_item_id IS NULL AND o.status = 'Delivered'
       AND o.delivered_at IS NOT NULL
       AND o.delivered_at <= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 1 DAY)
       AND o.paid_at IS NOT NULL
       AND NOT EXISTS (
         SELECT 1
         FROM marketplace_return_item ri
         JOIN marketplace_return_request r ON r.return_request_id = ri.return_request_id
         WHERE ri.order_item_id = oi.order_item_id AND r.status = 'Completed'
       )
     ORDER BY o.delivered_at, oi.order_item_id
     LIMIT 100`,
  );
  let delivered = 0;
  for (const row of rows) {
    if (await deliverOrderItem(row.order_item_id)) delivered++;
  }
  return delivered;
}

export function startCertificateDeliveryScheduler({ intervalMs = 60_000, logger = console } = {}) {
  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try {
      await processDueCertificateDeliveries();
    } catch (error) {
      logger.error("Certificate delivery scheduler failed:", error.code || error.name);
    } finally {
      running = false;
    }
  };
  void run();
  const timer = setInterval(run, intervalMs);
  timer.unref?.();
  return () => clearInterval(timer);
}

export async function getBuyerCertificate(customerId, orderItemId) {
  const buyerId = positiveId(customerId, "buyer");
  const itemId = positiveId(orderItemId, "order item");
  const [rows] = await db.promise().query(
    `SELECT c.certificate_svg,
       EXISTS (
         SELECT 1 FROM marketplace_return_item ri
         JOIN marketplace_return_request r ON r.return_request_id = ri.return_request_id
         WHERE ri.order_item_id = oi.order_item_id AND r.status = 'Completed'
       ) AS return_completed
     FROM marketplace_order_item oi
     JOIN marketplace_order o ON o.order_id = oi.order_id
     JOIN marketplace_certificate c
       ON c.artwork_id = oi.artwork_id AND c.seller_id = o.seller_id
     WHERE oi.order_item_id = ? AND o.customer_id = ?
       AND o.status = 'Delivered' AND o.delivered_at IS NOT NULL
       AND o.delivered_at <= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 1 DAY)
       AND o.paid_at IS NOT NULL
     LIMIT 1`,
    [itemId, buyerId],
  );
  if (!rows.length) fail(404, "Certificate access is unavailable for this order.");
  if (Number(rows[0].return_completed)) {
    fail(410, "Certificate access is unavailable because this return is completed.");
  }
  return rows[0].certificate_svg;
}
