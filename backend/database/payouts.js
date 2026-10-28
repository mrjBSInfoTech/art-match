import db from "./db.js";

// Reuse the immutable, per-order payment split rather than introducing a
// second balance which could disagree with checkout accounting.
const splitColumns = {
  provider_transfer_id: "VARCHAR(100) NULL",
  provider_reference: "VARCHAR(100) NULL",
  failure_reason: "VARCHAR(500) NULL",
  requested_at: "DATETIME NULL",
  failed_at: "DATETIME NULL",
  refund_amount: "DECIMAL(12, 2) NOT NULL DEFAULT 0.00",
  payout_amount: "DECIMAL(12, 2) NULL DEFAULT NULL",
  hold_reason: "VARCHAR(500) NULL",
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
  provider_reference VARCHAR(100) NOT NULL,
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
  await executor.query(orderRefundTableSql);
}
