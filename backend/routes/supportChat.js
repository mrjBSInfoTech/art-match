import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import db from "../database/db.js";
import {
  countUnreadSupportForAdmins,
  countUnreadSupportForAccount,
  countUnreadSupportForBuyer,
  findSupportConversationById,
  getOrCreateSupportConversation,
  getOrCreateSupportConversationForAccount,
  getSupportConversationSummaryForBuyer,
  getSupportConversationSummaryForAccount,
  insertSupportMessage,
  listSupportInbox,
  listSupportMessages,
  markSupportRead,
  updateSupportContactEmail,
} from "../database/supportChat.js";
import { authenticateBuyer } from "../middleware/buyerAuthMiddleware.js";
import { authenticateSeller } from "../middleware/sellerAuthMiddleware.js";
import { authenticateAdmin } from "../middleware/adminAuthMiddleware.js";
import { isB2Configured, uploadToB2 } from "../utils/b2Storage.js";

const router = express.Router();

const MAX_MESSAGE_LENGTH = 5000;
const MAX_ISSUE_LENGTH = 100;
const validAccountRoles = new Set(["buyer", "seller"]);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const supportUploadDir = path.join(__dirname, "..", "uploads", "support-chat");
fs.mkdirSync(supportUploadDir, { recursive: true });

const SUPPORT_CHAT_B2_PREFIX = "app-uploads/support-chat";
const ALLOWED_ATTACHMENT_MIME_TYPES = new Set([
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);
const ALLOWED_ATTACHMENT_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".mp4",
  ".mov",
  ".webm",
  ".ogg",
  ".m4v",
  ".pdf",
  ".txt",
  ".csv",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
]);

const supportUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, supportUploadDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || "attachment.bin").toLowerCase();
      const safeBase = (file.originalname || "attachment")
        .replace(/\.[^/.]+$/, "")
        .replace(/[^a-zA-Z0-9_-]/g, "_")
        .slice(0, 60);
      const uniquePart = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      cb(null, `${uniquePart}-${safeBase || "file"}${ext}`);
    },
  }),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const mime = String(file.mimetype || "").toLowerCase();
    if (ext === ".svg" || mime === "image/svg+xml") {
      cb(new Error("SVG attachments are not permitted."), false);
      return;
    }
    const isMediaMime = mime.startsWith("image/") || mime.startsWith("video/");
    const isAllowedDocMime = ALLOWED_ATTACHMENT_MIME_TYPES.has(mime);
    const isAllowedExt = ALLOWED_ATTACHMENT_EXTENSIONS.has(ext);
    if (isMediaMime || isAllowedDocMime || isAllowedExt) {
      cb(null, true);
      return;
    }
    cb(new Error("Unsupported attachment file type."), false);
  },
});

const uploadSupportAttachment = (req, res, next) => {
  supportUpload.single("image")(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ message: "Attachments must be 20MB or smaller." });
    }
    return res.status(400).json({ message: err.message || "Invalid attachment upload." });
  });
};

const cleanupLocalUpload = async (filePath) => {
  if (!filePath) return;
  try {
    await fs.promises.unlink(filePath);
  } catch {
    // Ignore cleanup errors for missing files
  }
};

const persistSupportAttachment = async (file) => {
  if (!file) {
    return { image: null, mediaType: null, fileName: null };
  }
  const savedMedia = `http://localhost:5000/uploads/support-chat/${file.filename}`;
  const mediaType = file.mimetype || "application/octet-stream";
  const fileName = file.originalname ? path.basename(file.originalname) : file.filename;

  if (isB2Configured()) {
    const key = `${SUPPORT_CHAT_B2_PREFIX}/${path.basename(file.filename)}`;
    try {
      await uploadToB2({
        key,
        body: await fs.promises.readFile(file.path),
        contentType: mediaType,
      });
      await cleanupLocalUpload(file.path);
    } catch (b2Error) {
      console.warn("Support chat B2 upload failed, keeping local copy:", b2Error.message);
    }
  }

  return { image: savedMedia, mediaType, fileName };
};

const getBuyerId = (user) => user.customer_id || user.id;

