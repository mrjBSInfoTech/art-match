CREATE TABLE IF NOT EXISTS strike_logs (
  strike_log_id INT AUTO_INCREMENT PRIMARY KEY,
  role VARCHAR(20) NOT NULL,
  account_id INT NOT NULL,
  admin_id INT NULL,
  strike_number TINYINT UNSIGNED NOT NULL,
  reason VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_strike_logs_account (role, account_id),
  INDEX idx_strike_logs_created (created_at)
);
