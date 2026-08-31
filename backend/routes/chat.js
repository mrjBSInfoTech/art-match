import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import db from "../database/db.js";
import { authenticateBuyer } from "../middleware/buyerAuthMiddleware.js";
import { authenticateSeller } from "../middleware/sellerAuthMiddleware.js";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const chatUploadDir = path.join(__dirname, "..", "uploads", "chat");
fs.mkdirSync(chatUploadDir, { recursive: true });

const chatUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, chatUploadDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname || "image.png");
      const safeBase = (file.originalname || "chat").replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_");
      cb(null, `${Date.now()}-${safeBase}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith("image/")) {
      cb(null, true);
      return;
    }
    cb(new Error("Only image files are allowed"), false);
  },
});

const getOrCreateConversation = (sellerId, buyerId) =>
  new Promise((resolve, reject) => {
    const findSql = `
      SELECT conversation_id
      FROM conversation
      WHERE student_id = ? AND customer_id = ?
      LIMIT 1
    `;

    db.query(findSql, [sellerId, buyerId], (findErr, rows) => {
      if (findErr) return reject(findErr);

      if (rows.length > 0) {
        return resolve(rows[0].conversation_id);
      }

      const createSql = `
        INSERT INTO conversation (student_id, customer_id)
        VALUES (?, ?)
      `;

      db.query(createSql, [sellerId, buyerId], (createErr, result) => {
        if (createErr) return reject(createErr);
        resolve(result.insertId);
      });
    });
  });

const getConversationAccessQuery = (role, userId) => {
  if (role === "buyer") {
    return {
      sql: `SELECT conversation_id, student_id, customer_id FROM conversation WHERE conversation_id = ? AND customer_id = ? LIMIT 1`,
      params: [userId],
    };
  }

  return {
    sql: `SELECT conversation_id, student_id, customer_id FROM conversation WHERE conversation_id = ? AND student_id = ? LIMIT 1`,
    params: [userId],
  };
};

const fetchConversationList = (role, userId) => 
  new Promise((resolve, reject) => {
    const isBuyer = role === "buyer";
    const sql = `
      SELECT
        c.conversation_id,
        ${isBuyer ? "s.student_id AS other_id" : "cu.customer_id AS other_id"},
        ${isBuyer ? "CONCAT(s.first_name, ' ', s.last_name) AS other_name" : "CONCAT(cu.first_name, ' ', cu.last_name) AS other_name"},
        ${isBuyer ? "s.profile_image AS other_avatar" : "cu.profile_image AS other_avatar"},
        m.message_data AS last_message,
        m.image AS last_image,
        m.date_created AS last_message_time
      FROM conversation c
      ${isBuyer ? "LEFT JOIN student s ON s.student_id = c.student_id" : "LEFT JOIN customer cu ON cu.customer_id = c.customer_id"}
      LEFT JOIN message m ON m.message_id = (
        SELECT m2.message_id
        FROM message m2
        WHERE m2.conversation_id = c.conversation_id
        ORDER BY m2.date_created DESC
        LIMIT 1
      )
      WHERE c.${isBuyer ? "customer_id" : "student_id"} = ?
      ORDER BY COALESCE(m.date_created, c.date_created) DESC
    `;

    db.query(sql, [userId], (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });

router.get("/buyer/conversations", authenticateBuyer, (req, res) => {
  const buyerId = req.user.customer_id || req.user.id;

  fetchConversationList("buyer", buyerId)
    .then((rows) => res.json(rows))
    .catch((error) => {
      console.error("Buyer conversation fetch failed:", error);
      res.status(500).json({ message: "Unable to load conversations" });
    });
});

router.get("/seller/conversations", authenticateSeller, (req, res) => {
  const sellerId = req.user.student_id || req.user.id;

  fetchConversationList("seller", sellerId)
    .then((rows) => res.json(rows))
    .catch((error) => {
      console.error("Seller conversation fetch failed:", error);
      res.status(500).json({ message: "Unable to load conversations" });
    });
});

router.get("/buyer/conversations/:conversationId/messages", authenticateBuyer, (req, res) => {
  const buyerId = req.user.customer_id || req.user.id;
  const conversationId = Number(req.params.conversationId);

  if (!conversationId) {
    return res.status(400).json({ message: "Invalid conversation id" });
  }

  const accessSql = `
    SELECT conversation_id, student_id, customer_id
    FROM conversation
    WHERE conversation_id = ? AND customer_id = ?
    LIMIT 1
  `;

  db.query(accessSql, [conversationId, buyerId], (accessErr, accessRows) => {
    if (accessErr) {
      console.error("Access check failed:", accessErr);
      return res.status(500).json({ message: "Unable to load messages" });
    }

    if (accessRows.length === 0) {
      return res.status(403).json({ message: "Access denied" });
    }

    const sql = `
      SELECT message_id, conversation_id, sender_type, message_data, image, date_created
      FROM message
      WHERE conversation_id = ?
      ORDER BY date_created ASC
    `;

    db.query(sql, [conversationId], (messageErr, rows) => {
      if (messageErr) {
        console.error("Message fetch failed:", messageErr);
        return res.status(500).json({ message: "Unable to load messages" });
      }

      res.json(rows);
    });
  });
});

router.get("/seller/conversations/:conversationId/messages", authenticateSeller, (req, res) => {
  const sellerId = req.user.student_id || req.user.id;
  const conversationId = Number(req.params.conversationId);

  if (!conversationId) {
    return res.status(400).json({ message: "Invalid conversation id" });
  }

  const accessSql = `
    SELECT conversation_id, student_id, customer_id
    FROM conversation
    WHERE conversation_id = ? AND student_id = ?
    LIMIT 1
  `;

  db.query(accessSql, [conversationId, sellerId], (accessErr, accessRows) => {
    if (accessErr) {
      console.error("Access check failed:", accessErr);
      return res.status(500).json({ message: "Unable to load messages" });
    }

    if (accessRows.length === 0) {
      return res.status(403).json({ message: "Access denied" });
    }

    const sql = `
      SELECT message_id, conversation_id, sender_type, message_data, image, date_created
      FROM message
      WHERE conversation_id = ?
      ORDER BY date_created ASC
    `;

    db.query(sql, [conversationId], (messageErr, rows) => {
      if (messageErr) {
        console.error("Message fetch failed:", messageErr);
        return res.status(500).json({ message: "Unable to load messages" });
      }

      res.json(rows);
    });
  });
});

router.post("/buyer/conversations/:sellerId/messages", authenticateBuyer, chatUpload.single("image"), async (req, res) => {
  const buyerId = req.user.customer_id || req.user.id;
  const sellerId = Number(req.params.sellerId);
  const messageText = typeof req.body.message === "string" ? req.body.message : "";
  const savedImage = req.file ? `/uploads/chat/${req.file.filename}` : null;

  if (!sellerId) {
    return res.status(400).json({ message: "Invalid seller id" });
  }

  if (!messageText.trim() && !savedImage) {
    return res.status(400).json({ message: "Message cannot be empty" });
  }

  try {
    const conversationId = await getOrCreateConversation(sellerId, buyerId);

    const insertSql = `
      INSERT INTO message (conversation_id, sender_type, message_data, image)
      VALUES (?, 'buyer', ?, ?)
    `;

    db.query(insertSql, [conversationId, messageText.trim() || "", savedImage], (insertErr, result) => {
      if (insertErr) {
        console.error("Buyer message insert failed:", insertErr);
        return res.status(500).json({ message: "Unable to send message" });
      }

      res.status(201).json({
        message_id: result.insertId,
        conversation_id: conversationId,
        sender_type: "buyer",
        message_data: messageText.trim() || "",
        image: savedImage,
      });
    });
  } catch (error) {
    console.error("Buyer send message failed:", error);
    res.status(500).json({ message: "Unable to send message" });
  }
});

router.post("/seller/conversations/:buyerId/messages", authenticateSeller, chatUpload.single("image"), async (req, res) => {
  const sellerId = req.user.student_id || req.user.id;
  const buyerId = Number(req.params.buyerId);
  const messageText = typeof req.body.message === "string" ? req.body.message : "";
  const savedImage = req.file ? `/uploads/chat/${req.file.filename}` : null;

  if (!buyerId) {
    return res.status(400).json({ message: "Invalid buyer id" });
  }

  if (!messageText.trim() && !savedImage) {
    return res.status(400).json({ message: "Message cannot be empty" });
  }

  try {
    const conversationId = await getOrCreateConversation(sellerId, buyerId);

    const insertSql = `
      INSERT INTO message (conversation_id, sender_type, message_data, image)
      VALUES (?, 'seller', ?, ?)
    `;

    db.query(insertSql, [conversationId, messageText.trim() || "", savedImage], (insertErr, result) => {
      if (insertErr) {
        console.error("Seller message insert failed:", insertErr);
        return res.status(500).json({ message: "Unable to send message" });
      }

      res.status(201).json({
        message_id: result.insertId,
        conversation_id: conversationId,
        sender_type: "seller",
        message_data: messageText.trim() || "",
        image: savedImage,
      });
    });
  } catch (error) {
    console.error("Seller send message failed:", error);
    res.status(500).json({ message: "Unable to send message" });
  }
});

export default router;
