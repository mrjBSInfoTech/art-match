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
import { uploadToB2, deleteFromB2 } from "../../utils/b2Storage.js";

const router = express.Router();

// All statements in a transaction must use the same pooled connection.
async function withAdminTransaction(work) {
  const connection = await db.promise().getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback().catch((rollbackError) => {
      console.error("Admin transaction rollback failed:", rollbackError.message);
    });
    throw error;
  } finally {
    connection.release();
  }
}


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

const ADMIN_B2_PREFIX = "app-uploads/admin/uploadAdmin";

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

    const uniquePart = `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;

    cb(null, `${uniquePart}-${safeName}${ext}`);
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

      const newRole = roleOrder[nextIndex];
      const permissions = rolePermissions(newRole);

      // Special case: if promoting to super admin, demote the existing super admin to admin
      if (direction > 0 && newRole === "super admin") {
        // First, find and demote the current super admin
        db.query(
          "SELECT admin_id FROM admin_role WHERE role = ? AND admin_id != ?",
          ["super admin", targetId],
          (findError, superAdminResults) => {
            if (findError)
              return res.status(500).json({ error: findError.message });

            let updateCount = 1; // Count for the target user promotion
            let updateErrors = [];

            const performUpdates = () => {
              // Demote existing super admin to admin
              if (superAdminResults.length > 0) {
                const existingSuperAdminId = superAdminResults[0].admin_id;
                const adminPermissions = rolePermissions("admin");

                db.query(
                  `UPDATE admin_role SET role = ?, can_add = ?, can_edit = ?, can_delete = ?, can_promote = ?, can_demote = ? WHERE admin_id = ?`,
                  [
                    "admin",
                    adminPermissions.can_add,
                    adminPermissions.can_edit,
                    adminPermissions.can_delete,
                    adminPermissions.can_promote,
                    adminPermissions.can_demote,
                    existingSuperAdminId,
                  ],
                  (demoteError) => {
                    if (demoteError) updateErrors.push(demoteError);
                    updateCount--;
                    if (updateCount === 0) finishUpdate();
                  },
                );
              }

              // Promote target user to super admin
              db.query(
                `UPDATE admin_role SET role = ?, can_add = ?, can_edit = ?, can_delete = ?, can_promote = ?, can_demote = ? WHERE admin_id = ?`,
                [
                  newRole,
                  permissions.can_add,
                  permissions.can_edit,
                  permissions.can_delete,
                  permissions.can_promote,
                  permissions.can_demote,
                  targetId,
                ],
                (promoteError) => {
                  if (promoteError) updateErrors.push(promoteError);
                  updateCount--;
                  if (updateCount === 0) finishUpdate();
                },
              );
            };

            const finishUpdate = () => {
              if (updateErrors.length > 0) {
                return res.status(500).json({ error: updateErrors[0].message });
              }
              res.json({
                message: `Admin promoted to Super Admin successfully. Previous Super Admin has been demoted to Admin.`,
                role: newRole,
              });
            };

            performUpdates();
          },
        );
      } else {
        // Normal promotion/demotion
        db.query(
          `UPDATE admin_role SET role = ?, can_add = ?, can_edit = ?, can_delete = ?, can_promote = ?, can_demote = ? WHERE admin_id = ?`,
          [
            newRole,
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
              role: newRole,
            });
          },
        );
      }
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
      ar.rejected_at
      ar.rejection_reasonr
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
    let uploadedB2Key = null;
    let transactionCommitted = false;

    try {
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
        return res.status(400).json({
          error: "Please fill in all required fields.",
        });
      }

      const creatableRoles = {
        "super admin": ["admin", "moderator", "customize"],

        admin: ["moderator", "customize"],

        moderator: ["customize"],

        customize: ["customize"],
      };

      const currentUserRole = req.adminRole || "admin";

      const allowedRoles = creatableRoles[currentUserRole] || [];

      if (!allowedRoles.includes(role)) {
        return res.status(403).json({
          error: `Your role cannot create ${role} accounts. Allowed roles: ${
            allowedRoles.join(", ") || "none"
          }.`,
        });
      }

      const permissions = rolePermissions(role, {
        can_add,
        can_edit,
        can_delete,
        can_promote,
        can_demote,
      });

      if (!permissions) {
        return res.status(400).json({
          error: "Invalid admin role.",
        });
      }

      /*
       * Upload image to B2 first.
       */
      if (req.file) {
        uploadedB2Key = `${ADMIN_B2_PREFIX}/${path.basename(
          req.file.filename,
        )}`;

        try {
          await uploadToB2({
            key: uploadedB2Key,

            body: await fs.promises.readFile(req.file.path),

            contentType: req.file.mimetype || "application/octet-stream",
          });

          console.log("Admin image uploaded to B2:", uploadedB2Key);
        } catch (b2Error) {
          console.error("Admin B2 upload failed:", b2Error.message);

          return res.status(502).json({
            error: "Admin image could not be uploaded to cloud storage.",
          });
        }
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const imageName = req.file ? req.file.filename : null;

      /*
       * Keep your Admin + Admin Role
       * creation inside one transaction.
       */
      const newAdminId = await withAdminTransaction(async (connection) => {
        const [result] = await connection.query(
          `INSERT INTO admin
            (username, password, first_name, last_name, email, password_changed, image)
           VALUES (?, ?, ?, ?, ?, 0, ?)`,
          [username.trim(), hashedPassword, first_name.trim(), last_name.trim(), email.trim(), imageName],
        );
        await connection.query(
          `INSERT INTO admin_role
            (admin_id, role, can_add, can_edit, can_delete, can_promote, can_demote)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [result.insertId, role, permissions.can_add, permissions.can_edit,
            permissions.can_delete, permissions.can_promote, permissions.can_demote],
        );
        return result.insertId;
      });

      transactionCommitted = true;

      return res.json({
        message: "✅ Admin created successfully",

        id: newAdminId,
      });
    } catch (error) {
      console.error("Admin creation error:", error);

      /*
       * If B2 succeeded but MySQL failed,
       * don't leave an orphan cloud file.
       */
      if (uploadedB2Key && !transactionCommitted) {
        try {
          await deleteFromB2(uploadedB2Key);
        } catch (cleanupError) {
          console.warn(
            "Could not clean failed admin B2 upload:",
            cleanupError.message,
          );
        }
      }

      if (error.code === "ER_DUP_ENTRY") {
        return res.status(400).json({
          error: "Username or email already exists.",
        });
      }

      return res.status(500).json({
        error: error.message || "Unable to create admin account.",
      });
    } finally {
      /*
       * Admin image is temporary locally.
       */
      if (req.file?.path) {
        await fs.promises.unlink(req.file.path).catch(() => {});
      }
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

    let uploadedB2Key = null;
    let transactionCommitted = false;

    try {
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
        return res.status(403).json({
          error:
            "You can update your personal account details, but not your admin access.",
        });
      }

      /*
       * Get current admin image.
       */
      const [currentRows] = await db.promise().query(
        `SELECT image
           FROM admin
           WHERE admin_id = ?
           LIMIT 1`,
        [id],
      );

      if (!currentRows.length) {
        return res.status(404).json({
          error: "Admin not found.",
        });
      }

      const currentAdmin = currentRows[0];

      /*
       * Upload replacement image to B2
       * before changing MySQL.
       */
      if (req.file) {
        uploadedB2Key = `${ADMIN_B2_PREFIX}/${path.basename(
          req.file.filename,
        )}`;

        try {
          await uploadToB2({
            key: uploadedB2Key,

            body: await fs.promises.readFile(req.file.path),

            contentType: req.file.mimetype || "application/octet-stream",
          });

          console.log("Updated admin image uploaded to B2:", uploadedB2Key);
        } catch (b2Error) {
          console.error("Admin B2 image upload failed:", b2Error.message);

          return res.status(502).json({
            error: "Admin image could not be uploaded to cloud storage.",
          });
        }
      }

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
          return res.status(400).json({
            error: "Invalid admin role.",
          });
        }

        if (
          req.adminRole === "admin" &&
          String(role).toLowerCase() === "super admin"
        ) {
          return res.status(403).json({
            error: "Only a Super Admin can assign the Super Admin role.",
          });
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
        await auditAdminUpdate(req, id, "FAILED", "No changes provided");

        return res.status(400).json({
          error: "No fields provided to update.",
        });
      }

      /*
       * Update admin + permissions
       * using the existing transaction.
       */
      await withAdminTransaction(async (connection) => {
        if (adminUpdates.length) {
          await connection.query(
            `UPDATE admin SET ${adminUpdates.join(", ")} WHERE admin_id = ?`,
            [...adminValues, id],
          );
        }
        if (roleUpdates.length) {
          await connection.query(
            `UPDATE admin_role SET ${roleUpdates.join(", ")} WHERE admin_id = ?`,
            [...roleValues, id],
          );
        }
      });

      transactionCommitted = true;

      /*
       * MySQL now uses the new image,
       * so the old B2 image can go.
       */
      if (
        req.file &&
        currentAdmin.image &&
        currentAdmin.image !== req.file.filename
      ) {
        const oldB2Key = `${ADMIN_B2_PREFIX}/${path.basename(
          currentAdmin.image,
        )}`;

        try {
          await deleteFromB2(oldB2Key);

          console.log("Old admin image deleted from B2:", oldB2Key);
        } catch (deleteError) {
          console.warn(
            "Could not delete old admin B2 image:",
            deleteError.message,
          );
        }

        /*
         * Remove an old local fallback
         * too, if one still exists.
         */
        const oldLocalPath = path.join(
          uploadDir,
          path.basename(currentAdmin.image),
        );

        if (fs.existsSync(oldLocalPath)) {
          fs.unlinkSync(oldLocalPath);
        }
      }

      await auditAdminUpdate(
        req,
        id,
        "SUCCESS",
        "Account information updated successfully",
      );

      return res.json({
        message: "✅ Admin account updated successfully",

        image: req.file?.filename,
      });
    } catch (error) {
      console.error("Admin update error:", error);

      /*
       * New cloud image should not remain
       * if MySQL rejected the update.
       */
      if (uploadedB2Key && !transactionCommitted) {
        try {
          await deleteFromB2(uploadedB2Key);
        } catch (cleanupError) {
          console.warn(
            "Unable to clean failed admin B2 image:",
            cleanupError.message,
          );
        }
      }

      const message =
        error.code === "ER_DUP_ENTRY"
          ? "Username or email already exists."
          : error.message || "Unable to update admin account.";

      await auditAdminUpdate(req, id, "FAILED", message);

      return res.status(error.code === "ER_DUP_ENTRY" ? 400 : 500).json({
        error: message,
      });
    } finally {
      if (req.file?.path) {
        await fs.promises.unlink(req.file.path).catch(() => {});
      }
    }
  },
);

