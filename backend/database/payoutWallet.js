import db from "./db.js";

export const adminPayoutWalletChangeRequestTableSql = `CREATE TABLE IF NOT EXISTS admin_payout_wallet_change_request (
  request_id INT AUTO_INCREMENT PRIMARY KEY,
  super_admin_id INT NOT NULL,
  current_wallet_id VARCHAR(100) NOT NULL,
  new_wallet_id VARCHAR(100) NOT NULL,
  reason VARCHAR(500) NULL,
  status ENUM('Pending', 'Approved', 'Applied', 'Rejected', 'Cancelled') NOT NULL DEFAULT 'Pending',
  approvals_required INT NOT NULL DEFAULT 3,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  applied_at DATETIME NULL,
  applied_by_admin_id INT NULL,
  rejected_at DATETIME NULL,
  INDEX idx_wallet_change_status (status),
  CONSTRAINT fk_wallet_change_super_admin FOREIGN KEY (super_admin_id)
    REFERENCES admin(admin_id) ON DELETE CASCADE,
  CONSTRAINT fk_wallet_change_applier FOREIGN KEY (applied_by_admin_id)
    REFERENCES admin(admin_id) ON DELETE SET NULL
) ENGINE=InnoDB`;

export const adminPayoutWalletChangeApprovalTableSql = `CREATE TABLE IF NOT EXISTS admin_payout_wallet_change_approval (
  approval_id INT AUTO_INCREMENT PRIMARY KEY,
  request_id INT NOT NULL,
  admin_id INT NOT NULL,
  decision ENUM('Approved', 'Rejected') NOT NULL,
  comment VARCHAR(500) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_wallet_change_admin (request_id, admin_id),
  CONSTRAINT fk_wallet_change_approval_req FOREIGN KEY (request_id)
    REFERENCES admin_payout_wallet_change_request(request_id) ON DELETE CASCADE,
  CONSTRAINT fk_wallet_change_approval_admin FOREIGN KEY (admin_id)
    REFERENCES admin(admin_id) ON DELETE RESTRICT
) ENGINE=InnoDB`;

export async function ensurePayoutWalletTables(executor = db.promise()) {
  await executor.query(adminPayoutWalletChangeRequestTableSql);
  await executor.query(adminPayoutWalletChangeApprovalTableSql);
}

