import express from "express";
import bcrypt from "bcryptjs";
import db from "../../database/db.js";
import { authenticateAdmin } from "../../middleware/adminAuthMiddleware.js";
import { requireAdminPermission } from "../../middleware/adminPermissionMiddleware.js";

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
      a.admin_id,
      COALESCE(x.strikes, 0) AS strikes,
      COALESCE(x.is_banned, FALSE) AS is_banned
    FROM student s
    LEFT JOIN accregistration a ON s.student_id = a.student_id
    LEFT JOIN account_access x ON x.role = 'seller' AND x.account_id = s.student_id
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

// ➕ Bulk Add Students from Excel/CSV
router.post(
  "/bulk",
  authenticateAdmin,
  requireAdminPermission("can_add"),
  (req, res) => {
    const students = Array.isArray(req.body?.students) ? req.body.students : [];

    if (students.length === 0) {
      return res.status(400).json({ message: "No students provided" });
    }

    const adminId = req.user?.admin_id || null;
    let createdCount = 0;

    const processStudent = (index) => {
      if (index >= students.length) {
        return res.status(201).json({
          message: `Successfully added ${createdCount} student(s)`,
          added: createdCount,
        });
      }

      createStudentRecord(
        {
          ...students[index],
          password: students[index].password || "Admin123456",
        },
        adminId,
        (err) => {
          if (err) {
            return res.status(err.status || 500).json({ message: err.message });
          }

          createdCount += 1;
          processStudent(index + 1);
        },
      );
    };

    processStudent(0);
  },
);

// ✏️ Update student profile and registration status
router.put(
  "/:id",
  authenticateAdmin,
  requireAdminPermission("can_edit"),
  (req, res) => {
    const { id } = req.params;
    const profileFields = [
      "first_name",
      "middle_name",
      "last_name",
      "birthdate",
      "email",
      "address",
      "phone_number",
      "year_level",
      "course",
      "student_number",
    ];
    const profileUpdates = profileFields.filter((field) =>
      Object.prototype.hasOwnProperty.call(req.body, field),
    );
    const { register_status } = req.body;

    if (profileUpdates.length === 0 && !register_status) {
      return res
        .status(400)
        .json({ error: "At least one student field is required" });
    }

    const updateStatus = () => {
      if (!register_status)
        return res.json({ message: "Student updated successfully" });

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
              if (insErr)
                return res.status(500).json({ error: insErr.message });
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
    };

    if (profileUpdates.length === 0) return updateStatus();

    const profileSql = `UPDATE student SET ${profileUpdates.map((field) => `${field} = ?`).join(", ")} WHERE student_id = ?`;
    db.query(
      profileSql,
      [...profileUpdates.map((field) => req.body[field] || null), id],
      (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        updateStatus();
      },
    );
  },
);
const formatDateTime = () =>
  new Date().toISOString().slice(0, 19).replace("T", " ");

const createStudentRecord = (studentData, adminId, callback) => {
  const requiredFields = [
    "first_name",
    "last_name",
    "birthdate",
    "email",
    "address",
    "phone_number",
    "year_level",
    "course",
    "student_number",
  ];

  const missingField = requiredFields.find(
    (field) => studentData[field] === undefined || studentData[field] === null || studentData[field] === "",
  );

  if (missingField) {
    return callback(
      {
        status: 400,
        message: `Missing required student field: ${missingField}`,
      },
      null,
    );
  }

  const now = formatDateTime();
  const password = studentData.password || "Admin123456";
  const passwordHash = bcrypt.hashSync(password, 10);

  const studentSql = `
    INSERT INTO student (
      first_name,
      middle_name,
      last_name,
      birthdate,
      email,
      address,
      phone_number,
      cor,
      year_level,
      course,
      student_number,
      password
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    studentSql,
    [
      studentData.first_name,
      studentData.middle_name || null,
      studentData.last_name,
      studentData.birthdate,
      studentData.email,
      studentData.address,
      studentData.phone_number,
      studentData.cor || null,
      studentData.year_level,
      studentData.course,
      studentData.student_number,
      passwordHash,
    ],
    (err, result) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY") {
          return callback(
            {
              status: 409,
              message: "Email or student number already exists",
            },
            null,
          );
        }

        return callback(
          {
            status: 500,
            message: err.message,
          },
          null,
        );
      }

      const studentId = result.insertId;
      const registrationSql = `
        INSERT INTO accregistration (
          student_id,
          registered_date,
          register_status,
          approved_date,
          admin_id
        ) VALUES (?, ?, 'verified', ?, ?)
      `;

      db.query(
        registrationSql,
        [studentId, now, now, adminId || null],
        (registrationErr) => {
          if (registrationErr) {
            return callback(
              {
                status: 500,
                message: registrationErr.message,
              },
              null,
            );
          }

          return callback(null, {
            student_id: studentId,
            register_status: "verified",
            registered_date: now,
            approved_date: now,
            admin_id: adminId || null,
          });
        },
      );
    },
  );
};

router.post(
  "/",
  authenticateAdmin,
  requireAdminPermission("can_add"),
  (req, res) => {
    const studentData = req.body || {};

    createStudentRecord(studentData, req.user?.admin_id, (err, result) => {
      if (err) {
        return res.status(err.status || 500).json({ message: err.message });
      }

      return res.status(201).json({
        message: "Student added successfully",
        student: result,
      });
    });
  },
);

router.delete(
  "/:id",
  authenticateAdmin,
  requireAdminPermission("can_delete"),
  (req, res) => {
    db.query(
      "DELETE FROM student WHERE student_id = ?",
      [req.params.id],
      (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.affectedRows === 0)
          return res.status(404).json({ error: "Student not found" });
        res.json({ message: "Student deleted successfully" });
      },
    );
  },
);
export default router;
