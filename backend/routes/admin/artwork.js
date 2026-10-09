import express from "express";
import db from "../../database/db.js";
import { authenticateAdmin } from "../../middleware/adminAuthMiddleware.js";
import { requireAdminPermission } from "../../middleware/adminPermissionMiddleware.js";

const router = express.Router();

// List artwork submitted for review, approved, or rejected.
router.get("/", authenticateAdmin, (req, res) => {
  const { status } = req.query;
  const statusFilter = typeof status === "string" ? status.trim().toLowerCase() : "";

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
      au.rejection_date,
      au.rejection_reason,
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
    WHERE LOWER(TRIM(au.request_status)) IN ('pending', 'verified', 'rejected')
  `;

  const params = [];

  if (statusFilter && statusFilter !== "all") {
    sql += " AND LOWER(TRIM(au.request_status)) = ?";
    params.push(statusFilter);
  }

  const orderBy =
    statusFilter === "verified"
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
      au.rejection_date,
      au.rejection_reason,
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
    const allowed = ["verified", "pending", "rejected"];
    if (!allowed.includes(status)) {
      return res
        .status(400)
        .json({ error: `Status must be one of: ${allowed.join(", ")}` });
    }

    const rejectionReason = status === "rejected"
      ? (typeof req.body.rejection_reason === "string" ? req.body.rejection_reason.trim() : "")
      : null;
    if (status === "rejected" && !rejectionReason) {
      return res.status(400).json({ error: "A rejection reason is required." });
    }
    if (rejectionReason && rejectionReason.length > 5000) {
      return res.status(400).json({ error: "Rejection reason must be 5000 characters or fewer." });
    }

    const selectSql = "SELECT artwork_id FROM artwork WHERE artwork_id = ?";
    db.query(selectSql, [id], (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      if (results.length === 0)
        return res.status(404).json({ error: "Artwork not found" });

      const approvedDate = status === "verified" ? new Date() : null;
      const rejectionDate = status === "rejected" ? new Date() : null;

      const checkUploadSql =
        "SELECT artupload_id FROM artupload WHERE artwork_id = ?";
      db.query(checkUploadSql, [id], (checkErr, uploadResults) => {
        if (checkErr) return res.status(500).json({ error: checkErr.message });

        if (uploadResults && uploadResults.length > 0) {
          // Update existing record
          const updateSql = `
          UPDATE artupload
          SET request_status = ?, admin_id = ?, approved_date = ?,
              rejection_date = ?, rejection_reason = ?
          WHERE artwork_id = ?
        `;
          db.query(
            updateSql,
            [status, adminId, approvedDate, rejectionDate, rejectionReason, id],
            (updateErr) => {
              if (updateErr)
                return res.status(500).json({ error: updateErr.message });

              return res.json({
                message: "Artwork status updated successfully",
              });
            },
          );
        } else {
          // Insert new record into artupload
          const insertSql = `
          INSERT INTO artupload (artwork_id, admin_id, request_status, request_date, approved_date, rejection_date, rejection_reason)
          VALUES (?, ?, ?, NOW(), ?, ?, ?)
        `;
          db.query(
            insertSql,
            [id, adminId, status, approvedDate, rejectionDate, rejectionReason],
            (insertErr) => {
              if (insertErr)
                return res.status(500).json({ error: insertErr.message });

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
