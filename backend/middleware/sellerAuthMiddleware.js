import jwt from "jsonwebtoken";
import db from "../database/db.js";

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
      req.user = { ...user, student_id: user.student_id};
      return next();
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

        req.user = { ...user, student_id: results[0].student_id };
        next();
      },
    );
  });
};
