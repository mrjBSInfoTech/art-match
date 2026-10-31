import { payoutService } from "../../utils/payouts.js";
import express from "express";
import multer from "multer";
import db from "../../database/db.js";
import { authenticateSeller } from "../../middleware/sellerAuthMiddleware.js";
import {
  deleteParcelPhoto,
  readParcelPhoto,
  saveParcelPhoto,
} from "../../utils/parcelPhotoStorage.js";
import { isB2Configured } from "../../utils/b2Storage.js";
import {
  normalizeTrackingUrl,
  normalizeShipmentTracking,
  validateParcelPhotoCount,
} from "../../utils/parcelShipment.js";
import { attachOrderReturns } from "../../utils/returns.js";
import { logSellerAudit } from "../../utils/auditLogger.js";
import { processDueCertificateDeliveries } from "../../utils/certificates.js";
import {
  attachDeliveryProof,
  parsePhotoList,
  validateDeliveryProof,
} from "../../utils/deliveryProof.js";

const router = express.Router();
const parcelPhotoTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);
const parcelPhotoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
  fileFilter: (req, file, callback) => {
    if (!parcelPhotoTypes.has(file.mimetype)) {
      return callback(new Error("Parcel photos must be JPEG, PNG, or WebP images"));
    }
    callback(null, true);
  },
});
const allowedTransitions = {
  Pending: new Set(["Confirmed", "Cancelled"]),
  Confirmed: new Set(["Packed"]),
  Packed: new Set(["Shipped"]),
  Shipped: new Set(["Delivered"]),
};

const createOrderStatusNotification = (orderId, buyerId, status, hasTrackingLink = false) =>
  new Promise((resolve) => {
    const orderLabel = `AM-${String(orderId).padStart(6, "0")}`;
    const statusMessages = {
      Confirmed: `Your order ${orderLabel} has been confirmed and is now being prepared.`,
      Packed: `Your order ${orderLabel} has been packed and is ready for shipment.`,
      Shipped: hasTrackingLink
        ? `Your order ${orderLabel} has shipped. Tracking is now available in My Orders.`
        : `Your order ${orderLabel} has shipped and is on the way.`,
      Delivered: `Your order ${orderLabel} has been delivered.`,
      Cancelled: `Your order ${orderLabel} has been cancelled.`,
    };

    const message = statusMessages[status] || `Your order ${orderLabel} status has been updated.`;
    const notificationType = status === "Shipped" || status === "Delivered" ? "shipping" : "order_status";

    db.query(
      "INSERT INTO account_notifications (role, account_id, notification_type, message, order_id) VALUES (?, ?, ?, ?, ?)",
      ["buyer", buyerId, notificationType, message, orderId],
      (error) => {
        if (error) {
          console.error("Unable to create order notification:", error.message);
          return resolve(false);
        }
        resolve(true);
      },
    );
  });

