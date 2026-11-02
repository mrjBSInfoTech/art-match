import jwt from "jsonwebtoken";
import { clearAuthCookieOptions } from "../utils/authCookies.js";

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
    process.env.JWT_SECRET || "your_secret_key",
    { algorithms: ["HS256"] },
    (err, user) => {
      if (err) {
        res.clearCookie("admin_token", clearAuthCookieOptions());
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

      req.user = { ...user, admin_id: adminId, role: user.role || "admin" };
      next();
    },
  );
};
