import express from "express";
import db from "../../database/db.js";
import { authenticateAdmin } from "../../middleware/adminAuthMiddleware.js";
import { addStrike, setBanned } from "../../database/accountAccess.js";
import { requireAdminPermission } from "../../middleware/adminPermissionMiddleware.js";

const router = express.Router();
const validRoles = new Set(["buyer", "seller"]);

router.use(authenticateAdmin);
router.use(requireAdminPermission("can_edit"));

router.get("/", (req, res) => {
  const sql = `
    SELECT 'buyer' AS role, c.customer_id AS account_id,
      c.username, c.email, COALESCE(x.strikes, 0) AS strikes,
      COALESCE(x.is_banned, FALSE) AS is_banned, x.banned_at, x.ban_reason
    FROM customer c
    LEFT JOIN account_access x ON x.role = 'buyer' AND x.account_id = c.customer_id
    UNION ALL
    SELECT 'seller' AS role, s.student_id AS account_id,
      s.student_number AS username, s.email, COALESCE(x.strikes, 0) AS strikes,
      COALESCE(x.is_banned, FALSE) AS is_banned, x.banned_at, x.ban_reason
    FROM student s
    LEFT JOIN account_access x ON x.role = 'seller' AND x.account_id = s.student_id
    ORDER BY role, account_id
  `;
  db.query(sql, (error, results) => {
    if (error) return res.status(500).json({ message: error.message });
    res.json(results);
  });
});

router.get("/reports", (req, res) => {
  const { role = "", search = "" } = req.query;
  if (role && !validRoles.has(role)) {
    return res.status(400).json({ message: "Invalid account role filter." });
  }
  if (typeof search !== "string" || search.length > 200) {
    return res.status(400).json({ message: "Search text must be 200 characters or fewer." });
  }

  const sql = `
    SELECT * FROM (
      SELECT
        sl.strike_log_id AS event_id,
        sl.created_at AS datetime,
        'STRIKE' AS action,
        sl.role,
        sl.account_id,
        COALESCE(NULLIF(TRIM(CONCAT_WS(' ', c.first_name, c.last_name)), ''), c.username,
          NULLIF(TRIM(CONCAT_WS(' ', s.first_name, s.last_name)), ''), s.student_number) AS account_name,
        COALESCE(c.username, s.student_number) AS username,
        COALESCE(c.email, s.email) AS email,
        sl.strike_number,
        sl.reason,
        COALESCE(x.strikes, 0) AS current_strikes,
        COALESCE(x.is_banned, FALSE) AS is_banned,
        sl.admin_id,
        a.username AS admin_username
      FROM strike_logs sl
      LEFT JOIN customer c ON sl.role = 'buyer' AND c.customer_id = sl.account_id
      LEFT JOIN student s ON sl.role = 'seller' AND s.student_id = sl.account_id
      LEFT JOIN account_access x ON x.role = sl.role AND x.account_id = sl.account_id
      LEFT JOIN admin a ON a.admin_id = sl.admin_id

      UNION ALL

      SELECT
        bl.ban_log_id AS event_id,
        bl.created_at AS datetime,
        bl.action,
        bl.role,
        bl.account_id,
        COALESCE(NULLIF(TRIM(CONCAT_WS(' ', c.first_name, c.last_name)), ''), c.username,
          NULLIF(TRIM(CONCAT_WS(' ', s.first_name, s.last_name)), ''), s.student_number) AS account_name,
        COALESCE(c.username, s.student_number) AS username,
        COALESCE(c.email, s.email) AS email,
        NULL AS strike_number,
        bl.reason,
        COALESCE(x.strikes, 0) AS current_strikes,
        COALESCE(x.is_banned, FALSE) AS is_banned,
        bl.admin_id,
        a.username AS admin_username
      FROM ban_logs bl
      LEFT JOIN customer c ON bl.role = 'buyer' AND c.customer_id = bl.account_id
      LEFT JOIN student s ON bl.role = 'seller' AND s.student_id = bl.account_id
      LEFT JOIN account_access x ON x.role = bl.role AND x.account_id = bl.account_id
      LEFT JOIN admin a ON a.admin_id = bl.admin_id
    ) AS access_report
    WHERE (? = '' OR role = ?)
      AND (? = '' OR CONCAT_WS(' ', role, account_id, account_name, username, email,
        action, reason, admin_username) LIKE ?)
    ORDER BY datetime DESC, event_id DESC
  `;
  const searchValue = `%${search}%`;
  db.query(sql, [role, role, search, searchValue], (error, results) => {
    if (error) return res.status(500).json({ message: error.message });
    res.json(results);
  });
});

router.post("/:role/:id/strike", async (req, res) => {
  const { role, id } = req.params;
  if (!validRoles.has(role) || !Number.isInteger(Number(id))) {
    return res.status(400).json({ message: "Invalid account role or ID." });
  }
  try {
    const access = await addStrike(
      role,
      Number(id),
      req.body.reason,
      req.user.admin_id,
    );
    res.json({
      message: access.is_banned
        ? "Third strike applied; account banned."
        : "Strike applied.",
      access,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put("/:role/:id/ban", async (req, res) => {
  const { role, id } = req.params;
  if (!validRoles.has(role) || !Number.isInteger(Number(id))) {
    return res.status(400).json({ message: "Invalid account role or ID." });
  }
  try {
    const access = await setBanned(
      role,
      Number(id),
      req.body.banned !== false,
      req.body.reason,
      req.user.admin_id,
    );
    res.json({
      message: access.is_banned ? "Account banned." : "Account unbanned.",
      access,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
