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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, "..", "..", "uploads", "admin", "uploadAdmin");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

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

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
});

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

// 🟢 Get all admin accounts with roles
router.get("/", authenticateAdmin, (req, res) => {
  const sql = `
    SELECT 
      a.admin_id,
      a.username,
      a.first_name,
      a.last_name,
      a.email,
      a.image,
      a.password_changed,
      ar.role,
      ar.can_add,
      ar.can_edit,
      ar.can_delete,
      ar.can_promote,
      ar.can_demote,
      ar.created_at,
      ar.updated_at
    FROM admin a
    LEFT JOIN admin_role ar ON a.admin_id = ar.admin_id
    ORDER BY a.admin_id ASC
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
      a.admin_id,
      a.username,
      a.first_name,
      a.last_name,
      a.email,
      a.image,
      a.password_changed,
      ar.role,
      ar.can_add,
      ar.can_edit,
      ar.can_delete,
      ar.can_promote,
      ar.can_demote,
      ar.created_at,
      ar.updated_at
    FROM admin a
    LEFT JOIN admin_role ar ON a.admin_id = ar.admin_id
    WHERE a.admin_id = ?
  `;
  db.query(sql, [id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0)
      return res.status(404).json({ error: "Admin not found" });
    res.json(results[0]);
  });
});

