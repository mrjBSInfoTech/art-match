import db from "./db.js";

export const ensureConversationReadStateTable = () =>
  new Promise((resolve, reject) => {
    db.query(
      `CREATE TABLE IF NOT EXISTS conversation_read_state (
        conversation_id INT NOT NULL,
        account_type ENUM('buyer', 'seller') NOT NULL,
        account_id INT NOT NULL,
        last_read_message_id INT NOT NULL DEFAULT 0,
        hidden_through_message_id INT NULL DEFAULT NULL,
        PRIMARY KEY (conversation_id, account_type, account_id),
        INDEX idx_conversation_read_account (account_type, account_id)
      ) ENGINE=InnoDB`,
      (createError) => {
        if (createError) return reject(createError);
        db.query(
          "ALTER TABLE conversation_read_state ADD COLUMN hidden_through_message_id INT NULL DEFAULT NULL",
          (alterError) => {
            if (alterError && alterError.code !== "ER_DUP_FIELDNAME") {
              return reject(alterError);
            }
            db.query(
              `CREATE TABLE IF NOT EXISTS chat_blocks (
                blocker_type ENUM('buyer', 'seller') NOT NULL,
                blocker_id INT NOT NULL,
                blocked_type ENUM('buyer', 'seller') NOT NULL,
                blocked_id INT NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (blocker_type, blocker_id, blocked_type, blocked_id),
                INDEX idx_chat_blocks_target (blocked_type, blocked_id)
              ) ENGINE=InnoDB`,
              (blockError) => (blockError ? reject(blockError) : resolve()),
            );
          },
        );
      },
    );
  });

const backfillSenderNames = () => {
  const sql = `
    UPDATE message m
    JOIN conversation c ON c.conversation_id = m.conversation_id
    LEFT JOIN student s ON s.student_id = c.student_id
    LEFT JOIN customer cu ON cu.customer_id = c.customer_id
    SET m.sender_name = CASE
      WHEN m.sender_type = 'buyer' THEN CONCAT(cu.first_name, ' ', cu.last_name)
      ELSE CONCAT(s.first_name, ' ', s.last_name)
    END
    WHERE m.sender_name IS NULL
  `;

  db.query(sql, (error) => {
    if (error) {
      console.error("Failed to backfill message sender names:", error.message);
      return;
    }
    console.log("Message sender names are up to date.");
  });
};

export const ensureMessageSenderNameColumn = () => {
  const schemaUpdates = [
    ["message sender_name", "ALTER TABLE message ADD COLUMN sender_name VARCHAR(201) NULL AFTER sender_type"],
    ["message sender_public_key", "ALTER TABLE message ADD COLUMN sender_public_key TEXT NULL AFTER sender_name"],
    ["message encryption_iv", "ALTER TABLE message ADD COLUMN encryption_iv VARCHAR(64) NULL AFTER sender_public_key"],
    ["message attachment_iv", "ALTER TABLE message ADD COLUMN attachment_iv VARCHAR(64) NULL AFTER encryption_iv"],
    ["message media_type", "ALTER TABLE message ADD COLUMN media_type VARCHAR(100) NULL AFTER attachment_iv"],
  ];

  const applyNextUpdate = (index) => {
    if (index >= schemaUpdates.length) {
      backfillSenderNames();
      return;
    }

    const [label, sql] = schemaUpdates[index];
    db.query(sql, (error) => {
      if (error && error.code !== "ER_DUP_FIELDNAME") {
        console.error(`Failed to add ${label}:`, error.message);
        return;
      }
      applyNextUpdate(index + 1);
    });
  };

  applyNextUpdate(0);
};
