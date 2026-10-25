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

const query = (sql) =>
  new Promise((resolve, reject) => {
    db.query(sql, (error, rows) => (error ? reject(error) : resolve(rows)));
  });

const migrateExistingKeys = async () => {
  const [customerRows, studentRows] = await Promise.all([
    query("SHOW COLUMNS FROM customer LIKE 'chat_public_key'"),
    query("SHOW COLUMNS FROM student LIKE 'chat_public_key'"),
  ]);
  const statements = [];
  if (customerRows.length > 0) {
    statements.push(`INSERT INTO chat_public_keys (account_type, account_id, public_key)
      SELECT 'buyer', customer_id, chat_public_key FROM customer
      WHERE chat_public_key IS NOT NULL AND chat_public_key <> ''
      ON DUPLICATE KEY UPDATE public_key = VALUES(public_key)`);
  }
  if (studentRows.length > 0) {
    statements.push(`INSERT INTO chat_public_keys (account_type, account_id, public_key)
      SELECT 'seller', student_id, chat_public_key FROM student
      WHERE chat_public_key IS NOT NULL AND chat_public_key <> ''
      ON DUPLICATE KEY UPDATE public_key = VALUES(public_key)`);
  }
  for (const statement of statements) await query(statement);
};

export const ensureChatPublicKeysTable = async () => {
  await query(createTableSql);
  await migrateExistingKeys();
};

export const ensureChatKeyRecoveryTable = () =>
  new Promise((resolve, reject) => {
    db.query(
      `CREATE TABLE IF NOT EXISTS chat_key_recovery (
        account_type ENUM('buyer', 'seller') NOT NULL,
        account_id INT NOT NULL,
        public_key TEXT NOT NULL,
        encrypted_private_key TEXT NOT NULL,
        salt VARCHAR(64) NOT NULL,
        iv VARCHAR(64) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (account_type, account_id)
      ) ENGINE=InnoDB`,
      (error) => (error ? reject(error) : resolve()),
    );
  });

export const saveChatKeyRecovery = (accountType, accountId, backup, callback) => {
  db.query(
    `INSERT INTO chat_key_recovery
       (account_type, account_id, public_key, encrypted_private_key, salt, iv)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       public_key = VALUES(public_key),
       encrypted_private_key = VALUES(encrypted_private_key),
       salt = VALUES(salt),
       iv = VALUES(iv)`,
    [
      accountType,
      accountId,
      backup.publicKey,
      backup.encryptedPrivateKey,
      backup.salt,
      backup.iv,
    ],
    callback,
  );
};

export const getChatKeyRecovery = (accountType, accountId, callback) => {
  db.query(
    `SELECT public_key AS publicKey,
            encrypted_private_key AS encryptedPrivateKey, salt, iv
     FROM chat_key_recovery
     WHERE account_type = ? AND account_id = ?
     LIMIT 1`,
    [accountType, accountId],
    callback,
  );
};

export const deleteChatKeyRecovery = (accountType, accountId, callback) => {
  db.query(
    "DELETE FROM chat_key_recovery WHERE account_type = ? AND account_id = ?",
    [accountType, accountId],
    callback,
  );
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
