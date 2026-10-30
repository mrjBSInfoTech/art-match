import db from "./db.js";

// Reuse the immutable, per-order payment split rather than introducing a
// second balance which could disagree with checkout accounting.
const splitColumns = {
  provider_batch_id: "VARCHAR(100) NULL",
  provider_transfer_id: "VARCHAR(100) NULL",
  provider_reference: "VARCHAR(100) NULL",
  failure_reason: "VARCHAR(500) NULL",
  requested_at: "DATETIME NULL",
  failed_at: "DATETIME NULL",
  refund_amount: "DECIMAL(12, 2) NOT NULL DEFAULT 0.00",
  payout_amount: "DECIMAL(12, 2) NULL DEFAULT NULL",
  hold_reason: "VARCHAR(500) NULL",
  payout_provider: "ENUM('demo','paymongo') NULL",
  approval_cycle_id: "INT NULL",
};

export const payoutAccountTableSql = `CREATE TABLE IF NOT EXISTS seller_payout_account (
  payout_account_id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  destination_type VARCHAR(24) NOT NULL,
  institution_code VARCHAR(80) NOT NULL,
  institution_name VARCHAR(150) NOT NULL,
  institution_provider VARCHAR(80) NOT NULL,
  account_name VARCHAR(180) NOT NULL,
  account_number_ciphertext TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_seller_payout_account_student (student_id),
  CONSTRAINT fk_seller_payout_account_student FOREIGN KEY (student_id)
    REFERENCES student(student_id) ON DELETE RESTRICT
) ENGINE=InnoDB`;

export const payoutAttemptTableSql = `CREATE TABLE IF NOT EXISTS seller_payout_attempt (
  attempt_id INT AUTO_INCREMENT PRIMARY KEY,
  split_id INT NOT NULL,
  payout_provider ENUM('demo','paymongo') NOT NULL DEFAULT 'paymongo',
  payout_mode ENUM('demo','test','live') NOT NULL DEFAULT 'test',
  provider_reference VARCHAR(100) NOT NULL,
  provider_batch_id VARCHAR(100) NULL,
  provider_transfer_id VARCHAR(100) NULL,
  status ENUM('Processing', 'Paid', 'Failed', 'Unknown') NOT NULL DEFAULT 'Processing',
  amount_centavos BIGINT UNSIGNED NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'PHP',
  destination_type VARCHAR(24) NOT NULL,
  institution_code VARCHAR(80) NOT NULL,
  institution_name VARCHAR(150) NOT NULL,
  institution_provider VARCHAR(80) NOT NULL,
  account_name VARCHAR(180) NOT NULL,
  account_number_ciphertext TEXT NOT NULL,
  admin_id INT NOT NULL,
  failure_reason VARCHAR(500) NULL,
  requested_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  paid_at DATETIME NULL,
  failed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_seller_payout_attempt_reference (provider_reference),
  UNIQUE KEY uq_seller_payout_attempt_transfer (provider_transfer_id),
  INDEX idx_seller_payout_attempt_split (split_id, status),
  CONSTRAINT fk_seller_payout_attempt_split FOREIGN KEY (split_id)
    REFERENCES seller_payment_split(split_id) ON DELETE RESTRICT,
  CONSTRAINT chk_seller_payout_attempt_amount CHECK (amount_centavos > 0)
) ENGINE=InnoDB`;

// An approval belongs to one immutable request cycle, never to every future
// attempt for an order. Rejection/corrections create a fresh cycle.
export const payoutApprovalCycleTableSql = `CREATE TABLE IF NOT EXISTS seller_payout_approval_cycle (
  cycle_id INT AUTO_INCREMENT PRIMARY KEY,
  split_id INT NOT NULL,
  requested_by_admin_id INT NOT NULL,
  approval_status ENUM('Pending Approval','Approved','Rejected','Invalidated') NOT NULL DEFAULT 'Pending Approval',
  payout_provider ENUM('demo','paymongo') NOT NULL,
  payout_mode ENUM('demo','test','live') NOT NULL,
  amount_centavos BIGINT UNSIGNED NOT NULL,
  snapshot_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  requested_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  approved_at DATETIME NULL,
  released_by_admin_id INT NULL,
  released_at DATETIME NULL,
  invalidation_reason VARCHAR(500) NULL,
  INDEX idx_payout_cycle_split (split_id,cycle_id),
  CONSTRAINT fk_payout_cycle_split FOREIGN KEY (split_id) REFERENCES seller_payment_split(split_id) ON DELETE RESTRICT,
  CONSTRAINT fk_payout_cycle_requester FOREIGN KEY (requested_by_admin_id) REFERENCES admin(admin_id) ON DELETE RESTRICT,
  CONSTRAINT fk_payout_cycle_releaser FOREIGN KEY (released_by_admin_id) REFERENCES admin(admin_id) ON DELETE RESTRICT,
  CONSTRAINT chk_payout_cycle_amount CHECK (amount_centavos > 0)
) ENGINE=InnoDB`;

export const payoutApprovalTableSql = `CREATE TABLE IF NOT EXISTS seller_payout_approval (
  approval_id INT AUTO_INCREMENT PRIMARY KEY,
  cycle_id INT NOT NULL,
  admin_id INT NOT NULL,
  decision ENUM('Approved','Rejected') NOT NULL,
  comment VARCHAR(500) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_payout_cycle_admin (cycle_id,admin_id),
  CONSTRAINT fk_payout_approval_cycle FOREIGN KEY (cycle_id) REFERENCES seller_payout_approval_cycle(cycle_id) ON DELETE RESTRICT,
  CONSTRAINT fk_payout_approval_admin FOREIGN KEY (admin_id) REFERENCES admin(admin_id) ON DELETE RESTRICT
) ENGINE=InnoDB`;

