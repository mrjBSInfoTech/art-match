import db from "./db.js";

const query = async (sql, params = []) => {
  const [rows] = await db.promise().query(sql, params);
  return rows;
};

export const ensureSupportChatTables = async () => {
  await query(
    `CREATE TABLE IF NOT EXISTS support_conversation (
      support_conversation_id INT AUTO_INCREMENT PRIMARY KEY,
      customer_id INT NULL,
      student_id INT NULL,
      contact_email VARCHAR(255) NULL,
      last_customer_message_at DATETIME NULL,
      last_seller_message_at DATETIME NULL,
      last_admin_message_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_support_conversation_customer (customer_id),
      UNIQUE KEY uq_support_conversation_student (student_id),
      CONSTRAINT fk_support_conversation_customer
        FOREIGN KEY (customer_id) REFERENCES customer (customer_id)
        ON DELETE CASCADE,
      CONSTRAINT fk_support_conversation_student
        FOREIGN KEY (student_id) REFERENCES student (student_id)
        ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
  );

  await query(
    `CREATE TABLE IF NOT EXISTS support_message (
      support_message_id INT AUTO_INCREMENT PRIMARY KEY,
      support_conversation_id INT NOT NULL,
      sender_type ENUM('buyer', 'seller', 'admin') NOT NULL,
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
  if (!conversationColumns.some((column) => column.Field === "student_id")) {
    await query(
      "ALTER TABLE support_conversation ADD COLUMN student_id INT NULL AFTER customer_id",
    );
    await query(
      "ALTER TABLE support_conversation ADD UNIQUE KEY uq_support_conversation_student (student_id)",
    );
    await query(
      `ALTER TABLE support_conversation
       ADD CONSTRAINT fk_support_conversation_student
       FOREIGN KEY (student_id) REFERENCES student (student_id) ON DELETE CASCADE`,
    );
  }
  const refreshedConversationColumns = await query("SHOW COLUMNS FROM support_conversation");
  const customerIdColumn = refreshedConversationColumns.find(
    (column) => column.Field === "customer_id",
  );
  if (customerIdColumn?.Null === "NO") {
    await query("ALTER TABLE support_conversation MODIFY customer_id INT NULL");
  }
  if (!conversationColumns.some((column) => column.Field === "contact_email")) {
    await query(
      "ALTER TABLE support_conversation ADD COLUMN contact_email VARCHAR(255) NULL AFTER customer_id",
    );
  }
  if (!refreshedConversationColumns.some((column) => column.Field === "last_seller_message_at")) {
    await query(
      "ALTER TABLE support_conversation ADD COLUMN last_seller_message_at DATETIME NULL AFTER last_customer_message_at",
    );
  }

  const messageColumns = await query("SHOW COLUMNS FROM support_message");
  const senderTypeColumn = messageColumns.find((column) => column.Field === "sender_type");
  if (senderTypeColumn && !senderTypeColumn.Type.includes("'seller'")) {
    await query(
      "ALTER TABLE support_message MODIFY sender_type ENUM('buyer', 'seller', 'admin') NOT NULL",
    );
  }
  if (!messageColumns.some((column) => column.Field === "issue_type")) {
    await query(
      "ALTER TABLE support_message ADD COLUMN issue_type VARCHAR(100) NULL AFTER sender_name",
    );
  }
  if (!messageColumns.some((column) => column.Field === "image")) {
    await query(
      "ALTER TABLE support_message ADD COLUMN image VARCHAR(500) NULL AFTER message_data",
    );
  }
  if (!messageColumns.some((column) => column.Field === "media_type")) {
    await query(
      "ALTER TABLE support_message ADD COLUMN media_type VARCHAR(100) NULL AFTER image",
    );
  }
  if (!messageColumns.some((column) => column.Field === "file_name")) {
    await query(
      "ALTER TABLE support_message ADD COLUMN file_name VARCHAR(255) NULL AFTER media_type",
    );
  }
  const messageDataColumn = messageColumns.find(
    (column) => column.Field === "message_data",
  );
  if (messageDataColumn?.Null === "NO") {
    await query("ALTER TABLE support_message MODIFY message_data TEXT NULL");
  }

  await query(
    `CREATE TABLE IF NOT EXISTS support_read_state (
      support_conversation_id INT NOT NULL,
      account_type ENUM('buyer', 'seller', 'admin') NOT NULL,
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
  const readStateColumns = await query("SHOW COLUMNS FROM support_read_state");
  const accountTypeColumn = readStateColumns.find(
    (column) => column.Field === "account_type",
  );
  if (accountTypeColumn && !accountTypeColumn.Type.includes("'seller'")) {
    await query(
      "ALTER TABLE support_read_state MODIFY account_type ENUM('buyer', 'seller', 'admin') NOT NULL",
    );
  }
};

export const findSupportConversationForAccount = async (role, accountId) => {
  const accountColumn = role === "seller" ? "student_id" : "customer_id";
  const rows = await query(
    `SELECT support_conversation_id, customer_id, student_id, created_at
     FROM support_conversation
     WHERE ${accountColumn} = ?
     LIMIT 1`,
    [accountId],
  );
  return rows[0] || null;
};

export const getOrCreateSupportConversationForAccount = async (role, accountId) => {
  if (role !== "buyer" && role !== "seller") {
    throw new Error("Invalid support account role.");
  }
  const existing = await findSupportConversationForAccount(role, accountId);
  if (existing) return existing;

  const accountColumn = role === "seller" ? "student_id" : "customer_id";
  try {
    await query(
      `INSERT INTO support_conversation (${accountColumn}) VALUES (?)`,
      [accountId],
    );
  } catch (error) {
    if (error.code !== "ER_DUP_ENTRY") throw error;
  }
  return findSupportConversationForAccount(role, accountId);
};

export const getOrCreateSupportConversation = (customerId) =>
  getOrCreateSupportConversationForAccount("buyer", customerId);

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
            sender_name, issue_type, message_data, image, media_type, file_name,
            created_at
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
  image,
  mediaType,
  fileName,
}) => {
  const [result] = await db
    .promise()
    .query(
      `INSERT INTO support_message
         (support_conversation_id, sender_type, sender_name, issue_type, message_data, image, media_type, file_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        conversationId,
        senderType,
        senderName || null,
        issueType || null,
        message || "",
        image || null,
        mediaType || null,
        fileName || null,
      ],
    );

  const timestampColumn = {
    buyer: "last_customer_message_at",
    seller: "last_seller_message_at",
    admin: "last_admin_message_at",
  }[senderType];
  if (!timestampColumn) throw new Error("Invalid support message sender type.");
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
       CASE WHEN sc.student_id IS NULL THEN 'buyer' ELSE 'seller' END AS account_role,
       COALESCE(sc.customer_id, sc.student_id) AS account_id,
       CASE
         WHEN sc.student_id IS NULL AND COALESCE(cu.is_private, 0) = 1 THEN 'Private buyer'
         WHEN sc.student_id IS NULL THEN CONCAT(cu.first_name, ' ', cu.last_name)
         ELSE CONCAT(s.first_name, ' ', s.last_name)
       END AS account_name,
       COALESCE(sc.contact_email, cu.email, s.email) AS account_email,
       CASE
         WHEN sc.student_id IS NULL AND COALESCE(cu.is_private, 0) = 1 THEN NULL
         WHEN sc.student_id IS NULL THEN cu.profile_image
         ELSE s.profile_image
       END AS account_avatar,
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
       COALESCE(
         NULLIF(m.message_data, ''),
         CASE WHEN m.image IS NOT NULL THEN COALESCE(m.file_name, 'Attachment') ELSE NULL END
       ) AS last_message,
       m.image AS last_image,
       m.media_type AS last_media_type,
       m.file_name AS last_file_name,
       m.sender_type AS last_sender_type,
       m.created_at AS last_message_time,
       (
         SELECT COUNT(*)
         FROM support_message unread
         WHERE unread.support_conversation_id = sc.support_conversation_id
           AND unread.sender_type = CASE WHEN sc.student_id IS NULL THEN 'buyer' ELSE 'seller' END
           AND unread.support_message_id > COALESCE(rs.last_read_message_id, 0)
       ) AS unread_count
     FROM support_conversation sc
     LEFT JOIN customer cu ON cu.customer_id = sc.customer_id
     LEFT JOIN student s ON s.student_id = sc.student_id
     LEFT JOIN support_message m ON m.support_message_id = (
       SELECT MAX(m2.support_message_id)
       FROM support_message m2
       WHERE m2.support_conversation_id = sc.support_conversation_id
     )
     LEFT JOIN support_read_state rs
       ON rs.support_conversation_id = sc.support_conversation_id
       AND rs.account_type = 'admin'
       AND rs.account_id = 0
     ORDER BY COALESCE(m.created_at, sc.created_at) DESC`,
  );

export const findSupportConversationById = async (conversationId) => {
  const rows = await query(
    `SELECT
       sc.support_conversation_id,
       sc.customer_id,
       sc.student_id,
       CASE WHEN sc.student_id IS NULL THEN 'buyer' ELSE 'seller' END AS account_role,
       COALESCE(sc.customer_id, sc.student_id) AS account_id,
       CASE
         WHEN sc.student_id IS NULL AND COALESCE(cu.is_private, 0) = 1 THEN 'Private buyer'
         WHEN sc.student_id IS NULL THEN CONCAT(cu.first_name, ' ', cu.last_name)
         ELSE CONCAT(s.first_name, ' ', s.last_name)
       END AS account_name,
       COALESCE(sc.contact_email, cu.email, s.email) AS account_email,
       sc.contact_email,
       CASE
         WHEN sc.student_id IS NULL AND COALESCE(cu.is_private, 0) = 1 THEN NULL
         WHEN sc.student_id IS NULL THEN cu.profile_image
         ELSE s.profile_image
       END AS account_avatar
     FROM support_conversation sc
     LEFT JOIN customer cu ON cu.customer_id = sc.customer_id
     LEFT JOIN student s ON s.student_id = sc.student_id
     WHERE sc.support_conversation_id = ?
     LIMIT 1`,
    [conversationId],
  );
  return rows[0] || null;
};

export const getSupportConversationSummaryForAccount = async (role, accountId) => {
  const rows = await query(
    `SELECT
       sc.support_conversation_id,
       COALESCE(sc.contact_email, cu.email, s.email) AS contact_email,
       COALESCE(
         NULLIF(m.message_data, ''),
         CASE WHEN m.image IS NOT NULL THEN COALESCE(m.file_name, 'Attachment') ELSE NULL END
       ) AS last_message,
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
     LEFT JOIN student s ON s.student_id = sc.student_id
     LEFT JOIN support_read_state rs
       ON rs.support_conversation_id = sc.support_conversation_id
       AND rs.account_type = ?
       AND rs.account_id = ?
     LEFT JOIN support_message m ON m.support_message_id = (
       SELECT MAX(m2.support_message_id)
       FROM support_message m2
       WHERE m2.support_conversation_id = sc.support_conversation_id
     )
     WHERE ((? = 'buyer' AND sc.customer_id = ?)
       OR (? = 'seller' AND sc.student_id = ?))
     LIMIT 1`,
    [role, accountId, role, accountId, role, accountId],
  );
  return rows[0] || null;
};

export const getSupportConversationSummaryForBuyer = (customerId) =>
  getSupportConversationSummaryForAccount("buyer", customerId);

export const countUnreadSupportForAccount = async (role, accountId) => {
  const rows = await query(
    `SELECT COUNT(*) AS unread_count
     FROM support_conversation sc
     JOIN support_message m
       ON m.support_conversation_id = sc.support_conversation_id
     LEFT JOIN support_read_state rs
       ON rs.support_conversation_id = sc.support_conversation_id
       AND rs.account_type = ?
       AND rs.account_id = ?
     WHERE ((? = 'buyer' AND sc.customer_id = ?)
       OR (? = 'seller' AND sc.student_id = ?))
       AND m.sender_type = 'admin'
       AND m.support_message_id > COALESCE(rs.last_read_message_id, 0)`,
    [role, accountId, role, accountId, role, accountId],
  );
  return Number(rows[0]?.unread_count || 0);
};

export const countUnreadSupportForBuyer = (customerId) =>
  countUnreadSupportForAccount("buyer", customerId);

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
     WHERE m.sender_type IN ('buyer', 'seller')
       AND m.support_message_id > COALESCE(rs.last_read_message_id, 0)`,
  );
  return Number(rows[0]?.unread_count || 0);
};
