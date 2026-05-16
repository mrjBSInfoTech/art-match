import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../database/db.js";

const router = express.Router();

// Register route
router.post("/register", (req, res) => {
  const { first_name, last_name, email, contact, password } = req.body;

  if (!first_name || !last_name || !email || !contact || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);

  const sql = "INSERT INTO user_account (first_name, last_name, email, contact, password) VALUES (?, ?, ?, ?, ?)";
  
  db.query(sql, [first_name, last_name, email, contact, hashedPassword], (err) => {
    if (err) {
      if (err.code === "ER_DUP_ENTRY") {
        return res.status(409).json({ message: "Email already exists" });
      }
      return res.status(500).json({ message: "Database error" });
    }

    res.status(201).json({ message: "User registered successfully" });
  });
});

// Login route
router.post("/login", (req, res) => {
  const { email, password } = req.body;

  const sql = `
  SELECT 
    user_id, 
    first_name,
    last_name,
    email,
    contact,
    password,
    type
  FROM user_account 
  WHERE email = ?`;

  db.query(sql, [email], (err, result) => {
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
        id: user.user_id,
        email: user.email,
        type: user.type,
      },
      process.env.JWT_SECRET,
      { expiresIn: "10d" },
    );

    res.json({
      token,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      contact: user.contact,
      type: user.type,
    });
  });
});

export default router;
