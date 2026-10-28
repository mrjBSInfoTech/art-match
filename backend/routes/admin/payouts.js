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
router.get("/", handle(() => payoutService.list()));
router.get("/:id", handle(async req => {
  const payout = (await payoutService.list({ payoutId: req.params.id })).orders[0];
  if (!payout) { const error = new Error("Payout not found."); error.status = 404; throw error; }
  return { payout };
}));
router.post("/:id/send", handle(req => payoutService.send(req.params.id, req.user.admin_id, req.body || {})));
router.post("/:id/reconcile", handle(req => payoutService.reconcile(req.params.id, req.user.admin_id, req.body || {})));
router.post("/:id/refunds/verify", handle(req => payoutService.verifyRefund(req.params.id, req.user.admin_id, req.body || {})));
export default router;
