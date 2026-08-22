import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../../database/db.js";

const router = express.Router();

// Login route
router.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required" });
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
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = result[0];
    const isMatch = bcrypt.compareSync(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      {
        id: user.admin_id,
        admin_id: user.admin_id,
        username: user.username,
      },
      process.env.JWT_SECRET || "your_secret_key",
      { expiresIn: "10d" },
    );

    res.json({
      token,
      admin_id: user.admin_id,
      username: user.username,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
    });
  });
});

export default router;
