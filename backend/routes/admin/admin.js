import express from "express";
import db from "../../database/db.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import bcrypt from "bcrypt";
import { authenticateAdmin } from "../../middleware/adminAuthMiddleware.js";
import {
  requireAdminPermission,
  requireAdminRoleManagement,
  requireLowerAdmin,
  requireLowerAdminOrSelf,
} from "../../middleware/adminPermissionMiddleware.js";
import { logAudit } from "../../utils/auditLogger.js";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(
  __dirname,
  "..",
  "..",
  "uploads",
  "admin",
  "uploadAdmin",
);

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

const rolePermissions = (role, values = {}) => {
  const normalizedRole = String(role || "admin").toLowerCase();
  if (
    !["super admin", "admin", "moderator", "customize"].includes(normalizedRole)
  ) {
    return null;
  }
  if (normalizedRole === "super admin") {
    return {
      can_add: 1,
      can_edit: 1,
      can_delete: 1,
      can_promote: 1,
      can_demote: 1,
    };
  }
  if (normalizedRole === "admin") {
    return {
      can_add: 1,
      can_edit: 1,
      can_delete: 1,
      can_promote: 0,
      can_demote: 0,
    };
  }
  if (normalizedRole === "moderator") {
    return {
      can_add: 1,
      can_edit: 1,
      can_delete: 0,
      can_promote: 0,
      can_demote: 0,
    };
  }
  return {
    can_add: toBoolean(values.can_add) ? 1 : 0,
    can_edit: toBoolean(values.can_edit) ? 1 : 0,
    can_delete: toBoolean(values.can_delete) ? 1 : 0,
    can_promote: 0,
    can_demote: 0,
  };
};

const changeRole = (direction) => (req, res) => {
  const roleOrder = ["customize", "moderator", "admin", "super admin"];
  const targetId = req.params.id;
  db.query(
    "SELECT role FROM admin_role WHERE admin_id = ?",
    [targetId],
    (error, results) => {
      if (error) return res.status(500).json({ error: error.message });
      if (!results.length)
        return res.status(404).json({ error: "Admin role not found." });

      const currentIndex = roleOrder.indexOf(results[0].role);
      const nextIndex = currentIndex + direction;
      if (nextIndex < 0 || nextIndex >= roleOrder.length) {
        return res.status(400).json({
          error: `Admin cannot be ${direction > 0 ? "promoted" : "demoted"} further.`,
        });
      }

      const role = roleOrder[nextIndex];
      const permissions = rolePermissions(role);
      db.query(
        `UPDATE admin_role SET role = ?, can_add = ?, can_edit = ?, can_delete = ?, can_promote = ?, can_demote = ? WHERE admin_id = ?`,
        [
          role,
          permissions.can_add,
          permissions.can_edit,
          permissions.can_delete,
          permissions.can_promote,
          permissions.can_demote,
          targetId,
        ],
        (updateError) => {
          if (updateError)
            return res.status(500).json({ error: updateError.message });
          res.json({
            message: `Admin ${direction > 0 ? "promoted" : "demoted"} successfully.`,
            role,
          });
        },
      );
    },
  );
};

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

router.put(
  "/:id/promote",
  authenticateAdmin,
  requireAdminPermission("can_promote"),
  changeRole(1),
);
router.put(
  "/:id/demote",
  authenticateAdmin,
  requireAdminPermission("can_demote"),
  changeRole(-1),
);

// ➕ Add new admin account and assign role/permissions
router.post(
  "/",
  authenticateAdmin,
  requireAdminRoleManagement,
  upload.single("image"),
  async (req, res) => {
    const {
      username,
      password,
      first_name,
      last_name,
      email,
      role = "admin",
      can_add,
      can_edit,
      can_delete,
      can_promote,
      can_demote,
    } = req.body;

    if (!username || !password || !first_name || !last_name || !email) {
      return res
        .status(400)
        .json({ error: "Please fill in all required fields." });
    }

    const permissions = rolePermissions(role, {
      can_add,
      can_edit,
      can_delete,
      can_promote,
      can_demote,
    });
    if (!permissions)
      return res.status(400).json({ error: "Invalid admin role." });
    if (req.adminRole === "admin" && role === "super admin") {
      return res
        .status(403)
        .json({ error: "Only a Super Admin can assign the Super Admin role." });
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
                permissions.can_add,
                permissions.can_edit,
                permissions.can_delete,
                permissions.can_promote,
                permissions.can_demote,
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
              },
            );
          },
        );
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);

// ✏️ Update admin account and permissions
router.put(
  "/:id",
  authenticateAdmin,
  requireLowerAdminOrSelf("can_edit"),
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

    if (
      req.isOwnAdminAccount &&
      [
        "role",
        "can_add",
        "can_edit",
        "can_delete",
        "can_promote",
        "can_demote",
      ].some((field) => req.body[field] !== undefined)
    ) {
      return res
        .status(403)
        .json({
          error:
            "You can update your personal account details, but not your admin access.",
        });
    }

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
          const permissions = rolePermissions(role, req.body);
          if (!permissions) {
            return db.rollback(() =>
              res.status(400).json({ error: "Invalid admin role." }),
            );
          }
          if (
            req.adminRole === "admin" &&
            String(role).toLowerCase() === "super admin"
          ) {
            return db.rollback(() =>
              res.status(403).json({
                error: "Only a Super Admin can assign the Super Admin role.",
              }),
            );
          }
          roleUpdates.push("role = ?");
          roleValues.push(String(role).toLowerCase());
          for (const permission of Object.keys(permissions)) {
            roleUpdates.push(`${permission} = ?`);
            roleValues.push(permissions[permission]);
          }
        } else {
          for (const permission of [
            "can_add",
            "can_edit",
            "can_delete",
            "can_promote",
            "can_demote",
          ]) {
            if (req.body[permission] !== undefined) {
              roleUpdates.push(`${permission} = ?`);
              roleValues.push(toBoolean(req.body[permission]) ? 1 : 0);
            }
          }
        }

        if (adminUpdates.length === 0 && roleUpdates.length === 0) {
          return db.rollback(async () => {
            await auditAdminUpdate(req, id, "FAILED", "No changes provided");
            return res
              .status(400)
              .json({ error: "No fields provided to update." });
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
              const msg =
                err.code === "ER_DUP_ENTRY"
                  ? "Username or email already exists."
                  : err.message;
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

              await auditAdminUpdate(
                req,
                id,
                "SUCCESS",
                "Account information updated successfully",
              );
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
  },
);

// ❌ Delete admin account
router.delete(
  "/:id",
  authenticateAdmin,
  requireAdminRoleManagement,
  (req, res) => {
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
  },
);

export default router;
