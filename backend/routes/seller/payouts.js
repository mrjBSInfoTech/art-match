import express from "express";
import { authenticateSeller } from "../../middleware/sellerAuthMiddleware.js";
import { payoutService } from "../../utils/payouts.js";
import { listPayoutInstitutions } from "../../utils/paymongoPayouts.js";

const router = express.Router();
router.use(authenticateSeller);
router.use((req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
const handle = callback => async (req, res) => {
  try { res.json(await callback(req)); }
  catch (error) {
    console.error("Seller payout request failed:", error.name);
    res.status(error.status || 500).json({ message: error.status ? error.message : "Unable to update payout settings." });
  }
};
router.get("/institutions", handle(async () => ({ institutions: await listPayoutInstitutions(), capability: await payoutService.capability() })));
router.get("/", handle(req => payoutService.getAccount(req.user.student_id)));
router.put("/", handle(req => payoutService.saveAccount(req.user.student_id, req.body)));
export default router;
