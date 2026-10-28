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
import { listFaqs, replaceFaqs } from "../../database/faq.js";
import { logAudit } from "../../utils/auditLogger.js";

const router = express.Router();

const MAX_FAQS = 50;
const MAX_QUESTION_LENGTH = 255;
const MAX_ANSWER_LENGTH = 5000;

function validateFaqs(faqs) {
  if (!Array.isArray(faqs)) {
    return "FAQ list must be an array.";
  }
  if (faqs.length > MAX_FAQS) {
    return `You can add up to ${MAX_FAQS} frequently asked questions.`;
  }
  for (const [index, faq] of faqs.entries()) {
    if (!faq || typeof faq !== "object" || Array.isArray(faq)) {
      return `FAQ ${index + 1} is not valid.`;
    }
    const question = typeof faq.question === "string" ? faq.question.trim() : "";
    const answer = typeof faq.answer === "string" ? faq.answer.trim() : "";
    if (!question) {
      return `FAQ ${index + 1}: the question is required.`;
    }
    if (question.length > MAX_QUESTION_LENGTH) {
      return `FAQ ${index + 1}: the question must be ${MAX_QUESTION_LENGTH} characters or fewer.`;
    }
    if (!answer) {
      return `FAQ ${index + 1}: the answer is required.`;
    }
    if (answer.length > MAX_ANSWER_LENGTH) {
      return `FAQ ${index + 1}: the answer must be ${MAX_ANSWER_LENGTH} characters or fewer.`;
    }
  }
  return null;
}

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

router.get("/faqs", authenticateAdmin, async (_req, res) => {
  try {
    const faqs = await listFaqs();
    return res.json({ faqs });
  } catch (error) {
    console.error("Unable to load FAQs:", error.code || error.name);
    return res.status(500).json({ message: "Unable to load FAQs." });
  }
});

router.put(
  "/faqs",
  authenticateAdmin,
  requireAdminPermission("can_edit"),
  async (req, res) => {
    const validationError = validateFaqs(req.body?.faqs);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const faqs = req.body.faqs.map(({ question, answer }) => ({
      question: question.trim(),
      answer: answer.trim(),
    }));

    try {
      const savedFaqs = await replaceFaqs(faqs);
      try {
        await logAudit({
          action: "UPDATE_FAQ_ENTRIES",
          actor: req.user.username || req.user.admin_id,
          role: req.user.role || "Admin",
          status: "SUCCESS",
          information: `FAQ entries updated (${savedFaqs.length} item(s)).`,
        });
      } catch (auditError) {
        console.error("FAQs saved but audit logging failed:", auditError.message);
      }
      return res.json({ message: "FAQs saved.", faqs: savedFaqs });
    } catch (error) {
      console.error("Unable to save FAQs:", error.code || error.name);
      return res.status(500).json({ message: "Unable to save FAQs." });
    }
  },
);

export default router;
