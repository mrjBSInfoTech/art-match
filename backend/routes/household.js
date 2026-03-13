import express from "express";
import db from "../database/db.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// 🟢 Get all households
router.get("/", authenticateToken, (req, res) => {
  const sql = `
    SELECT 
      household_id,
      house_number,
      street_number,
      barangay,
      household_members,
      head_family
    FROM household
    ORDER BY house_number ASC
  `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// 🔍 Get single household by ID
router.get("/:id", authenticateToken, (req, res) => {
  const { id } = req.params;
  const sql = `
    SELECT 
      household_id,
      house_number,
      street_number,
      barangay,
      household_members,
      head_family
    FROM household
    WHERE household_id = ?
  `;
  db.query(sql, [id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ error: "Household not found" });
    res.json(results[0]);
  });
});

// ➕ Add new household
router.post("/", authenticateToken, (req, res) => {
  const { house_number, street_number, barangay, household_members, head_family } = req.body;

  if (!house_number || !street_number || !barangay || !household_members || !head_family) {
    return res.status(400).json({ error: "Please fill all required fields." });
  }

  const sql = `
    INSERT INTO household 
    (house_number, street_number, barangay, household_members, head_family) 
    VALUES (?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [house_number, street_number, barangay, household_members, head_family],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "✅ Household added successfully", id: result.insertId });
    }
  );
});

// ✏️ Update household
router.put("/:id", authenticateToken, (req, res) => {
  const { id } = req.params;
  const { house_number, street_number, barangay, household_members, head_family } = req.body;

  if (!house_number || !street_number || !barangay || !household_members || !head_family) {
    return res.status(400).json({ error: "Please fill all required fields." });
  }

  const sql = `
    UPDATE household 
    SET house_number = ?, street_number = ?, barangay = ?, household_members = ?, head_family = ?
    WHERE household_id = ?
  `;

  db.query(
    sql,
    [house_number, street_number, barangay, household_members, head_family, id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "✅ Household updated successfully" });
    }
  );
});

// ❌ Delete household
router.delete("/:id", authenticateToken, (req, res) => {
  const { id } = req.params;

  db.query("DELETE FROM household WHERE household_id = ?", [id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "✅ Household deleted successfully" });
  });
});

export default router;
