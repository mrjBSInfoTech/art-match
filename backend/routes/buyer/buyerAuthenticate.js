import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../../database/db.js";
import { authenticateBuyer } from "../../middleware/buyerAuthMiddleware.js";
import { logAudit } from "../../utils/auditLogger.js";

const router = express.Router();

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
    });
  });
});

router.get("/me", authenticateBuyer, (req, res) => {
  db.query(
    "SELECT customer_id, username, first_name, last_name, email, phone_number FROM customer WHERE customer_id = ?",
    [req.user.customer_id],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Database error" });
      if (!result.length) return res.status(404).json({ message: "Buyer not found" });
      res.json(result[0]);
    },
  );
});

router.put("/me", authenticateBuyer, async (req, res) => {
  const fields = ["username", "first_name", "last_name", "email", "phone_number"];
  const updates = fields.filter((field) => Object.hasOwn(req.body, field));
  const values = updates.map((field) => req.body[field]);
  if (req.body.password) {
    updates.push("password");
    values.push(bcrypt.hashSync(req.body.password, 10));
  }
  if (!updates.length) return res.status(400).json({ message: "No profile changes supplied." });

  db.query(
    `UPDATE customer SET ${updates.map((field) => `${field} = ?`).join(", ")} WHERE customer_id = ?`,
    [...values, req.user.customer_id],
    (err) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY") return res.status(409).json({ message: "Username or email already exists." });
        return res.status(500).json({ message: "Database error" });
      }
      res.json({ message: "Buyer profile updated successfully." });
    },
  );
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
