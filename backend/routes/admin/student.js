import express from "express";
import db from "../../database/db.js";
import { authenticateAdmin } from "../../middleware/adminAuthMiddleware.js";

const router = express.Router();

// 🟢 Get all students, optionally filter by status
router.get("/", authenticateAdmin, (req, res) => {
  const { status } = req.query;
  let sql = `
    SELECT 
      s.student_id,
      s.first_name, 
      s.middle_name, 
      s.last_name, 
      s.birthdate, 
      s.email, 
      s.address, 
      s.phone_number, 
      s.cor, 
      s.year_level, 
      s.course, 
      s.student_number, 
      a.register_status, 
      a.registered_date,
      a.approved_date, 
      a.admin_id 
    FROM student s 
    LEFT JOIN accregistration a ON s.student_id = a.student_id
  `;
  const params = [];

  if (status) {
    sql += ` WHERE a.register_status = ?`;
    params.push(status);
  }

  sql += ` ORDER BY s.student_id ASC`;

  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// 🔍 Get single student by ID
router.get("/:id", authenticateAdmin, (req, res) => {
  const { id } = req.params;
  const sql = `
    SELECT 
      s.student_id,
      s.first_name, 
      s.middle_name, 
      s.last_name, 
      s.birthdate, 
      s.email, 
      s.address, 
      s.phone_number, 
      s.cor, 
      s.year_level, 
      s.course, 
      s.student_number, 
      a.register_status, 
      a.registered_date,
      a.approved_date, 
      a.admin_id 
    FROM student s 
    LEFT JOIN accregistration a ON s.student_id = a.student_id 
    WHERE s.student_id = ?
  `;

  db.query(sql, [id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0)
      return res.status(404).json({ error: "Student not found" });
    res.json(results[0]);
  });
});

// ✏️ Update student status
router.put("/:id", authenticateAdmin, (req, res) => {
  const { id } = req.params;
  const { register_status } = req.body;

  if (!register_status) {
    return res.status(400).json({ error: "register_status is required" });
  }

  const statusLower = String(register_status).toLowerCase();

  if (statusLower === "verified") {
    const adminId = req.user?.admin_id || null;
    const approvedDate = new Date()
      .toISOString()
      .slice(0, 19)
      .replace("T", " ");

    const updateSql = `
      UPDATE accregistration
      SET register_status = 'verified', approved_date = ?, admin_id = ?
      WHERE student_id = ?
    `;

    db.query(updateSql, [approvedDate, adminId, id], (err, result) => {
      if (err) return res.status(500).json({ error: err.message });

      if (result.affectedRows === 0) {
        // No accregistration row exists yet — insert one
        const insertSql = `
          INSERT INTO accregistration (student_id, register_status, approved_date, admin_id)
          VALUES (?, 'verified', ?, ?)
        `;
        db.query(insertSql, [id, approvedDate, adminId], (insErr) => {
          if (insErr) return res.status(500).json({ error: insErr.message });
          return res.json({ message: "Student verified successfully" });
        });
        return;
      }

      return res.json({ message: "Student verified successfully" });
    });
    return;
  }

  // For other statuses, update or insert into accregistration
  const updateSql = `UPDATE accregistration SET register_status = ? WHERE student_id = ?`;
  db.query(updateSql, [register_status, id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });

    if (result.affectedRows === 0) {
      const insertSql = `INSERT INTO accregistration (student_id, register_status) VALUES (?, ?)`;
      db.query(insertSql, [id, register_status], (insErr) => {
        if (insErr) return res.status(500).json({ error: insErr.message });
        return res.json({ message: "Student status updated" });
      });
      return;
    }

    return res.json({ message: "Student status updated" });
  });
});

// ✅ Bulk verify student registrations
router.put("/bulk/verify", authenticateAdmin, (req, res) => {
  const { ids } = req.body;
  const adminId = req.user?.admin_id || req.user?.id || null;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res
      .status(400)
      .json({ error: "An array of student IDs is required." });
  }

  const approvedDate = new Date()
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");

  const accSql = `
    UPDATE accregistration 
    SET register_status = 'verified', approved_date = ?, admin_id = ? 
    WHERE student_id IN (?)
  `;

  db.query(accSql, [approvedDate, adminId, ids], (err, result) => {
    if (err) {
      console.error("Bulk AccRegistration update DB error:", err);
      return res.status(500).json({ error: err.message });
    }

    res.json({
      message: `${result.affectedRows} student(s) verified successfully.`,
    });
  });
});

{/* // For future or possible use
// ❌ Bulk deny student registrations by deleting them
router.post("/bulk/deny", authenticateAdmin, (req, res) => {
  const { ids } = req.body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res
      .status(400)
      .json({ message: "An array of student IDs is required." });
  }

  const sql = `DELETE FROM student WHERE student_id IN (?)`;
  db.query(sql, [ids], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({
      message: `${result.affectedRows} student(s) denied successfully.`,
    });
  });
});

// ❌ Deny single student registration by deleting it
router.delete("/:id", authenticateAdmin, (req, res) => {
  const { id } = req.params;
  const sql = `DELETE FROM student WHERE student_id = ?`;

  db.query(sql, [id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Student not found" });
    res.json({ message: "Student denied successfully" });
  });
});
*/}
export default router;