router.get("/", authenticateSeller, (req, res) => {
  res.set("Cache-Control", "no-store");
  db.query(
    `SELECT
       o.order_id, CONCAT('AM-', LPAD(o.order_id, 6, '0')) AS order_number,
       o.created_at, o.status, o.delivered_at, o.customer_id, o.seller_id,
       CONCAT(st.first_name, ' ', st.last_name) AS seller_name,
       o.delivery_method, o.payment_method, o.payment_status,
       o.paymongo_payment_method, o.paid_at, o.subtotal, o.shipping_fee,
       o.total_amount, o.buyer_name, o.buyer_email, c.phone_number AS buyer_phone,
       o.shipping_street,
       o.shipping_barangay, o.shipping_city, o.shipping_province,
       o.shipping_region, o.shipping_postal_code, o.parcel_photos, o.received_photos,
       o.courier, o.tracking_number, o.tracking_url, o.handling_instructions, i.order_item_id,
       i.artwork_id, i.title, i.artist_name, i.image, i.unit_price, i.quantity,
       i.selected_products, i.line_total, i.original_line_total, i.order_note,
       s.gross_amount, s.commission_amount, s.processing_fee_amount,
       s.net_amount, s.payout_status
     FROM marketplace_order o
     LEFT JOIN student st ON st.student_id = o.seller_id
     LEFT JOIN marketplace_order_item i ON i.order_id = o.order_id
     LEFT JOIN customer c ON c.customer_id = o.customer_id
     LEFT JOIN seller_payment_split s ON s.order_id = o.order_id
     WHERE o.seller_id = ?
       AND (o.payment_method <> 'paymongo' OR o.payment_status IN ('Paid', 'Refunded'))
     ORDER BY o.created_at DESC, o.order_id DESC, i.order_item_id`,
    [req.user.student_id],
    async (err, rows) => {
      if (err) {
        console.error("Seller order list error:", err);
        return res.status(500).json({ message: "Unable to load orders" });
      }
      const orders = new Map();
      rows.forEach((row) => {
        let order = orders.get(row.order_id);
        if (!order) {
          order = {
            orderId: row.order_id,
            id: row.order_number,
            date: row.created_at,
            status: row.status,
            deliveredAt: row.delivered_at,
            customerId: row.customer_id,
            sellerId: row.seller_id,
            sellerName: row.seller_name || null,
            deliveryMethod: row.delivery_method || "door_to_door",
            payment: row.payment_method,
            paymentStatus: row.payment_status,
            paymentChannel: row.paymongo_payment_method,
            paidAt: row.paid_at,
            subtotal: Number(row.subtotal),
            shipping: Number(row.shipping_fee),
            total: Number(row.total_amount),
            // What this seller is actually owed for their share of the payment.
            earning: row.net_amount === null || row.net_amount === undefined
              ? null
              : {
                  gross: Number(row.gross_amount),
                  commission: Number(row.commission_amount),
                  processingFee: Number(row.processing_fee_amount),
                  net: Number(row.net_amount),
                  payoutStatus: row.payout_status,
                },
            courier: row.courier || null,
            trackingNumber: row.tracking_number || null,
            trackingUrl: row.tracking_url || null,
            handlingInstructions: Array.isArray(row.handling_instructions)
              ? row.handling_instructions
              : typeof row.handling_instructions === "string"
                ? JSON.parse(row.handling_instructions)
                : [],
            parcelPhotoCount: Array.isArray(row.parcel_photos)
              ? row.parcel_photos.length
              : typeof row.parcel_photos === "string"
                ? JSON.parse(row.parcel_photos).length
                : 0,
            receivedPhotoCount: Array.isArray(row.received_photos)
              ? row.received_photos.length
              : typeof row.received_photos === "string"
                ? JSON.parse(row.received_photos).length
                : 0,
            customer: row.buyer_name,
            email: row.buyer_email,
            phone: row.buyer_phone,
            address: [
              row.shipping_street,
              row.shipping_barangay,
              row.shipping_city,
              row.shipping_province,
              row.shipping_region,
              row.shipping_postal_code,
            ].filter(Boolean).join(", "),
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
            image: row.image,
            qty: row.quantity,
            price: Number(row.unit_price),
            lineTotal: Number(row.line_total ?? (Number(row.unit_price) * Number(row.quantity))),
            originalLineTotal: Number(row.original_line_total ??
              (Number(row.unit_price) * Number(row.quantity))),
            selectedProducts: typeof row.selected_products === "string"
              ? JSON.parse(row.selected_products)
              : row.selected_products || null,
            orderNote: row.order_note || null,
          });
        }
      });
      try {
        res.json(await attachDeliveryProof(db.promise(), await attachOrderReturns(
          db.promise(), [...orders.values()], "seller", req.user.student_id,
        )));
      } catch (error) {
        console.error("Seller order return information error:", error);
        res.status(500).json({ message: "Unable to load orders" });
      }
    },
  );
});

