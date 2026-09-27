import express from "express";
import db from "../../database/db.js";
import { authenticateSeller } from "../../middleware/sellerAuthMiddleware.js";

const router = express.Router();

const normalizeOptionalText = (value) => {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text === "" ? null : text;
};

router.get("/", authenticateSeller, (req, res) => {
  const studentId = req.user?.student_id;

  db.query(
    `SELECT storefront_id, student_id, shop_name, shop_description, created_at, updated_at
     FROM storefront
     WHERE student_id = ?
     LIMIT 1`,
    [studentId],
    (err, results) => {
      if (err) {
        console.error("Get storefront DB error:", err);
        return res
          .status(500)
          .json({ message: "Database error loading storefront." });
      }

      if (results.length === 0) {
        return res.json({
          storefront_id: null,
          student_id: studentId,
          shop_name: null,
          shop_description: null,
        });
      }

      res.json(results[0]);
    },
  );
});

router.put("/", authenticateSeller, (req, res) => {
  const studentId = req.user?.student_id;
  const shopName = normalizeOptionalText(req.body?.shop_name);
  const shopDescription = normalizeOptionalText(req.body?.shop_description);

  if (!studentId) {
    return res.status(403).json({ message: "Unable to identify seller." });
  }

  db.query(
    "SELECT storefront_id FROM storefront WHERE student_id = ?",
    [studentId],
    (selectErr, rows) => {
      if (selectErr) {
        console.error("Storefront lookup error:", selectErr);
        return res
          .status(500)
          .json({ message: "Database error checking storefront." });
      }

      const payload = [shopName, shopDescription, studentId];

      if (rows.length > 0) {
        db.query(
          "UPDATE storefront SET shop_name = ?, shop_description = ?, updated_at = CURRENT_TIMESTAMP WHERE student_id = ?",
          payload,
          (updateErr) => {
            if (updateErr) {
              console.error("Update storefront DB error:", updateErr);
              return res
                .status(500)
                .json({ message: "Database error saving storefront." });
            }

            return res.json({
              message: "Storefront updated successfully.",
              shop_name: shopName,
              shop_description: shopDescription,
            });
          },
        );
        return;
      }

      db.query(
        "INSERT INTO storefront (student_id, shop_name, shop_description) VALUES (?, ?, ?)",
        [studentId, shopName, shopDescription],
        (insertErr) => {
          if (insertErr) {
            console.error("Insert storefront DB error:", insertErr);
            return res
              .status(500)
              .json({ message: "Database error creating storefront." });
          }

          res.status(201).json({
            message: "Storefront created successfully.",
            shop_name: shopName,
            shop_description: shopDescription,
          });
        },
      );
    },
  );
});

export default router;
