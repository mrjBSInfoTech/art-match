import express from "express";
import db from "../../database/db.js";
import { authenticateAdmin } from "../../middleware/adminAuthMiddleware.js";
import { requireAdminPermission } from "../../middleware/adminPermissionMiddleware.js";

const router = express.Router();
const editableFields = [
  "username",
  "first_name",
  "last_name",
  "email",
  "phone_number",
];
const selectFields =
  "customer_id, username, first_name, last_name, email, phone_number";

router.get("/", authenticateAdmin, (req, res) => {
  db.query(
    `SELECT ${selectFields}, COALESCE(x.strikes, 0) AS strikes,
      COALESCE(x.is_banned, FALSE) AS is_banned
     FROM customer c
     LEFT JOIN account_access x ON x.role = 'buyer' AND x.account_id = c.customer_id
     ORDER BY c.customer_id ASC`,
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
    },
  );
});

router.get("/:id", authenticateAdmin, (req, res) => {
  db.query(
    `SELECT ${selectFields} FROM customer WHERE customer_id = ?`,
    [req.params.id],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      if (results.length === 0)
        return res.status(404).json({ error: "Customer not found" });
      res.json(results[0]);
    },
  );
});

router.put(
  "/:id",
  authenticateAdmin,
  requireAdminPermission("can_edit"),
  (req, res) => {
    const fields = editableFields.filter((field) =>
      Object.prototype.hasOwnProperty.call(req.body, field),
    );
    if (fields.length === 0)
      return res
        .status(400)
        .json({ error: "At least one customer field is required" });

    const sql = `UPDATE customer SET ${fields.map((field) => `${field} = ?`).join(", ")} WHERE customer_id = ?`;
    db.query(
      sql,
      [...fields.map((field) => req.body[field] || null), req.params.id],
      (err, result) => {
        if (err) {
          if (err.code === "ER_DUP_ENTRY")
            return res
              .status(409)
              .json({ error: "Username or email already exists" });
          return res.status(500).json({ error: err.message });
        }
        res.json({ message: "Customer updated successfully" });
      },
    );
  },
);

router.delete(
  "/:id",
  authenticateAdmin,
  requireAdminPermission("can_delete"),
  (req, res) => {
    db.query(
      "DELETE FROM customer WHERE customer_id = ?",
      [req.params.id],
      (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.affectedRows === 0)
          return res.status(404).json({ error: "Customer not found" });
        res.json({ message: "Customer deleted successfully" });
      },
    );
  },
);

export default router;
