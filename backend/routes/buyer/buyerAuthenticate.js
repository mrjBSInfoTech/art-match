import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../../database/db.js";
import { authenticateBuyer } from "../../middleware/buyerAuthMiddleware.js";
import { logAudit } from "../../utils/auditLogger.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const profileUploadDir = path.join(
  __dirname,
  "..",
  "..",
  "uploads",
  "buyer",
  "profile",
);
fs.mkdirSync(profileUploadDir, { recursive: true });
const profileUpload = multer({
  storage: multer.diskStorage({
    destination: profileUploadDir,
    filename: (req, file, cb) =>
      cb(
        null,
        `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`,
      ),
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, file.mimetype.startsWith("image/")),
});

// Register route
router.post("/register", (req, res) => {
  const { username, first_name, last_name, email, phone_number, password } =
    req.body;

  if (
    !username ||
    !first_name ||
    !last_name ||
    !email ||
    !phone_number ||
    !password
  ) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);

  const sql =
    "INSERT INTO customer (username, first_name, last_name, email, phone_number, password) VALUES (?, ?, ?, ?, ?, ?)";

  db.query(
    sql,
    [username, first_name, last_name, email, phone_number, hashedPassword],
    (err) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY") {
          return res.status(409).json({ message: "Username already exists" });
        }
        return res.status(500).json({ message: "Database error" });
      }

      res.status(201).json({ message: "User registered successfully" });
    },
  );
});

// Login route
router.post("/login", (req, res) => {
  const { username, password } = req.body;

  const sql = `
  SELECT 
    customer_id, 
    username,
    first_name,
    last_name,
    email,
    phone_number,
    profile_image,
    password,
    COALESCE(x.is_banned, FALSE) AS is_banned
  FROM customer c
  LEFT JOIN account_access x ON x.role = 'buyer' AND x.account_id = c.customer_id
  WHERE c.username = ?`;

  db.query(sql, [username], (err, result) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ message: "Database error" });
    }

    if (result.length === 0) {
      logAudit({
        action: "LOGIN",
        actor: username,
        role: "Customer",
        status: "FAILED",
        information: "Invalid username",
      });
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = result[0];
    if (user.is_banned) {
      return res.status(403).json({ message: "Buyer account is banned." });
    }
    const isMatch = bcrypt.compareSync(password, user.password);

    if (!isMatch) {
      logAudit({
        action: "LOGIN",
        actor: username,
        role: "Customer",
        status: "FAILED",
        information: "Invalid password",
      });
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      {
        id: user.customer_id,
        username: user.username,
      },
      process.env.JWT_SECRET || "your_secret_key",
      { expiresIn: "10d" },
    );

    logAudit({
      action: "LOGIN",
      actor: user.username,
      role: "Customer",
      status: "SUCCESS",
      information: "Customer logged in",
    });
    res.json({
      token,
      customer_id: user.customer_id,
      username: user.username,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      phone_number: user.phone_number,
      profile_image: user.profile_image,
    });
  });
});

router.get("/me", authenticateBuyer, (req, res) => {
  db.query(
    "SELECT customer_id, username, first_name, last_name, email, phone_number, profile_image, is_private FROM customer WHERE customer_id = ?",
    [req.user.customer_id],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Database error" });
      if (!result.length)
        return res.status(404).json({ message: "Buyer not found" });
      res.json(result[0]);
    },
  );
});

router.put(
  "/me",
  authenticateBuyer,
  profileUpload.single("profile_image"),
  async (req, res) => {
    const fields = [
      "username",
      "first_name",
      "last_name",
      "email",
      "phone_number",
    ];
    const updates = fields.filter((field) => Object.hasOwn(req.body, field));
    const values = updates.map((field) => req.body[field]);
    if (Object.hasOwn(req.body, "is_private")) {
      if (typeof req.body.is_private !== "boolean") {
        return res.status(400).json({ message: "Privacy setting must be a boolean." });
      }
      updates.push("is_private");
      values.push(req.body.is_private ? 1 : 0);
    }
    if (req.file) {
      updates.push("profile_image");
      values.push(req.file.filename);
    }
    if (!updates.length)
      return res.status(400).json({ message: "No profile changes supplied." });

    db.query(
      `UPDATE customer SET ${updates.map((field) => `${field} = ?`).join(", ")} WHERE customer_id = ?`,
      [...values, req.user.customer_id],
      (err) => {
        if (err) {
          if (err.code === "ER_DUP_ENTRY")
            return res
              .status(409)
              .json({ message: "Username or email already exists." });
          return res.status(500).json({ message: "Database error" });
        }
        res.json({
          message: "Buyer profile updated successfully.",
          profile_image: req.file?.filename,
        });
      },
    );
  },
);

router.put("/change-password", authenticateBuyer, async (req, res) => {
  const currentPassword = String(req.body.currentPassword || "");
  const newPassword = String(req.body.newPassword || "");

  if (!currentPassword || newPassword.length < 8 || newPassword.length > 128) {
    return res.status(400).json({
      message: "Enter your current password and a new password of at least 8 characters.",
    });
  }

  try {
    const [rows] = await db.promise().query(
      "SELECT password FROM customer WHERE customer_id = ? LIMIT 1",
      [req.user.customer_id],
    );
    if (!rows.length) {
      return res.status(404).json({ message: "Buyer not found." });
    }
    if (!(await bcrypt.compare(currentPassword, rows[0].password))) {
      return res.status(400).json({ message: "Current password is incorrect." });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.promise().query(
      "UPDATE customer SET password = ? WHERE customer_id = ?",
      [passwordHash, req.user.customer_id],
    );
    res.json({ message: "Password changed successfully." });
  } catch (error) {
    console.error("Buyer password change failed:", error);
    res.status(500).json({ message: "Unable to change password." });
  }
});

router.post("/logout", authenticateBuyer, async (req, res) => {
  try {
    await logAudit({
      action: "LOGOUT",
      actor: req.user.username || req.user.customer_id,
      role: "Customer",
      status: "SUCCESS",
      information: "Customer logged out",
    });
    res.json({ message: "Logout recorded" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Unable to record logout", error: error.message });
  }
});

export default router;
