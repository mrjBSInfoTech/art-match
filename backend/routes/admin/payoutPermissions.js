import express from "express";
import { authenticateAdmin } from "../../middleware/adminAuthMiddleware.js";
import { allowPayoutAdminOrApplicant } from "../../middleware/payoutAdminMiddleware.js";
import { payoutService } from "../../utils/payouts.js";

const router = express.Router();
router.use(authenticateAdmin, allowPayoutAdminOrApplicant);
router.use((req, res, next) => { res.set("Cache-Control", "no-store"); next(); });

const handle = callback => async (req, res) => {
  try { res.json(await callback(req)); }
  catch (error) {
    console.error("Admin payout permission request failed:", error.name);
    res.status(error.status || 500).json({ message: error.status ? error.message : "Unable to process payout permission request." });
  }
};

router.get("/status", handle(req => payoutService.getAdminPermissionStatus(req.user.admin_id)));
router.post("/request", handle(req => payoutService.requestAdminPayoutPermission(req.user.admin_id, req.body || {})));
router.get("/", handle(req => payoutService.listAdminPermissionRequests(req.user.admin_id)));
router.post("/:id/approve", handle(req => payoutService.approveAdminPermissionRequest(req.user.admin_id, req.params.id)));
router.post("/:id/reject", handle(req => payoutService.rejectAdminPermissionRequest(req.user.admin_id, req.params.id, req.body || {})));

export default router;

