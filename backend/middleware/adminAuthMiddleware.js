import jwt from "jsonwebtoken";
import db from "../database/db.js";
import { clearAuthCookieOptions } from "../utils/authCookies.js";
import { getJwtSecret } from "../utils/jwtSecret.js";

export const authenticateAdmin = (req, res, next) => {
  const token =
    req.cookies?.admin_token ||
    (req.headers?.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.split(" ")[1]
      : req.headers?.authorization?.split(" ")[1]);

  if (!token) {
    return res
      .status(401)
      .json({ message: "Access denied. No token provided." });
  }

  jwt.verify(
    token,
    getJwtSecret(),
    { algorithms: ["HS256"] },
    (err, user) => {
      if (err) {
        if (typeof res.clearCookie === "function") {
          res.clearCookie("admin_token", clearAuthCookieOptions());
        }
        return res.status(401).json({ message: "Invalid or expired token." });
      }

      const adminId = user.admin_id;
      if (!adminId) {
        return res.status(403).json({ message: "Unable to identify admin." });
      }

      const ALLOWED_ADMIN_ROLES = new Set(["admin", "superadmin", "moderator", "customize"]);
      db.query(
        `SELECT a.password_changed, ar.role,
                COALESCE(aa.is_banned, 0) AS is_banned
         FROM admin a
         LEFT JOIN admin_role ar ON ar.admin_id = a.admin_id
         LEFT JOIN account_access aa
           ON aa.role = 'admin' AND aa.account_id = a.admin_id
         WHERE a.admin_id = ?
         LIMIT 1`,
        [adminId],
        (error, results) => {
          if (error) {
            return res.status(500).json({ message: "Unable to verify admin account status." });
          }
          const current = results?.[0];
          if (!current) {
            if (typeof res.clearCookie === "function") {
              res.clearCookie("admin_token", clearAuthCookieOptions());
            }
            return res.status(401).json({ message: "Admin account no longer exists." });
          }

          const normalizedRole = String(current.role || "")
            .trim()
            .toLowerCase()
            .replace(/[\s_-]+/g, "");
          if (!ALLOWED_ADMIN_ROLES.has(normalizedRole)) {
            return res.status(403).json({ message: "Access denied. Admin privileges required." });
          }
          if (Number(current.is_banned)) {
            return res.status(403).json({ message: "Admin account is banned." });
          }

          const tokenPasswordChanged = Number(user.password_changed || 0);
          const currentPasswordChanged = Number(current.password_changed || 0);
          if (user.password_changed !== undefined && tokenPasswordChanged !== currentPasswordChanged) {
            if (typeof res.clearCookie === "function") {
              res.clearCookie("admin_token", clearAuthCookieOptions());
            }
            return res.status(401).json({
              message: "Session has expired due to a password change or logout. Please log in again.",
            });
          }

          req.user = { ...user, admin_id: adminId, role: current.role };
          next();
        },
      );
    },
  );
};
