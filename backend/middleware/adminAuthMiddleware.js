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

      const normalizedRole = String(user.role || "").trim().toLowerCase().replace(/[\s_-]+/g, "");
      const ALLOWED_ADMIN_ROLES = new Set(["admin", "superadmin", "moderator", "customize"]);

      if (user.role && !ALLOWED_ADMIN_ROLES.has(normalizedRole)) {
        return res.status(403).json({ message: "Access denied. Admin privileges required." });
      }

      const proceed = () => {
        req.user = { ...user, admin_id: adminId, role: user.role || "admin" };
        next();
      };

      if (user.password_changed !== undefined && db?.query) {
        db.query(
          "SELECT password_changed FROM admin WHERE admin_id = ?",
          [adminId],
          (error, results) => {
            if (!error && Array.isArray(results) && results.length > 0) {
              const currentPasswordChanged = Number(results[0].password_changed || 0);
              const tokenPasswordChanged = Number(user.password_changed || 0);
              if (tokenPasswordChanged !== currentPasswordChanged) {
                if (typeof res.clearCookie === "function") {
                  res.clearCookie("admin_token", clearAuthCookieOptions());
                }
                return res.status(401).json({
                  message: "Session has expired due to a password change or logout. Please log in again.",
                });
              }
            }
            proceed();
          },
        );
      } else {
        proceed();
      }
    },
  );
};
