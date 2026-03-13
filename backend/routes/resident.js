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
const uploadDir = path.join(__dirname, "..", "uploads", "uploadResident");

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

// 🟢 Get all residents
router.get("/", authenticateToken, (req, res) => {
  const sql = `
    SELECT 
      resident_id,
      user_id,
      household_id,
      first_name,
      middle_name,
      last_name,
      gender,
      dob,
      address,
      phone_number,
      email,
      image
    FROM resident
    ORDER BY last_name, first_name ASC
  `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// 🔍 Get single resident by ID
router.get("/:id", authenticateToken, (req, res) => {
  const { id } = req.params;
  const sql = `
    SELECT 
      resident_id,
      user_id,
      household_id,
      first_name,
      middle_name,
      last_name,
      gender,
      dob,
      address,
      phone_number,
      email,
      image
    FROM resident
    WHERE resident_id = ?
  `;
  db.query(sql, [id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ error: "Resident not found" });
    res.json(results[0]);
  });
});

// ➕ Add new resident
router.post("/", authenticateToken, upload.single("image"), (req, res) => {
  const { user_id, household_id, first_name, middle_name, last_name, gender, dob, address, phone_number, email } = req.body;
  const image = req.file ? req.file.filename : null;

  if (!first_name || !last_name || !gender || !dob || !address || !phone_number || !email) {
    return res.status(400).json({ error: "Please fill all required fields." });
  }

  const sql = `
    INSERT INTO resident 
    (user_id, household_id, first_name, middle_name, last_name, gender, dob, address, phone_number, email, image) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [user_id || null, household_id || null, first_name, middle_name || null, last_name, gender, dob, address, phone_number, email, image],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "✅ Resident added successfully", id: result.insertId });
    }
  );
});

// ✏️ Update resident
router.put("/:id", authenticateToken, upload.single("image"), (req, res) => {
  const { id } = req.params;
  const { user_id, household_id, first_name, middle_name, last_name, gender, dob, address, phone_number, email } = req.body;
  const image = req.file ? req.file.filename : req.body.image;

  if (!first_name || !last_name || !gender || !dob || !address || !phone_number || !email) {
    return res.status(400).json({ error: "Please fill all required fields." });
  }

  const sql = `
    UPDATE resident 
    SET user_id = ?, household_id = ?, first_name = ?, middle_name = ?, last_name = ?, gender = ?,
        dob = ?, address = ?, phone_number = ?, email = ?, image = ?
    WHERE resident_id = ?
  `;

  db.query(
    sql,
    [user_id || null, household_id || null, first_name, middle_name || null, last_name, gender, dob, address, phone_number, email, image, id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "✅ Resident updated successfully" });
    }
  );
});

// ❌ Delete resident
router.delete("/:id", authenticateToken, (req, res) => {
  const { id } = req.params;

  // Get image filename first to delete the file from folder
  db.query("SELECT image FROM resident WHERE resident_id = ?", [id], (err, results) => {
    if (results[0]?.image) {
      const imagePath = path.join(uploadDir, results[0].image);
      if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    }

    db.query("DELETE FROM resident WHERE resident_id = ?", [id], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "✅ Resident deleted successfully" });
    });
  });
});

export default router;
