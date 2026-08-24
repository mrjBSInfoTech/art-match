import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../../database/db.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { authenticateSeller } from "../../middleware/sellerAuthMiddleware.js";
import { logAudit } from "../../utils/auditLogger.js";

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
  "uploadCOR",
);

// ✅ Ensure upload folder exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ✅ Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Sanitize filename
    const fileName = file.originalname.replace(/[^a-zA-Z0-9.]/g, "_");
    cb(null, `${Date.now()}-${fileName}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
  limits: { fileSize: 2 * 1024 * 1024 },
});

// Register route
router.post("/register", upload.single("cor"), (req, res) => {
  const {
    first_name,
    middle_name,
    last_name,
    birthdate,
    email,
    address,
    phone_number,
    student_number,
    year_level,
    course,
    status,
    password,
  } = req.body;

  if (
    !first_name ||
    !middle_name ||
    !last_name ||
    !birthdate ||
    !email ||
    !address ||
    !phone_number ||
    !student_number ||
    !year_level ||
    !course ||
    !password
  ) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const corPath = req.file ? req.file.filename : null;

  const sql =
    "INSERT INTO student (first_name, middle_name, last_name, birthdate, email, address, phone_number, cor, year_level, course, student_number, password) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

  db.query(
    sql,
    [
      first_name,
      middle_name,
      last_name,
      birthdate,
      email,
      address,
      phone_number,
      corPath,
      year_level,
      course,
      student_number,
      hashedPassword,
    ],
    (err, result) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY") {
          return res
            .status(409)
            .json({ message: "Email or student number already exists" });
        }
        console.error("Database error:", err);
        return res.status(500).json({ message: "Database error" });
      }

      const studentId = result.insertId;
      const registeredDate = new Date();

      const accSql = `
        INSERT INTO accregistration (student_id, registered_date, register_status)
        VALUES (?, ?, 'pending')
      `;

      db.query(accSql, [studentId, registeredDate], (accErr) => {
        if (accErr) {
          console.error("AccRegistration DB error:", accErr);
          return res
            .status(500)
            .json({ message: "Database error recording registration" });
        }

        res.status(201).json({ message: "User registered successfully" });
      });
    },
  );
});

// Login route
router.post("/login", (req, res) => {
  const { student_number, password } = req.body;

  if (!student_number || !password) {
    return res
      .status(400)
      .json({ message: "Student number and password are required" });
  }

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
      s.password, 
      a.register_status,
      a.registered_date,
      a.approved_date
    FROM student s
    LEFT JOIN accregistration a ON s.student_id = a.student_id
    WHERE s.student_number = ?`;

  // defensive: remove any accidental trailing comma before FROM to avoid SQL syntax errors
  const normalizedSql = sql.replace(/,\s*FROM/gi, " FROM");

  db.query(normalizedSql, [student_number], (err, result) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ message: "Database error" });
    }

    if (result.length === 0) {
      logAudit({
        action: "LOGIN",
        actor: student_number,
        role: "Student",
        status: "FAILED",
        information: "Invalid student number",
      });
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = result[0];
    const isMatch = bcrypt.compareSync(password, user.password);

    if (!isMatch) {
      logAudit({
        action: "LOGIN",
        actor: student_number,
        role: "Student",
        status: "FAILED",
        information: "Invalid password",
      });
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      {
        id: user.student_id,
        student_id: user.student_id,
        student_number: user.student_number,
      },
      process.env.JWT_SECRET,
      { expiresIn: "10d" },
    );

    logAudit({
      action: "LOGIN",
      actor: user.student_number,
      role: "Student",
      status: "SUCCESS",
      information: "Student logged in",
    });
    res.json({
      token,
      student_id: user.student_id,
      first_name: user.first_name,
      middle_name: user.middle_name,
      last_name: user.last_name,
      birthdate: user.birthdate,
      email: user.email,
      address: user.address,
      phone_number: user.phone_number,
      cor: user.cor,
      year_level: user.year_level,
      student_number: user.student_number,
      course: user.course,
      register_status: user.register_status,
      registered_date: user.registered_date,
      approved_date: user.approved_date,
    });
  });
});

router.post("/logout", authenticateSeller, async (req, res) => {
  try {
    await logAudit({
      action: "LOGOUT",
      actor: req.user.student_number || req.user.student_id,
      role: "Student",
      status: "SUCCESS",
      information: "Student logged out",
    });
    res.json({ message: "Logout recorded" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Unable to record logout", error: error.message });
  }
});

export default router;
