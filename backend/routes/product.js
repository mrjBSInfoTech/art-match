import express from "express";
import db from "../database/db.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from 'url';

const router = express.Router();

// Get absolute path for uploads
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, "..", "uploads", "uploadProducts");

// ✅ Ensure upload folder exists
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// ✅ Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Sanitize filename
    const fileName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
    const uniqueName = `${Date.now()}-${fileName}`;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

// 🟢 Get all products
router.get("/", (req, res) => {
  const sql = `
    SELECT p.*, c.name AS category_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.category_id
    ORDER BY p.created_at DESC
  `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// ➕ Add new product
router.post("/", upload.single("image"), (req, res) => {
  const { name, category_id, brand, model, sync_product, price, stock } = req.body;
  const image = req.file ? req.file.filename : null;

  if (!name || !category_id || !price || !stock) {
    return res.status(400).json({ error: "Please fill all required fields." });
  }

  const sql = `
    INSERT INTO products 
    (name, category_id, brand, model, sync_product, image, price, stock) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [name, category_id, brand, model, sync_product || "disable", image, price, stock],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "✅ Product added successfully", id: result.insertId });
    }
  );
});

// ✏️ Update product
router.put("/:id", upload.single("image"), (req, res) => {
  const { id } = req.params;
  const { name, category_id, brand, model, sync_product, price, stock } = req.body;
  const image = req.file ? req.file.filename : req.body.image;

  const sql = `
    UPDATE products 
    SET name = ?, category_id = ?, brand = ?, model = ?, 
        sync_product = ?, image = ?, price = ?, stock = ?
    WHERE product_id = ?
  `;

  db.query(
    sql,
    [name, category_id, brand, model, sync_product, image, price, stock, id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "✅ Product updated successfully" });
    }
  );
});

// ❌ Delete product
router.delete("/:id", (req, res) => {
  const { id } = req.params;

  // Get image filename first to delete the file from folder
  db.query("SELECT image FROM supplier WHERE supplier_id = ?", [id], (err, results) => {
    if (results[0]?.image) {
      const imagePath = path.join(uploadDir, results[0].image);
      if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    }

    db.query("DELETE FROM supplier WHERE supplier_id = ?", [id], () => {
      res.json({ message: "Supplier deleted successfully" });
    });
  });
});

export default router;
