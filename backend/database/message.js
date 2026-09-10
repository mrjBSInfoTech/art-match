import db from "./db.js";

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
