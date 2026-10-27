import express from "express";
import db from "../../database/db.js";
import { authenticateSeller } from "../../middleware/sellerAuthMiddleware.js";

const router = express.Router();

router.get("/", authenticateSeller, (req, res) => {
  const actors = [...new Set(
    [req.user.student_number, req.user.student_id]
      .filter((actor) => actor !== undefined && actor !== null)
      .map(String),
  )];
  if (!actors.length) {
    return res.status(403).json({ message: "Unable to identify seller." });
  }

  res.set("Cache-Control", "no-store");
  db.query(
    `SELECT audit_id, datetime, action, actor, role, status, information
     FROM audit_logs
     WHERE role IN ('Student', 'seller') AND actor IN (?)
     ORDER BY datetime DESC, audit_id DESC`,
    [actors],
    (error, rows) => {
      if (error) {
        console.error("Unable to load seller audit logs:", error.message);
        return res.status(500).json({ message: "Unable to load your audit logs." });
      }
      res.json(rows);
    },
  );
});

export default router;
