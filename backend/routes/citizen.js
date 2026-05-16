import express from "express";
import db from "../database/db.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// 🟢 Get all citizen
router.get("/", authenticateToken, (req, res) => {
  const sql = `
    SELECT 
      user_id, 
      first_name,
      last_name,
      email,
      contact,
      type,
      resident_id,
      status,
      date_created
    FROM user_account
  ORDER BY user_id ASC`;

  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// 🔍 Get single citizen by ID
router.get("/:id", authenticateToken, (req, res) => {
  const { id } = req.params;
  const sql = `
    SELECT 
      *
    FROM user_account 
    WHERE user_id = ?
  `;
  db.query(sql, [id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0)
      return res.status(404).json({ error: "Citizen not found" });
    res.json(results[0]);
  });
});

// ✏️ Unified Update: Updates Info AND Status in one go
router.put("/:id", authenticateToken, (req, res) => {
  const { id } = req.params;
  const { status, resident_id, type } = req.body;

  // Build dynamic SQL - only update fields that are provided
  const updates = [];
  const values = [];

  // Only add status if provided and not empty
  if (status !== undefined && status !== null && status !== "") {
    updates.push("status = ?");
    values.push(status);
  }

  // Only add type if provided and not empty
  if (type !== undefined && type !== null && type !== "") {
    updates.push("type = ?");
    values.push(type);
  }

  // Only add resident_id if provided and not empty
  if (resident_id !== undefined && resident_id !== null && resident_id !== "") {
    updates.push("resident_id = ?");
    values.push(resident_id);
  }

  // If no fields to update, return error
  if (updates.length === 0) {
    return res.status(400).json({ message: "No valid fields to update" });
  }

  values.push(id);
  const sql = `UPDATE user_account SET ${updates.join(", ")} WHERE user_id = ?`;

  db.query(sql, values, (err) => {
    if (err) {
      console.error("Database Error:", err);
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: "Citizen record updated successfully" });
  });
});


export default router;
