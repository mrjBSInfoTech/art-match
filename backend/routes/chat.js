import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import db from "../database/db.js";
import { authenticateBuyer } from "../middleware/buyerAuthMiddleware.js";
import { authenticateSeller } from "../middleware/sellerAuthMiddleware.js";
import { getChatPublicKey, saveChatPublicKey } from "../database/chatKeys.js";
import { addChatEventClient, publishChatMessage } from "../utils/chatEvents.js";

const router = express.Router();

router.get("/buyer/events", authenticateBuyer, (req, res) => {
  addChatEventClient("buyer", req.user.customer_id || req.user.id, res);
});

router.get("/seller/events", authenticateSeller, (req, res) => {
  addChatEventClient("seller", req.user.student_id || req.user.id, res);
});

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
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype &&
      (file.mimetype.startsWith("image/") ||
        file.mimetype.startsWith("video/") ||
        file.mimetype === "application/octet-stream")
    ) {
      cb(null, true);
      return;
    }
    cb(new Error("Only image and video files are allowed"), false);
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

const markConversationRead = (conversationId, accountType, accountId) =>
  new Promise((resolve, reject) => {
    db.query(
      `INSERT INTO conversation_read_state
        (conversation_id, account_type, account_id, last_read_message_id)
       SELECT ?, ?, ?, COALESCE(MAX(message_id), 0)
       FROM message
       WHERE conversation_id = ?
       ON DUPLICATE KEY UPDATE
         last_read_message_id = GREATEST(last_read_message_id, VALUES(last_read_message_id))`,
      [conversationId, accountType, accountId, conversationId],
      (error) => (error ? reject(error) : resolve()),
    );
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
        ${isBuyer ? "CONCAT(s.first_name, ' ', s.last_name) AS other_name" : "CASE WHEN COALESCE(cu.is_private, 0) = 1 THEN 'Private buyer' ELSE CONCAT(cu.first_name, ' ', cu.last_name) END AS other_name"},
        ${isBuyer ? "s.profile_image AS other_avatar" : "CASE WHEN COALESCE(cu.is_private, 0) = 1 THEN NULL ELSE cu.profile_image END AS other_avatar"},
        (
          SELECT COUNT(*)
          FROM message unread
          WHERE unread.conversation_id = c.conversation_id
            AND unread.sender_type = '${isBuyer ? "seller" : "buyer"}'
            AND unread.message_id > COALESCE(read_state.last_read_message_id, 0)
        ) AS unread_count,
        CASE WHEN m.encryption_iv IS NULL THEN m.message_data ELSE '[Encrypted message]' END AS last_message,
        m.image AS last_image,
        m.date_created AS last_message_time
      FROM conversation c
      ${isBuyer ? "LEFT JOIN student s ON s.student_id = c.student_id" : "LEFT JOIN customer cu ON cu.customer_id = c.customer_id"}
      LEFT JOIN conversation_read_state read_state
        ON read_state.conversation_id = c.conversation_id
        AND read_state.account_type = '${role}'
        AND read_state.account_id = c.${isBuyer ? "customer_id" : "student_id"}
      LEFT JOIN message m ON m.message_id = (
        SELECT m2.message_id
        FROM message m2
        WHERE m2.conversation_id = c.conversation_id
        ORDER BY m2.date_created DESC
        LIMIT 1
      )
      WHERE c.${isBuyer ? "customer_id" : "student_id"} = ?
        AND (
          read_state.hidden_through_message_id IS NULL
          OR COALESCE(m.message_id, 0) > read_state.hidden_through_message_id
        )
      ORDER BY COALESCE(m.date_created, c.date_created) DESC
    `;

    db.query(sql, [userId], (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });

const getConversationParticipants = (role, conversationId, accountId) =>
  new Promise((resolve, reject) => {
    const accountColumn = role === "buyer" ? "customer_id" : "student_id";
    db.query(
      `SELECT conversation_id, student_id, customer_id
       FROM conversation
       WHERE conversation_id = ? AND ${accountColumn} = ?
       LIMIT 1`,
      [conversationId, accountId],
      (error, rows) => {
        if (error) return reject(error);
        resolve(rows[0] || null);
      },
    );
  });

const getChatBlockStatus = (role, accountId, otherType, otherId) =>
  new Promise((resolve, reject) => {
    db.query(
      `SELECT
        EXISTS(
          SELECT 1 FROM chat_blocks
          WHERE blocker_type = ? AND blocker_id = ?
            AND blocked_type = ? AND blocked_id = ?
        ) AS blocked_by_me,
        EXISTS(
          SELECT 1 FROM chat_blocks
          WHERE blocker_type = ? AND blocker_id = ?
            AND blocked_type = ? AND blocked_id = ?
        ) AS blocked_by_other`,
      [role, accountId, otherType, otherId, otherType, otherId, role, accountId],
      (error, rows) => {
        if (error) return reject(error);
        resolve(rows[0]);
      },
    );
  });

const isChatBlocked = (sellerId, buyerId) =>
  new Promise((resolve, reject) => {
    db.query(
      `SELECT EXISTS(
        SELECT 1 FROM chat_blocks
        WHERE (blocker_type = 'buyer' AND blocker_id = ? AND blocked_type = 'seller' AND blocked_id = ?)
           OR (blocker_type = 'seller' AND blocker_id = ? AND blocked_type = 'buyer' AND blocked_id = ?)
      ) AS is_blocked`,
      [buyerId, sellerId, sellerId, buyerId],
      (error, rows) => {
        if (error) return reject(error);
        resolve(Boolean(rows[0]?.is_blocked));
      },
    );
  });

const hideConversationForAccount = (conversationId, role, accountId) =>
  new Promise((resolve, reject) => {
    db.query(
      `INSERT INTO conversation_read_state
        (conversation_id, account_type, account_id, hidden_through_message_id)
       SELECT ?, ?, ?, COALESCE(MAX(message_id), 0)
       FROM message
       WHERE conversation_id = ?
       ON DUPLICATE KEY UPDATE
         hidden_through_message_id = GREATEST(
           COALESCE(hidden_through_message_id, 0),
           VALUES(hidden_through_message_id)
         )`,
      [conversationId, role, accountId, conversationId],
      (error) => (error ? reject(error) : resolve()),
    );
  });

const restoreConversationForAccount = (conversationId, role, accountId) =>
  new Promise((resolve, reject) => {
    db.query(
      `UPDATE conversation_read_state
       SET hidden_through_message_id = NULL
       WHERE conversation_id = ? AND account_type = ? AND account_id = ?`,
      [conversationId, role, accountId],
      (error) => (error ? reject(error) : resolve()),
    );
  });

const parsePublicKey = (value) => {
  if (typeof value !== "string" || value.length < 20 || value.length > 5000) {
    return null;
  }
  try {
    const parsed = JSON.parse(value);
    if (parsed.kty !== "EC" || parsed.crv !== "P-256" || !parsed.x || !parsed.y) {
      return null;
    }
    return value;
  } catch {
    return null;
  }
};

const registerPublicKey = (accountType, accountId, value, res) => {
  const publicKey = parsePublicKey(value);
  if (!publicKey) {
    res.status(400).json({ message: "Invalid chat public key" });
    return;
  }
  saveChatPublicKey(accountType, accountId, publicKey, (error) => {
    if (error) {
      console.error("Chat public key save failed:", error);
      res.status(500).json({ message: "Unable to save chat public key" });
      return;
    }
    res.status(204).end();
  });
};

const fetchPublicKey = (accountType, accountId, res) => {
  getChatPublicKey(accountType, accountId, (error, rows) => {
    if (error) {
      console.error("Chat public key fetch failed:", error);
      res.status(500).json({ message: "Unable to load chat public key" });
      return;
    }
    if (!rows.length) {
      res.status(404).json({ message: "The other account has not enabled secure messaging yet" });
      return;
    }
    res.json({ publicKey: rows[0].public_key });
  });
};

router.post("/buyer/keys", authenticateBuyer, (req, res) => {
  registerPublicKey("buyer", req.user.customer_id || req.user.id, req.body.publicKey, res);
});

router.get("/buyer/keys/:sellerId", authenticateBuyer, (req, res) => {
  fetchPublicKey("seller", Number(req.params.sellerId), res);
});

router.post("/seller/keys", authenticateSeller, (req, res) => {
  registerPublicKey("seller", req.user.student_id || req.user.id, req.body.publicKey, res);
});

router.get("/seller/keys/:buyerId", authenticateSeller, (req, res) => {
  fetchPublicKey("buyer", Number(req.params.buyerId), res);
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

  const fetchAccountNotifications = (role, accountId) =>
    new Promise((resolve, reject) => {
      db.query(
        `SELECT notification_id, notification_type, message, is_read, created_at
         FROM account_notifications
         WHERE role = ? AND account_id = ?
         ORDER BY created_at DESC`,
        [role, accountId],
        (error, rows) => (error ? reject(error) : resolve(rows)),
      );
    });

  const markAccountNotificationsRead = (role, accountId) =>
    new Promise((resolve, reject) => {
      db.query(
        "UPDATE account_notifications SET is_read = TRUE WHERE role = ? AND account_id = ? AND is_read = FALSE",
        [role, accountId],
        (error) => (error ? reject(error) : resolve()),
      );
    });

  router.post("/buyer/notifications/read", authenticateBuyer, (req, res) => {
    markAccountNotificationsRead("buyer", req.user.customer_id || req.user.id)
      .then(() => res.status(204).end())
      .catch((error) => {
        console.error("Buyer notification update failed:", error);
        res.status(500).json({ message: "Unable to update notifications" });
      });
  });

  router.post("/seller/notifications/read", authenticateSeller, (req, res) => {
    markAccountNotificationsRead("seller", req.user.student_id || req.user.id)
      .then(() => res.status(204).end())
      .catch((error) => {
        console.error("Seller notification update failed:", error);
        res.status(500).json({ message: "Unable to update notifications" });
      });
  });

  const registerConversationActions = (role, authenticate, getAccountId, otherType) => {
    router.get(`/${role}/conversations/:conversationId/block`, authenticate, async (req, res) => {
      const conversationId = Number(req.params.conversationId);
      const accountId = getAccountId(req.user);
      if (!Number.isInteger(conversationId) || conversationId <= 0) {
        return res.status(400).json({ message: "Invalid conversation id" });
      }

      try {
        const conversation = await getConversationParticipants(role, conversationId, accountId);
        if (!conversation) return res.status(404).json({ message: "Conversation not found" });
        const otherId = role === "buyer" ? conversation.student_id : conversation.customer_id;
        res.json(await getChatBlockStatus(role, accountId, otherType, otherId));
      } catch (error) {
        console.error("Chat block status fetch failed:", error);
        res.status(500).json({ message: "Unable to load block status" });
      }
    });

    router.post(`/${role}/conversations/:conversationId/block`, authenticate, async (req, res) => {
      const conversationId = Number(req.params.conversationId);
      const accountId = getAccountId(req.user);
      if (!Number.isInteger(conversationId) || conversationId <= 0) {
        return res.status(400).json({ message: "Invalid conversation id" });
      }

      try {
        const conversation = await getConversationParticipants(role, conversationId, accountId);
        if (!conversation) return res.status(404).json({ message: "Conversation not found" });
        const otherId = role === "buyer" ? conversation.student_id : conversation.customer_id;
        await new Promise((resolve, reject) => {
          db.query(
            `INSERT INTO chat_blocks (blocker_type, blocker_id, blocked_type, blocked_id)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE created_at = CURRENT_TIMESTAMP`,
            [role, accountId, otherType, otherId],
            (error) => (error ? reject(error) : resolve()),
          );
        });
        res.status(204).end();
      } catch (error) {
        console.error("Chat block failed:", error);
        res.status(500).json({ message: "Unable to block user" });
      }
    });

    router.delete(`/${role}/conversations/:conversationId/block`, authenticate, async (req, res) => {
      const conversationId = Number(req.params.conversationId);
      const accountId = getAccountId(req.user);
      if (!Number.isInteger(conversationId) || conversationId <= 0) {
        return res.status(400).json({ message: "Invalid conversation id" });
      }

      try {
        const conversation = await getConversationParticipants(role, conversationId, accountId);
        if (!conversation) return res.status(404).json({ message: "Conversation not found" });
        const otherId = role === "buyer" ? conversation.student_id : conversation.customer_id;
        await new Promise((resolve, reject) => {
          db.query(
            `DELETE FROM chat_blocks
             WHERE blocker_type = ? AND blocker_id = ? AND blocked_type = ? AND blocked_id = ?`,
            [role, accountId, otherType, otherId],
            (error) => (error ? reject(error) : resolve()),
          );
        });
        res.status(204).end();
      } catch (error) {
        console.error("Chat unblock failed:", error);
        res.status(500).json({ message: "Unable to unblock user" });
      }
    });

    router.delete(`/${role}/conversations/:conversationId`, authenticate, async (req, res) => {
      const conversationId = Number(req.params.conversationId);
      const accountId = getAccountId(req.user);
      if (!Number.isInteger(conversationId) || conversationId <= 0) {
        return res.status(400).json({ message: "Invalid conversation id" });
      }

      try {
        const conversation = await getConversationParticipants(role, conversationId, accountId);
        if (!conversation) return res.status(404).json({ message: "Conversation not found" });
        await hideConversationForAccount(conversationId, role, accountId);
        res.status(204).end();
      } catch (error) {
        console.error("Chat delete failed:", error);
        res.status(500).json({ message: "Unable to delete chat" });
      }
    });
  };

  registerConversationActions(
    "buyer",
    authenticateBuyer,
    (user) => user.customer_id || user.id,
    "seller",
  );
  registerConversationActions(
    "seller",
    authenticateSeller,
    (user) => user.student_id || user.id,
    "buyer",
  );

  router.get("/buyer/notifications", authenticateBuyer, (req, res) => {
    fetchAccountNotifications("buyer", req.user.customer_id || req.user.id)
      .then((rows) => res.json(rows))
      .catch((error) => {
        console.error("Buyer notification fetch failed:", error);
        res.status(500).json({ message: "Unable to load notifications" });
      });
  });

  router.get("/seller/notifications", authenticateSeller, (req, res) => {
    fetchAccountNotifications("seller", req.user.student_id || req.user.id)
      .then((rows) => res.json(rows))
      .catch((error) => {
        console.error("Seller notification fetch failed:", error);
        res.status(500).json({ message: "Unable to load notifications" });
      });
  });

  router.post("/buyer/conversations/:sellerId", authenticateBuyer, async (req, res) => {
    const buyerId = req.user.customer_id || req.user.id;
    const sellerIdentifier = String(req.params.sellerId || "").trim();

    if (!/^\d+$/.test(sellerIdentifier) || Number(sellerIdentifier) <= 0) {
      return res.status(400).json({ message: "Invalid seller id" });
    }

    try {
      const sellerId = await new Promise((resolve, reject) => {
        db.query(
          "SELECT student_id FROM student WHERE student_id = ? OR student_number = ? LIMIT 1",
          [sellerIdentifier, sellerIdentifier],
          (error, rows) => {
          if (error) return reject(error);
          resolve(rows.length > 0 ? rows[0].student_id : null);
          },
        );
      });

      if (!sellerId) {
        return res.status(404).json({ message: "Seller not found" });
      }

      if (await isChatBlocked(sellerId, buyerId)) {
        return res.status(403).json({ message: "Messaging is unavailable for this account" });
      }

      const conversationId = await getOrCreateConversation(sellerId, buyerId);
      await restoreConversationForAccount(conversationId, "buyer", buyerId);
      res.status(201).json({ conversation_id: conversationId });
    } catch (error) {
      console.error("Buyer conversation creation failed:", error);
      res.status(500).json({ message: "Unable to start conversation" });
    }
  });

  router.post("/seller/conversations/:buyerId", authenticateSeller, async (req, res) => {
    const sellerId = req.user.student_id || req.user.id;
    const buyerId = Number(req.params.buyerId);

    if (!Number.isInteger(buyerId) || buyerId <= 0) {
      return res.status(400).json({ message: "Invalid buyer id" });
    }

    try {
      const buyerExists = await new Promise((resolve, reject) => {
        db.query("SELECT customer_id FROM customer WHERE customer_id = ? LIMIT 1", [buyerId], (error, rows) => {
          if (error) return reject(error);
          resolve(rows.length > 0);
        });
      });

      if (!buyerExists) {
        return res.status(404).json({ message: "Buyer not found" });
      }

      if (await isChatBlocked(sellerId, buyerId)) {
        return res.status(403).json({ message: "Messaging is unavailable for this account" });
      }

      const conversationId = await getOrCreateConversation(sellerId, buyerId);
      await restoreConversationForAccount(conversationId, "seller", sellerId);
      res.status(201).json({ conversation_id: conversationId });
    } catch (error) {
      console.error("Seller conversation creation failed:", error);
      res.status(500).json({ message: "Unable to start conversation" });
    }
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
      SELECT message_id, conversation_id, sender_type, message_data, image, sender_public_key, encryption_iv, attachment_iv, media_type, date_created
      FROM message
      WHERE conversation_id = ?
      ORDER BY date_created ASC
    `;

    markConversationRead(conversationId, "buyer", buyerId)
      .then(() => {
        db.query(sql, [conversationId], (messageErr, rows) => {
          if (messageErr) {
            console.error("Message fetch failed:", messageErr);
            return res.status(500).json({ message: "Unable to load messages" });
          }

          res.json(rows);
        });
      })
      .catch((error) => {
        console.error("Message read update failed:", error);
        res.status(500).json({ message: "Unable to load messages" });
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
      SELECT message_id, conversation_id, sender_type, message_data, image, sender_public_key, encryption_iv, attachment_iv, media_type, date_created
      FROM message
      WHERE conversation_id = ?
      ORDER BY date_created ASC
    `;

    markConversationRead(conversationId, "seller", sellerId)
      .then(() => {
        db.query(sql, [conversationId], (messageErr, rows) => {
          if (messageErr) {
            console.error("Message fetch failed:", messageErr);
            return res.status(500).json({ message: "Unable to load messages" });
          }

          res.json(rows);
        });
      })
      .catch((error) => {
        console.error("Message read update failed:", error);
        res.status(500).json({ message: "Unable to load messages" });
      });
  });
});

router.post("/buyer/conversations/:sellerId/messages", authenticateBuyer, chatUpload.single("image"), async (req, res) => {
  const buyerId = req.user.customer_id || req.user.id;
  const sellerId = Number(req.params.sellerId);
  const messageText = typeof req.body.message === "string" ? req.body.message : "";
  const savedMedia = req.file ? `http://localhost:5000/uploads/chat/${req.file.filename}` : null;
  const mediaType = req.body.media_type || req.file?.mimetype || "";
  const senderPublicKey = parsePublicKey(req.body.sender_public_key);
  const encryptionIv = req.body.encryption_iv || null;
  const attachmentIv = req.body.attachment_iv || null;

  if (!sellerId) {
    return res.status(400).json({ message: "Invalid seller id" });
  }

  if (!messageText.trim() && !savedMedia) {
    return res.status(400).json({ message: "Message cannot be empty" });
  }

  try {
    if (await isChatBlocked(sellerId, buyerId)) {
      return res.status(403).json({ message: "Messaging is unavailable for this account" });
    }

    const conversationId = await getOrCreateConversation(sellerId, buyerId);

    const insertSql = `
        INSERT INTO message (conversation_id, sender_type, message_data, image, sender_public_key, encryption_iv, attachment_iv, media_type)
      VALUES (?, 'buyer', ?, ?, ?, ?, ?, ?)
    `;

    db.query(insertSql, [conversationId, messageText.trim() || "", savedMedia, senderPublicKey, encryptionIv, attachmentIv, mediaType], (insertErr, result) => {
      if (insertErr) {
        console.error("Buyer message insert failed:", insertErr);
        return res.status(500).json({ message: "Unable to send message" });
      }

      publishChatMessage(sellerId, buyerId, conversationId, result.insertId);
      res.status(201).json({
        message_id: result.insertId,
        conversation_id: conversationId,
        sender_type: "buyer",
        message_data: messageText.trim() || "",
        image: savedMedia,
        sender_public_key: senderPublicKey,
        encryption_iv: encryptionIv,
        attachment_iv: attachmentIv,
        media_type: mediaType,
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
  const savedMedia = req.file ? `http://localhost:5000/uploads/chat/${req.file.filename}` : null;
  const mediaType = req.body.media_type || req.file?.mimetype || "";
  const senderPublicKey = parsePublicKey(req.body.sender_public_key);
  const encryptionIv = req.body.encryption_iv || null;
  const attachmentIv = req.body.attachment_iv || null;

  if (!buyerId) {
    return res.status(400).json({ message: "Invalid buyer id" });
  }

  if (!messageText.trim() && !savedMedia) {
    return res.status(400).json({ message: "Message cannot be empty" });
  }

  try {
    if (await isChatBlocked(sellerId, buyerId)) {
      return res.status(403).json({ message: "Messaging is unavailable for this account" });
    }

    const conversationId = await getOrCreateConversation(sellerId, buyerId);

    const insertSql = `
        INSERT INTO message (conversation_id, sender_type, message_data, image, sender_public_key, encryption_iv, attachment_iv, media_type)
      VALUES (?, 'seller', ?, ?, ?, ?, ?, ?)
    `;

    db.query(insertSql, [conversationId, messageText.trim() || "", savedMedia, senderPublicKey, encryptionIv, attachmentIv, mediaType], (insertErr, result) => {
      if (insertErr) {
        console.error("Seller message insert failed:", insertErr);
        return res.status(500).json({ message: "Unable to send message" });
      }

      publishChatMessage(sellerId, buyerId, conversationId, result.insertId);
      res.status(201).json({
        message_id: result.insertId,
        conversation_id: conversationId,
        sender_type: "seller",
        message_data: messageText.trim() || "",
        image: savedMedia,
        sender_public_key: senderPublicKey,
        encryption_iv: encryptionIv,
        attachment_iv: attachmentIv,
        media_type: mediaType,
      });
    });
  } catch (error) {
    console.error("Seller send message failed:", error);
    res.status(500).json({ message: "Unable to send message" });
  }
});

export default router;
