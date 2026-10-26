import db from "./db.js";

/*
 * A multi-seller checkout is charged ONCE to the buyer, but each seller must be
 * paid separately. This table records, per seller order, exactly how that
 * single payment is divided, so the money can be reconciled and paid out
 * without re-deriving it from changing prices later.
 *
 *   gross_amount          what the buyer was charged for this seller's part
 *   commission_rate       platform percentage captured at order time
 *   commission_amount     platform cut of gross_amount
 *   processing_fee_amount payment-processor share attributed to this order
 *   net_amount            what the seller actually receives
 *
 * gross = commission + processing_fee + net, always, enforced by the writer.
 */
const createTableSql = `
  CREATE TABLE IF NOT EXISTS seller_payment_split (
    split_id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL UNIQUE,
    seller_id INT NOT NULL,
    payment_reference VARCHAR(100) NULL,
    currency CHAR(3) NOT NULL DEFAULT 'PHP',

    gross_amount DECIMAL(12, 2) NOT NULL,
    commission_rate DECIMAL(5, 4) NOT NULL DEFAULT 0.0000,
    commission_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    processing_fee_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    net_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,

    payout_status ENUM(
      'Held',
      'Eligible',
      'Processing',
      'Paid',
      'Reversed'
    ) NOT NULL DEFAULT 'Held',

    eligible_at DATETIME NULL,
    paid_at DATETIME NULL,
    payout_reference VARCHAR(100) NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_seller_payment_split_order
      FOREIGN KEY (order_id) REFERENCES marketplace_order (order_id) ON DELETE CASCADE,
    CONSTRAINT fk_seller_payment_split_seller
      FOREIGN KEY (seller_id) REFERENCES student (student_id) ON DELETE CASCADE,

    INDEX idx_seller_payment_split_seller (seller_id, payout_status),
    INDEX idx_seller_payment_split_reference (payment_reference)
  ) ENGINE=InnoDB
`;

export const ensurePaymentSplitTable = async () => {
  try {
    await new Promise((resolve, reject) => {
      db.query(createTableSql, (error) => (error ? reject(error) : resolve()));
    });
  } catch (error) {
    console.error("Failed to ensure seller payment split table:", error.message);
    throw error;
  }
};

/*
 * Platform commission is NOT charged. ArtMatch takes no cut of a sale, so every
 * seller receives the full amount of their items.
 *
 * This intentionally ignores ARTMATCH_COMMISSION_RATE: a stale environment
 * variable must not start deducting money from sellers. Introducing a
 * commission later is a business decision that requires its own change (and
 * the seller-facing transparency that goes with it).
 */
export const PLATFORM_COMMISSION_ENABLED = false;

export const getCommissionRate = () => 0;
