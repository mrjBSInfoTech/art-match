import express from "express";
import db from "../database/db.js";
import {
  countUnreadSupportForAdmins,
  countUnreadSupportForBuyer,
  findSupportConversationById,
  getOrCreateSupportConversation,
  getSupportConversationSummaryForBuyer,
  insertSupportMessage,
  listSupportInbox,
  listSupportMessages,
  markSupportRead,
  updateSupportContactEmail,
} from "../database/supportChat.js";
import { authenticateBuyer } from "../middleware/buyerAuthMiddleware.js";
import { authenticateAdmin } from "../middleware/adminAuthMiddleware.js";

const router = express.Router();

const MAX_MESSAGE_LENGTH = 5000;
const MAX_ISSUE_LENGTH = 100;

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

router.post("/buyer/messages", authenticateBuyer, async (req, res) => {
  const buyerId = getBuyerId(req.user);
  const message = readMessage(req.body);
  const issueType =
    typeof req.body?.issue_type === "string" ? req.body.issue_type.trim() : "";

  if (!issueType) {
    return res.status(400).json({ message: "Select the issue type." });
  }
  if (issueType.length > MAX_ISSUE_LENGTH) {
    return res.status(400).json({
      message: `Issue type must be ${MAX_ISSUE_LENGTH} characters or fewer.`,
    });
  }
  if (!message) {
    return res.status(400).json({ message: "Tell us more before sending." });
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({
      message: `Messages must be ${MAX_MESSAGE_LENGTH} characters or fewer.`,
    });
  }

  try {
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
    });
    await markSupportRead(conversation.support_conversation_id, "buyer", buyerId);

    return res.status(201).json({
      message_id: messageId,
      conversation_id: conversation.support_conversation_id,
      sender_type: "buyer",
      sender_name: buyerName,
      issue_type: issueType,
      message_data: message,
    });
  } catch (error) {
    console.error("Unable to send support message:", error.code || error.name);
    return res.status(500).json({ message: "Unable to send your message." });
  }
});

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
  async (req, res) => {
    const conversationId = Number(req.params.conversationId);
    if (!conversationId) {
      return res.status(400).json({ message: "Invalid conversation id." });
    }

    const message = readMessage(req.body);
    if (!message) {
      return res.status(400).json({ message: "Enter a reply before sending." });
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({
        message: `Replies must be ${MAX_MESSAGE_LENGTH} characters or fewer.`,
      });
    }

    try {
      const conversation = await findSupportConversationById(conversationId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found." });
      }

      const adminName =
        [req.user.first_name, req.user.last_name].filter(Boolean).join(" ").trim() ||
        req.user.username ||
        "ArtMatch Support";

      const messageId = await insertSupportMessage({
        conversationId,
        senderType: "admin",
        senderName: adminName,
        message,
      });
      await markSupportRead(conversationId, "admin", 0);

      return res.status(201).json({
        message_id: messageId,
        conversation_id: conversationId,
        sender_type: "admin",
        sender_name: adminName,
        message_data: message,
      });
    } catch (error) {
      console.error("Unable to send support reply:", error.code || error.name);
      return res.status(500).json({ message: "Unable to send your reply." });
    }
  },
);

export default router;
