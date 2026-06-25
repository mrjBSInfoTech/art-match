import axios from "axios";
import express from "express";
import db from "../database/db.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const getEspAddress = () => {
  return new Promise((resolve, reject) => {
    const sql = "SELECT port_number FROM port LIMIT 1"; 
    db.query(sql, (err, results) => {
      if (err) return reject(err);
      if (!results || results.length === 0) {
        return resolve("192.168.1.9"); 
      }
      
      const config = results[0];
      resolve(config.port_number);
    });
  });
};

const router = express.Router();

// 📖 Urgency Dictionary (English & Tagalog)
const classifyMessage = (text) => {
  const content = text.toLowerCase();

  const keywords = {
    high: [
      // Emergency / Life & Safety
      "dead", "death", "fire", "burning", "stabbing", "stabbed", "gun", "shot", "bleeding", "blood", "robbery", 
      "theft", "rape", "accident", "hit", "emergency", "disaster", "severe accident", "injured", 
      "unconscious", "not moving", "fell down", "electrocuted", "poisoned", "suffocated", "earthquake", 
      "landslide", "collapse", "dangerous flood", "storm", "murder", "gas leak", "live wire", "armed", 
      "threat", "hostage", "kidnapping", "assault", "group attack", "ambulance", "rescue", "firefighter", 
      "police", "emergency response", "hospital transfer", "critical", "urgent", "asap", "immediate action", 
      "call for help", "danger", "explosion", "trapped", "drowning", "missing person","kill", "killed", "shot", 
      "stabbed", "burned", "suffocated", "poisoned", "electrocuted", "injured",
      // Tagalog Keywords
      "namatay", "patay", "sunog", "nasusunog", "saksak", "baril", "binaril", "dugo", "duguan", "holdap", 
      "ginahasa", "nakaw", "ninanakawan", "accidente", "sagasa", "inatake", "nahimatay", "sakuna", "nabundol", 
      "na-aksidente", "tumba", "duguang-tao", "hindi-gumagalaw", "nahulog", "natumba", "na-suffocate", 
      "na-kuryente", "na-kalason", "lindol", "landslide", "gumuho", "bumagsak", "baha-na-taas-bewang", 
      "baha-na-mapanganib", "ipu-ipo", "bagyo-report", "tagas-gas", "nakaka-kuryente", "kuryenteng-buhay", 
      "may-baril", "may-patalim", "banta", "pananakot", "hostage", "kidnapan", "nakatutok", "pinagtulungan", 
      "bugbugan", "rumesbak", "rumesponde", "ambulansya", "rescue", "rumesponde-agad", "sunog-malaki", 
      "bombero", "pulis-bilis", "hospital-transfer", "need help now", "kailangan ng tulong", "delikado", 
      "panganib", "bomba", "nasusunog", "nasunog", "nasunog na", "nasusunog na", "nasusunog na bahay",
    ],
    medium: [
      // Community Concerns
      "disturbance", "noise", "shouting", "fighting", "rude behavior", "stray dog", "dog bite", "rabies", 
      "clogged", "flood", "loud noise", "drunk", "suspicious", "abuse", "obstruction", "karaoke noise", 
      "drinking session", "gambling", "street disturbance", "neighbor dispute", "loitering", "missing child", 
      "missing elderly", "lost item", "suspicious person", "illegal parking", "blocked road", "clogged drainage", 
      "bad smell", "uncollected garbage", "broken light", "unstable post", "dangerous branches", "dengue", 
      "mosquitoes", "pests", "rats", "stomach pain", "food poisoning", "contagious disease", "cough", "colds", 
      "fever", "quarantine", "complaint", "concern", "needs attention", "traffic issue", "sanitation issue", 
      "dirty surroundings", "foul odor", "delay", "pending issue", "need help", "issue report", "please fix",
      // Tagalog Keywords
      "gulo", "away", "sigawan", "mura", "bastos", "ligaw (aso)", "kagat", "barado", "baha", "baha (na)", 
      "ingay", "lasing", "nagwawala", "duda", "kahina-hinala", "abuso", "nakaharang", "rabies-shot", 
      "masakit-tiyan", "na-food-poison", "nakakahawang-sakit", "ubo-at-sipon", "lagnat", "videoke-madaling-araw", 
      "karaoke-ingay", "lasing-nambubugaw", "nag-iinuman", "sugal", "tong-its", "pot-session", "nagsusugal", 
      "vandalism", "away-magkapitbahay", "palaboy", "bata-nawawala", "matanda-nawawala", "nawawalang-gamit", 
      "nakatambay-duda", "nakaharang-sasakyan", "illegal-parking", "bawal-na-tindahan", "nakaharang-sa-daan", 
      "kanal-barado-na", "mabaho-na", "poste-na-naglalaro", "sanga-na-delikado"
    ],
    low: [
      // Routine / Administrative
      "light", "post", "road", "damage", "hole", "garbage", "collection", "documents", "permit", "certificate", 
      "question", "schedule", "reservation", "line", "tree", "branch", "barangay clearance", "indigency certificate", 
      "good moral", "business permit", "id request", "affidavit", "legal advice", "meeting schedule", "seminar", 
      "sports league", "scholarship", "aid list", "feeding program", "vaccination", "registration", "election", 
      "payment", "receipt", "electricity bill", "water bill", "fee", "tax", "penalty", "cleaning request", 
      "repair request", "check request", "inquiry", "follow-up", "status update", "just checking", "quick question", 
      "clarification", "suggestion", "feedback", "info request", "confirmation",
      // Tagalog Keywords
      "ilaw", "poste", "kalsada", "sira", "butas", "basura", "koleksyon", "papeles", "dokumento", "permit", 
      "cert", "tanong", "reservasyon", "linya", "puno", "sanga", "cedula", "notaryo", "4ps-update", 
      "senior-citizen-id", "pwd-id", "indorsement", "schedule-ng-pulong", "ayuda-lista", "bayad", "resibo", 
      "bill-kuryente", "bill-tubig", "pa-schedule", "pa-check", "pa-repair", "pa-suyo", "katanungan"
    ],
  };

  if (keywords.high.some((word) => content.includes(word))) return "High";
  if (keywords.medium.some((word) => content.includes(word))) return "Medium";
  return "Low"; // Defaults to Low if no major keywords found
};

