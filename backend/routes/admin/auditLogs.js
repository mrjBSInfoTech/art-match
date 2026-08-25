import express from "express";
import db from "../../database/db.js";
import { authenticateAdmin } from "../../middleware/adminAuthMiddleware.js";
import { ensureAuditLogsTable } from "../../utils/auditLogger.js";

const router = express.Router();

router.get("/", authenticateAdmin, async (req, res) => {
  const { search = "", date = "", period = "all" } = req.query;
  const searchValue = `%${search}%`;

  try {
    await ensureAuditLogsTable();

    let sql = `
      SELECT audit_id, datetime, action, actor, role, status, information
      FROM audit_logs
      WHERE 1 = 1
    `;
    const params = [];

    if (search) {
      sql += `
        AND (
          action LIKE ? OR actor LIKE ? OR role LIKE ? OR status LIKE ? OR information LIKE ?
        )
      `;
      params.push(
        searchValue,
        searchValue,
        searchValue,
        searchValue,
        searchValue,
      );
    }

    if (date) {
      sql += ` AND DATE(datetime) = ? `;
      params.push(date);
    }

    const periodIntervals = {
      hour: "1 HOUR",
      day: "1 DAY",
      week: "1 WEEK",
      month: "1 MONTH",
      year: "1 YEAR",
    };
    if (periodIntervals[period]) {
      sql += ` AND datetime >= DATE_SUB(NOW(), INTERVAL ${periodIntervals[period]}) `;
    }

    sql += ` ORDER BY datetime DESC, audit_id DESC `;

    db.query(sql, params, (error, results) => {
      if (error) return res.status(500).json({ error: error.message });
      res.json(results);
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
