import jwt from "jsonwebtoken";
import db from "../database/db.js";
import { getAccountAccess } from "../database/accountAccess.js";

export const authenticateSeller = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];

  if (!authHeader) {
    return res.status(401).json({ message: "Access denied. No token provided." });
  }
  if (!token) {
    return res.status(401).json({ message: "Invalid token format." });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: "Invalid or expired token." });
    }

    if (user.student_id) {
      return continueIfActive(req, res, next, user, user.student_id);
    }

    if (!user.student_number) {
      return res.status(403).json({ message: "Unable to identify seller." });
    }

    db.query(
      "SELECT student_id FROM student WHERE student_number = ?",
      [user.student_number],
      (dbError, results) => {
        if (dbError) {
          console.error("Unable to resolve seller:", dbError);
          return res.status(500).json({ message: "Unable to identify seller." });
        }
        if (results.length === 0) {
          return res.status(403).json({ message: "Unable to identify seller." });
        }

        continueIfActive(req, res, next, user, results[0].student_id);
      },
    );
  });
};

const continueIfActive = (req, res, next, user, studentId) => {
  getAccountAccess("seller", studentId)
    .then((access) => {
      if (access.is_banned) {
        return res.status(403).json({ message: "Seller account is banned." });
      }
      req.user = { ...user, role: "seller", student_id: studentId };
      next();
    })
    .catch(() =>
      res.status(500).json({ message: "Unable to verify account status." }),
    );
};
