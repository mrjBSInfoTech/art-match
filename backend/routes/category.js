import express from "express";
import db from "../database/db.js";

const router = express.Router();

router.get("/", (req, res) => {
const query = `
  SELECT 
    c.category_id,
    c.name,
    COUNT(p.product_id) AS product_count
  FROM categories c
  LEFT JOIN products p ON c.category_id = p.category_id
  GROUP BY c.category_id, c.name
  ORDER BY c.name ASC
`;
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

router.post("/", (req, res) => {
  const { name } = req.body;
  db.query("INSERT INTO categories (name) VALUES (?)", [name], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Category added successfully", id: result.insertId });
  });
});

router.put("/:id", (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  db.query(
    "UPDATE categories SET name = ? WHERE category_id = ?",
    [name, id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "Category updated successfully" });
    }
  );
});

router.delete("/:id", (req, res) => {
  const { id } = req.params;
  db.query("DELETE FROM categories WHERE category_id = ?", [id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Category deleted successfully" });
  });
});

export default router;