router.put(
  "/:id/status",
  authenticateSeller,
  parcelPhotoUpload.array("parcel_photos", 5),
  (error, req, res, next) => {
    if (!error) return next();
    const message =
      error.code === "LIMIT_FILE_SIZE"
        ? "Each parcel photo must be 5 MB or smaller"
        : error.code === "LIMIT_FILE_COUNT"
          ? "Upload no more than 5 parcel photos"
          : error.message;
    return res.status(400).json({ message });
  },
  async (req, res) => {
    const orderId = Number(req.params.id);
    const sellerId = req.user.student_id;
    const requestedStatus = String(req.body.status || "");
    const files = req.files || [];
    const uploadedPhotos = [];
    let connection;

    const fail = (statusCode, message) => {
      const error = new Error(message);
      error.statusCode = statusCode;
      throw error;
    };

    try {
      if (!Number.isSafeInteger(orderId) || orderId <= 0) {
        fail(400, "Invalid order id");
      }

      connection = await db.promise().getConnection();
      await connection.beginTransaction();
      const [orders] = await connection.query(
        `        SELECT status, customer_id, total_amount, payment_status, parcel_photos, received_photos, courier, tracking_number, tracking_url, handling_instructions,
                payment_method, payment_status, paid_at
         FROM marketplace_order
         WHERE order_id = ? AND seller_id = ?
         LIMIT 1
         FOR UPDATE`,
        [orderId, sellerId],
      );

      if (!orders.length) fail(404, "Order not found");
      const order = orders[0];
      if (!allowedTransitions[order.status]?.has(requestedStatus)) {
        fail(400, `Cannot move an order from ${order.status} to ${requestedStatus}`);
      }
      if (order.payment_method === "paymongo") {
        if (requestedStatus === "Cancelled") {
          fail(409, order.payment_status === "Paid"
            ? "Paid online orders require refund handling before cancellation"
            : "Ask the buyer to cancel this unpaid payment from checkout so its payment session can be expired safely.");
        }
        if (requestedStatus !== "Cancelled" && order.payment_status !== "Paid") {
          fail(409, "Awaiting online payment. This order cannot be processed until payment is confirmed.");
        }
      }

      let deliveryNotes = null;
      if (requestedStatus === "Packed") {
        try {
          validateParcelPhotoCount(files);
        } catch (error) {
          fail(400, error.message);
        }
      } else if (requestedStatus === "Delivered") {
        // Delivery requires real, stored proof. Validation happens before any
        // upload so a rejected request leaves no files and no status change.
        try {
          deliveryNotes = validateDeliveryProof(files, req.body.delivery_notes).notes;
        } catch (error) {
          fail(error.statusCode || 400, error.message);
        }
      } else if (files.length) {
        fail(400, "Photos can only be uploaded when marking the order Packed or Delivered");
      }
      if (requestedStatus !== "Delivered" && req.body.delivery_notes) {
        fail(400, "Delivery notes can only be added when marking the order Delivered");
      }

      const allowedHandlingInstructions = new Set([
        "fragile",
        "do_not_bend",
        "keep_dry",
        "handle_with_care",
        "small_items",
        "this_side_up",
      ]);
      let handlingInstructions;
      if (requestedStatus === "Packed") {
        try {
          handlingInstructions = JSON.parse(req.body.handling_instructions || "[]");
        } catch {
          fail(400, "Invalid parcel handling instructions");
        }
        if (
          !Array.isArray(handlingInstructions) ||
          handlingInstructions.length > allowedHandlingInstructions.size ||
          handlingInstructions.some((instruction) => !allowedHandlingInstructions.has(instruction)) ||
          new Set(handlingInstructions).size !== handlingInstructions.length
        ) {
          fail(400, "Invalid parcel handling instructions");
        }
      }

      const existingPhotos = Array.isArray(order.parcel_photos)
        ? order.parcel_photos
        : order.parcel_photos
          ? JSON.parse(order.parcel_photos)
          : [];
      if (requestedStatus === "Shipped" && existingPhotos.length === 0) {
        fail(409, "Add parcel photos before shipping this order");
      }

      let shipmentTracking;
      let trackingUrl;
      try {
        if (requestedStatus === "Shipped") {
          shipmentTracking = normalizeShipmentTracking({
            courier: req.body.courier,
            trackingNumber: req.body.tracking_number,
            trackingUrl: req.body.tracking_url,
          });
          trackingUrl = shipmentTracking.trackingUrl;
        } else {
          trackingUrl = normalizeTrackingUrl(req.body.tracking_url);
        }
      } catch (error) {
        fail(400, error.message);
      }
      if (requestedStatus !== "Shipped" && trackingUrl) {
        fail(400, "A tracking link can only be added when marking the order Shipped");
      }
      if (requestedStatus !== "Shipped" && (req.body.courier || req.body.tracking_number)) {
        fail(400, "Courier tracking information can only be added when marking the order Shipped");
      }

      const existingReceivedPhotos = Array.isArray(order.received_photos)
        ? order.received_photos
        : order.received_photos
          ? JSON.parse(order.received_photos)
          : [];

      let parcelPhotos = existingPhotos;
      let receivedPhotos = existingReceivedPhotos;
      if (requestedStatus === "Packed") {
        parcelPhotos = [];
        for (const file of files) {
          const extension = parcelPhotoTypes.get(file.mimetype);
          try {
            const photo = await saveParcelPhoto({
              orderId,
              buffer: file.buffer,
              contentType: file.mimetype,
              extension,
            });
            uploadedPhotos.push(photo);
            parcelPhotos.push(photo);
          } catch (uploadError) {
            if (isB2Configured()) uploadError.statusCode = 502;
            throw uploadError;
          }
        }
      } else if (requestedStatus === "Delivered" && files.length > 0) {
        receivedPhotos = [];
        for (const file of files) {
          const extension = parcelPhotoTypes.get(file.mimetype);
          try {
            const photo = await saveParcelPhoto({
              orderId,
              buffer: file.buffer,
              contentType: file.mimetype,
              extension,
            });
            uploadedPhotos.push(photo);
            receivedPhotos.push(photo);
          } catch (uploadError) {
            if (isB2Configured()) uploadError.statusCode = 502;
            throw uploadError;
          }
        }
      }

      const [result] = await connection.query(
        `UPDATE marketplace_order
         SET status = ?, parcel_photos = ?, received_photos = ?, tracking_url = ?,
             handling_instructions = COALESCE(?, handling_instructions),
             payment_status = CASE
               WHEN payment_method = 'cod' AND ? = 'Delivered' THEN 'Paid'
               ELSE payment_status
             END,
             paid_at = CASE
               WHEN payment_method = 'cod' AND ? = 'Delivered' THEN COALESCE(paid_at, NOW())
               ELSE paid_at
             END,
             delivered_at = CASE
               WHEN ? = 'Delivered' THEN COALESCE(delivered_at, NOW())
               ELSE delivered_at
             END,
             courier = ?, tracking_number = ?
         WHERE order_id = ? AND seller_id = ? AND status = ?`,
        [
          requestedStatus,
          JSON.stringify(parcelPhotos),
          JSON.stringify(receivedPhotos),
          requestedStatus === "Shipped" ? trackingUrl : order.tracking_url,
          requestedStatus === "Packed" ? JSON.stringify(handlingInstructions) : null,
          requestedStatus,
          requestedStatus,
          requestedStatus,
          shipmentTracking ? shipmentTracking.courier : order.courier ?? null,
          shipmentTracking ? shipmentTracking.trackingNumber : order.tracking_number ?? null,
          orderId,
          sellerId,
          order.status,
        ],
      );
      if (!result.affectedRows) {
        fail(409, "Order status changed; refresh and try again");
      }

      if (requestedStatus === "Delivered") {
        // Same transaction as the status change: the order can never be
        // Delivered without its proof record, and vice versa.
        await connection.query(
          `INSERT INTO marketplace_order_delivery_proof
             (order_id, seller_id, notes, photo_count)
           VALUES (?, ?, ?, ?)`,
          [orderId, sellerId, deliveryNotes, receivedPhotos.length],
        );
      }

      const [updatedRows] = await connection.query(
        `SELECT delivered_at, DATE_ADD(delivered_at, INTERVAL 7 DAY) AS return_deadline
         FROM marketplace_order WHERE order_id = ? LIMIT 1`,
        [orderId],
      );
      const updatedOrder = updatedRows[0] || {};

      await connection.commit();
      if (requestedStatus === "Delivered") {
        await processDueCertificateDeliveries().catch((certificateError) =>
          console.error("Unable to deliver certificate on order delivery:", certificateError.message),
        );
      }
      await createOrderStatusNotification(orderId, order.customer_id, requestedStatus, Boolean(trackingUrl));
      const resultingPaymentStatus =
        order.payment_method === "cod" && requestedStatus === "Delivered"
          ? "Paid"
          : order.payment_status;
      await logSellerAudit(req.user, {
        action: "UPDATE_ORDER_STATUS",
        information: `Order AM-${String(orderId).padStart(6, "0")} changed from ${order.status} to ${requestedStatus} (total PHP ${Number(order.total_amount).toFixed(2)}, payment ${resultingPaymentStatus}).`,
      });
      return res.json({
        message: "Order status updated",
        status: requestedStatus,
        deliveredAt: updatedOrder.delivered_at ?? null,
        returnDeadline: updatedOrder.return_deadline ?? null,
        paymentStatus:
          order.payment_method === "cod" && requestedStatus === "Delivered"
            ? "Paid"
            : order.payment_status,
        courier: shipmentTracking ? shipmentTracking.courier : order.courier ?? null,
        trackingNumber: shipmentTracking ? shipmentTracking.trackingNumber : order.tracking_number ?? null,
        trackingUrl: requestedStatus === "Shipped" ? trackingUrl : order.tracking_url,
        parcelPhotoCount: parcelPhotos.length,
        receivedPhotoCount: receivedPhotos.length,
        deliveryProof: requestedStatus === "Delivered"
          ? {
              notes: deliveryNotes,
              submittedAt: updatedOrder.delivered_at ?? null,
              photoCount: receivedPhotos.length,
            }
          : undefined,
        handlingInstructions:
          requestedStatus === "Packed"
            ? handlingInstructions
            : Array.isArray(order.handling_instructions)
              ? order.handling_instructions
              : typeof order.handling_instructions === "string"
                ? JSON.parse(order.handling_instructions)
                : [],
      });
    } catch (error) {
      if (connection) await connection.rollback().catch(() => {});
      for (const photo of uploadedPhotos) {
        try {
          await deleteParcelPhoto(photo, orderId);
        } catch (cleanupError) {
          console.error("Unable to remove unused parcel photo:", cleanupError.message);
        }
      }
      const statusCode = error.statusCode || 500;
      console.error("Seller order status update error:", error.message);
      return res.status(statusCode).json({
        message:
          statusCode === 502
            ? "Photos could not be uploaded to cloud storage"
            : statusCode === 500 && error.code === "ENOSPC"
              ? "There is not enough disk space to save photos"
            : error.statusCode
              ? error.message
              : "Unable to save the order update. Please try again.",
      });
    } finally {
      connection?.release();
    }
  },
);

