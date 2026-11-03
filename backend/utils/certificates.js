import db from "../database/db.js";
import { randomBytes } from "node:crypto";
import QRCode from "qrcode";
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

export function certificateUrl(token) {
  const base = process.env.PUBLIC_APP_URL || process.env.FRONTEND_URL ||
    (process.env.NODE_ENV === "production" ? "" : "http://localhost:5173");
  let url;
  try { url = new URL(base); } catch { fail(503, "Certificate public site URL is not configured."); }
  if (!/^https?:$/.test(url.protocol) || url.username || url.password ||
      (process.env.NODE_ENV === "production" && (url.protocol !== "https:" || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(url.hostname)))) {
    fail(503, "Configure a secure public site URL for certificates.");
  }
  return `${url.origin}${url.pathname.replace(/\/+$/, "")}/buyer/certificate/verify/${token}`;
}

export async function reserveCertificateIdentity(sellerId, artworkId) {
  const ownerId = positiveId(sellerId, "seller");
  const id = positiveId(artworkId, "artwork");
  const [owned] = await db.promise().query(`SELECT a.artwork_id FROM artwork a
    JOIN artupload au ON au.artwork_id = a.artwork_id WHERE a.artwork_id = ? AND a.student_id = ?
    AND LOWER(TRIM(au.request_status)) IN ('verified', 'approved') LIMIT 1`, [id, ownerId]);
  if (!owned.length) fail(404, "Approved artwork not found.");
  await db.promise().query(`INSERT IGNORE INTO marketplace_certificate_identity (artwork_id, public_token) VALUES (?, ?)`,
    [id, randomBytes(32).toString("hex")]);
  const [rows] = await db.promise().query("SELECT public_token FROM marketplace_certificate_identity WHERE artwork_id = ?", [id]);
  return { verificationUrl: certificateUrl(rows[0].public_token) };
}

export async function certificateWithQr(svg, verificationUrl) {
  // Replace only our overlay, keeping the seller's design and raster template intact.
  const clean = svg.replace(/<g id="certificate-verification-qr">[\s\S]*?<\/g>/g, "");
  const png = await QRCode.toDataURL(verificationUrl, { width: 384, margin: 4, errorCorrectionLevel: "M" });
  return clean.replace(/<\/svg>\s*$/i, `<g id="certificate-verification-qr"><rect x="990" y="597" width="146" height="151" fill="#fff"/><image href="${png}" x="1000" y="602" width="126" height="126"/><text x="1063" y="741" text-anchor="middle" fill="#202124" font-family="Arial,sans-serif" font-size="12">Scan to verify</text></g></svg>`);
}

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

  const identity = await reserveCertificateIdentity(ownerId, id);
  svg = await certificateWithQr(svg, identity.verificationUrl);

  const [result] = await db.promise().query(
    `INSERT IGNORE INTO marketplace_certificate (artwork_id, seller_id, certificate_id, certificate_svg)
     VALUES (?, ?, ?, ?)`,
    [id, ownerId, certificateId, svg],
  );
  if (result.affectedRows !== 1) {
    fail(409, "A certificate has already been published for this artwork.");
  }
  void processDueCertificateDeliveries().catch(() => {});
  return { artworkId: id, certificateId, published: true, ...identity, svg };
}

export async function getSellerCertificate(sellerId, artworkId) {
  const ownerId = positiveId(sellerId, "seller");
  const id = positiveId(artworkId, "artwork");
  const [rows] = await db.promise().query(
    `SELECT certificate_id, certificate_svg, published_at FROM marketplace_certificate
     WHERE artwork_id = ? AND seller_id = ?`,
    [id, ownerId],
  );
  if (!rows[0]) return null;
  const identity = await reserveCertificateIdentity(ownerId, id);
  return { artworkId: id, certificateId: rows[0].certificate_id, publishedAt: rows[0].published_at,
    ...identity, svg: await certificateWithQr(rows[0].certificate_svg, identity.verificationUrl) };
}

