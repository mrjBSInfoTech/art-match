
import express from "express";
import db from "../database/db.js";

const router = express.Router();

// Create a new transaction with products
router.post("/", (req, res) => {
  const { total_amount, products } = req.body;

  if (!total_amount || !products || products.length === 0) {
    return res.status(400).json({ message: "Invalid transaction data" });
  }

  // Start transaction
  db.beginTransaction((err) => {
    if (err) {
      return res.status(500).json({ message: "Failed to start transaction", error: err.message });
    }

    // Insert transaction
    db.query(
      "INSERT INTO transactions (total_amount, transaction_date) VALUES (?, NOW())",
      [total_amount],
      (err, transactionResult) => {
        if (err) {
          return db.rollback(() => {
            res.status(500).json({ message: "Failed to create transaction", error: err.message });
          });
        }

        const transactionId = transactionResult.insertId;
        let completed = 0;

        // Insert transaction products and update stock
        products.forEach((product) => {
          const { product_id, quantity, subtotal } = product;

          // Insert into transaction_products
          db.query(
            "INSERT INTO transaction_products (transaction_id, product_id, quantity, subtotal) VALUES (?, ?, ?, ?)",
            [transactionId, product_id, quantity, subtotal],
            (err) => {
              if (err) {
                return db.rollback(() => {
                  res.status(500).json({ message: "Failed to insert product", error: err.message });
                });
              }

              // Update product stock
              db.query(
                "UPDATE products SET stock = stock - ? WHERE product_id = ?",
                [quantity, product_id],
                (err) => {
                  if (err) {
                    return db.rollback(() => {
                      res.status(500).json({ message: "Failed to update stock", error: err.message });
                    });
                  }

                  completed++;

                  // If all products processed, commit transaction
                  if (completed === products.length) {
                    db.commit((err) => {
                      if (err) {
                        return db.rollback(() => {
                          res.status(500).json({ message: "Failed to commit transaction", error: err.message });
                        });
                      }

                      res.status(201).json({
                        message: "Transaction created successfully",
                        transaction_id: transactionId,
                      });
                    });
                  }
                }
              );
            }
          );
        });
      }
    );
  });
});

// Get all transactions
router.get("/", (req, res) => {
  const sql = "SELECT * FROM transactions ORDER BY transaction_date DESC";
  db.query(sql, (err, transactionResults) => {
    if (err) {
      console.error("Error fetching transactions:", err);
      return res.status(500).json({ message: "Failed to fetch transactions", error: err.message });
    }

    if (transactionResults.length === 0) {
      return res.json([]);
    }

    // Fetch products for each transaction
    let completed = 0;
    const transactions = transactionResults.map((transaction) => ({
      ...transaction,
      products: [],
    }));

    transactionResults.forEach((transaction, index) => {
      db.query(
        `SELECT tp.*, p.name as product_name, p.price 
         FROM transaction_products tp
         JOIN products p ON tp.product_id = p.product_id
         WHERE tp.transaction_id = ?`,
        [transaction.transaction_id],
        (err, productResults) => {
          if (err) {
            console.error("Error fetching products:", err);
          } else {
            transactions[index].products = productResults || [];
          }

          completed++;

          // Send response when all transactions processed
          if (completed === transactionResults.length) {
            res.json(transactions);
          }
        }
      );
    });
  });
});

export default router;