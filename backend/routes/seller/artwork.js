import express from "express";
import db from "../../database/db.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { authenticateSeller } from "../../middleware/sellerAuthMiddleware.js";

const router = express.Router();

// Get absolute path for uploads
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(
  __dirname,
  "..",
  "..",
  "uploads",
  "seller",
  "uploadArtwork",
);

// ✅ Ensure upload folder exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

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

// Get artworks for the current user
router.get("/", authenticateSeller, (req, res) => {
  try {
    const studentId = req.user?.student_id || req.user?.id;
    if (!studentId) {
      return res.status(403).json({ message: "Unable to identify seller" });
    }
    const sql = `
      SELECT 
        a.artwork_id,
        a.student_id,
        a.title,
        a.price,
        a.description,
        a.image,
        a.genre,
        a.color_used,
        a.art_size,
        au.request_status,
        a.date_created,
        f.feature_scanned,
        f.mediums_used
      FROM artwork a
      LEFT JOIN artupload au ON a.artwork_id = au.artwork_id
      LEFT JOIN feature f ON a.artwork_id = f.artwork_id
      WHERE a.student_id = ?
      ORDER BY a.artwork_id DESC
    `;

    db.query(sql, [studentId], (err, results) => {
      if (err) {
        console.error("Seller artwork list DB error:", err);
        return res.status(500).json({ message: err.message });
      }
      res.json(results);
    });
  } catch (err) {
    console.error("Unhandled error in GET /api/seller/artwork:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get single artwork by ID
router.get("/:id", authenticateSeller, (req, res) => {
  try {
    const { id } = req.params;
    const studentId = req.user?.student_id || req.user?.id;
    if (!studentId) {
      return res.status(403).json({ message: "Unable to identify seller" });
    }
    const sql = `
      SELECT 
        a.artwork_id,
        a.student_id,
        a.title,
        a.price,
        a.description,
        a.image,
        a.genre,
        a.color_used,
        a.art_size,
        au.request_status,
        a.date_created,
        f.feature_scanned,
        f.mediums_used
      FROM artwork a
      LEFT JOIN artupload au ON a.artwork_id = au.artwork_id
      LEFT JOIN feature f ON a.artwork_id = f.artwork_id
      WHERE a.artwork_id = ? AND a.student_id = ?
    `;
    db.query(sql, [id, studentId], (err, results) => {
      if (err) {
        console.error("Seller artwork detail DB error:", err);
        return res.status(500).json({ message: err.message });
      }
      if (results.length === 0)
        return res.status(404).json({ message: "Artwork not found" });
      res.json(results[0]);
    });
  } catch (err) {
    console.error("Unhandled error in GET /api/seller/artwork/:id:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Add new artwork
router.post("/", authenticateSeller, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file uploaded" });
    }

    const studentId = req.user?.student_id || req.user?.id;

    {/* // For future use
    const hasPostedToday = await new Promise((resolve, reject) => {
      const checkSql = `
        SELECT COUNT(*) AS post_count 
        FROM artwork 
        WHERE student_id = ? AND DATE(date_created) = CURDATE()
      `;
      db.query(checkSql, [studentId], (err, results) => {
        if (err) return reject(err);
        resolve(results[0].post_count > 0);
      });
    });

    if (hasPostedToday) {
      // Delete the uploaded file to avoid orphan files on disk
      const uploadedFilePath = path.join(uploadDir, req.file.filename);
      if (fs.existsSync(uploadedFilePath)) {
        fs.unlinkSync(uploadedFilePath);
      }

      return res.status(429).json({
        error: "Daily limit reached. You can only upload 1 art per day. Please try again tomorrow.",
      });
    }  
    */}

    const { title, art_size, genre, price, description, date_posted } = req.body;
    const createdAt = date_posted || new Date().toISOString().slice(0, 19).replace("T", " ");

    if (!studentId) {
      return res.status(403).json({ error: "Unable to identify seller" });
    }
    if (!title || !art_size || !genre || !price || !description) {
      return res.status(400).json({ error: "Please fill all required fields." });
    }

    const absoluteImagePath = path.join(uploadDir, req.file.filename);
    let detectedColors = "Pending";

    // Call Local Python ML API Service for Color Extraction
    try {
      const mlResponse = await fetch("http://127.0.0.1:8000/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_path: absoluteImagePath }),
      });

      if (mlResponse.ok) {
        const mlData = await mlResponse.json();
        if (mlData.success && Array.isArray(mlData.colors) && mlData.colors.length > 0) {
          detectedColors = mlData.colors.join(", ");
        }
      }
    } catch (mlError) {
      console.error("Python ML Service offline, saving default color status:", mlError.message);
    }

    const imageName = req.file.filename;
    const sql = `
      INSERT INTO artwork
      (student_id, title, art_size, genre, color_used, price, description, image, date_created)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
      sql,
      [
        studentId,
        title.trim(),
        art_size.trim(),
        genre.trim(),
        detectedColors,
        price,
        description.trim(),
        imageName,
        createdAt,
      ],
      (err, result) => {
        if (err) {
          console.error("DB Error:", err);
          return res.status(500).json({ error: err.message });
        }

        const artworkId = result.insertId;

        const artUploadSql = `
          INSERT INTO artupload (artwork_id, request_status, request_date)
          VALUES (?, 'Pending', ?)
        `;

        db.query(artUploadSql, [artworkId, createdAt], (uploadErr) => {
          if (uploadErr) {
            console.error("ArtUpload DB Error:", uploadErr);
            return res.status(500).json({ error: uploadErr.message });
          }

          res.json({
            message: "Artwork added successfully!",
            id: artworkId,
            colors: detectedColors,
          });
        });
      }
    );
  } catch (error) {
    console.error("Error creating artwork:", error);
    res.status(500).json({ error: "Failed to process artwork submission." });
  }
});

// Update artwork
router.put("/:id", authenticateSeller, upload.single("file"), (req, res) => {
  const { id } = req.params;
  const studentId = req.user?.student_id || req.user?.id;
  const {
    title,
    art_size,
    genre,
    price,
    description,
    color_used,
  } = req.body;

  if (!studentId) {
    return res.status(403).json({ error: "Unable to identify seller" });
  }
  if (!title || !art_size || !genre || !price || !description) {
    return res.status(400).json({ error: "Please fill all required fields." });
  }

  if (req.file) {
    db.query(
      "SELECT image FROM artwork WHERE artwork_id = ? AND student_id = ?",
      [id, studentId],
      (err, results) => {
        if (results && results[0]?.image) {
          const oldImagePath = path.join(uploadDir, results[0].image);
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
          }
        }
      }
    );
  }

  const imageName = req.file ? req.file.filename : null;
  const sql = `
    UPDATE artwork
    SET title = ?, art_size = ?, genre = ?, color_used = ?, price = ?, description = ?, image = COALESCE(?, image)
    WHERE artwork_id = ? AND student_id = ?
  `;

  db.query(
    sql,
    [
      title.trim(),
      art_size.trim(),
      genre.trim(),
      (color_used || "").trim(),
      price,
      description.trim(),
      imageName,
      id,
      studentId,
    ],
    (err, result) => {
      if (err) {
        console.error("DB Error:", err);
        return res.status(500).json({ error: err.message });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Artwork not found" });
      }
      res.json({ message: "Artwork updated successfully" });
    }
  );
});

// Delete artwork
router.delete("/:id", authenticateSeller, (req, res) => {
  const { id } = req.params;
  const studentId = req.user?.student_id || req.user?.id;
  if (!studentId) {
    return res.status(403).json({ error: "Unable to identify seller" });
  }

  db.query(
    "SELECT image FROM artwork WHERE artwork_id = ? AND student_id = ?",
    [id, studentId],
    (err, results) => {
      if (err) {
        console.error("DB Error:", err);
        return res.status(500).json({ error: err.message });
      }
      if (results.length === 0) {
        return res.status(404).json({ error: "Artwork not found" });
      }
      if (results && results[0]?.image) {
        const imagePath = path.join(uploadDir, results[0].image);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      }

      db.query(
        "DELETE FROM artwork WHERE artwork_id = ? AND student_id = ?",
        [id, studentId],
        (err) => {
          if (err) {
            console.error("DB Error:", err);
            return res.status(500).json({ error: err.message });
          }
          res.json({ message: "Artwork deleted successfully" });
        },
      );
    },
  );
});

export default router;
