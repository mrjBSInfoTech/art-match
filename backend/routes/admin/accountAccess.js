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
