import jwt from "jsonwebtoken";
import { getAccountAccess } from "../database/accountAccess.js";

export const authenticateBuyer = (req, res, next) => {
  const token =
    req.cookies?.buyer_token ||
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
        return res.status(403).json({ message: "Invalid or expired token." });
      }

      const normalizedRole = String(user.role || "").trim().toLowerCase().replace(/[\s_-]+/g, "");
      if (user.role && !["buyer", "customer"].includes(normalizedRole)) {
        return res.status(403).json({ message: "Access denied. Buyer privileges required." });
      }

      const customerId = user.customer_id || user.id;
      if (!customerId) {
        return res.status(403).json({ message: "Unable to identify buyer." });
      }

      getAccountAccess("buyer", customerId)
        .then((access) => {
          if (access.is_banned) {
            return res
              .status(403)
              .json({ message: "Buyer account is banned." });
          }
          req.user = { ...user, role: "buyer", customer_id: customerId };
          next();
        })
        .catch(() =>
          res.status(500).json({ message: "Unable to verify account status." }),
        );
    },
  );
};
