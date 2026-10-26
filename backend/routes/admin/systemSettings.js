import express from "express";
import db from "../../database/db.js";
import { authenticateAdmin } from "../../middleware/adminAuthMiddleware.js";
import { requireAdminPermission } from "../../middleware/adminPermissionMiddleware.js";
import {
  getAccountExpirationDate,
  getPromotionHeroEnabled,
  updateAccountExpirationDate,
} from "../../database/systemSettings.js";
import { lockPromotionSlides } from "../../database/promotionSlides.js";

const router = express.Router();

router.get("/promotion-hero", authenticateAdmin, async (_req, res) => {
  try {
    const enabled = await getPromotionHeroEnabled();
    return res.json({ enabled });
  } catch (error) {
    console.error("Unable to load promotion hero setting:", error.code || error.name);
    return res.status(500).json({ message: "Unable to load promotion hero setting." });
  }
});

router.put(
  "/promotion-hero",
  authenticateAdmin,
  requireAdminPermission("can_edit"),
  async (req, res) => {
    if (typeof req.body?.enabled !== "boolean") {
      return res.status(400).json({ message: "Choose whether the default hero slide is enabled." });
    }
    let connection;
    try {
      connection = await db.promise().getConnection();
      await connection.beginTransaction();
      if (!req.body.enabled) {
        await lockPromotionSlides(connection);
        const [visibleSlides] = await connection.query(
          `SELECT COUNT(*) AS slide_count
           FROM promotion_slides
           WHERE status = 'Published'
             AND (student_id IS NULL OR published_until IS NULL
                  OR published_until > CURRENT_TIMESTAMP)`,
        );
        if (Number(visibleSlides[0]?.slide_count) < 1) {
          await connection.rollback();
          return res.status(409).json({
            message: "Publish at least one promotion slide before turning off the default hero.",
          });
        }
      }
      const enabled = req.body.enabled;
      await connection.query(
        `INSERT INTO system_settings (setting_key, setting_value)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
        ["promotion_hero_enabled", enabled ? "1" : "0"],
      );
      await connection.commit();
      return res.json({ enabled });
    } catch (error) {
      if (connection) await connection.rollback().catch(() => {});
      console.error("Unable to update promotion hero setting:", error.code || error.name);
      return res.status(500).json({ message: "Unable to update promotion hero setting." });
    } finally {
      connection?.release();
    }
  },
);

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
