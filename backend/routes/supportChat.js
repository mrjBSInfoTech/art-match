import express from "express";
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

const router = express.Router();

const MAX_MESSAGE_LENGTH = 5000;
const MAX_ISSUE_LENGTH = 100;
const validAccountRoles = new Set(["buyer", "seller"]);

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

router.post("/seller/messages", authenticateSeller, async (req, res) => {
  const sellerId = req.user.student_id;
  const message = readMessage(req.body);
  if (!message) {
    return res.status(400).json({ message: "Enter a message before sending." });
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({
      message: `Messages must be ${MAX_MESSAGE_LENGTH} characters or fewer.`,
    });
  }

  try {
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
    });
  } catch (error) {
    console.error("Unable to send seller support message:", error.code || error.name);
    return res.status(500).json({ message: "Unable to send your message." });
  }
});

/* ------------------------------- Admin side ------------------------------- */

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
