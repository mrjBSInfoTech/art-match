import express from "express";
import db from "../../database/db.js";

const router = express.Router();

// Public catalog: return artwork from every seller.
router.get("/", (req, res) => {
  const sql = `
    SELECT
      a.artwork_id,
      a.student_id,
      a.title,
      a.price,
      a.description,
      a.image,
      a.color_used,
      a.genre,
      a.art_size,
      CONCAT(s.first_name, ' ', s.last_name) AS artist,
      ac.register_status,
      ac.approved_date
    FROM artwork a
    LEFT JOIN student s ON a.student_id = s.student_id
    LEFT JOIN accregistration ac ON a.student_id = ac.student_id
    -- Include artworks where the seller either has been verified or has no registration row
    WHERE (ac.register_status IS NULL OR LOWER(ac.register_status) = 'verified')
    ORDER BY a.date_created DESC, a.artwork_id DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Buyer artwork query error:", err);
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

router.get("/:id", (req, res) => {
  const sql = `
    SELECT
      a.artwork_id,
      a.student_id,
      a.title,
      a.price,
      a.description,
      a.image,
      a.color_used,
      a.genre,
      a.art_size,
      f.feature_scanned,
      f.mediums_used,
      CONCAT(s.first_name, ' ', s.last_name) AS artist,
      ac.register_status,
      ac.approved_date
    FROM artwork a
    LEFT JOIN student s ON a.student_id = s.student_id
    LEFT JOIN accregistration ac ON a.student_id = ac.student_id
    LEFT JOIN feature f ON a.artwork_id = f.artwork_id
    WHERE a.artwork_id = ? AND (ac.register_status IS NULL OR LOWER(ac.register_status) = 'verified')
  `;

  // Debugging: log the incoming id
  // console.log('GET /api/buyer/artworks/:id', req.params.id);

  db.query(sql, [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) {
      return res.status(404).json({ error: "Artwork not found" });
    }
    res.json(results[0]);
  });
});

export default router;