export async function getPublicCertificate(token) {
  if (!/^[a-f0-9]{64}$/.test(String(token))) fail(404, "Certificate unavailable.");
  const [rows] = await db.promise().query(`SELECT c.certificate_id, c.certificate_svg,
      o.status, o.delivered_at <= CURRENT_TIMESTAMP AS access_ready,
      o.paid_at IS NOT NULL AS paid,
      (
        EXISTS (
          SELECT 1 FROM marketplace_return_item ri
          JOIN marketplace_return_request r ON r.return_request_id = ri.return_request_id
          WHERE ri.order_item_id = oi.order_item_id AND r.status IN ('Completed', 'Received')
        )
        OR EXISTS (
          SELECT 1 FROM marketplace_certificate_access ca
          WHERE ca.order_item_id = oi.order_item_id AND ca.ownership_status = 'revoked'
        )
      ) AS return_completed
    FROM marketplace_certificate_identity i
    JOIN marketplace_certificate c ON c.artwork_id = i.artwork_id
    JOIN marketplace_order_item oi ON oi.artwork_id = c.artwork_id
    JOIN marketplace_order o ON o.order_id = oi.order_id AND o.seller_id = c.seller_id
    WHERE i.public_token = ? ORDER BY o.created_at DESC, o.order_id DESC LIMIT 1`, [token]);
  const row = rows[0];
  if (!row) fail(404, "Certificate unavailable.");
  if (Number(row.return_completed)) {
    fail(410, "Access to this Certificate of Authenticity has been revoked because this product was returned.");
  }
  if (row.status !== "Delivered" || !Number(row.access_ready) || !Number(row.paid)) {
    fail(409, "Certificate unavailable until paid delivery.");
  }
  return { certificateId: row.certificate_id, status: "Active",
    svg: await certificateWithQr(row.certificate_svg, certificateUrl(token)) };
}

export async function getBuyerCertificateIdentity(customerId, orderItemId) {
  await getBuyerCertificate(customerId, orderItemId);
  const [rows] = await db.promise().query(`SELECT oi.artwork_id, o.seller_id, c.certificate_id
    FROM marketplace_order_item oi JOIN marketplace_order o ON o.order_id = oi.order_id
    JOIN marketplace_certificate c ON c.artwork_id = oi.artwork_id AND c.seller_id = o.seller_id
    WHERE oi.order_item_id = ? AND o.customer_id = ?`, [orderItemId, customerId]);
  return { certificateId: rows[0].certificate_id,
    ...await reserveCertificateIdentity(rows[0].seller_id, rows[0].artwork_id) };
}

