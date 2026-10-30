import express from "express";
import multer from "multer";
import db from "../../database/db.js";
import { authenticateBuyer } from "../../middleware/buyerAuthMiddleware.js";
import { createReturnRequest, listReturnRequests, transitionReturnRequest, ReturnError } from "../../utils/returns.js";
import { saveParcelPhoto, deleteParcelPhoto, readParcelPhoto } from "../../utils/parcelPhotoStorage.js";

const router = express.Router();
router.use(authenticateBuyer);
router.use((req, res, next) => {
  // Legacy buyer tokens use {id, username}. Seller/admin JWTs carry their own
  // identity markers; never reinterpret those numeric IDs as return buyers.
  if (req.user.student_id != null || req.user.student_number != null || req.user.admin_id != null) {
    return res.status(403).json({ message: "Only the buyer can create or manage a buyer return request." });
  }
  res.set("Cache-Control", "no-store");
  next();
});

const evidencePhotoTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);
// Optional return evidence photos (0–5). JSON requests skip multer entirely.
const evidenceUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
  fileFilter: (_req, file, callback) => {
    if (!evidencePhotoTypes.has(file.mimetype)) {
      return callback(new Error("Return photos must be JPEG, PNG, or WebP images."));
    }
    callback(null, true);
  },
});
const evidenceMiddleware = (req, res, next) => {
  if (!req.is("multipart/form-data")) return next();
  evidenceUpload.array("evidence_photos", 5)(req, res, (error) => {
    if (!error) return next();
    const message = error.code === "LIMIT_FILE_SIZE"
      ? "Each return photo must be 5 MB or smaller."
      : error.code === "LIMIT_FILE_COUNT" || error.code === "LIMIT_UNEXPECTED_FILE"
        ? "Upload no more than 5 return photos."
        : error.message;
    return res.status(400).json({ message });
  });
};

const handle = (action) => async (req, res) => {
  try { await action(req, res); }
  catch (error) {
    if (error instanceof ReturnError) return res.status(error.status).json({ message: error.message });
    console.error("Buyer return error:", error.code || error.name);
    return res.status(500).json({ message: "Unable to process the return request. Please try again." });
  }
};

router.get("/", handle(async (req, res) => {
  const filters = {};
  if (req.query.conversation_id !== undefined) filters.conversationId = req.query.conversation_id;
  if (req.query.order_id !== undefined) filters.orderId = req.query.order_id;
  res.json(await listReturnRequests(db.promise(), "buyer", req.user.customer_id, filters));
}));

router.get("/:id", handle(async (req, res) => {
  const requests = await listReturnRequests(db.promise(), "buyer", req.user.customer_id, { requestId: req.params.id });
  res.json(requests[0]);
}));

router.get("/:id/photos/:index", handle(async (req, res) => {
  const requestId = Number(req.params.id);
  const index = Number(req.params.index);
  if (!Number.isSafeInteger(requestId) || requestId <= 0 || !Number.isSafeInteger(index) || index < 0) {
    return res.status(400).json({ message: "Invalid return photo request." });
  }
  const [rows] = await db.promise().query(
    "SELECT order_id, evidence_photos FROM marketplace_return_request WHERE return_request_id = ? AND customer_id = ? LIMIT 1",
    [requestId, req.user.customer_id],
  );
  const photos = rows[0]
    ? (typeof rows[0].evidence_photos === "string" ? JSON.parse(rows[0].evidence_photos) : rows[0].evidence_photos) || []
    : [];
  const photo = photos[index];
  if (!photo?.key) return res.status(404).json({ message: "Return photo not found." });
  const image = await readParcelPhoto(photo, rows[0].order_id);
  res.set({ "Cache-Control": "private, max-age=300", "Content-Type": photo.contentType, "X-Content-Type-Options": "nosniff" });
  res.send(image);
}));

router.post("/", evidenceMiddleware, handle(async (req, res) => {
  const files = req.files || [];
  const body = { ...(req.body || {}) };
  if (typeof body.order_item_ids === "string") {
    try { body.order_item_ids = JSON.parse(body.order_item_ids); }
    catch { return res.status(400).json({ message: "Select at least one item to return." }); }
  }
  const saved = [];
  try {
    if (files.length) {
      // Verify ownership before writing any file to storage.
      const orderId = Number(body.order_id);
      const [owned] = await db.promise().query(
        "SELECT order_id FROM marketplace_order WHERE order_id = ? AND customer_id = ? LIMIT 1",
        [Number.isSafeInteger(orderId) ? orderId : 0, req.user.customer_id],
      );
      if (!owned.length) return res.status(404).json({ message: "Order not found." });
      for (const file of files) {
        saved.push(await saveParcelPhoto({
          orderId,
          buffer: file.buffer,
          contentType: file.mimetype,
          extension: evidencePhotoTypes.get(file.mimetype),
        }));
      }
    }
    res.status(201).json(await createReturnRequest(req.user.customer_id, body, saved));
  } catch (error) {
    for (const photo of saved) {
      await deleteParcelPhoto(photo, Number(body.order_id)).catch(() => {});
    }
    throw error;
  }
}));

for (const action of ["cancel", "shipped"]) {
  router.put(`/:id/${action}`, handle(async (req, res) => {
    res.json(await transitionReturnRequest("buyer", req.user.customer_id, req.params.id, action, req.body));
  }));
}

export default router;