// ➕ Add new admin account and assign role/permissions
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
      can_add = 0,
      can_edit = 0,
      can_delete = 0,
      can_promote = 0,
      can_demote = 0,
    } = req.body;

    if (!username || !password || !first_name || !last_name || !email) {
      return res
        .status(400)
        .json({ error: "Please fill in all required fields." });
    }

    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const imageName = req.file ? req.file.filename : null;

      db.beginTransaction((err) => {
        if (err) return res.status(500).json({ error: err.message });

        const sqlAdmin = `
          INSERT INTO admin (username, password, first_name, last_name, email, password_changed, image) 
          VALUES (?, ?, ?, ?, ?, 0, ?)
        `;

        db.query(
          sqlAdmin,
          [
            username.trim(),
            hashedPassword,
            first_name.trim(),
            last_name.trim(),
            email.trim(),
            imageName,
          ],
          (err, result) => {
            if (err) {
              return db.rollback(() => {
                if (err.code === "ER_DUP_ENTRY") {
                  return res
                    .status(400)
                    .json({ error: "Username or email already exists." });
                }
                return res.status(500).json({ error: err.message });
              });
            }

            const newAdminId = result.insertId;

            const sqlRole = `
              INSERT INTO admin_role (admin_id, role, can_add, can_edit, can_delete, can_promote, can_demote)
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `;

            db.query(
              sqlRole,
              [
                newAdminId,
                role,
                toBoolean(can_add) ? 1 : 0,
                toBoolean(can_edit) ? 1 : 0,
                toBoolean(can_delete) ? 1 : 0,
                toBoolean(can_promote) ? 1 : 0,
                toBoolean(can_demote) ? 1 : 0,
              ],
              (err) => {
                if (err) {
                  return db.rollback(() => {
                    res.status(500).json({ error: err.message });
                  });
                }

                db.commit((err) => {
                  if (err) {
                    return db.rollback(() => {
                      res.status(500).json({ error: err.message });
                    });
                  }

                  res.json({
                    message: "✅ Admin created successfully",
                    id: newAdminId,
                  });
                });
              }
            );
          }
        );
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// ✏️ Update admin account and permissions
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
      can_promote,
      can_demote,
      image,
    } = req.body;

    try {
      db.beginTransaction(async (err) => {
        if (err) return res.status(500).json({ error: err.message });

        const adminUpdates = [];
        const adminValues = [];

        if (username) {
          adminUpdates.push("username = ?");
          adminValues.push(username.trim());
        }
        if (first_name) {
          adminUpdates.push("first_name = ?");
          adminValues.push(first_name.trim());
        }
        if (last_name) {
          adminUpdates.push("last_name = ?");
          adminValues.push(last_name.trim());
        }
        if (email) {
          adminUpdates.push("email = ?");
          adminValues.push(email.trim());
        }
        if (req.file) {
          adminUpdates.push("image = ?");
          adminValues.push(req.file.filename);
        } else if (image !== undefined) {
          adminUpdates.push("image = ?");
          adminValues.push(image);
        }
        if (password) {
          const hashedPassword = await bcrypt.hash(password, 10);
          adminUpdates.push("password = ?");
          adminValues.push(hashedPassword);
          adminUpdates.push("password_changed = password_changed + 1");
        }

        const roleUpdates = [];
        const roleValues = [];

        if (role) {
          roleUpdates.push("role = ?");
          roleValues.push(role);
        }
        if (can_add !== undefined) {
          roleUpdates.push("can_add = ?");
          roleValues.push(toBoolean(can_add) ? 1 : 0);
        }
        if (can_edit !== undefined) {
          roleUpdates.push("can_edit = ?");
          roleValues.push(toBoolean(can_edit) ? 1 : 0);
        }
        if (can_delete !== undefined) {
          roleUpdates.push("can_delete = ?");
          roleValues.push(toBoolean(can_delete) ? 1 : 0);
        }
        if (can_promote !== undefined) {
          roleUpdates.push("can_promote = ?");
          roleValues.push(toBoolean(can_promote) ? 1 : 0);
        }
        if (can_demote !== undefined) {
          roleUpdates.push("can_demote = ?");
          roleValues.push(toBoolean(can_demote) ? 1 : 0);
        }

        if (adminUpdates.length === 0 && roleUpdates.length === 0) {
          return db.rollback(async () => {
            await auditAdminUpdate(req, id, "FAILED", "No changes provided");
            return res.status(400).json({ error: "No fields provided to update." });
          });
        }

        const runAdminUpdate = (cb) => {
          if (adminUpdates.length === 0) return cb(null);
          adminValues.push(id);
          const sql = `UPDATE admin SET ${adminUpdates.join(", ")} WHERE admin_id = ?`;
          db.query(sql, adminValues, cb);
        };

        const runRoleUpdate = (cb) => {
          if (roleUpdates.length === 0) return cb(null);
          roleValues.push(id);
          const sql = `UPDATE admin_role SET ${roleUpdates.join(", ")} WHERE admin_id = ?`;
          db.query(sql, roleValues, cb);
        };

        runAdminUpdate(async (err) => {
          if (err) {
            return db.rollback(async () => {
              const msg = err.code === "ER_DUP_ENTRY" ? "Username or email already exists." : err.message;
              await auditAdminUpdate(req, id, "FAILED", msg);
              return res.status(400).json({ error: msg });
            });
          }

          runRoleUpdate(async (err) => {
            if (err) {
              return db.rollback(async () => {
                await auditAdminUpdate(req, id, "FAILED", err.message);
                return res.status(500).json({ error: err.message });
              });
            }

            db.commit(async (err) => {
              if (err) {
                return db.rollback(async () => {
                  res.status(500).json({ error: err.message });
                });
              }

              await auditAdminUpdate(req, id, "SUCCESS", "Account information updated successfully");
              res.json({
                message: "✅ Admin account updated successfully",
                image: req.file?.filename,
              });
            });
          });
        });
      });
    } catch (error) {
      await auditAdminUpdate(req, id, "FAILED", error.message);
      res.status(500).json({ error: error.message });
    }
  }
);

// ❌ Delete admin account 
router.delete("/:id", authenticateAdmin, (req, res) => {
  const { id } = req.params;

  db.query("SELECT image FROM admin WHERE admin_id = ?", [id], (err, results) => {
    if (results && results[0]?.image) {
      const imagePath = path.join(uploadDir, results[0].image);
      if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    }

    db.query("DELETE FROM admin WHERE admin_id = ?", [id], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "✅ Admin account deleted successfully" });
    });
  });
});

export default router;