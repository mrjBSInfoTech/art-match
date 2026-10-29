import express from "express";
import { authenticateAdmin } from "../../middleware/adminAuthMiddleware.js";
import { requirePayoutAdmin } from "../../middleware/payoutAdminMiddleware.js";
import { payoutService } from "../../utils/payouts.js";

const router = express.Router();
router.use(authenticateAdmin, requirePayoutAdmin);
router.use((req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
const handle = callback => async (req, res) => {
  try { res.json(await callback(req)); }
  catch (error) {
    console.error("Admin payout request failed:", error.name);
    res.status(error.status || 500).json({ message: error.status ? error.message : "Unable to process this payout." });
  }
};
router.get("/", handle(req => payoutService.list({ adminId: req.user.admin_id })));
router.get("/:id", handle(async req => {
  const payout = (await payoutService.list({ payoutId: req.params.id, adminId: req.user.admin_id })).orders[0];
  if (!payout) { const error = new Error("Payout not found."); error.status = 404; throw error; }
  return { payout };
}));
router.get("/:id/approvals", handle(req => payoutService.approvals(req.params.id, req.user.admin_id)));
router.post("/:id/request", handle(req => payoutService.request(req.params.id, req.user.admin_id, req.body || {})));
router.post("/:id/approve", handle(req => payoutService.approve(req.params.id, req.user.admin_id, req.body || {})));
router.post("/:id/reject", handle(req => payoutService.reject(req.params.id, req.user.admin_id, req.body || {})));
router.post("/:id/release", handle(req => payoutService.release(req.params.id, req.user.admin_id, req.body || {})));
// Retain old clients without leaving a route around the approval gate.
router.post("/:id/send", handle(req => payoutService.send(req.params.id, req.user.admin_id, req.body || {})));
router.post("/:id/reconcile", handle(req => payoutService.reconcile(req.params.id, req.user.admin_id, req.body || {})));
router.post("/:id/refunds/verify", handle(req => payoutService.verifyRefund(req.params.id, req.user.admin_id, req.body || {})));
export default router;
