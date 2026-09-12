import express from "express";
import fs from "fs";
import path from "path";
import db from "../../database/db.js";
import { authenticateAdmin } from "../../middleware/adminAuthMiddleware.js";
import { requireAdminPermission } from "../../middleware/adminPermissionMiddleware.js";

const router = express.Router();

// Helper to get correct MIME type from image extension
function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    default:
      return "image/jpeg";
  }
}

async function scanAndSaveArtworkData(artworkId, imageName) {
  console.log(`[ML Scan] Starting model scan for artwork ${artworkId}...`);
  if (!imageName) {
    console.warn(`[ML Scan] No imageName provided for artwork ${artworkId}`);
    return;
  }

  const imagePath = path.join(
    process.cwd(),
    "uploads",
    "seller",
    "uploadArtwork",
    imageName,
  );

  if (!fs.existsSync(imagePath)) {
    console.warn(`[ML Scan] Image file not found at: ${imagePath}`);
    return;
  }

  try {
    // Send image to local Python FastAPI inference server
    const mlResponse = await fetch("http://127.0.0.1:8000/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_path: imagePath }),
    });

    if (!mlResponse.ok) {
      throw new Error(`Python server returned status ${mlResponse.status}`);
    }

    const mlData = await mlResponse.json();
    
    // Normalize and format predictions into comma-separated values
    let detectedFeatures = Array.isArray(mlData.features) 
      ? mlData.features.join(", ") 
      : (mlData.features || "None");
      
    let detectedMediums = Array.isArray(mlData.mediums) 
      ? mlData.mediums.join(", ") 
      : (mlData.mediums || "None");

    const MAX_LEN = 1000;
    if (detectedFeatures.length > MAX_LEN) detectedFeatures = detectedFeatures.slice(0, MAX_LEN);
    if (detectedMediums.length > MAX_LEN) detectedMediums = detectedMediums.slice(0, MAX_LEN);

    // Check if entry already exists in the feature table
    const query = (sql, params) =>
      new Promise((resolve, reject) => {
        db.query(sql, params, (error, results) => {
          if (error) reject(error);
          else resolve(results);
        });
      });

    const results = await query(
      "SELECT feature_id FROM feature WHERE artwork_id = ?",
      [artworkId],
    );

    if (results && results.length > 0) {
      await query(
        `
          UPDATE feature
          SET feature_scanned = ?, mediums_used = ?
          WHERE artwork_id = ?
        `,
        [detectedFeatures, detectedMediums, artworkId],
      );
      console.log(`[ML Scan] Successfully updated features & mediums for artwork ${artworkId}`);
    } else {
      await query(
        `
          INSERT INTO feature (artwork_id, feature_scanned, mediums_used)
          VALUES (?, ?, ?)
        `,
        [artworkId, detectedFeatures, detectedMediums],
      );
      console.log(`[ML Scan] Successfully inserted features & mediums for artwork ${artworkId}`);
    }
  } catch (error) {
    console.error("[ML Scan] Failed to process artwork scan:", error.message);
  }
}

// Get all artworks of all students
router.get("/", authenticateAdmin, (req, res) => {
  const { status } = req.query;

  let sql = `
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
      a.date_created,
      au.request_status AS status,
      au.request_date,
      au.approved_date,
      au.admin_id,
      f.feature_scanned,
      f.mediums_used,
      s.first_name,
      s.last_name,
      s.student_number,
      s.course,
      s.year_level
    FROM artwork a
    LEFT JOIN student s ON s.student_id = a.student_id
    LEFT JOIN artupload au ON au.artwork_id = a.artwork_id
    LEFT JOIN feature f ON f.artwork_id = a.artwork_id
  `;

  const params = [];

  if (status) {
    sql += " WHERE au.request_status = ?";
    params.push(status);
  }

  const orderBy =
    status && String(status).toLowerCase() === "verified"
      ? "au.approved_date DESC"
      : "a.artwork_id DESC";
  sql += ` ORDER BY ${orderBy}`;

  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results || []);
  });
});

// Get single artwork by ID
router.get("/:id", authenticateAdmin, (req, res) => {
  const { id } = req.params;

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
      a.date_created,
      au.request_status,
      au.request_date,
      au.approved_date,
      au.admin_id,
      f.feature_scanned,
      f.mediums_used,
      s.first_name,
      s.last_name,
      s.student_number,
      s.course,
      s.year_level
    FROM artwork a
    LEFT JOIN student s ON s.student_id = a.student_id
    LEFT JOIN artupload au ON au.artwork_id = a.artwork_id
    LEFT JOIN feature f ON f.artwork_id = a.artwork_id
    WHERE a.artwork_id = ?
  `;

  db.query(sql, [id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0)
      return res.status(404).json({ error: "Artwork not found" });
    res.json(results[0]);
  });
});

router.put(
  "/:id",
  authenticateAdmin,
  requireAdminPermission("can_edit"),
  (req, res) => {
    const { id } = req.params;
    const rawStatus = req.body.request_status || req.body.status || null;
    const adminId = req.user?.admin_id || req.body.admin_id || null;

    if (!rawStatus) {
      return res.status(400).json({ error: "Missing status in request body" });
    }

    const status = String(rawStatus).toLowerCase();
    const allowed = ["verified", "pending"];
    if (!allowed.includes(status)) {
      return res
        .status(400)
        .json({ error: `Status must be one of: ${allowed.join(", ")}` });
    }

    const selectSql = "SELECT image FROM artwork WHERE artwork_id = ?";
    db.query(selectSql, [id], async (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      if (results.length === 0)
        return res.status(404).json({ error: "Artwork not found" });

      const artwork = results[0];
      const approvedDate = status === "verified" ? new Date() : null;

      const checkUploadSql =
        "SELECT artupload_id FROM artupload WHERE artwork_id = ?";
      db.query(checkUploadSql, [id], async (checkErr, uploadResults) => {
        if (checkErr) return res.status(500).json({ error: checkErr.message });

        if (uploadResults && uploadResults.length > 0) {
          // Update existing record
          const updateSql = `
          UPDATE artupload
          SET request_status = ?, admin_id = ?, approved_date = ?
          WHERE artwork_id = ?
        `;
          db.query(
            updateSql,
            [status, adminId, approvedDate, id],
            async (updateErr) => {
              if (updateErr)
                return res.status(500).json({ error: updateErr.message });

              if (status === "verified") {
                await scanAndSaveArtworkData(id, artwork.image);
              }

              return res.json({
                message: "Artwork status updated successfully",
              });
            },
          );
        } else {
          // Insert new record into artupload
          const insertSql = `
          INSERT INTO artupload (artwork_id, admin_id, request_status, request_date, approved_date)
          VALUES (?, ?, ?, NOW(), ?)
        `;
          db.query(
            insertSql,
            [id, adminId, status, approvedDate],
            async (insertErr) => {
              if (insertErr)
                return res.status(500).json({ error: insertErr.message });

              if (status === "verified") {
                await scanAndSaveArtworkData(id, artwork.image);
              }

              return res.json({
                message: "Artwork status updated successfully",
              });
            },
          );
        }
      });
    });
  },
);

export default router;
