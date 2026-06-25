import express from "express";
import db from "../database/db.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// Get port number
router.get("/", authenticateToken, (req, res) => {
  const query = `
    SELECT * FROM port
  `;

  db.query(query, [req.user.id], (err, results) => {
    if (err) {
      console.error("❌ Error fetching port number:", err.message);
      return res.status(500).json({ error: err.message });
    }
    res.json(results || []);
  });
});

// Update port number
router.put("/:id", authenticateToken, (req, res) => {
  const { id } = req.params;
  const { port_number } = req.body;

  db.query(
    "UPDATE port SET port_number = ? WHERE port_id = ?",
    [port_number, id],
    (err) => {
      if (err) {
        console.error("❌ Error updating port number:", err.message);
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: "Port number updated successfully" });
    }
  );
});

export default router;