/*
 * Protected delivery-proof image. Only the seller who owns the order can read
 * it here; the buyer has a matching route in routes/buyer/orders.js.
 */
router.get("/:id/received-photos/:index", authenticateSeller, async (req, res) => {
  const orderId = Number(req.params.id);
  const photoIndex = Number(req.params.index);
  if (
    !Number.isSafeInteger(orderId) || orderId <= 0 ||
    !Number.isSafeInteger(photoIndex) || photoIndex < 0
  ) {
    return res.status(400).json({ message: "Invalid delivery photo request" });
  }
  try {
    const [rows] = await db.promise().query(
      `SELECT received_photos FROM marketplace_order
       WHERE order_id = ? AND seller_id = ? LIMIT 1`,
      [orderId, req.user.student_id],
    );
    const photo = rows.length ? parsePhotoList(rows[0].received_photos)[photoIndex] : null;
    if (!photo?.key || !["image/jpeg", "image/png", "image/webp"].includes(photo.contentType)) {
      return res.status(404).json({ message: "Delivery photo not found" });
    }
    const image = await readParcelPhoto(photo, orderId);
    res.set({
      "Cache-Control": "private, max-age=300",
      "Content-Type": photo.contentType,
      "X-Content-Type-Options": "nosniff",
    });
    return res.send(image);
  } catch (error) {
    console.error("Seller delivery photo fetch failed:", error.code || error.message);
    return res.status(500).json({ message: "Unable to load delivery photo" });
  }
});

/*
 * Payout summary: how this seller's share of each buyer payment is doing.
 *
 * Held     paid by the buyer, order not yet delivered/collected
 * Eligible ready to pay out
 * Paid     already settled
 */
router.get("/payouts", authenticateSeller, async (req, res) => {
  res.set("Cache-Control", "no-store");
  try {
    res.json(await payoutService.list({ sellerId: req.user.student_id }));
  } catch (error) {
    console.error("Seller payout summary error:", error.name);
    res.status(error.status || 500).json({ message: error.status ? error.message : "Unable to load payouts." });
  }
});

export default router;
