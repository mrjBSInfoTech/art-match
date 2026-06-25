import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../database/db.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();
// Login route
router.post("/login", (req, res) => {
  const { username, password } = req.body;

  const sql = `
  SELECT 
    oa.official_account_id, 
    oa.username, 
    oa.password, 
    oa.account_type, 
    oa.can_add, 
    oa.can_edit, 
    oa.can_delete,
    oa.password_changed,
    o.first_name, 
    o.last_name, 
    o.position,
    o.image
  FROM official_account oa
  INNER JOIN official o ON oa.official_account_id = o.official_account_id
  WHERE oa.username = ?`;

  db.query(sql, [username], (err, result) => {
    if (err) return res.status(500).json({ message: "Database error" });

    if (result.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = result[0];
    const isMatch = bcrypt.compareSync(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      {
        id: user.official_account_id,
        username: user.username,
        account_type: user.account_type,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
    );

    res.json({
      token,
      official_account_id: user.official_account_id,
      username: user.username,
      account_type: user.account_type,
      first_name: user.first_name,
      last_name: user.last_name,
      position: user.position,
      image: user.image,
      can_add: user.can_add,
      can_edit: user.can_edit,
      can_delete: user.can_delete,
      password_changed: user.password_changed,
    });
  });
});

// Change password
router.put("/changePassword", authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Current and new passwords are required" });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  // First, get the user's current password to verify
  db.query(
    "SELECT password FROM official_account WHERE official_account_id = ?",
    [userId],
    async (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      
      if (result.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      // Verify current password
      const isMatch = bcrypt.compareSync(currentPassword, result[0].password);
      if (!isMatch) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Build dynamic update query (similar to officialAccount.js pattern)
      const updates = [];
      const values = [];

      updates.push("password = ?");
      values.push(hashedPassword);

      updates.push("password_changed = password_changed + 1");

      values.push(userId);

      const sql = `UPDATE official_account SET ${updates.join(", ")} WHERE official_account_id = ?`;

      db.query(sql, values, (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "✅ Password updated successfully" });
      });
    }
  );
});

export default router;
