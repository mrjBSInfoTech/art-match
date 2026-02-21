import express from "express";
import db from "../database/db.js";

const router = express.Router();

// GET /sales?filter=day&date=2025-02-01
router.get("/", (req, res) => {
  const filter = req.query.filter || "day";
  const date = req.query.date || new Date().toISOString().split("T")[0];

  console.log(`📊 Sales API called - Filter: ${filter}, Date: ${date}`);

  let query = "";
  let params = [];

  switch (filter) {
    case "day":
      query = `
    SELECT
      HOUR(transaction_date) AS label,
      COUNT(*) AS transaction_count,
      COALESCE(SUM(total_amount), 0) AS total_sales
    FROM transactions
    WHERE DATE(transaction_date) = ?
    GROUP BY HOUR(transaction_date)
    ORDER BY HOUR(transaction_date)
  `;
      params = [date];
      break;

    case "week": {
      const d = new Date(date);
      const sunday = new Date(d);
      sunday.setDate(d.getDate() - d.getDay());

      const saturday = new Date(sunday);
      saturday.setDate(sunday.getDate() + 6);

      query = `
        SELECT 
          DATE(transaction_date) AS label,
          COUNT(*) AS transaction_count,
          COALESCE(SUM(total_amount), 0) AS total_sales
        FROM transactions
        WHERE DATE(transaction_date) BETWEEN ? AND ?
        GROUP BY DATE(transaction_date)
        ORDER BY DATE(transaction_date)
      `;
      params = [
        sunday.toISOString().split("T")[0],
        saturday.toISOString().split("T")[0],
      ];
      break;
    }

    case "month": {
      const d = new Date(date);
      query = `
    SELECT
      MONTH(transaction_date) AS label,
      COUNT(*) AS transaction_count,
      COALESCE(SUM(total_amount), 0) AS total_sales
    FROM transactions
    WHERE YEAR(transaction_date) = ?
    GROUP BY MONTH(transaction_date)
    ORDER BY MONTH(transaction_date)
  `;
      params = [d.getFullYear()];
      break;
    }

    case "year": {
      query = `
        SELECT 
          YEAR(transaction_date) AS label,
          COUNT(*) AS transaction_count,
          COALESCE(SUM(total_amount), 0) AS total_sales
        FROM transactions
        WHERE YEAR(transaction_date) BETWEEN 2025 AND 2035
        GROUP BY YEAR(transaction_date)
        ORDER BY YEAR(transaction_date)
      `;
      params = [];
      break;
    }
    default:
      return res.status(400).json({ error: "Invalid filter type" });
  }

  console.log(`📋 Executing query with params:`, params);

  db.query(query, params, (err, results) => {
    if (err) {
      console.error("❌ Error fetching sales summary:", err.message);
      return res.status(500).json({
        status: "error",
        message: "Failed to fetch sales summary",
        error: err.message,
      });
    }

    console.log(`✅ Sales data retrieved:`, results[0]);
    const arrayFilters = ["day","week", "month", "year"];

    res.json({
      status: "success",
      data: arrayFilters.includes(filter)
        ? results
        : results[0] || { transaction_count: 0, total_sales: 0 },
    });
  });
});

export default router;
