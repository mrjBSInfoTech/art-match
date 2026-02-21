import express from "express";
import db from "../database/db.js";

const router = express.Router();

// 🟢 Get all suppliers
router.get("/", (req, res) => {
  db.query("SELECT * FROM supplier ORDER BY name ASC", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// ➕ Add a new supplier
router.post("/", (req, res) => {
  const { name, number, facebook_link, email } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: "Please fill in all required fields." });
  }

  const sql =
    "INSERT INTO supplier (name, number, facebook_link, email) VALUES (?, ?, ?, ?)";
  db.query(sql, [name, number || null, facebook_link || null, email], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Supplier added successfully", id: result.insertId });
  });
});

// ✏️ Update supplier
router.put("/:id", (req, res) => {
  const { id } = req.params;
  const { name, number, facebook_link, email } = req.body;

  const sql =
    "UPDATE supplier SET name = ?, number = ?, facebook_link = ?, email = ? WHERE supplier_id = ?";
  db.query(sql, [name, number, facebook_link, email, id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Supplier updated successfully" });
  });
});

// ❌ Delete supplier
router.delete("/:id", (req, res) => {
  const { id } = req.params;

  db.query("DELETE FROM supplier WHERE supplier_id = ?", [id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Supplier deleted successfully" });
  });
});

export default router;
