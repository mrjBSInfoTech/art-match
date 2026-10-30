import express from "express";
import db from "../../database/db.js";
import { authenticateSeller } from "../../middleware/sellerAuthMiddleware.js";
import { listReturnRequests, transitionReturnRequest, processOrderReturnRefund, ReturnError } from "../../utils/returns.js";
import { logSellerAudit } from "../../utils/auditLogger.js";
import { readParcelPhoto } from "../../utils/parcelPhotoStorage.js";

const router = express.Router();
router.use(authenticateSeller);
router.use((_req, res, next) => { res.set("Cache-Control", "no-store"); next(); });

const handle = (action) => async (req, res) => {
  try { await action(req, res); }
  catch (error) {
    if (error instanceof ReturnError) return res.status(error.status).json({ message: error.message });
    console.error("Seller return error:", error.code || error.name);
    return res.status(500).json({ message: "Unable to process the return request. Please try again." });
  }
};

router.get("/", handle(async (req, res) => {
  const filters = {};
  if (req.query.conversation_id !== undefined) filters.conversationId = req.query.conversation_id;
  if (req.query.order_id !== undefined) filters.orderId = req.query.order_id;
  res.json(await listReturnRequests(db.promise(), "seller", req.user.student_id, filters));
}));

router.get("/:id", handle(async (req, res) => {
  const requests = await listReturnRequests(db.promise(), "seller", req.user.student_id, { requestId: req.params.id });
  res.json(requests[0]);
}));

router.get("/:id/photos/:index", handle(async (req, res) => {
  const requestId = Number(req.params.id);
  const index = Number(req.params.index);
  if (!Number.isSafeInteger(requestId) || requestId <= 0 || !Number.isSafeInteger(index) || index < 0) {
    return res.status(400).json({ message: "Invalid return photo request." });
  }
  const [rows] = await db.promise().query(
    "SELECT order_id, evidence_photos FROM marketplace_return_request WHERE return_request_id = ? AND seller_id = ? LIMIT 1",
    [requestId, req.user.student_id],
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

for (const action of ["approve", "reject", "receive"]) {
  router.put(`/:id/${action}`, handle(async (req, res) => {
    const result = await transitionReturnRequest(
      "seller",
      req.user.student_id,
      req.params.id,
      action,
      req.body,
    );
    const actionLabel = {
      approve: "approved",
      reject: "rejected",
      receive: "marked received",
    }[action];
    await logSellerAudit(req.user, {
      action: `RETURN_${action.toUpperCase()}`,
      information: `Return request ID ${req.params.id} was ${actionLabel}.`,
    });
    res.json(result);
  }));
}

router.post("/:id/refund", handle(async (req, res) => {
  const result = await processOrderReturnRefund(
    "seller",
    req.user.student_id,
    req.params.id,
    { strict: true },
  );
  await logSellerAudit(req.user, {
    action: "RETURN_REFUND_PROCESSED",
    information: `Refund processed/verified for return request ID ${req.params.id} (status: ${result.refund_status}).`,
  });
  res.json(result);
}));

export default router;