export async function getSellerOrderCertificateIdentity(sellerId, orderItemId) {
  const [rows] = await db.promise().query(`SELECT o.customer_id FROM marketplace_order_item oi
    JOIN marketplace_order o ON o.order_id = oi.order_id WHERE oi.order_item_id = ? AND o.seller_id = ?`,
    [positiveId(orderItemId, "order item"), positiveId(sellerId, "seller")]);
  if (!rows.length) fail(404, "Certificate unavailable.");
  return getBuyerCertificateIdentity(rows[0].customer_id, orderItemId);
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
         AND o.delivered_at <= CURRENT_TIMESTAMP
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
    const identity = await reserveCertificateIdentity(item.seller_id, item.artwork_id);
    const linkPath = identity.verificationUrl;
    const [message] = await connection.query(
      `INSERT INTO message (conversation_id, sender_type, message_data, image, media_type)
       VALUES (?, 'seller', ?, ?, ?)`,
      [conversationId, `Your Certificate of Authenticity for "${item.title || "your artwork"}" is ready. Certificate ID: ${certificates[0].certificate_id}`,
        linkPath, CERTIFICATE_LINK_MEDIA_TYPE],
    );
    await connection.query(
      `INSERT INTO marketplace_certificate_delivery
       (order_item_id, order_id, conversation_id, message_id)
       VALUES (?, ?, ?, ?)`,
      [item.order_item_id, item.order_id, conversationId, message.insertId],
    );
    try {
      await connection.query(
        `INSERT INTO marketplace_certificate_access
         (artwork_id, order_id, order_item_id, customer_id, seller_id, ownership_status)
         VALUES (?, ?, ?, ?, ?, 'active')
         ON DUPLICATE KEY UPDATE ownership_status = 'active', revoked_at = NULL, revocation_reason = NULL`,
        [item.artwork_id, item.order_id, item.order_item_id, item.customer_id, item.seller_id],
      );
    } catch {
      // Allow delivery to proceed even if optional access tracking table is pending migration
    }
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
       AND o.delivered_at <= CURRENT_TIMESTAMP
       AND o.paid_at IS NOT NULL
       AND NOT EXISTS (
         SELECT 1
         FROM marketplace_return_item ri
         JOIN marketplace_return_request r ON r.return_request_id = ri.return_request_id
         WHERE ri.order_item_id = oi.order_item_id AND r.status IN ('Completed', 'Received')
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

export function startCertificateDeliveryScheduler({ intervalMs = 5_000, logger = console } = {}) {
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
       o.delivered_at <= CURRENT_TIMESTAMP AS access_ready,
       GREATEST(1, CEIL(TIMESTAMPDIFF(SECOND, CURRENT_TIMESTAMP, o.delivered_at) / 60)) AS minutes_remaining,
       (EXISTS (SELECT 1 FROM marketplace_return_item ri JOIN marketplace_return_request r ON r.return_request_id = ri.return_request_id WHERE ri.order_item_id = oi.order_item_id AND r.status IN ('Completed', 'Received')) OR EXISTS (SELECT 1 FROM marketplace_certificate_access ca WHERE ca.order_item_id = oi.order_item_id AND ca.ownership_status = 'revoked')) AS return_completed
     FROM marketplace_order_item oi
     JOIN marketplace_order o ON o.order_id = oi.order_id
     JOIN marketplace_certificate c
       ON c.artwork_id = oi.artwork_id AND c.seller_id = o.seller_id
     WHERE oi.order_item_id = ? AND o.customer_id = ?
       AND o.status = 'Delivered' AND o.delivered_at IS NOT NULL
       AND o.paid_at IS NOT NULL
     LIMIT 1`,
    [itemId, buyerId],
  );
  if (!rows.length) fail(404, "Certificate access is unavailable for this order.");
  if (Number(rows[0].return_completed)) {
    fail(410, "Access to this Certificate of Authenticity has been revoked because this product was returned.");
  }
  if (!Number(rows[0].access_ready)) {
    fail(409, `Your certificate becomes available upon delivery. Please try again in ${Number(rows[0].minutes_remaining)} minute(s).`);
  }
  return rows[0].certificate_svg;
}


export async function revokeCertificateAccessForReturn(executor, returnRequestId) {
  const conn = executor || db.promise();
  const id = positiveId(returnRequestId, "return request");

  try {
    await conn.query(
      `INSERT INTO marketplace_certificate_access
         (artwork_id, order_id, order_item_id, customer_id, seller_id, ownership_status, revoked_at, revocation_reason, return_request_id)
       SELECT oi.artwork_id, oi.order_id, oi.order_item_id, o.customer_id, o.seller_id,
              'revoked', CURRENT_TIMESTAMP, 'Product returned', r.return_request_id
       FROM marketplace_return_item ri
       JOIN marketplace_return_request r ON r.return_request_id = ri.return_request_id
       JOIN marketplace_order_item oi ON oi.order_item_id = ri.order_item_id
       JOIN marketplace_order o ON o.order_id = oi.order_id
       WHERE r.return_request_id = ?
       ON DUPLICATE KEY UPDATE
         ownership_status = 'revoked',
         revoked_at = CURRENT_TIMESTAMP,
         revocation_reason = 'Product returned',
         return_request_id = VALUES(return_request_id)`,
      [id],
    );
  } catch (error) {
    console.warn("Unable to update certificate access record:", error.message);
  }

  try {
    await conn.query(
      `UPDATE marketplace_certificate_delivery cd
       JOIN marketplace_return_item ri ON ri.order_item_id = cd.order_item_id
       SET cd.access_status = 'revoked',
           cd.revoked_at = CURRENT_TIMESTAMP,
           cd.revocation_reason = 'Product returned',
           cd.return_request_id = ?
       WHERE ri.return_request_id = ?`,
      [id, id],
    );
  } catch (error) {
    console.warn("Unable to update certificate delivery record:", error.message);
  }
}

export async function searchCertificates(currentSellerId, { query: rawQuery = "", excludeSelf = true, limit = 50 } = {}) {
  const sellerId = positiveId(currentSellerId, "seller");
  const searchQuery = typeof rawQuery === "string" ? rawQuery.trim() : "";
  const maxLimit = Math.min(Math.max(1, Number(limit) || 50), 100);

  const filterSql = excludeSelf ? "c.seller_id != ?" : "(c.seller_id != ? OR 1=1)";
  const params = [sellerId];

  let searchCondition = "";
  if (searchQuery) {
    const likePattern = `%${searchQuery}%`;
    searchCondition = `
      AND (
        c.certificate_id LIKE ?
        OR a.title LIKE ?
        OR CONCAT(COALESCE(s.first_name, ''), ' ', COALESCE(s.last_name, '')) LIKE ?
        OR s.first_name LIKE ?
        OR s.last_name LIKE ?
        OR a.genre LIKE ?
        OR a.art_type LIKE ?
        OR i.public_token = ?
      )
    `;
    params.push(
      likePattern,
      likePattern,
      likePattern,
      likePattern,
      likePattern,
      likePattern,
      likePattern,
      searchQuery,
    );
  }

  params.push(maxLimit);

  const [rows] = await db.promise().query(
    `SELECT 
       c.artwork_id,
       c.seller_id,
       c.certificate_id,
       c.certificate_svg,
       c.published_at,
       i.public_token,
       a.title AS artwork_title,
       a.image AS artwork_image,
       a.genre,
       a.art_type,
       a.price,
       s.first_name,
       s.last_name,
       s.profile_image,
       s.course,
       s.student_number
     FROM marketplace_certificate c
     JOIN artwork a ON a.artwork_id = c.artwork_id
     JOIN student s ON s.student_id = c.seller_id
     LEFT JOIN marketplace_certificate_identity i ON i.artwork_id = c.artwork_id
     WHERE ${filterSql}
       ${searchCondition}
     ORDER BY c.published_at DESC
     LIMIT ?`,
    params,
  );

  return Promise.all(
    rows.map(async (row) => {
      let verificationUrl = null;
      let svg = row.certificate_svg;
      if (row.public_token) {
        try {
          verificationUrl = certificateUrl(row.public_token);
          svg = await certificateWithQr(row.certificate_svg, verificationUrl);
        } catch {
          // Keep existing svg if URL configuration fails
        }
      }
      return {
        certificateId: row.certificate_id,
        artworkId: row.artwork_id,
        publishedAt: row.published_at,
        verificationUrl,
        publicToken: row.public_token || null,
        svg,
        artwork: {
          id: row.artwork_id,
          title: row.artwork_title || "Untitled Artwork",
          image: row.artwork_image || null,
          genre: row.genre || null,
          artType: row.art_type || null,
          price: row.price || 0,
        },
        artist: {
          id: row.seller_id,
          name: `${row.first_name || ""} ${row.last_name || ""}`.trim() || "Student Artist",
          firstName: row.first_name,
          lastName: row.last_name,
          profileImage: row.profile_image || null,
          course: row.course || null,
          studentNumber: row.student_number || null,
        },
        isOwnCertificate: row.seller_id === sellerId,
      };
    }),
  );
}
