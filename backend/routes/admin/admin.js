import express from "express";
import db from "../../database/db.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import bcrypt from "bcrypt";
import { authenticateAdmin } from "../../middleware/adminAuthMiddleware.js";
import { logAudit } from "../../utils/auditLogger.js";

const router = express.Router();

// Get absolute path for uploads folder
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, "..", "uploads", "uploadAdmin");

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for admin profile picture uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const originalName = path.parse(file.originalname).name;
    const ext = path.extname(file.originalname);
    const safeName = originalName.replace(/[^a-zA-Z0-9_-]/g, "_");

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

const toBoolean = (value) =>
  value === true ||
  value === 1 ||
  ["1", "true"].includes(String(value).toLowerCase());

const auditAdminUpdate = async (req, id, status, information) => {
  const isOwnAccount = String(req.user?.admin_id) === String(id);
  try {
    await logAudit({
      action: isOwnAccount
        ? "UPDATE_ACCOUNT_INFORMATION"
        : "UPDATE_ADMIN_ACCOUNT",
      actor: req.user?.username || req.user?.admin_id,
      role: req.user?.role || "Admin",
      status,
      information,
    });
  } catch (auditError) {
    console.error("Unable to record admin update audit:", auditError.message);
  }
};

// 🟢 Get all admin accounts
router.get("/", authenticateAdmin, (req, res) => {
  const sql = `
    SELECT 
      admin_id,
      username,
      first_name,
      last_name,
      email,
      role,
      can_add,
      can_edit,
      can_delete,
      password_changed,
      image,
      created_at AS date_created
    FROM admin
    ORDER BY admin_id ASC
  `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// 🔍 Get single admin by ID
router.get("/:id", authenticateAdmin, (req, res) => {
  const { id } = req.params;
  const sql = `
    SELECT 
      admin_id,
      username,
      first_name,
      last_name,
      email,
      role,
      can_add,
      can_edit,
      can_delete,
      password_changed,
      image,
      created_at AS date_created
    FROM admin
    WHERE admin_id = ?
  `;
  db.query(sql, [id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0)
      return res.status(404).json({ error: "Admin not found" });
    res.json(results[0]);
  });
});

// ➕ Add new admin account
router.post(
  "/",
  authenticateAdmin,
  upload.single("image"),
  async (req, res) => {
    const {
      username,
      password,
      first_name,
      last_name,
      email,
      role = "admin",
      can_add = 1,
      can_edit = 1,
      can_delete = 1,
    } = req.body;

    if (!username || !password || !first_name || !last_name || !email) {
      return res
        .status(400)
        .json({ error: "Please fill in all required fields." });
    }

    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const imageName = req.file ? req.file.filename : null;

      const sql = `
      INSERT INTO admin 
      (username, password, first_name, last_name, email, role, can_add, can_edit, can_delete, password_changed, image) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
    `;

      db.query(
        sql,
        [
          username.trim(),
          hashedPassword,
          first_name.trim(),
          last_name.trim(),
          email.trim(),
          role,
          toBoolean(can_add) ? 1 : 0,
          toBoolean(can_edit) ? 1 : 0,
          toBoolean(can_delete) ? 1 : 0,
          imageName,
        ],
        (err, result) => {
          if (err) {
            if (err.code === "ER_DUP_ENTRY") {
              return res
                .status(400)
                .json({ error: "Username or email already exists." });
            }
            return res.status(500).json({ error: err.message });
          }
          res.json({
            message: "✅ Admin created successfully",
            id: result.insertId,
          });
        },
      );
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);

// ✏️ Update admin account
router.put(
  "/:id",
  authenticateAdmin,
  upload.single("image"),
  async (req, res) => {
    const { id } = req.params;
    const {
      username,
      password,
      first_name,
      last_name,
      email,
      role,
      can_add,
      can_edit,
      can_delete,
      image,
    } = req.body;

    try {
      const updates = [];
      const values = [];

      if (username) {
        updates.push("username = ?");
        values.push(username.trim());
      }

      if (first_name) {
        updates.push("first_name = ?");
        values.push(first_name.trim());
      }

      if (last_name) {
        updates.push("last_name = ?");
        values.push(last_name.trim());
      }

      if (email) {
        updates.push("email = ?");
        values.push(email.trim());
      }

      if (role) {
        updates.push("role = ?");
        values.push(role);
      }

      if (can_add !== undefined) {
        updates.push("can_add = ?");
        values.push(toBoolean(can_add) ? 1 : 0);
      }

      if (can_edit !== undefined) {
        updates.push("can_edit = ?");
        values.push(toBoolean(can_edit) ? 1 : 0);
      }

      if (can_delete !== undefined) {
        updates.push("can_delete = ?");
        values.push(toBoolean(can_delete) ? 1 : 0);
      }

      if (req.file) {
        updates.push("image = ?");
        values.push(req.file.filename);
      } else if (image !== undefined) {
        updates.push("image = ?");
        values.push(image);
      }

      if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        updates.push("password = ?");
        values.push(hashedPassword);
        updates.push("password_changed = password_changed + 1");
      }

      if (updates.length === 0) {
        await auditAdminUpdate(
          req,
          id,
          "FAILED",
          "No account information changes provided",
        );
        return res.status(400).json({ error: "No fields provided to update." });
      }

      values.push(id);
      const sql = `UPDATE admin SET ${updates.join(", ")} WHERE admin_id = ?`;

      db.query(sql, values, async (err) => {
        if (err) {
          if (err.code === "ER_DUP_ENTRY") {
            await auditAdminUpdate(
              req,
              id,
              "FAILED",
              "Username or email already exists",
            );
            return res
              .status(400)
              .json({ error: "Username or email already exists." });
          }
          await auditAdminUpdate(req, id, "FAILED", err.message);
          return res.status(500).json({ error: err.message });
        }
        await auditAdminUpdate(
          req,
          id,
          "SUCCESS",
          "Account information updated successfully",
        );
        res.json({ message: "✅ Admin account updated successfully" });
      });
    } catch (error) {
      await auditAdminUpdate(req, id, "FAILED", error.message);
      res.status(500).json({ error: error.message });
    }
  },
);

// ❌ Delete admin account
router.delete("/:id", authenticateAdmin, (req, res) => {
  const { id } = req.params;

  db.query(
    "SELECT image FROM admin WHERE admin_id = ?",
    [id],
    (err, results) => {
      if (results && results[0]?.image) {
        const imagePath = path.join(uploadDir, results[0].image);
        if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
      }

      db.query("DELETE FROM admin WHERE admin_id = ?", [id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "✅ Admin account deleted successfully" });
      });
    },
  );
});

export default router;
