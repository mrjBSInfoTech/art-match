-- Add versioning to chat recovery backups without changing existing rows.
-- Existing rows remain version 1 so they can still be restored with their PIN.

CREATE DATABASE IF NOT EXISTS art_match;
USE art_match;

CREATE TABLE IF NOT EXISTS chat_key_recovery (
  account_type ENUM('buyer', 'seller') NOT NULL,
  account_id INT NOT NULL,
  public_key TEXT NOT NULL,
  encrypted_private_key TEXT NOT NULL,
  salt VARCHAR(64) NOT NULL,
  iv VARCHAR(64) NOT NULL,
  backup_version TINYINT UNSIGNED NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (account_type, account_id)
) ENGINE=InnoDB;

SET @sql = (
  SELECT IF(COUNT(*) = 0,
    'ALTER TABLE chat_key_recovery ADD COLUMN backup_version TINYINT UNSIGNED NOT NULL DEFAULT 1',
    'SELECT 1')
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'chat_key_recovery'
    AND COLUMN_NAME = 'backup_version'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
