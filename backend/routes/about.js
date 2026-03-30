import express from "express";
import db from "../database/db.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from 'url'

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
router.get("/", (req, res) => {
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

export default router;
