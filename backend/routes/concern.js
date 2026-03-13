import express from "express";
import db from "../database/db.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// 📖 Urgency Dictionary (English & Tagalog)
const classifyMessage = (text) => {
  const content = text.toLowerCase();

  const keywords = {
    high: ["fire", "sunog", "accident", "aksidente", "emergency", "tulong", "help", "crime", "krimen", "magnanakaw", "robbery", "danger", "panganib"],
    medium: ["dispute", "away", "reklamo", "complaint", "ingay", "noise", "basura", "trash", "utang", "debt", "argument"],
    low: ["gossip", "chismis", "tanong", "question", "inquiry", "update", "balita", "meeting", "pulong", "info"]
  };

  if (keywords.high.some(word => content.includes(word))) return "High";
  if (keywords.medium.some(word => content.includes(word))) return "Medium";
  return "Low"; // Defaults to Low if no major keywords found
};

// 🟢 GET all messages
router.get("/", authenticateToken, (req, res) => {
  const sql = "SELECT * FROM message ORDER BY date_posted DESC";
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// 🔍 GET single message by ID
router.get("/:id", authenticateToken, (req, res) => {
  const { id } = req.params;
  const sql = "SELECT * FROM message WHERE message_id = ?";
  db.query(sql, [id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ error: "Message not found" });
    res.json(results[0]);
  });
});

// ➕ POST: Add and Automatically Classify Message
router.post("/", authenticateToken, (req, res) => {
  const { user_id, message_content } = req.body; // Assuming 'message_content' is sent from frontend

  if (!message_content) {
    return res.status(400).json({ error: "Message content is required." });
  }

  // Auto-generate values based on dictionary
  const urgency = classifyMessage(message_content);
  const type = urgency === "High" ? "Emergency" : urgency === "Medium" ? "Dispute" : "General";
  const status = "Pending"; // Initial status

  const sql = `
    INSERT INTO message (user_id, message_type, message_urgency, status) 
    VALUES (?, ?, ?, ?)
  `;

  db.query(sql, [user_id || null, type, urgency, status], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ 
      message: "✅ Message categorized and sent", 
      id: result.insertId,
      classification: { type, urgency } 
    });
  });
});

// ✏️ UPDATE: Change Status (Resolved / Completed / Solved)
router.put("/:id", authenticateToken, (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'Resolved', 'Completed', or 'Solved'

  if (!status) return res.status(400).json({ error: "Status update is required." });

  const sql = "UPDATE message SET status = ? WHERE message_id = ?";

  db.query(sql, [status, id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: `✅ Message status updated to ${status}` });
  });
});

// ❌ DELETE message
router.delete("/:id", authenticateToken, (req, res) => {
  const { id } = req.params;
  const sql = "DELETE FROM message WHERE message_id = ?";

  db.query(sql, [id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "✅ Message deleted successfully" });
  });
});

export default router;