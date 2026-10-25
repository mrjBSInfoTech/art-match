import express from "express";
import multer from "multer";
import db from "../../database/db.js";
import { authenticateSeller } from "../../middleware/sellerAuthMiddleware.js";
import {
  deleteParcelPhoto,
  saveParcelPhoto,
} from "../../utils/parcelPhotoStorage.js";
import { isB2Configured } from "../../utils/b2Storage.js";
import {
  normalizeTrackingUrl,
  validateParcelPhotoCount,
} from "../../utils/parcelShipment.js";

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

const createOrderStatusNotification = (orderId, buyerId, status) =>
  new Promise((resolve) => {
    const orderLabel = `AM-${String(orderId).padStart(6, "0")}`;
    const statusMessages = {
      Confirmed: `Your order ${orderLabel} has been confirmed and is now being prepared.`,
      Packed: `Your order ${orderLabel} has been packed and is ready for shipment.`,
      Shipped: `Your order ${orderLabel} has shipped and is on the way.`,
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
  db.query(
    `SELECT
       o.order_id, CONCAT('AM-', LPAD(o.order_id, 6, '0')) AS order_number,
       o.created_at, o.status, o.payment_method, o.subtotal, o.shipping_fee,
       o.total_amount, o.buyer_name, o.buyer_email, c.phone_number AS buyer_phone,
       o.shipping_street,
       o.shipping_barangay, o.shipping_city, o.shipping_province,
       o.shipping_region, o.shipping_postal_code, o.parcel_photos,
       o.tracking_url, o.handling_instructions, i.order_item_id,
       i.artwork_id, i.title, i.artist_name, i.image, i.unit_price, i.quantity
     FROM marketplace_order o
     LEFT JOIN marketplace_order_item i ON i.order_id = o.order_id
     LEFT JOIN customer c ON c.customer_id = o.customer_id
     WHERE o.seller_id = ?
     ORDER BY o.created_at DESC, o.order_id DESC, i.order_item_id`,
    [req.user.student_id],
    (err, rows) => {
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
            payment: row.payment_method,
            subtotal: Number(row.subtotal),
            shipping: Number(row.shipping_fee),
            total: Number(row.total_amount),
            trackingUrl: row.tracking_url,
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
          });
        }
      });
      res.json([...orders.values()]);
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
        `SELECT status, customer_id, parcel_photos, tracking_url, handling_instructions
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

      if (requestedStatus === "Packed") {
        try {
          validateParcelPhotoCount(files);
        } catch (error) {
          fail(400, error.message);
        }
      }
      if (requestedStatus !== "Packed" && files.length) {
        fail(400, "Parcel photos can only be uploaded when marking the order Packed");
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

      let trackingUrl;
      try {
        trackingUrl = normalizeTrackingUrl(req.body.tracking_url);
      } catch (error) {
        fail(400, error.message);
      }
      if (requestedStatus !== "Shipped" && trackingUrl) {
        fail(400, "A tracking link can only be added when marking the order Shipped");
      }

      let parcelPhotos = existingPhotos;
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
      }

      const [result] = await connection.query(
        `UPDATE marketplace_order
         SET status = ?, parcel_photos = ?, tracking_url = ?,
             handling_instructions = COALESCE(?, handling_instructions)
         WHERE order_id = ? AND seller_id = ? AND status = ?`,
        [
          requestedStatus,
          JSON.stringify(parcelPhotos),
          requestedStatus === "Shipped" ? trackingUrl : order.tracking_url,
          requestedStatus === "Packed" ? JSON.stringify(handlingInstructions) : null,
          orderId,
          sellerId,
          order.status,
        ],
      );
      if (!result.affectedRows) {
        fail(409, "Order status changed; refresh and try again");
      }

      await connection.commit();
      await createOrderStatusNotification(orderId, order.customer_id, requestedStatus);
      return res.json({
        message: "Order status updated",
        status: requestedStatus,
        trackingUrl: requestedStatus === "Shipped" ? trackingUrl : order.tracking_url,
        parcelPhotoCount: parcelPhotos.length,
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
            ? "Parcel photos could not be uploaded to cloud storage"
            : statusCode === 500 && error.code === "ENOSPC"
              ? "There is not enough disk space to save parcel photos"
            : error.statusCode
              ? error.message
              : "Unable to save parcel photos. Please try again.",
      });
    } finally {
      connection?.release();
    }
  },
);

export default router;