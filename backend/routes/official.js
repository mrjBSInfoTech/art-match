import express from "express";
import db from "../database/db.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from 'url';
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// Get absolute path for uploads
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, "..", "uploads", "uploadOfficial");

// ✅ Ensure upload folder exists
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
// Image upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const originalName = path.parse(file.originalname).name;
    const ext = path.extname(file.originalname);
    const safeName = originalName.replace(/[^a-zA-Z0-9_-]/g, "_");
    
    // Check if file exists and generate unique name if needed
    let filename = `${safeName}${ext}`;
    let counter = 1;
    
    while (fs.existsSync(path.join(uploadDir, filename))) {
      filename = `${safeName}_${counter}${ext}`;
      counter++;
    }
    
    cb(null, filename);
  },
});

const upload = multer({ storage });

// 🟢 Get all officials
router.get("/", authenticateToken, (req, res) => {
  const sql = `
    SELECT 
      official_id,
      official_account_id,
      first_name,
      middle_name,
      last_name,
      position,
      dob,
      address,
      image,
      phone_number,
      email
    FROM official
    ORDER BY last_name, first_name ASC
  `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// 🔍 Get single official by ID
router.get("/:id", authenticateToken, (req, res) => {
  const { id } = req.params;
  const sql = `
    SELECT 
      official_id,
      official_account_id,
      first_name,
      middle_name,
      last_name,
      position,
      dob,
      address,
      image,
      phone_number,
      email
    FROM official
    WHERE official_id = ?
  `;
  db.query(sql, [id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ error: "Official not found" });
    res.json(results[0]);
  });
});

// ➕ Add new official
router.post("/", authenticateToken, upload.single("image"), (req, res) => {
  const { official_account_id, first_name, middle_name, last_name, position, dob, address, phone_number, email } = req.body;

  if (!first_name || !last_name || !position) {
    return res.status(400).json({ error: "Please fill all required fields (first_name, last_name, position)." });
  }

  if (!req.file) {
    return res.status(400).json({ error: "Image file is required" });
  }

  const imageName = req.file.filename;
  console.log("New official image:", imageName);

  const sql = `
    INSERT INTO official 
    (official_account_id, first_name, middle_name, last_name, position, dob, address, image, phone_number, email) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [official_account_id || null, first_name, middle_name || null, last_name, position, dob || null, address || null, imageName, phone_number || null, email || null],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "✅ Official added successfully", id: result.insertId });
    }
  );
});

// ✏️ Update official
router.put("/:id", authenticateToken, upload.single("image"), (req, res) => {
  const { id } = req.params;
  const { official_account_id, first_name, middle_name, last_name, position, dob, address, phone_number, email, image } = req.body;

  if (!first_name || !last_name || !position) {
    return res.status(400).json({ error: "Please fill all required fields (first_name, last_name, position)." });
  }

  // First, get the current official to preserve account_id if not provided
  db.query("SELECT official_account_id FROM official WHERE official_id = ?", [id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ error: "Official not found" });

    // Preserve existing account_id if not explicitly provided in the request
    const accountId = official_account_id !== undefined ? official_account_id : results[0].official_account_id;

    // Determine image name: use new file if uploaded, otherwise preserve existing image
    const imageName = req.file ? req.file.filename : image;
    console.log("Updated official image:", imageName || "(no change)");

    const sql = `
      UPDATE official 
      SET official_account_id = ?, first_name = ?, middle_name = ?, last_name = ?, position = ?, 
          dob = ?, address = ?, image = ?, phone_number = ?, email = ?
      WHERE official_id = ?
    `;

    db.query(
      sql,
      [accountId, first_name, middle_name || null, last_name, position, dob || null, address || null, imageName, phone_number || null, email || null, id],
      (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "✅ Official updated successfully" });
      }
    );
  });
});

// ❌ Delete official
router.delete("/:id", authenticateToken, (req, res) => {
  const { id } = req.params;

  // Get image filename first to delete the file from folder
  db.query("SELECT image FROM official WHERE official_id = ?", [id], (err, results) => {
    if (results[0]?.image) {
      const imagePath = path.join(uploadDir, results[0].image);
      if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    }

    db.query("DELETE FROM official WHERE official_id = ?", [id], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "✅ Official deleted successfully" });
    });
  });
});

export default router;