const readMessage = (body) =>
  typeof body?.message === "string" ? body.message.trim() : "";

const getBuyerName = async (customerId) => {
  const [rows] = await db
    .promise()
    .query(
      "SELECT first_name, last_name, email FROM customer WHERE customer_id = ? LIMIT 1",
      [customerId],
    );
  const buyer = rows[0];
  if (!buyer) return { name: null, email: "" };
  return {
    name: `${buyer.first_name || ""} ${buyer.last_name || ""}`.trim() || null,
    email: buyer.email || "",
  };
};

const getSellerName = async (studentId) => {
  const [rows] = await db
    .promise()
    .query(
      "SELECT first_name, last_name, email FROM student WHERE student_id = ? LIMIT 1",
      [studentId],
    );
  const seller = rows[0];
  if (!seller) return { name: null, email: "" };
  return {
    name: `${seller.first_name || ""} ${seller.last_name || ""}`.trim() || null,
    email: seller.email || "",
  };
};

/* ------------------------------- Buyer side ------------------------------- */

router.get("/buyer/conversation", authenticateBuyer, async (req, res) => {
  const buyerId = getBuyerId(req.user);
  try {
    const conversation = await getOrCreateSupportConversation(buyerId);
    await markSupportRead(conversation.support_conversation_id, "buyer", buyerId);
    const messages = await listSupportMessages(
      conversation.support_conversation_id,
    );
    return res.json({
      conversation_id: conversation.support_conversation_id,
      messages,
    });
  } catch (error) {
    console.error("Unable to load support conversation:", error.code || error.name);
    return res
      .status(500)
      .json({ message: "Unable to load your support conversation." });
  }
});

// Compact preview of the buyer's support thread, for the buyer Messages page.
router.get("/buyer/summary", authenticateBuyer, async (req, res) => {
  try {
    const summary = await getSupportConversationSummaryForBuyer(
      getBuyerId(req.user),
    );
    return res.json({ conversation: summary });
  } catch (error) {
    console.error("Unable to load support summary:", error.code || error.name);
    return res.status(500).json({ message: "Unable to load support summary." });
  }
});

router.get("/buyer/unread-count", authenticateBuyer, async (req, res) => {
  try {
    const unread = await countUnreadSupportForBuyer(getBuyerId(req.user));
    return res.json({ unread_count: unread });
  } catch (error) {
    console.error("Unable to count support replies:", error.code || error.name);
    return res.status(500).json({ message: "Unable to count support replies." });
  }
});

// The email shown to admins always comes from the buyer's profile.
router.get("/buyer/profile-email", authenticateBuyer, async (req, res) => {
  try {
    const { email } = await getBuyerName(getBuyerId(req.user));
    return res.json({ email });
  } catch (error) {
    console.error("Unable to load profile email:", error.code || error.name);
    return res.status(500).json({ message: "Unable to load your email address." });
  }
});

router.post(
  "/buyer/messages",
  authenticateBuyer,
  uploadSupportAttachment,
  async (req, res) => {
    const buyerId = getBuyerId(req.user);
    const message = readMessage(req.body);
    const issueType =
      typeof req.body?.issue_type === "string" ? req.body.issue_type.trim() : "";

    if (!issueType) {
      await cleanupLocalUpload(req.file?.path);
      return res.status(400).json({ message: "Select the issue type." });
    }
    if (issueType.length > MAX_ISSUE_LENGTH) {
      await cleanupLocalUpload(req.file?.path);
      return res.status(400).json({
        message: `Issue type must be ${MAX_ISSUE_LENGTH} characters or fewer.`,
      });
    }
    if (!message && !req.file) {
      return res
        .status(400)
        .json({ message: "Tell us more or attach a file before sending." });
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      await cleanupLocalUpload(req.file?.path);
      return res.status(400).json({
        message: `Messages must be ${MAX_MESSAGE_LENGTH} characters or fewer.`,
      });
    }

    try {
      const attachment = await persistSupportAttachment(req.file);
      const conversation = await getOrCreateSupportConversation(buyerId);
      const { name: buyerName, email: profileEmail } = await getBuyerName(buyerId);
      if (profileEmail) {
        await updateSupportContactEmail(
          conversation.support_conversation_id,
          profileEmail,
        );
      }
      const messageId = await insertSupportMessage({
        conversationId: conversation.support_conversation_id,
        senderType: "buyer",
        senderName: buyerName,
        issueType,
        message,
        ...attachment,
      });
      await markSupportRead(conversation.support_conversation_id, "buyer", buyerId);

      return res.status(201).json({
        message_id: messageId,
        conversation_id: conversation.support_conversation_id,
        sender_type: "buyer",
        sender_name: buyerName,
        issue_type: issueType,
        message_data: message,
        image: attachment.image,
        media_type: attachment.mediaType,
        file_name: attachment.fileName,
      });
    } catch (error) {
      await cleanupLocalUpload(req.file?.path);
      console.error("Unable to send support message:", error.code || error.name);
      return res.status(500).json({ message: "Unable to send your message." });
    }
  },
);

