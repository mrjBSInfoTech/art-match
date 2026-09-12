CREATE TABLE IF NOT EXISTS chat_public_keys (
  public_key_id INT AUTO_INCREMENT PRIMARY KEY,
  account_type ENUM('buyer', 'seller') NOT NULL,
  account_id INT NOT NULL,
  public_key TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_chat_public_key_account (account_type, account_id)
);

ALTER TABLE message
  ADD COLUMN sender_public_key TEXT NULL AFTER sender_name,
  ADD COLUMN encryption_iv VARCHAR(64) NULL AFTER sender_public_key,
  ADD COLUMN attachment_iv VARCHAR(64) NULL AFTER encryption_iv,
  ADD COLUMN media_type VARCHAR(100) NULL AFTER attachment_iv;