// ❌ Delete admin account
router.delete(
  "/:id",
  authenticateAdmin,
  requireAdminRoleManagement,
  async (req, res) => {
    const { id } = req.params;

    try {
      const [rows] = await db.promise().query(
        `SELECT image
           FROM admin
           WHERE admin_id = ?
           LIMIT 1`,
        [id],
      );

      if (!rows.length) {
        return res.status(404).json({
          error: "Admin not found.",
        });
      }

      const imageName = rows[0].image;

      /*
       * Delete database record first.
       */
      await db.promise().query(
        `DELETE FROM admin
         WHERE admin_id = ?`,
        [id],
      );

      /*
       * Then clean its B2 image.
       */
      if (imageName) {
        const b2Key = `${ADMIN_B2_PREFIX}/${path.basename(imageName)}`;

        try {
          await deleteFromB2(b2Key);

          console.log("Admin image deleted from B2:", b2Key);
        } catch (b2Error) {
          console.warn(
            "Admin was deleted, but B2 image cleanup failed:",
            b2Error.message,
          );
        }

        /*
         * Also clean any old
         * local fallback copy.
         */
        const localPath = path.join(uploadDir, path.basename(imageName));

        if (fs.existsSync(localPath)) {
          fs.unlinkSync(localPath);
        }
      }

      return res.json({
        message: "✅ Admin account deleted successfully",
      });
    } catch (error) {
      console.error("Admin deletion error:", error);

      return res.status(500).json({
        error: error.message || "Unable to delete admin account.",
      });
    }
  },
);

export default router;
