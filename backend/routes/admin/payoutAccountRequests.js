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
    console.error("Payout account change request failed:", error.name);
    res.status(error.status || 500).json({ message: error.status ? error.message : "Unable to process payout account request." });
  }
};

router.get("/", handle(req => payoutService.listAccountRequests({ adminId: req.user.admin_id, status: req.query.status })));
router.post("/:id/approve", handle(req => payoutService.approveAccountRequest(req.params.id, req.user.admin_id, req.body || {})));
router.post("/:id/reject", handle(req => payoutService.rejectAccountRequest(req.params.id, req.user.admin_id, req.body || {})));

export default router;

