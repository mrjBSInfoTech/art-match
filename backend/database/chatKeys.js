import db from "./db.js";

const createTableSql = `
  CREATE TABLE IF NOT EXISTS chat_public_keys (
    public_key_id INT AUTO_INCREMENT PRIMARY KEY,
    account_type ENUM('buyer', 'seller') NOT NULL,
    account_id INT NOT NULL,
    public_key TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_chat_public_key_account (account_type, account_id)
  )
`;

const migrateExistingKeys = () => {
  db.query("SHOW COLUMNS FROM customer LIKE 'chat_public_key'", (customerError, customerRows) => {
    db.query("SHOW COLUMNS FROM student LIKE 'chat_public_key'", (studentError, studentRows) => {
      const statements = [];
      if (!customerError && customerRows.length > 0) {
        statements.push(`INSERT INTO chat_public_keys (account_type, account_id, public_key)
          SELECT 'buyer', customer_id, chat_public_key FROM customer
          WHERE chat_public_key IS NOT NULL AND chat_public_key <> ''
          ON DUPLICATE KEY UPDATE public_key = VALUES(public_key)`);
      }
      if (!studentError && studentRows.length > 0) {
        statements.push(`INSERT INTO chat_public_keys (account_type, account_id, public_key)
          SELECT 'seller', student_id, chat_public_key FROM student
          WHERE chat_public_key IS NOT NULL AND chat_public_key <> ''
          ON DUPLICATE KEY UPDATE public_key = VALUES(public_key)`);
      }

      const runNext = (index) => {
        if (index >= statements.length) return;
        db.query(statements[index], (error) => {
          if (error) console.error("Failed to migrate chat public keys:", error.message);
          else runNext(index + 1);
        });
      };

      runNext(0);
    });
  });
};

export const ensureChatPublicKeysTable = () => {
  db.query(createTableSql, (error) => {
    if (error) {
      console.error("Failed to create chat_public_keys table:", error.message);
      return;
    }
    migrateExistingKeys();
  });
};

export const saveChatPublicKey = (accountType, accountId, publicKey, callback) => {
  db.query(
    `INSERT INTO chat_public_keys (account_type, account_id, public_key)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE public_key = VALUES(public_key)`,
    [accountType, accountId, publicKey],
    callback,
  );
};

export const getChatPublicKey = (accountType, accountId, callback) => {
  db.query(
    `SELECT public_key
     FROM chat_public_keys
     WHERE account_type = ? AND account_id = ?
     LIMIT 1`,
    [accountType, accountId],
    callback,
  );
};