/* ------------------------------- Seller side ----------------------------- */

router.get("/seller/conversation", authenticateSeller, async (req, res) => {
  const sellerId = req.user.student_id;
  try {
    const conversation = await getOrCreateSupportConversationForAccount(
      "seller",
      sellerId,
    );
    await markSupportRead(
      conversation.support_conversation_id,
      "seller",
      sellerId,
    );
    const messages = await listSupportMessages(
      conversation.support_conversation_id,
    );
    return res.json({
      conversation_id: conversation.support_conversation_id,
      messages,
    });
  } catch (error) {
    console.error("Unable to load seller support conversation:", error.code || error.name);
    return res
      .status(500)
      .json({ message: "Unable to load your support conversation." });
  }
});

router.get("/seller/summary", authenticateSeller, async (req, res) => {
  try {
    const summary = await getSupportConversationSummaryForAccount(
      "seller",
      req.user.student_id,
    );
    return res.json({ conversation: summary });
  } catch (error) {
    console.error("Unable to load seller support summary:", error.code || error.name);
    return res.status(500).json({ message: "Unable to load support messages." });
  }
});

router.get("/seller/unread-count", authenticateSeller, async (req, res) => {
  try {
    const unread = await countUnreadSupportForAccount(
      "seller",
      req.user.student_id,
    );
    return res.json({ unread_count: unread });
  } catch (error) {
    console.error("Unable to count seller support messages:", error.code || error.name);
    return res.status(500).json({ message: "Unable to count support messages." });
  }
});

router.post(
  "/seller/messages",
  authenticateSeller,
  uploadSupportAttachment,
  async (req, res) => {
    const sellerId = req.user.student_id;
    const message = readMessage(req.body);
    if (!message && !req.file) {
      return res
        .status(400)
        .json({ message: "Enter a message or attach a file before sending." });
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      await cleanupLocalUpload(req.file?.path);
      return res.status(400).json({
        message: `Messages must be ${MAX_MESSAGE_LENGTH} characters or fewer.`,
      });
    }

    try {
      const attachment = await persistSupportAttachment(req.file);
      const conversation = await getOrCreateSupportConversationForAccount(
        "seller",
        sellerId,
      );
      const { name: sellerName } = await getSellerName(sellerId);
      const messageId = await insertSupportMessage({
        conversationId: conversation.support_conversation_id,
        senderType: "seller",
        senderName: sellerName,
        message,
        ...attachment,
      });
      await markSupportRead(
        conversation.support_conversation_id,
        "seller",
        sellerId,
      );
      return res.status(201).json({
        message_id: messageId,
        conversation_id: conversation.support_conversation_id,
        sender_type: "seller",
        sender_name: sellerName,
        message_data: message,
        image: attachment.image,
        media_type: attachment.mediaType,
        file_name: attachment.fileName,
      });
    } catch (error) {
      await cleanupLocalUpload(req.file?.path);
      console.error("Unable to send seller support message:", error.code || error.name);
      return res.status(500).json({ message: "Unable to send your message." });
    }
  },
);

/* ------------------------------- Admin side ------------------------------- */

router.get("/admin/conversations", authenticateAdmin, async (_req, res) => {
  try {
    return res.json(await listSupportInbox());
  } catch (error) {
    console.error("Unable to load support inbox:", error.code || error.name);
    return res.status(500).json({ message: "Unable to load the support inbox." });
  }
});

