import jwt from "jsonwebtoken";
import db from "../database/db.js";
import { getAccountAccess } from "../database/accountAccess.js";

export const authenticateSeller = (req, res, next) => {
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
            return res
              .status(500)
              .json({ message: "Unable to identify seller." });
          }
          if (results.length === 0) {
            return res
              .status(403)
              .json({ message: "Unable to identify seller." });
          }

          continueIfActive(req, res, next, user, results[0].student_id);
        },
      );
    },
  );
};

const continueIfActive = (req, res, next, user, studentId) => {
  db.query(
    `SELECT expire_date, (expire_date <= CURRENT_TIMESTAMP) AS is_expired
     FROM student WHERE student_id = ?`,
    [studentId],
    (studentError, students) => {
      if (studentError) {
        console.error("Unable to verify seller expiration:", studentError);
        return res.status(500).json({ message: "Unable to verify account status." });
      }
      if (!students.length) {
        return res.status(403).json({ message: "Unable to identify seller." });
      }

      const student = students[0];
      if (student.is_expired) {
        db.query(
          "UPDATE student SET account_status = 'expired' WHERE student_id = ?",
          [studentId],
          (updateError) => {
            if (updateError) {
              console.error("Unable to mark seller account as expired:", updateError);
              return res.status(500).json({ message: "Unable to verify account status." });
            }
            return res.status(403).json({ message: "Seller account has expired." });
          },
        );
        return;
      }

      getAccountAccess("seller", studentId)
        .then((access) => {
          if (access.is_banned) {
            return res.status(403).json({ message: "Seller account is banned." });
          }
          req.user = { ...user, role: "seller", student_id: studentId };
          next();
        })
        .catch((error) => {
          console.error("Unable to verify seller access:", error);
          res.status(500).json({ message: "Unable to verify account status." });
        });
    },
  );
};
