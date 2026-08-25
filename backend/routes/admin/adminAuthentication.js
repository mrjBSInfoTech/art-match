import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../../database/db.js";
import { logAudit } from "../../utils/auditLogger.js";
import { authenticateAdmin } from "../../middleware/adminAuthMiddleware.js";

const router = express.Router();

// Login route
router.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ message: "Username and password are required" });
  }

  const sql = `
  SELECT * FROM admin 
  WHERE username = ?`;

  db.query(sql, [username], (err, result) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ message: "Database error" });
    }

    if (result.length === 0) {
      logAudit({
        action: "LOGIN",
        actor: username,
        role: "Admin",
        status: "FAILED",
        information: "Invalid username",
      });
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = result[0];
    const isMatch = bcrypt.compareSync(password, user.password);

    if (!isMatch) {
      logAudit({
        action: "LOGIN",
        actor: username,
        role: "Admin",
        status: "FAILED",
        information: "Invalid password",
      });
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      {
        id: user.admin_id,
        admin_id: user.admin_id,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        image: user.image,
        email: user.email,
        role: user.role,
        can_add: user.can_add,
        can_edit: user.can_edit,
        can_delete: user.can_delete,
        password_changed: user.password_changed,
        date_created: user.date_created,
      },
      process.env.JWT_SECRET || "your_secret_key",
      { expiresIn: "10d" },
    );

    logAudit({
      action: "LOGIN",
      actor: user.username,
      role: "Admin",
      status: "SUCCESS",
      information: "Admin logged in",
    });
    res.json({
      token,
      admin_id: user.admin_id,
      username: user.username,
      first_name: user.first_name,
      last_name: user.last_name,
      image: user.image,
      email: user.email,
      role: user.role,
      can_add: user.can_add,
      can_edit: user.can_edit,
      can_delete: user.can_delete,
      password_changed: user.password_changed,
      date_created: user.date_created,
    });
  });
});

router.post("/logout", authenticateAdmin, async (req, res) => {
  try {
    await logAudit({
      action: "LOGOUT",
      actor: req.user.username || req.user.admin_id,
      role: req.user.role || "Admin",
      status: "SUCCESS",
      information: "Admin logged out",
    });
    res.json({ message: "Logout recorded" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Unable to record logout", error: error.message });
  }
});

router.post("/verify-password", authenticateAdmin, async (req, res) => {
  const { password } = req.body;
  const adminId = req.user?.admin_id;

  if (!adminId || !password) {
    logAudit({
      action: "UPDATE_ACCOUNT_INFORMATION",
      actor: req.user?.username || adminId,
      role: req.user?.role || "Admin",
      status: "FAILED",
      information: "Password confirmation was not provided",
    }).catch((auditError) =>
      console.error(
        "Unable to record password verification audit:",
        auditError.message,
      ),
    );
    return res.status(400).json({ message: "Password is required." });
  }

  try {
    const user = await new Promise((resolve, reject) => {
      db.query(
        "SELECT password FROM admin WHERE admin_id = ?",
        [adminId],
        (error, results) => {
          if (error) return reject(error);
          resolve(results[0]);
        },
      );
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      logAudit({
        action: "UPDATE_ACCOUNT_INFORMATION",
        actor: req.user?.username || adminId,
        role: req.user?.role || "Admin",
        status: "FAILED",
        information: "Incorrect password confirmation",
      }).catch((auditError) =>
        console.error(
          "Unable to record password verification audit:",
          auditError.message,
        ),
      );
      return res.status(401).json({ message: "Incorrect password." });
    }

    res.json({ message: "Password verified." });
  } catch (error) {
    res.status(500).json({ message: "Unable to verify password." });
  }
});

router.put("/change-password", authenticateAdmin, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const adminId = req.user?.admin_id;

  if (!adminId || !currentPassword || !newPassword) {
    return res.status(400).json({
      message: "Current password and new password are required.",
    });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({
      message: "New password must be at least 8 characters long.",
    });
  }

  try {
    const user = await new Promise((resolve, reject) => {
      db.query(
        "SELECT password FROM admin WHERE admin_id = ?",
        [adminId],
        (error, results) => {
          if (error) return reject(error);
          resolve(results[0]);
        },
      );
    });

    if (!user) {
      return res.status(404).json({ message: "Admin account not found." });
    }

    const currentPasswordMatches = await bcrypt.compare(
      currentPassword,
      user.password,
    );
    if (!currentPasswordMatches) {
      return res
        .status(401)
        .json({ message: "Current password is incorrect." });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        message: "New password must be different from the current password.",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await new Promise((resolve, reject) => {
      db.query(
        "UPDATE admin SET password = ?, password_changed = password_changed + 1 WHERE admin_id = ?",
        [hashedPassword, adminId],
        (error) => (error ? reject(error) : resolve()),
      );
    });

    res.json({
      message: "Password changed successfully.",
      password_changed: 1,
    });
  } catch (error) {
    console.error("Error changing admin password:", error);
    res.status(500).json({ message: "Unable to change password." });
  }
});

export default router;
