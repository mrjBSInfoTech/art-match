import express from "express";
import db from "../../database/db.js";
import { authenticateBuyer } from "../../middleware/buyerAuthMiddleware.js";
import { createReturnRequest, listReturnRequests, transitionReturnRequest, ReturnError } from "../../utils/returns.js";

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

router.post("/", handle(async (req, res) => {
  res.status(201).json(await createReturnRequest(req.user.customer_id, req.body));
}));

for (const action of ["cancel", "shipped"]) {
  router.put(`/:id/${action}`, handle(async (req, res) => {
    res.json(await transitionReturnRequest("buyer", req.user.customer_id, req.params.id, action, req.body));
  }));
}

export default router;