router.get("/admin/unread-count", authenticateAdmin, async (_req, res) => {
  try {
    return res.json({ unread_count: await countUnreadSupportForAdmins() });
  } catch (error) {
    console.error("Unable to count support messages:", error.code || error.name);
    return res.status(500).json({ message: "Unable to count support messages." });
  }
});

router.get(
  "/admin/conversations/:conversationId/messages",
  authenticateAdmin,
  async (req, res) => {
    const conversationId = Number(req.params.conversationId);
    if (!conversationId) {
      return res.status(400).json({ message: "Invalid conversation id." });
    }

    try {
      const conversation = await findSupportConversationById(conversationId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found." });
      }
      await markSupportRead(conversationId, "admin", 0);
      const messages = await listSupportMessages(conversationId);
      return res.json({ conversation, messages });
    } catch (error) {
      console.error("Unable to load support thread:", error.code || error.name);
      return res.status(500).json({ message: "Unable to load the conversation." });
    }
  },
);

router.post(
  "/admin/conversations/:conversationId/messages",
  authenticateAdmin,
  uploadSupportAttachment,
  async (req, res) => {
    const conversationId = Number(req.params.conversationId);
    if (!conversationId) {
      await cleanupLocalUpload(req.file?.path);
      return res.status(400).json({ message: "Invalid conversation id." });
    }

    const message = readMessage(req.body);
    if (!message && !req.file) {
      return res
        .status(400)
        .json({ message: "Enter a reply or attach a file before sending." });
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      await cleanupLocalUpload(req.file?.path);
      return res.status(400).json({
        message: `Replies must be ${MAX_MESSAGE_LENGTH} characters or fewer.`,
      });
    }

    try {
      const conversation = await findSupportConversationById(conversationId);
      if (!conversation) {
        await cleanupLocalUpload(req.file?.path);
        return res.status(404).json({ message: "Conversation not found." });
      }

      const attachment = await persistSupportAttachment(req.file);

      const adminName =
        [req.user.first_name, req.user.last_name].filter(Boolean).join(" ").trim() ||
        req.user.username ||
        "ArtMatch Support";

      const messageId = await insertSupportMessage({
        conversationId,
        senderType: "admin",
        senderName: adminName,
        message,
        ...attachment,
      });
      await markSupportRead(conversationId, "admin", 0);

      return res.status(201).json({
        message_id: messageId,
        conversation_id: conversationId,
        sender_type: "admin",
        sender_name: adminName,
        message_data: message,
        image: attachment.image,
        media_type: attachment.mediaType,
        file_name: attachment.fileName,
      });
    } catch (error) {
      await cleanupLocalUpload(req.file?.path);
      console.error("Unable to send support reply:", error.code || error.name);
      return res.status(500).json({ message: "Unable to send your reply." });
    }
  },
);

router.post(
  "/admin/conversations/:role/:accountId",
  authenticateAdmin,
  async (req, res) => {
    const { role } = req.params;
    const accountId = Number(req.params.accountId);
    if (
      !validAccountRoles.has(role) ||
      !Number.isSafeInteger(accountId) ||
      accountId <= 0
    ) {
      return res.status(400).json({ message: "Invalid account role or ID." });
    }

    try {
      const accountTable = role === "buyer" ? "customer" : "student";
      const accountColumn = role === "buyer" ? "customer_id" : "student_id";
      const [accounts] = await db
        .promise()
        .query(`SELECT ${accountColumn} FROM ${accountTable} WHERE ${accountColumn} = ? LIMIT 1`, [accountId]);
      if (!accounts.length) {
        return res.status(404).json({ message: "Account not found." });
      }

      const conversation = await getOrCreateSupportConversationForAccount(
        role,
        accountId,
      );
      return res.status(201).json({
        conversation_id: conversation.support_conversation_id,
        account_role: role,
        account_id: accountId,
      });
    } catch (error) {
      console.error("Unable to start admin support conversation:", error.code || error.name);
      return res.status(500).json({ message: "Unable to start the conversation." });
    }
  },
);

export default router;