// This is provider evidence, not an admin "mark refunded" switch. A provider
// refund can belong to one order only; the same refund must never reduce
// several sellers' balances in a multi-seller checkout.
export const orderRefundTableSql = `CREATE TABLE IF NOT EXISTS seller_order_refund (
  refund_id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  return_request_id INT NULL,
  provider_refund_id VARCHAR(100) NOT NULL,
  provider_payment_id VARCHAR(100) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  status ENUM('Pending', 'Succeeded', 'Failed') NOT NULL DEFAULT 'Pending',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_seller_order_refund_provider (provider_refund_id),
  INDEX idx_seller_order_refund_order (order_id, status),
  INDEX idx_seller_order_refund_return (return_request_id, status),
  CONSTRAINT fk_seller_order_refund_order FOREIGN KEY (order_id)
    REFERENCES marketplace_order(order_id) ON DELETE RESTRICT,
  CONSTRAINT fk_seller_order_refund_return FOREIGN KEY (return_request_id)
    REFERENCES marketplace_return_request(return_request_id) ON DELETE RESTRICT,
  CONSTRAINT chk_seller_order_refund_amount CHECK (amount > 0)
) ENGINE=InnoDB`;

export async function ensurePayoutTables() {
  const executor = db.promise();
  const [columns] = await executor.query("SHOW COLUMNS FROM seller_payment_split");
  const existing = new Set(columns.map((column) => column.Field));
  for (const [name, definition] of Object.entries(splitColumns)) {
    if (!existing.has(name)) {
      await executor.query(`ALTER TABLE seller_payment_split ADD COLUMN ${name} ${definition}`);
    }
  }
  const statusColumn = columns.find((column) => column.Field === "payout_status");
  const statuses = /^enum\(/i.test(statusColumn?.Type || "")
    ? Array.from(statusColumn.Type.matchAll(/'((?:[^'\\]|\\.)*)'/g), (match) => match[1])
    : null;
  if (!statuses) throw new Error("Seller payout status requires an ENUM schema.");
  const required = ["Held", "Eligible", "Processing", "Paid", "Reversed", "Failed", "Cancelled"];
  if (required.some((status) => !statuses.includes(status))) {
    const expanded = [...statuses, ...required.filter((status) => !statuses.includes(status))];
    if (expanded.some((status) => !/^[A-Za-z ]+$/.test(status))) {
      throw new Error("Unexpected seller payout status requires manual schema review.");
    }
    await executor.query(`ALTER TABLE seller_payment_split MODIFY COLUMN payout_status
      ENUM(${expanded.map((status) => `'${status}'`).join(", ")}) NOT NULL DEFAULT 'Held'`);
  }
  const [indexes] = await executor.query("SHOW INDEX FROM seller_payment_split");
  if (!indexes.some((index) => index.Key_name === "uq_seller_payment_split_transfer")) {
    await executor.query(`ALTER TABLE seller_payment_split
      ADD UNIQUE KEY uq_seller_payment_split_transfer (provider_transfer_id)`);
  }
  await executor.query(payoutAccountTableSql);
  await executor.query(payoutAttemptTableSql);
  const [attemptColumns] = await executor.query("SHOW COLUMNS FROM seller_payout_attempt");
  if (!attemptColumns.some(column => column.Field === "payout_provider")) {
    // All pre-existing attempts used the actual PayMongo adapter.
    await executor.query("ALTER TABLE seller_payout_attempt ADD COLUMN payout_provider ENUM('demo','paymongo') NOT NULL DEFAULT 'paymongo'");
  }
  if (!attemptColumns.some(column => column.Field === "payout_mode")) {
    await executor.query("ALTER TABLE seller_payout_attempt ADD COLUMN payout_mode ENUM('demo','test','live') NOT NULL DEFAULT 'test'");
  }
  if (!attemptColumns.some(column => column.Field === "provider_batch_id")) {
    await executor.query("ALTER TABLE seller_payout_attempt ADD COLUMN provider_batch_id VARCHAR(100) NULL");
  }
  await executor.query(orderRefundTableSql);
  await executor.query(payoutApprovalCycleTableSql);
  const [cycleColumns] = await executor.query("SHOW COLUMNS FROM seller_payout_approval_cycle");
  if (!cycleColumns.some(column => column.Field === "payout_mode")) {
    await executor.query("ALTER TABLE seller_payout_approval_cycle ADD COLUMN payout_mode ENUM('demo','test','live') NOT NULL DEFAULT 'test'");
  }
  await executor.query(payoutApprovalTableSql);
  await executor.query("UPDATE seller_payment_split SET approval_cycle_id = NULL WHERE payout_provider = 'demo' OR approval_cycle_id IN (SELECT cycle_id FROM (SELECT cycle_id FROM seller_payout_approval_cycle WHERE payout_provider = 'demo' OR payout_mode = 'demo') t)");
  await executor.query("DELETE FROM seller_payout_approval WHERE cycle_id IN (SELECT cycle_id FROM seller_payout_approval_cycle WHERE payout_provider = 'demo' OR payout_mode = 'demo')");
  await executor.query("DELETE FROM seller_payout_approval_cycle WHERE payout_provider = 'demo' OR payout_mode = 'demo'");
  await executor.query("DELETE FROM seller_payout_attempt WHERE payout_provider = 'demo' OR payout_mode = 'demo' OR provider_reference LIKE 'DEMO-%'");
  await executor.query("DELETE FROM seller_payment_split WHERE payout_provider = 'demo' OR payout_reference LIKE 'DEMO-%' OR provider_reference LIKE 'DEMO-%'");
}
