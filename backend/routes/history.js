import express from "express";
import db from "../database/db.js";

const router = express.Router();

// Get transaction records by ID with products
router.get("/:id", (req, res) => {
  const { id } = req.params;

  db.query(
    "SELECT * FROM transactions WHERE transaction_id = ?",
    [id],
    (err, transactionResults) => {
      if (err) {
        console.error("Error fetching transaction:", err);
        return res.status(500).json({ message: "Failed to fetch transaction", error: err.message });
      }

      if (transactionResults.length === 0) {
        return res.status(404).json({ message: "Transaction not found" });
      }

      db.query(
        `SELECT tp.*, p.name, p.price 
         FROM transaction_products tp
         JOIN products p ON tp.product_id = p.product_id
         WHERE tp.transaction_id = ?`,
        [id],
        (err, productResults) => {
          if (err) {
            console.error("Error fetching products:", err);
            return res.status(500).json({ message: "Failed to fetch products", error: err.message });
          }

          res.json({
            transaction: transactionResults[0],
            products: productResults,
          });
        }
      );
    }
  );
});

export default router;