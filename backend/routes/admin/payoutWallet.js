import express from "express";
import { authenticateAdmin } from "../../middleware/adminAuthMiddleware.js";
import { requirePayoutAdmin } from "../../middleware/payoutAdminMiddleware.js";
import { payoutService } from "../../utils/payouts.js";

const router = express.Router();
router.use(authenticateAdmin, requirePayoutAdmin);
router.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

const handle = (callback) => async (req, res) => {
  try {
    res.json(await callback(req));
  } catch (error) {
    console.error("Admin payout wallet request failed:", error.name, error.message);
    res.status(error.status || 500).json({
      message: error.status ? error.message : "Unable to process payout wallet request.",
    });
  }
};

router.get("/", handle((req) => payoutService.getWalletSettings({ adminId: req.user.admin_id })));
router.post("/request", handle((req) => payoutService.requestWalletChange(req.user.admin_id, req.body || {})));
router.post("/request/:id/approve", handle((req) => payoutService.approveWalletChange(req.user.admin_id, req.params.id, req.body || {})));
router.post("/request/:id/reject", handle((req) => payoutService.rejectWalletChange(req.user.admin_id, req.params.id, req.body || {})));
router.post("/request/:id/apply", handle((req) => payoutService.applyWalletChange(req.user.admin_id, req.params.id)));
router.post("/request/:id/cancel", handle((req) => payoutService.cancelWalletChange(req.user.admin_id, req.params.id)));

export default router;

