import express from "express";
import db from "../../database/db.js";

const router = express.Router();

router.get("/seller/:id", (req, res) => {
  const studentId = Number(req.params.id);
  if (!Number.isInteger(studentId) || studentId <= 0) {
    return res.status(400).json({ message: "Invalid seller id" });
  }

  res.set("Cache-Control", "no-store");
  db.query(
        `SELECT s.student_id, s.first_name, s.last_name, s.profile_image, s.course,
          ac.registered_date, sf.shop_name, sf.shop_description,
          sf.specialties, sf.pinned_artwork_ids,
          COALESCE((
            SELECT SUM(oi.quantity)
            FROM marketplace_order o
            JOIN marketplace_order_item oi ON oi.order_id = o.order_id
            WHERE o.seller_id = s.student_id AND o.status = 'Delivered'
          ), 0) AS sales_count
     FROM student s
     LEFT JOIN accregistration ac ON ac.student_id = s.student_id
     LEFT JOIN storefront sf ON sf.student_id = s.student_id
     WHERE s.student_id = ?
       AND (ac.register_status IS NULL OR LOWER(ac.register_status) = 'verified')
     LIMIT 1`,
    [studentId],
    (err, rows) => {
      if (err) {
        console.error("Public seller profile query error:", err);
        return res.status(500).json({ message: "Unable to load seller profile" });
      }
      if (!rows.length) {
        return res.status(404).json({ message: "Seller not found" });
      }
      res.json(rows[0]);
    },
  );
});

router.get("/seller/:id/reviews", (req, res) => {
  const studentId = Number(req.params.id);
  if (!Number.isInteger(studentId) || studentId <= 0) {
    return res.status(400).json({ message: "Invalid seller id" });
  }

  res.set("Cache-Control", "no-store");
  db.query(
    `SELECT r.review_id AS id, r.rating, r.comment, r.created_at,
            CONCAT(c.first_name, ' ', c.last_name) AS reviewer_name,
            oi.title AS artwork_title, oi.image AS artwork_image
     FROM artwork_review r
     JOIN customer c ON c.customer_id = r.customer_id
     LEFT JOIN marketplace_order_item oi ON oi.order_item_id = r.order_item_id
     JOIN student s ON s.student_id = r.seller_id
     LEFT JOIN accregistration ac ON ac.student_id = s.student_id
     WHERE r.seller_id = ?
       AND (ac.register_status IS NULL OR LOWER(ac.register_status) = 'verified')
     ORDER BY r.created_at DESC, r.review_id DESC`,
    [studentId],
    (err, rows) => {
      if (err) {
        console.error("Public seller reviews query error:", err);
        return res.status(500).json({ message: "Unable to load seller reviews" });
      }
      res.json(rows);
    },
  );
});

// Public catalog: return artwork from every seller.
router.get("/", (req, res) => {
  res.set("Cache-Control", "no-store");
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
      a.date_created,
      f.mediums_used,
      s.first_name,
      s.last_name,
      CONCAT(s.first_name, ' ', s.last_name) AS artist,
      s.profile_image,
      s.course,
      s.year_level,
      sf.shop_name,
      sf.shop_description,
      COALESCE(ac.register_status, 'available') AS status,
      ac.approved_date
    FROM artwork a
    LEFT JOIN student s ON a.student_id = s.student_id
    LEFT JOIN accregistration ac ON a.student_id = ac.student_id
    LEFT JOIN feature f ON a.artwork_id = f.artwork_id
    LEFT JOIN storefront sf ON sf.student_id = a.student_id
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
  res.set("Cache-Control", "no-store");
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
      s.first_name,
      s.last_name,
      CONCAT(s.first_name, ' ', s.last_name) AS artist,
      s.profile_image,
      s.course,
      s.year_level,
      sf.shop_name,
      sf.shop_description,
      ac.register_status,
      ac.approved_date
    FROM artwork a
    LEFT JOIN student s ON a.student_id = s.student_id
    LEFT JOIN accregistration ac ON a.student_id = ac.student_id
    LEFT JOIN feature f ON a.artwork_id = f.artwork_id
    LEFT JOIN storefront sf ON sf.student_id = a.student_id
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
