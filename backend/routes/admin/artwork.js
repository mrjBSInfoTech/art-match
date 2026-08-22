import express from "express";
import fs from "fs";
import path from "path";
import db from "../../database/db.js";
import { authenticateAdmin } from "../../middleware/adminAuthMiddleware.js";

let genAI = null;
const getGenAI = async () => {
  if (genAI) return genAI;
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing. Add it to .env before using it.");
  }

  try {
    const mod = await import("@google/generative-ai");
    const GoogleGenerativeAI = mod.GoogleGenerativeAI || mod.default || mod;
    genAI = new GoogleGenerativeAI(apiKey);
    return genAI;
  } catch (err) {
    throw new Error("Google Generative AI module not available: " + err.message);
  }
};

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

// Helper function to scan artwork using Gemini AI and store features/mediums in MySQL
async function scanAndSaveArtworkData(artworkId, imageName) {
  console.log(`[AI Scan] scanAndSaveArtworkData called for artwork ${artworkId}`);
  if (!imageName) {
    console.warn(`[AI Scan] No imageName provided for artwork ${artworkId}`);
    return;
  }

  const imagePath = path.join(
    process.cwd(),
    "uploads",
    "seller",
    "uploadArtwork",
    imageName
  );
  console.log(`[AI Scan] imagePath resolved to: ${imagePath}`);

  if (!fs.existsSync(imagePath)) {
    console.warn(`[AI Scan] Image file not found at: ${imagePath}`);
    return;
  }

  try {
    const imageBuffer = fs.readFileSync(imagePath);
    const imageBase64 = imageBuffer.toString("base64");
    const mimeType = getMimeType(imagePath);

    const imagePart = {
      inlineData: {
        data: imageBase64,
        mimeType: mimeType,
      },
    };

    const ai = await getGenAI();
    const model = ai.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Scan Features & Mediums (Comma-separated output)
    const featurePrompt = `Analyze this artwork image and identify:
1. Visual features/elements (e.g., paint brush, brush, heavy brush, thick strokes, portrait, landscape, geometric patterns).
2. Art mediums used (e.g., acrylic paint, oil paint, watercolor, digital illustration, charcoal, canvas, paper).

Requirements:
- Return output STRICTLY in JSON format with two keys: "features" and "mediums".
- Both values MUST be a single line of comma-separated items.
Example JSON:
{
  "features": "paint brush, brush, heavy brush",
  "mediums": "acrylic paint, canvas"
}
Do not include any Markdown code blocks outside the valid JSON object.`;

    const featureResult = await model.generateContent([
      featurePrompt,
      imagePart,
    ]);

    let detectedFeatures = "";
    let detectedMediums = "";

    try {
      const cleanJson = featureResult.response
        .text()
        .replace(/```json|```/g, "")
        .trim();
      const parsed = JSON.parse(cleanJson);
      detectedFeatures = parsed.features || "";
      detectedMediums = parsed.mediums || "";
    } catch (e) {
      // Fallback if AI outputs plain text instead of JSON
      detectedFeatures = featureResult.response
        .text()
        .trim()
        .replace(/[\r\n]+/g, ", ");
    }

    // Normalize and truncate AI outputs to avoid DB constraint/length issues
    detectedFeatures = String(detectedFeatures || "").trim();
    detectedMediums = String(detectedMediums || "").trim();
    const MAX_LEN = 1000;
    if (detectedFeatures.length > MAX_LEN) detectedFeatures = detectedFeatures.slice(0, MAX_LEN);
    if (detectedMediums.length > MAX_LEN) detectedMediums = detectedMediums.slice(0, MAX_LEN);

    // Save or Update entry in feature table
    const checkSql = "SELECT feature_id FROM feature WHERE artwork_id = ?";
    db.query(checkSql, [artworkId], (err, results) => {
      if (err) {
        console.error("[AI Scan] Error checking feature table:", err && err.message ? err.message : err);
        return;
      }

      const insertSql = `
        INSERT INTO feature (artwork_id, feature_scanned, mediums_used)
        VALUES (?, ?, ?)
      `;
      const updateSql = `
        UPDATE feature
        SET feature_scanned = ?, mediums_used = ?
        WHERE artwork_id = ?
      `;

      const doFallback = (errMessage) => {
        try {
          const dumpDir = path.join(process.cwd(), "uploads", "ai_features");
          fs.mkdirSync(dumpDir, { recursive: true });
          const dumpPath = path.join(dumpDir, `artwork_${artworkId}_features.txt`);
          fs.writeFileSync(dumpPath, `features:${detectedFeatures}\nmediums:${detectedMediums}`, "utf8");
          console.log(`[AI Scan] Wrote AI output to ${dumpPath} due to DB error: ${errMessage}`);
        } catch (e) {
          console.error("[AI Scan] Failed to write AI fallback file:", e && e.message ? e.message : e);
        }
      };

      if (results && results.length > 0) {
        db.query(updateSql, [detectedFeatures, detectedMediums, artworkId], (updateErr) => {
          if (updateErr) {
            console.error("[AI Scan] Update DB Error:", updateErr && updateErr.message ? updateErr.message : updateErr);
            if (String(updateErr.message || "").toLowerCase().includes("feature_scanned")) {
              doFallback(updateErr.message || updateErr);
              const updateMediumsSql = `
                UPDATE feature
                SET mediums_used = ?
                WHERE artwork_id = ?
              `;
              db.query(updateMediumsSql, [detectedMediums, artworkId], (retryErr) => {
                if (retryErr) console.error("[AI Scan] Retry update (mediums_only) failed:", retryErr && retryErr.message ? retryErr.message : retryErr);
                else console.log(`[AI Scan] Updated feature for artwork ${artworkId} (mediums_only)`);
              });
            }
          } else {
            console.log(`[AI Scan] Successfully updated feature data for artwork ${artworkId}`);
          }
        });
      } else {
        db.query(insertSql, [artworkId, detectedFeatures, detectedMediums], (insertErr) => {
          if (insertErr) {
            console.error("[AI Scan] Insert DB Error:", insertErr && insertErr.message ? insertErr.message : insertErr);
            if (String(insertErr.message || "").toLowerCase().includes("feature_scanned")) {
              doFallback(insertErr.message || insertErr);
              const insertMediumsSql = `
                INSERT INTO feature (artwork_id, mediums_used)
                VALUES (?, ?)
              `;
              db.query(insertMediumsSql, [detectedMediums, artworkId], (retryErr) => {
                if (retryErr) console.error("[AI Scan] Retry insert (mediums_only) failed:", retryErr && retryErr.message ? retryErr.message : retryErr);
                else console.log(`[AI Scan] Inserted feature for artwork ${artworkId} (mediums_only)`);
              });
            }
          } else {
            console.log(`[AI Scan] Successfully inserted feature data for artwork ${artworkId}`);
          }
        });
      }
    });
  } catch (error) {
    console.error("[AI Scan] Failed to process artwork scan:", error.message);
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

  const orderBy = status && String(status).toLowerCase() === "verified" ? "au.approved_date DESC" : "a.artwork_id DESC";
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

router.put("/:id", authenticateAdmin, (req, res) => {
  const { id } = req.params;
  const rawStatus = req.body.request_status || req.body.status || null;
  const adminId = req.user?.admin_id || req.body.admin_id || null;

  if (!rawStatus) {
    return res.status(400).json({ error: "Missing status in request body" });
  }

  const status = String(rawStatus).toLowerCase();
  const allowed = ["verified", "pending"];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: `Status must be one of: ${allowed.join(', ')}` });
  }

  const selectSql = "SELECT image FROM artwork WHERE artwork_id = ?";
  db.query(selectSql, [id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0)
      return res.status(404).json({ error: "Artwork not found" });

    const artwork = results[0];
    const approvedDate = status === "verified" ? new Date() : null;

    const checkUploadSql = "SELECT artupload_id FROM artupload WHERE artwork_id = ?";
    db.query(checkUploadSql, [id], (checkErr, uploadResults) => {
      if (checkErr) return res.status(500).json({ error: checkErr.message });

      if (uploadResults && uploadResults.length > 0) {
        // Update existing record
        const updateSql = `
          UPDATE artupload
          SET request_status = ?, admin_id = ?, approved_date = ?
          WHERE artwork_id = ?
        `;
        db.query(updateSql, [status, adminId, approvedDate, id], (updateErr) => {
          if (updateErr) return res.status(500).json({ error: updateErr.message });

          if (status === "verified") {
            scanAndSaveArtworkData(id, artwork.image);
          }

          return res.json({ message: "Artwork status updated successfully" });
        });
      } else {
        // Insert new record into artupload
        const insertSql = `
          INSERT INTO artupload (artwork_id, admin_id, request_status, request_date, approved_date)
          VALUES (?, ?, ?, NOW(), ?)
        `;
        db.query(insertSql, [id, adminId, status, approvedDate], (insertErr) => {
          if (insertErr) return res.status(500).json({ error: insertErr.message });

          if (status === "verified") {
            scanAndSaveArtworkData(id, artwork.image);
          }

          return res.json({ message: "Artwork status updated successfully" });
        });
      }
    });
  });
});

export default router;