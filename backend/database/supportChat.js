import db from "./db.js";

const query = async (sql, params = []) => {
  const [rows] = await db.promise().query(sql, params);
  return rows;
};

export const ensureSupportChatTables = async () => {
  await query(
    `CREATE TABLE IF NOT EXISTS support_conversation (
      support_conversation_id INT AUTO_INCREMENT PRIMARY KEY,
      customer_id INT NOT NULL,
      contact_email VARCHAR(255) NULL,
      last_customer_message_at DATETIME NULL,
      last_admin_message_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_support_conversation_customer (customer_id),
      CONSTRAINT fk_support_conversation_customer
        FOREIGN KEY (customer_id) REFERENCES customer (customer_id)
        ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
  );

  await query(
    `CREATE TABLE IF NOT EXISTS support_message (
      support_message_id INT AUTO_INCREMENT PRIMARY KEY,
      support_conversation_id INT NOT NULL,
      sender_type ENUM('buyer', 'admin') NOT NULL,
      sender_name VARCHAR(201) NULL,
      message_data TEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_support_message_conversation
        (support_conversation_id, support_message_id),
      CONSTRAINT fk_support_message_conversation
        FOREIGN KEY (support_conversation_id)
        REFERENCES support_conversation (support_conversation_id)
        ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
  );

  // Migrations for databases created before the contact template existed.
  const conversationColumns = await query("SHOW COLUMNS FROM support_conversation");
  if (!conversationColumns.some((column) => column.Field === "contact_email")) {
    await query(
      "ALTER TABLE support_conversation ADD COLUMN contact_email VARCHAR(255) NULL AFTER customer_id",
    );
  }

  const messageColumns = await query("SHOW COLUMNS FROM support_message");
  if (!messageColumns.some((column) => column.Field === "issue_type")) {
    await query(
      "ALTER TABLE support_message ADD COLUMN issue_type VARCHAR(100) NULL AFTER sender_name",
    );
  }

  await query(
    `CREATE TABLE IF NOT EXISTS support_read_state (
      support_conversation_id INT NOT NULL,
      account_type ENUM('buyer', 'admin') NOT NULL,
      account_id INT NOT NULL,
      last_read_message_id INT NOT NULL DEFAULT 0,
      PRIMARY KEY (support_conversation_id, account_type, account_id),
      INDEX idx_support_read_account (account_type, account_id),
      CONSTRAINT fk_support_read_conversation
        FOREIGN KEY (support_conversation_id)
        REFERENCES support_conversation (support_conversation_id)
        ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
  );
};

export const findSupportConversationForBuyer = async (customerId) => {
  const rows = await query(
    `SELECT support_conversation_id, customer_id, created_at
     FROM support_conversation
     WHERE customer_id = ?
     LIMIT 1`,
    [customerId],
  );
  return rows[0] || null;
};

export const getOrCreateSupportConversation = async (customerId) => {
  const existing = await findSupportConversationForBuyer(customerId);
  if (existing) return existing;

  await query(
    "INSERT INTO support_conversation (customer_id) VALUES (?)",
    [customerId],
  );
  return findSupportConversationForBuyer(customerId);
};

export const markSupportRead = async (conversationId, accountType, accountId) => {
  await query(
    `INSERT INTO support_read_state
       (support_conversation_id, account_type, account_id, last_read_message_id)
     SELECT ?, ?, ?, COALESCE(MAX(support_message_id), 0)
     FROM support_message
     WHERE support_conversation_id = ?
     ON DUPLICATE KEY UPDATE
       last_read_message_id = GREATEST(
         last_read_message_id,
         VALUES(last_read_message_id)
       )`,
    [conversationId, accountType, accountId, conversationId],
  );
};

export const listSupportMessages = async (conversationId) =>
  query(
    `SELECT support_message_id, support_conversation_id, sender_type,
            sender_name, issue_type, message_data, created_at
     FROM support_message
     WHERE support_conversation_id = ?
     ORDER BY support_message_id ASC`,
    [conversationId],
  );

export const updateSupportContactEmail = async (conversationId, email) => {
  await query(
    "UPDATE support_conversation SET contact_email = ? WHERE support_conversation_id = ?",
    [email, conversationId],
  );
};

export const insertSupportMessage = async ({
  conversationId,
  senderType,
  senderName,
  issueType,
  message,
}) => {
  const [result] = await db
    .promise()
    .query(
      `INSERT INTO support_message
         (support_conversation_id, sender_type, sender_name, issue_type, message_data)
       VALUES (?, ?, ?, ?, ?)`,
      [conversationId, senderType, senderName || null, issueType || null, message],
    );

  const timestampColumn =
    senderType === "buyer" ? "last_customer_message_at" : "last_admin_message_at";
  await query(
    `UPDATE support_conversation
     SET ${timestampColumn} = CURRENT_TIMESTAMP
     WHERE support_conversation_id = ?`,
    [conversationId],
  );

  return result.insertId;
};

export const listSupportInbox = async () =>
  query(
    `SELECT
       sc.support_conversation_id,
       sc.customer_id,
       CASE
         WHEN COALESCE(cu.is_private, 0) = 1 THEN 'Private buyer'
         ELSE CONCAT(cu.first_name, ' ', cu.last_name)
       END AS buyer_name,
       COALESCE(sc.contact_email, cu.email) AS buyer_email,
       CASE
         WHEN COALESCE(cu.is_private, 0) = 1 THEN NULL
         ELSE cu.profile_image
       END AS buyer_avatar,
       COALESCE(
         m.issue_type,
         (
           SELECT m3.issue_type
           FROM support_message m3
           WHERE m3.support_conversation_id = sc.support_conversation_id
             AND m3.issue_type IS NOT NULL
           ORDER BY m3.support_message_id DESC
           LIMIT 1
         )
       ) AS last_issue_type,
       m.message_data AS last_message,
       m.sender_type AS last_sender_type,
       m.created_at AS last_message_time,
       (
         SELECT COUNT(*)
         FROM support_message unread
         WHERE unread.support_conversation_id = sc.support_conversation_id
           AND unread.sender_type = 'buyer'
           AND unread.support_message_id > COALESCE(rs.last_read_message_id, 0)
       ) AS unread_count
     FROM support_conversation sc
     LEFT JOIN customer cu ON cu.customer_id = sc.customer_id
     LEFT JOIN support_message m ON m.support_message_id = (
       SELECT MAX(m2.support_message_id)
       FROM support_message m2
       WHERE m2.support_conversation_id = sc.support_conversation_id
     )
     LEFT JOIN support_read_state rs
       ON rs.support_conversation_id = sc.support_conversation_id
       AND rs.account_type = 'admin'
       AND rs.account_id = 0
     WHERE m.support_message_id IS NOT NULL
     ORDER BY COALESCE(m.created_at, sc.created_at) DESC`,
  );

export const findSupportConversationById = async (conversationId) => {
  const rows = await query(
    `SELECT
       sc.support_conversation_id,
       sc.customer_id,
       CASE
         WHEN COALESCE(cu.is_private, 0) = 1 THEN 'Private buyer'
         ELSE CONCAT(cu.first_name, ' ', cu.last_name)
       END AS buyer_name,
       COALESCE(sc.contact_email, cu.email) AS buyer_email,
       sc.contact_email,
       CASE
         WHEN COALESCE(cu.is_private, 0) = 1 THEN NULL
         ELSE cu.profile_image
       END AS buyer_avatar
     FROM support_conversation sc
     LEFT JOIN customer cu ON cu.customer_id = sc.customer_id
     WHERE sc.support_conversation_id = ?
     LIMIT 1`,
    [conversationId],
  );
  return rows[0] || null;
};

export const getSupportConversationSummaryForBuyer = async (customerId) => {
  const rows = await query(
    `SELECT
       sc.support_conversation_id,
       COALESCE(sc.contact_email, cu.email) AS contact_email,
       m.message_data AS last_message,
       m.sender_type AS last_sender_type,
       m.created_at AS last_message_time,
       (
         SELECT COUNT(*)
         FROM support_message unread
         WHERE unread.support_conversation_id = sc.support_conversation_id
           AND unread.sender_type = 'admin'
           AND unread.support_message_id > COALESCE(rs.last_read_message_id, 0)
       ) AS unread_count
     FROM support_conversation sc
     LEFT JOIN customer cu ON cu.customer_id = sc.customer_id
     LEFT JOIN support_read_state rs
       ON rs.support_conversation_id = sc.support_conversation_id
       AND rs.account_type = 'buyer'
       AND rs.account_id = sc.customer_id
     LEFT JOIN support_message m ON m.support_message_id = (
       SELECT MAX(m2.support_message_id)
       FROM support_message m2
       WHERE m2.support_conversation_id = sc.support_conversation_id
     )
     WHERE sc.customer_id = ?
       AND m.support_message_id IS NOT NULL
     LIMIT 1`,
    [customerId],
  );
  return rows[0] || null;
};

export const countUnreadSupportForBuyer = async (customerId) => {
  const rows = await query(
    `SELECT COUNT(*) AS unread_count
     FROM support_conversation sc
     JOIN support_message m
       ON m.support_conversation_id = sc.support_conversation_id
     LEFT JOIN support_read_state rs
       ON rs.support_conversation_id = sc.support_conversation_id
       AND rs.account_type = 'buyer'
       AND rs.account_id = sc.customer_id
     WHERE sc.customer_id = ?
       AND m.sender_type = 'admin'
       AND m.support_message_id > COALESCE(rs.last_read_message_id, 0)`,
    [customerId],
  );
  return Number(rows[0]?.unread_count || 0);
};

export const countUnreadSupportForAdmins = async () => {
  const rows = await query(
    `SELECT COUNT(*) AS unread_count
     FROM support_conversation sc
     JOIN support_message m
       ON m.support_conversation_id = sc.support_conversation_id
     LEFT JOIN support_read_state rs
       ON rs.support_conversation_id = sc.support_conversation_id
       AND rs.account_type = 'admin'
       AND rs.account_id = 0
     WHERE m.sender_type = 'buyer'
       AND m.support_message_id > COALESCE(rs.last_read_message_id, 0)`,
  );
  return Number(rows[0]?.unread_count || 0);
};
