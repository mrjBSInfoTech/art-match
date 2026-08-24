import express from "express";
import db from "../../database/db.js";
import { authenticateAdmin } from "../../middleware/adminAuthMiddleware.js";
import { ensureAuditLogsTable } from "../../utils/auditLogger.js";

const router = express.Router();

router.get("/", authenticateAdmin, async (req, res) => {
  const { search = "" } = req.query;
  const query = `%${search}%`;
  const sql = `
    SELECT audit_id, datetime, action, actor, role, status, information
    FROM audit_logs
    WHERE action LIKE ? OR actor LIKE ? OR role LIKE ? OR status LIKE ? OR information LIKE ?
    ORDER BY datetime DESC, audit_id DESC
  `;

  try {
    await ensureAuditLogsTable();
    db.query(sql, [query, query, query, query, query], (error, results) => {
      if (error) return res.status(500).json({ error: error.message });
      res.json(results);
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
