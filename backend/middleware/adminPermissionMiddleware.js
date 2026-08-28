import db from "../database/db.js";

const permissionColumns = new Set([
  "can_add",
  "can_edit",
  "can_delete",
  "can_promote",
  "can_demote",
]);

const roleRank = {
  customize: 1,
  moderator: 2,
  admin: 3,
  "super admin": 4,
};

export const requireAdminPermission = (permission) => (req, res, next) => {
  if (!permissionColumns.has(permission)) {
    return res.status(500).json({ message: "Invalid admin permission." });
  }

  db.query(
    "SELECT role, can_add, can_edit, can_delete, can_promote, can_demote FROM admin_role WHERE admin_id = ?",
    [req.user.admin_id],
    (error, results) => {
      if (error)
        return res
          .status(500)
          .json({ message: "Unable to verify admin permissions." });
      const access = results[0];
      if (!access)
        return res
          .status(403)
          .json({ message: "Admin role is not configured." });

      const fixedPermissions = {
        admin: new Set(["can_add", "can_edit", "can_delete"]),
        moderator: new Set(["can_add", "can_edit"]),
      };
      const hasAssignedPermission = ["1", "true"].includes(
        String(access[permission]).toLowerCase(),
      );
      const allowed =
        access.role === "super admin" ||
        fixedPermissions[access.role]?.has(permission) ||
        (access.role === "customize" && hasAssignedPermission);
      if (allowed) {
        req.adminAccess = access;
        return next();
      }

      return res.status(403).json({
        message: `Your admin role cannot ${permission.replace("can_", "")}.`,
      });
    },
  );
};

export const requireAdminRoleManagement = (req, res, next) => {
  db.query(
    "SELECT role FROM admin_role WHERE admin_id = ?",
    [req.user.admin_id],
    (error, results) => {
      if (error)
        return res
          .status(500)
          .json({ message: "Unable to verify admin role." });
      const role = results[0]?.role;
      req.adminRole = role;
      if (role === "super admin" || role === "admin") return next();
      return res.status(403).json({
        message: "Only Super Admins and Admins can assign admin access.",
      });
    },
  );
};

export const requireLowerAdmin = (permission) => (req, res, next) => {
  requireAdminPermission(permission)(req, res, () => {
    db.query(
      "SELECT role FROM admin_role WHERE admin_id = ?",
      [req.params.id],
      (error, results) => {
        if (error)
          return res
            .status(500)
            .json({ message: "Unable to verify target admin role." });
        const actorRank = roleRank[req.adminAccess.role];
        const targetRole = results[0]?.role;
        const targetRank = roleRank[targetRole];
        if (!targetRank)
          return res
            .status(404)
            .json({ message: "Target admin role is not configured." });
        if (targetRank >= actorRank) {
          return res.status(403).json({
            message:
              "You cannot manage an admin with equal or higher permission.",
          });
        }
        return next();
      },
    );
  });
};

export const requireLowerAdminOrSelf = (permission) => (req, res, next) => {
  if (String(req.params.id) === String(req.user.admin_id)) {
    req.isOwnAdminAccount = true;
    return next();
  }
  return requireLowerAdmin(permission)(req, res, next);
};
