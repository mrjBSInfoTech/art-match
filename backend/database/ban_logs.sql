CREATE TABLE IF NOT EXISTS ban_logs (
  ban_log_id INT AUTO_INCREMENT PRIMARY KEY,
  role VARCHAR(20) NOT NULL,
  account_id INT NOT NULL,
  admin_id INT NULL,
  action ENUM('BAN', 'UNBAN') NOT NULL,
  reason VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ban_logs_account (role, account_id),
  INDEX idx_ban_logs_created (created_at)
);