// 🟢 GET all messages
router.get("/", authenticateToken, (req, res) => {
  const sql = `SELECT 
    m.message_id, 
    m.user_id, 
    m.message,
    m.message_type,
    m.message_urgency,
    m.status,
    m.date_posted,
    u.first_name,
    u.last_name,
    u.type
  FROM message m
  LEFT JOIN user_account u ON m.user_id = u.user_id
  ORDER BY m.date_posted DESC`;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json(results);
  });
});

// 🔍 GET single message by ID
router.get("/:id", authenticateToken, (req, res) => {
  const { id } = req.params;
  const sql = "SELECT * FROM message WHERE message_id = ?";
  db.query(sql, [id], (err, results) => {
    if (err) return res.status(500).json({ message: err.message });
    if (results.length === 0)
      return res.status(404).json({ message: "Message not found" });
    res.json(results[0]);
  });
});

// ➕ POST: Add and Automatically Classify Message
router.post("/", authenticateToken, (req, res) => {
  const user_id = req.user.id;
  const { message, message_type } = req.body;

  console.log("User ID from token:", user_id);
  console.log("Request body:", { message, message_type });

  if (!message || !message_type) {
    return res
      .status(400)
      .json({ message: "Please fill all required fields." });
  }

  // Auto-generate values based on dictionary
  const urgency = classifyMessage(message);
  const type =
    urgency === "High"
      ? "Emergency"
      : urgency === "Medium"
        ? "Dispute"
        : "General";
  const status = "Pending"; // Initial status

  const sql = `
    INSERT INTO message (user_id, message, message_type, message_urgency, status) 
    VALUES (?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [user_id || null, message, message_type, urgency, status],
    async (err, result) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({ message: err.message });
      }

      // Trigger ESP32 alerts based on urgency
      try {
        const ESP32_IP = await getEspAddress();
        if (urgency === "High") {
          await axios.get(`http://${ESP32_IP}/alert/high`);
          console.log("ESP32 High alert triggered");
        } else if (urgency === "Medium") {
          await axios.get(`http://${ESP32_IP}/alert/medium`);
          console.log("ESP32 Medium alert triggered");
        }
      } catch (error) {
        console.error("ESP32 trigger error:", error.message);
      }

      res.json({
        message: "✅ Message categorized and sent",
        id: result.insertId,
        classification: { type, urgency },
      });
    },
  );
});

// ✏️ UPDATE: Change Status (Resolved / Completed / Solved)
router.put("/:id", authenticateToken, (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'Resolved', 'Completed', or 'Solved'

  if (!status)
    return res.status(400).json({ message: "Status update is required." });

  const sql = "UPDATE message SET status = ? WHERE message_id = ?";

  db.query(sql, [status, id], (err) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json({ message: `Message status updated to ${status}` });
  });
});

// ❌ DELETE message
router.delete("/:id", authenticateToken, (req, res) => {
  const { id } = req.params;
  const sql = "DELETE FROM message WHERE message_id = ?";

  db.query(sql, [id], (err) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json({ message: "Message deleted successfully" });
  });
});

export default router;
