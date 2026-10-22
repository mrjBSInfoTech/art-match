import express from "express";
import db from "../../database/db.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { authenticateSeller } from "../../middleware/sellerAuthMiddleware.js";
import { uploadToB2, deleteFromB2 } from "../../utils/b2Storage.js";
import {
  ArtworkDetailsValidationError,
  resolveArtworkDetails,
} from "../../utils/artworkDetails.js";
import {
  ArtworkScanValidationError,
  applyArtworkScanOverrides,
  parseArtworkScanOverrides,
  resolveArtworkScanUpdate,
} from "../../utils/artworkScanAttributes.js";

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

async function scanArtwork(absoluteImagePath, art_type, product) {
  let detectedColors = "Pending";
  let detectedFeatures = null;
  const type = art_type.trim().toLowerCase();
  const fixedMedium = type === "digital" ? "Digital" : null;
  const featuresOnly = ["photography", "photo", "image", "print"].includes(type)
    || (["auto", "physical"].includes(type) && product.trim().toLowerCase() === "image");
  let detectedMediums = fixedMedium || (featuresOnly ? "None" : null);

  // Analyze colors, features, and mediums when the seller uploads artwork.
  try {
    const mlResponse = await fetch("http://127.0.0.1:8000/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image_path: absoluteImagePath,
        artwork_type: type,
        product: product.trim().toLowerCase(),
      }),
    });

    if (mlResponse.ok) {
      const mlData = await mlResponse.json();
      if (
        mlData.success &&
        Array.isArray(mlData.colors) &&
        mlData.colors.length > 0
      ) {
        detectedColors = mlData.colors.join(", ");
        console.log("Detected colors:", detectedColors);
      }

      if (mlData.success) {
        detectedFeatures = (
          Array.isArray(mlData.features)
            ? mlData.features.join(", ") || "None"
            : String(mlData.features || "None")
        ).slice(0, 1000);
        console.log("Detected features:", detectedFeatures);
        detectedMediums = (
          fixedMedium
            ? fixedMedium
            : featuresOnly
              ? "None"
              : Array.isArray(mlData.mediums)
                ? mlData.mediums.join(", ") || "None"
                : String(mlData.mediums || "None")
        ).slice(0, 1000);
        console.log("Detected mediums:", detectedMediums);
      }
    }
  } catch (mlError) {
    console.error(
      "Python ML Service offline, saving default color status:",
      mlError.message,
    );
  }
  return { detectedColors, detectedFeatures, detectedMediums };
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
    const uniquePart =
  `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;

    const filename =`${uniquePart}-${safeName}${ext}`; 
    let counter = 1;

    cb(null, filename);
  },
});

const upload = multer({ storage });

function removeTemporaryUpload(file) {
  if (!file) return;
  const temporaryPath = path.join(uploadDir, file.filename);
  if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath);
}

// Get artworks for the current user
router.get("/", authenticateSeller, (req, res) => {
  res.set("Cache-Control", "no-store");
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
        a.art_type,
        a.product,
        a.artwork_details,
        au.request_status,
        au.request_date,
        au.approved_date,
        au.rejection_date,
        au.rejection_reason,
        a.date_created,
        f.feature_scanned,
        f.mediums_used,
        s.first_name,
        s.last_name,
        s.student_number,
        s.course
      FROM artwork a
      LEFT JOIN student s ON s.student_id = a.student_id
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
  res.set("Cache-Control", "no-store");
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
        a.art_type,
        a.product,
        a.artwork_details,
        au.request_status,
        au.request_date,
        au.approved_date,
        au.rejection_date,
        au.rejection_reason,
        a.date_created,
        f.feature_scanned,
        f.mediums_used,
        s.first_name,
        s.last_name,
        s.student_number,
        s.course
      FROM artwork a
      LEFT JOIN student s ON s.student_id = a.student_id
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
router.post(
  "/",
  authenticateSeller,
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image file uploaded" });
      }

      const studentId = req.user?.student_id || req.user?.id;

      {
        /* // For future use
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
    */
      }

      const {
        title,
        art_size,
        art_type,
        product,
        genre,
        price,
        description,
        date_posted,
      } = req.body;
      const createdAt =
        date_posted || new Date().toISOString().slice(0, 19).replace("T", " ");

      if (!studentId) {
        removeTemporaryUpload(req.file);
        return res.status(403).json({ error: "Unable to identify seller" });
      }
      if (!title || !art_size || !art_type || !product || !genre || !price || !description) {
        removeTemporaryUpload(req.file);
        return res
          .status(400)
          .json({ error: "Please fill all required fields." });
      }

      const artworkDetails = resolveArtworkDetails({
        rawDetails: req.body.artwork_details,
        artType: art_type,
        product,
      });
      const scanOverrides = parseArtworkScanOverrides(req.body, art_type, product);

      const absoluteImagePath = path.join(uploadDir, req.file.filename);
      const { detectedColors, detectedFeatures, detectedMediums } =
        await scanArtwork(absoluteImagePath, art_type, product);
      const scanAttributes = applyArtworkScanOverrides({
        feature_scanned: detectedFeatures,
        mediums_used: detectedMediums,
      }, scanOverrides);

      const imageName = req.file.filename;

      const b2Key = `app-uploads/seller/uploadArtwork/${imageName}`;

      try {
        await uploadToB2({
          key: b2Key,
          body: fs.readFileSync(absoluteImagePath),
          contentType: req.file.mimetype || "application/octet-stream",
        });

        console.log("Artwork uploaded to B2:", b2Key);
      } catch (b2Error) {
        console.error("B2 artwork upload failed:", b2Error.message);

        return res.status(502).json({
          error: "Artwork image could not be uploaded to cloud storage.",
        });
      }
      const sql = `
      INSERT INTO artwork
      (student_id, title, art_size, art_type, product, artwork_details, genre, color_used, price, description, image, date_created)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

      db.query(
        sql,
        [
          studentId,
          title.trim(),
          art_size.trim(),
          art_type.trim(),
          product.trim(),
          artworkDetails === null ? null : JSON.stringify(artworkDetails),
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
          VALUES (?, 'Unverified', ?)
        `;

          db.query(artUploadSql, [artworkId, createdAt], (uploadErr) => {
            if (uploadErr) {
              console.error("ArtUpload DB Error:", uploadErr);
              return res.status(500).json({ error: uploadErr.message });
            }

            if (fs.existsSync(absoluteImagePath)) {
              fs.unlinkSync(absoluteImagePath);
            }
            const respond = () =>
              res.json({
                message: "Artwork added successfully!",
                id: artworkId,
                request_status: "Unverified",
                colors: detectedColors,
              });

            if (scanAttributes.feature_scanned === null && scanAttributes.mediums_used === null) {
              return respond();
            }

            db.query(
              `INSERT INTO feature (artwork_id, feature_scanned, mediums_used)
               VALUES (?, ?, ?)`,
              [artworkId, scanAttributes.feature_scanned, scanAttributes.mediums_used],
              (featureErr) => {
                if (featureErr) {
                  console.error("Feature scan DB Error:", featureErr);
                  return res.status(500).json({ error: featureErr.message });
                }
                return respond();
              },
            );
          });
        },
      );
    } catch (error) {
      if (error instanceof ArtworkDetailsValidationError || error instanceof ArtworkScanValidationError) {
        removeTemporaryUpload(req.file);
        return res.status(400).json({ error: error.message });
      }
      console.error("Error creating artwork:", error);
      res.status(500).json({ error: "Failed to process artwork submission." });
    }
  },
);

// Update artwork verification status
router.put("/:id/verify", authenticateSeller, (req, res) => {
  const studentId = req.user?.student_id || req.user?.id;
  if (!studentId) {
    return res.status(403).json({ error: "Unable to identify seller" });
  }

  db.query(
    `UPDATE artupload au
     JOIN artwork a ON a.artwork_id = au.artwork_id
     SET au.request_status = 'Pending', au.request_date = NOW(),
         au.admin_id = NULL, au.approved_date = NULL
     WHERE a.artwork_id = ? AND a.student_id = ?
       AND LOWER(TRIM(au.request_status)) IN ('unverified', 'rejected')`,
    [req.params.id, studentId],
    (err, result) => {
      if (err) {
        console.error("DB Error:", err);
        return res.status(500).json({ error: err.message });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Artwork not found" });
      }
      res.json({ message: "Artwork updated successfully" });
    },
  );
});

// Update artwork
router.put(
  "/:id",
  authenticateSeller,
  upload.single("file"),
  async (req, res) => {
    const { id } = req.params;

    const studentId = req.user?.student_id || req.user?.id;

    const {
      title,
      art_size,
      art_type,
      product,
      genre,
      price,
      description,
      color_used,
    } = req.body;

    if (!studentId) {
      removeTemporaryUpload(req.file);
      return res.status(403).json({
        error: "Unable to identify seller",
      });
    }

    if (!title || !art_size || !art_type || !product || !genre || !price || !description) {
      removeTemporaryUpload(req.file);
      return res.status(400).json({
        error: "Please fill all required fields.",
      });
    }

    const temporaryImagePath = req.file
      ? path.join(uploadDir, req.file.filename)
      : null;

    try {
      const requestedScanOverrides = parseArtworkScanOverrides(req.body, art_type, product);
      // Get current artwork/image.
      const currentArtwork = await new Promise((resolve, reject) => {
        db.query(
          `SELECT image, art_type, product, artwork_details, color_used
               FROM artwork
               WHERE artwork_id = ?
                 AND student_id = ?`,
          [id, studentId],
          (err, rows) => {
            if (err) {
              reject(err);
              return;
            }

            resolve(rows?.[0] || null);
          },
        );
      });

      if (!currentArtwork) {
        removeTemporaryUpload(req.file);
        return res.status(404).json({
          error: "Artwork not found",
        });
      }

      const artworkDetails = resolveArtworkDetails({
        rawDetails: req.body.artwork_details,
        artType: art_type,
        product,
        currentArtwork,
      });
      const scanOverrides = resolveArtworkScanUpdate(
        requestedScanOverrides, art_type, product, currentArtwork,
      );

      let imageName = null;

      // If seller selected a new image,
      // upload it to B2 first.
      if (req.file) {
        imageName = req.file.filename;

        const newB2Key = `app-uploads/seller/uploadArtwork/${imageName}`;

        await uploadToB2({
          key: newB2Key,

          body: fs.readFileSync(temporaryImagePath),

          contentType: req.file.mimetype || "application/octet-stream",
        });

        console.log("Updated artwork image uploaded to B2:", newB2Key);
      }

      const sql = `
        UPDATE artwork
        SET
          title = ?,
          art_size = ?,
          art_type = ?,
          product = ?,
          artwork_details = ?,
          genre = ?,
          color_used = ?,
          price = ?,
          description = ?,
          image = COALESCE(?, image)
        WHERE artwork_id = ?
          AND student_id = ?
      `;

      await new Promise((resolve, reject) => {
        db.query(
          sql,
          [
            title.trim(),
            art_size.trim(),
            art_type.trim(),
            product.trim(),
            artworkDetails === null ? null : JSON.stringify(artworkDetails),
            genre.trim(),
            typeof color_used === "string" ? color_used.trim() : currentArtwork.color_used ?? "",
            price,
            description.trim(),
            imageName,
            id,
            studentId,
          ],
          (err, result) => {
            if (err) {
              reject(err);
              return;
            }

            resolve(result);
          },
        );
      });

      const scanFields = Object.keys(scanOverrides);
      if (scanFields.length > 0) {
        const existingFeature = await new Promise((resolve, reject) => {
          db.query(
            `SELECT f.feature_id
             FROM feature f
             JOIN artwork a ON a.artwork_id = f.artwork_id
             WHERE f.artwork_id = ? AND a.student_id = ?
             LIMIT 1`,
            [id, studentId],
            (error, rows) => error ? reject(error) : resolve(rows?.[0] || null),
          );
        });

        await new Promise((resolve, reject) => {
          const callback = (error, result) => error ? reject(error) : resolve(result);
          if (existingFeature) {
            // Update only supplied fields so one override cannot erase the other.
            db.query(
              `UPDATE feature f
               JOIN artwork a ON a.artwork_id = f.artwork_id
               SET ${scanFields.map((field) => `f.${field} = ?`).join(", ")}
               WHERE f.artwork_id = ? AND a.student_id = ?`,
              [...scanFields.map((field) => scanOverrides[field]), id, studentId],
              callback,
            );
          } else {
            const attributes = applyArtworkScanOverrides({}, scanOverrides);
            db.query(
              `INSERT INTO feature (artwork_id, feature_scanned, mediums_used)
               SELECT a.artwork_id, ?, ? FROM artwork a
               WHERE a.artwork_id = ? AND a.student_id = ?`,
              [attributes.feature_scanned, attributes.mediums_used, id, studentId],
              callback,
            );
          }
        });
      }

      // New image successfully saved
      // to DB, so remove old B2 image.
      if (
        req.file &&
        currentArtwork.image &&
        currentArtwork.image !== imageName
      ) {
        const oldB2Key = `app-uploads/seller/uploadArtwork/${currentArtwork.image}`;

        try {
          await deleteFromB2(oldB2Key);

          console.log("Old artwork image deleted from B2:", oldB2Key);
        } catch (deleteError) {
          console.warn("Could not delete old B2 image:", deleteError.message);
        }
      }

      // Remove temporary local file.
      if (temporaryImagePath && fs.existsSync(temporaryImagePath)) {
        fs.unlinkSync(temporaryImagePath);
      }

      return res.json({
        message: "Artwork updated successfully",
      });
    } catch (error) {
      const validationError = error instanceof ArtworkDetailsValidationError
        || error instanceof ArtworkScanValidationError;
      if (!validationError) {
        console.error("Artwork update error:", error);
      }

      // Clean temporary file
      // even when update fails.
      if (temporaryImagePath && fs.existsSync(temporaryImagePath)) {
        fs.unlinkSync(temporaryImagePath);
      }

      return res.status(validationError ? 400 : 500).json({
        error: validationError
          ? error.message
          : "Failed to update artwork.",
      });
    }
  },
);

// Delete artwork
router.delete("/:id", authenticateSeller, async (req, res) => {
  const { id } = req.params;

  const studentId = req.user?.student_id || req.user?.id;

  if (!studentId) {
    return res.status(403).json({
      error: "Unable to identify seller",
    });
  }

  try {
    const artwork = await new Promise((resolve, reject) => {
      db.query(
        `SELECT image
               FROM artwork
               WHERE artwork_id = ?
                 AND student_id = ?`,
        [id, studentId],
        (err, rows) => {
          if (err) {
            reject(err);
            return;
          }

          resolve(rows?.[0] || null);
        },
      );
    });

    if (!artwork) {
      return res.status(404).json({
        error: "Artwork not found",
      });
    }

    // Delete database record first.
    await new Promise((resolve, reject) => {
      db.query(
        `DELETE FROM artwork
             WHERE artwork_id = ?
               AND student_id = ?`,
        [id, studentId],
        (err, result) => {
          if (err) {
            reject(err);
            return;
          }

          resolve(result);
        },
      );
    });

    // Then remove its cloud image.
    if (artwork.image) {
      const b2Key = `app-uploads/seller/uploadArtwork/${artwork.image}`;

      try {
        await deleteFromB2(b2Key);

        console.log("Artwork image deleted from B2:", b2Key);
      } catch (b2Error) {
        // DB deletion already succeeded,
        // so don't fail the whole request.
        console.warn(
          "Artwork deleted, but B2 cleanup failed:",
          b2Error.message,
        );
      }
    }

    // Also clean an old local copy
    // if one happens to exist.
    if (artwork.image) {
      const localPath = path.join(uploadDir, artwork.image);

      if (fs.existsSync(localPath)) {
        fs.unlinkSync(localPath);
      }
    }

    return res.json({
      message: "Artwork deleted successfully",
    });
  } catch (error) {
    console.error("Artwork delete error:", error);

    return res.status(500).json({
      error: "Failed to delete artwork.",
    });
  }
});

export default router;
