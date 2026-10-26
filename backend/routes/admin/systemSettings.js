import express from "express";
import { authenticateAdmin } from "../../middleware/adminAuthMiddleware.js";
import { requireAdminPermission } from "../../middleware/adminPermissionMiddleware.js";
import {
  getAccountExpirationDate,
  updateAccountExpirationDate,
} from "../../database/systemSettings.js";

const router = express.Router();

router.get("/account-expiration", authenticateAdmin, (_req, res) => {
  getAccountExpirationDate((error, date) => {
    if (error) {
      console.error("Unable to load account expiration date:", error);
      return res.status(500).json({ message: "Unable to load account expiration date." });
    }
    return res.json({ date });
  });
});

router.put(
  "/account-expiration",
  authenticateAdmin,
  requireAdminPermission("can_edit"),
  async (req, res) => {
    const date = req.body?.date;
    if (typeof date !== "string") {
      return res.status(400).json({
        message: "Choose a valid expiration date.",
      });
    }

    try {
      const updatedAccounts = await updateAccountExpirationDate(date);
      return res.json({ date, updatedAccounts });
    } catch (error) {
      if (error.status === 400) {
        return res.status(400).json({ message: error.message });
      }
      console.error("Unable to update account expiration date:", error);
      return res.status(500).json({ message: "Unable to update account expiration date." });
    }
  },
);

export default router;
