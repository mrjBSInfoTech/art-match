import jwt from "jsonwebtoken";
import { getAccountAccess } from "../database/accountAccess.js";

export const authenticateBuyer = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];

  if (!authHeader) {
    return res
      .status(401)
      .json({ message: "Access denied. No token provided." });
  }
  if (!token) {
    return res.status(401).json({ message: "Invalid token format." });
  }

  jwt.verify(
    token,
    process.env.JWT_SECRET || "your_secret_key",
    (err, user) => {
      if (err) {
        return res.status(403).json({ message: "Invalid or expired token." });
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
