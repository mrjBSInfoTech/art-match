CREATE TABLE IF NOT EXISTS chat_public_keys (
  public_key_id INT AUTO_INCREMENT PRIMARY KEY,
  account_type ENUM('buyer', 'seller') NOT NULL,
  account_id INT NOT NULL,
  public_key TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_chat_public_key_account (account_type, account_id)
);

INSERT INTO chat_public_keys (account_type, account_id, public_key)
SELECT 'buyer', customer_id, chat_public_key
FROM customer
WHERE chat_public_key IS NOT NULL AND chat_public_key <> ''
ON DUPLICATE KEY UPDATE public_key = VALUES(public_key);

INSERT INTO chat_public_keys (account_type, account_id, public_key)
SELECT 'seller', student_id, chat_public_key
FROM student
WHERE chat_public_key IS NOT NULL AND chat_public_key <> ''
ON DUPLICATE KEY UPDATE public_key = VALUES(public_key);
