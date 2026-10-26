import express from "express";
import db from "../../database/db.js";
import { authenticateSeller } from "../../middleware/sellerAuthMiddleware.js";
import { listReturnRequests, transitionReturnRequest, ReturnError } from "../../utils/returns.js";

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

for (const action of ["approve", "reject", "receive"]) {
  router.put(`/:id/${action}`, handle(async (req, res) => {
    res.json(await transitionReturnRequest("seller", req.user.student_id, req.params.id, action, req.body));
  }));
}

export default router;
