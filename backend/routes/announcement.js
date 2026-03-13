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
const uploadDir = path.join(__dirname, "..", "uploads", "uploadAnnouncement");

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

// 🟢 Get all announcements
router.get("/", authenticateToken, (req, res) => {
  const sql = `
    SELECT 
      announcement_id,
      title,
      description,
      image,
      date_posted
    FROM announcement
    ORDER BY date_posted DESC
  `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// 🔍 Get single announcement by ID
router.get("/:id", authenticateToken, (req, res) => {
  const { id } = req.params;
  const sql = `
    SELECT 
      announcement_id,
      title,
      description,
      image,
      date_posted
    FROM announcement
    WHERE announcement_id = ?
  `;
  db.query(sql, [id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ error: "Announcement not found" });
    res.json(results[0]);
  });
});

// Add new announcement
router.post("/", authenticateToken, upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No image file uploaded" });
  
  const { title, description, date_posted } = req.body;

  // Validate required fields
  if (!title || !title.trim()) {
    return res.status(400).json({ error: "Title is required" });
  }
  if (!description || !description.trim()) {
    return res.status(400).json({ error: "Description is required" });
  }
  if (!date_posted) {
    return res.status(400).json({ error: "Date posted is required" });
  }

  const imageName = req.file.filename;
  console.log("New announcement image:", imageName);

  const sql = `
    INSERT INTO announcement 
    (title, description, image, date_posted) 
    VALUES (?, ?, ?, ?)
  `;

  db.query(
    sql,
    [title.trim(), description.trim(), imageName, date_posted],
    (err, result) => {
      if (err) {
        console.error("DB Error:", err);
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: "Announcement added successfully", id: result.insertId });
    }
  );
});

// Update announcement
router.put("/:id", authenticateToken, upload.single("file"), (req, res) => {
  const { id } = req.params;
  const { title, description, date_posted } = req.body;

  // Validate required fields
  if (!title || !title.trim()) {
    return res.status(400).json({ error: "Title is required" });
  }
  if (!description || !description.trim()) {
    return res.status(400).json({ error: "Description is required" });
  }
  if (!date_posted) {
    return res.status(400).json({ error: "Date posted is required" });
  }

  // If new file is uploaded, delete old one
  if (req.file) {
    db.query("SELECT image FROM announcement WHERE announcement_id = ?", [id], (err, results) => {
      if (results && results[0]?.image) {
        const oldImagePath = path.join(uploadDir, results[0].image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
          console.log("Deleted old image:", results[0].image);
        }
      }
    });
  }

  const imageName = req.file ? req.file.filename : null;
  console.log("Updated announcement image:", imageName || "(no change)");

  const sql = `
    UPDATE announcement 
    SET title = ?, description = ?, image = COALESCE(?, image), date_posted = ?
    WHERE announcement_id = ?
  `;

  db.query(
    sql,
    [title.trim(), description.trim(), imageName, date_posted, id],
    (err) => {
      if (err) {
        console.error("DB Error:", err);
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: "Announcement updated successfully" });
    }
  );
});

// Delete announcement
router.delete("/:id", authenticateToken, (req, res) => {
  const { id } = req.params;

  // Get image filename first to delete the file from folder
  db.query("SELECT image FROM announcement WHERE announcement_id = ?", [id], (err, results) => {
    if (results && results[0]?.image) {
      const imagePath = path.join(uploadDir, results[0].image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
        console.log("Deleted image:", results[0].image);
      }
    }

    db.query("DELETE FROM announcement WHERE announcement_id = ?", [id], (err) => {
      if (err) {
        console.error("DB Error:", err);
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: "Announcement deleted successfully" });
    });
  });
});

export default router;
