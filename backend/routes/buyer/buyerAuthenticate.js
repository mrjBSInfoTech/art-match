import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../../database/db.js";

const router = express.Router();

// Register route
router.post("/register", (req, res) => {
  const {
    username,
    first_name,
    last_name,
    email,
    phone_number,
    password,
  } = req.body;

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
    [
      username,
      first_name,
      last_name,
      email,
      phone_number,
      hashedPassword,
    ],
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
    password
  FROM customer 
  WHERE username = ?`;

  db.query(sql, [username], (err, result) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ message: "Database error" });
    }

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
        id: user.customer_id,
        username: user.username,
      },
      process.env.JWT_SECRET || "your_secret_key",
      { expiresIn: "10d" },
    );

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

export default router;
