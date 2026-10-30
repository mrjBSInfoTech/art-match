import db from "./db.js";
import { ensureArtworkReviewSchema } from "./reviews.js";

const orderTableSql = `
  CREATE TABLE IF NOT EXISTS marketplace_order (
    order_id INT AUTO_INCREMENT PRIMARY KEY,
    order_number VARCHAR(32) NULL UNIQUE,

    customer_id INT NOT NULL,
    seller_id INT NOT NULL,

    buyer_name VARCHAR(201) NOT NULL,
    buyer_email VARCHAR(255) NULL,

    payment_method ENUM(
      'paymongo',
      'cod'
    ) NOT NULL,

    payment_status ENUM(
      'Pending',
      'Paid',
      'Failed',
      'Expired',
      'Refunded'
    ) NOT NULL DEFAULT 'Pending',

    payment_reference VARCHAR(100) NULL,

    paymongo_checkout_session_id VARCHAR(100) NULL,
    paymongo_checkout_url VARCHAR(2048) NULL,
    paymongo_payment_id VARCHAR(100) NULL,
    paymongo_payment_method VARCHAR(50) NULL,

    paid_at DATETIME NULL,

    delivery_method ENUM(
      'door_to_door',
      'pickup'
    ) NOT NULL DEFAULT 'door_to_door',

    address_id INT NULL,
    shipping_street VARCHAR(255) NOT NULL,
    shipping_barangay VARCHAR(100) NOT NULL,
    shipping_city VARCHAR(100) NOT NULL,
    shipping_province VARCHAR(100) NULL,
    shipping_region VARCHAR(100) NOT NULL,
    shipping_postal_code VARCHAR(20) NOT NULL,

    subtotal DECIMAL(12, 2) NOT NULL,
    original_subtotal DECIMAL(12, 2) NULL,
    discount_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    voucher_code VARCHAR(20) NULL,
    -- No shipping fee: couriers are arranged outside ArtMatch.
    shipping_fee DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(12, 2) NOT NULL,

    status ENUM(
      'Pending',
      'Confirmed',
      'Packed',
      'Shipped',
      'Delivered',
      'Cancelled'
    ) NOT NULL DEFAULT 'Pending',

    delivered_at DATETIME NULL,

    parcel_photos JSON NULL,
    received_photos JSON NULL,
    courier VARCHAR(50) NULL,
    tracking_number VARCHAR(100) NULL,
    tracking_url VARCHAR(2048) NULL,
    handling_instructions JSON NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_marketplace_order_customer (
      customer_id,
      created_at
    ),

    INDEX idx_marketplace_order_seller (
      seller_id,
      created_at
    ),

    INDEX idx_marketplace_order_payment_reference (
      payment_reference
    )
  ) ENGINE=InnoDB
`;
const query = (sql) =>
  new Promise((resolve, reject) => {
    db.query(sql, (error, rows) => {
      if (error) return reject(error);
      resolve(rows);
    });
  });

const paymentStatuses = ["Pending", "Paid", "Failed", "Expired", "Refunded"];
// Only known legacy online labels can be migrated automatically. Unknown/manual
// processors retain their original values rather than being silently converted.
const legacyOnlineMethods = new Map([
  ["gcash", "gcash"], ["maya", "paymaya"], ["paymaya", "paymaya"],
  ["card", "card"], ["qrph", "qrph"],
]);
const sqlLiteral = (value) => `'${String(value).replaceAll("\\", "\\\\").replaceAll("'", "''")}'`;
const enumValues = (type) => {
  if (!/^enum\(/i.test(type || "")) return null;
  return Array.from(String(type).matchAll(/'((?:[^'\\]|\\.|'')*)'/g),
    (match) => match[1].replace(/\\(.)/g, "$1").replaceAll("''", "'"));
};
const enumSql = (values) => `ENUM(${values.map(sqlLiteral).join(", ")})`;

const ensurePaymentMethodValues = async (column) => {
  if (!column) return;
  const existing = enumValues(column.Type);
  if (!existing) {
    console.warn("Payment method column is not an ENUM; keeping existing values for manual review.");
    return;
  }
  const legacy = existing.filter((value) => legacyOnlineMethods.has(value));
  const unknown = existing.filter((value) => !["paymongo", "cod"].includes(value) && !legacyOnlineMethods.has(value));
  const target = ["paymongo", "cod", ...unknown];
  const nullable = column.Null === "YES" ? "NULL" : "NOT NULL";
  const originalDefault = column.Default === null || column.Default === undefined
    ? "" : ` DEFAULT ${sqlLiteral(column.Default)}`;

  // Expand first so converting an older GCash/Card ENUM cannot truncate rows.
  const expanded = [...existing, ...target.filter((value) => !existing.includes(value))];
  if (expanded.length !== existing.length) {
    await query(`ALTER TABLE marketplace_order MODIFY COLUMN payment_method ${enumSql(expanded)} ${nullable}${originalDefault}`);
  }
  for (const method of legacy) {
    await query(`UPDATE marketplace_order
      SET paymongo_payment_method = COALESCE(NULLIF(paymongo_payment_method, ''), ${sqlLiteral(legacyOnlineMethods.get(method))}),
          payment_method = 'paymongo'
      WHERE payment_method = ${sqlLiteral(method)}`);
  }
  if (legacy.length) {
    const defaultValue = legacyOnlineMethods.has(column.Default) ? "paymongo" : column.Default;
    const defaultSql = defaultValue === null || defaultValue === undefined ? "" : ` DEFAULT ${sqlLiteral(defaultValue)}`;
    await query(`ALTER TABLE marketplace_order MODIFY COLUMN payment_method ${enumSql(target)} ${nullable}${defaultSql}`);
  }
  if (unknown.length) {
    console.warn("Legacy payment methods were preserved and require manual review before they can be processed.");
  }
};

const ensureOrderColumns = async () => {
  const existingColumns = await query(
    "SHOW COLUMNS FROM marketplace_order",
  );

  const names = new Set(
    existingColumns.map((column) => column.Field),
  );

  // Nullable original prices preserve older orders without rewriting their
  // historical totals. New discounted orders retain both list and paid prices.
  for (const [name, definition] of [
    ["original_subtotal", "DECIMAL(12, 2) NULL"],
    ["discount_amount", "DECIMAL(12, 2) NOT NULL DEFAULT 0.00"],
    ["voucher_code", "VARCHAR(20) NULL"],
    ["delivery_method", "ENUM('door_to_door', 'pickup') NOT NULL DEFAULT 'door_to_door'"],
  ]) {
    if (!names.has(name)) await query(`ALTER TABLE marketplace_order ADD COLUMN ${name} ${definition}`);
  }

  if (!names.has("payment_status")) {
    await query(`
      ALTER TABLE marketplace_order
      ADD COLUMN payment_status
      ENUM(
        'Pending',
        'Paid',
        'Failed',
        'Expired',
        'Refunded'
      )
      NOT NULL DEFAULT 'Pending'
      AFTER payment_method
    `);
  } else {
    const column = existingColumns.find((entry) => entry.Field === "payment_status");
    const existing = enumValues(column.Type);
    if (existing && paymentStatuses.some((value) => !existing.includes(value))) {
      const expanded = [...existing, ...paymentStatuses.filter((value) => !existing.includes(value))];
      const nullable = column.Null === "YES" ? "NULL" : "NOT NULL";
      await query(`ALTER TABLE marketplace_order MODIFY COLUMN payment_status ${enumSql(expanded)} ${nullable} DEFAULT 'Pending'`);
    }
  }

  if (!names.has("payment_reference")) {
    await query(`
      ALTER TABLE marketplace_order
      ADD COLUMN payment_reference
      VARCHAR(100) NULL
      AFTER payment_status
    `);
  }

  if (!names.has("paymongo_checkout_session_id")) {
    await query(`
      ALTER TABLE marketplace_order
      ADD COLUMN paymongo_checkout_session_id
      VARCHAR(100) NULL
      AFTER payment_reference
    `);
  }

  if (!names.has("paymongo_payment_id")) {
    await query(`
      ALTER TABLE marketplace_order
      ADD COLUMN paymongo_payment_id
      VARCHAR(100) NULL
      AFTER paymongo_checkout_session_id
    `);
  }

  if (!names.has("paymongo_checkout_url")) {
    await query(`
      ALTER TABLE marketplace_order
      ADD COLUMN paymongo_checkout_url VARCHAR(2048) NULL
      AFTER paymongo_checkout_session_id
    `);
  }

  if (!names.has("paymongo_payment_method")) {
    await query(`
      ALTER TABLE marketplace_order
      ADD COLUMN paymongo_payment_method
      VARCHAR(50) NULL
      AFTER paymongo_payment_id
    `);
  }

  if (!names.has("paid_at")) {
    await query(`
      ALTER TABLE marketplace_order
      ADD COLUMN paid_at
      DATETIME NULL
      AFTER paymongo_payment_method
    `);
  }

  if (!names.has("parcel_photos")) {
    await query(`
      ALTER TABLE marketplace_order
      ADD COLUMN parcel_photos JSON NULL
    `);
  }

  if (!names.has("received_photos")) {
    await query(`
      ALTER TABLE marketplace_order
      ADD COLUMN received_photos JSON NULL
    `);
  }

  if (!names.has("tracking_url")) {
    await query(`
      ALTER TABLE marketplace_order
      ADD COLUMN tracking_url VARCHAR(2048) NULL
    `);
  }

  // Nullable additions preserve tracking-only orders and are safe to rerun.
  for (const [name, definition] of [
    ["courier", "VARCHAR(50) NULL"],
    ["tracking_number", "VARCHAR(100) NULL"],
  ]) {
    if (!names.has(name)) {
      await query(`ALTER TABLE marketplace_order ADD COLUMN ${name} ${definition}`);
    }
  }

  if (!names.has("handling_instructions")) {
    await query(`
      ALTER TABLE marketplace_order
      ADD COLUMN handling_instructions JSON NULL
    `);
  }

  await ensurePaymentMethodValues(existingColumns.find((column) => column.Field === "payment_method"));

  const indexes = await query(
    "SHOW INDEX FROM marketplace_order",
  );

  const indexNames = new Set(
    indexes.map((index) => index.Key_name),
  );

  if (
    !indexNames.has(
      "idx_marketplace_order_payment_reference",
    )
  ) {
    await query(`
      ALTER TABLE marketplace_order
      ADD INDEX idx_marketplace_order_payment_reference
      (payment_reference)
    `);
  }
};

const ensureDeliveryColumn = async () => {
  const columns = await query("SHOW COLUMNS FROM marketplace_order LIKE 'delivered_at'");
  if (columns.length) return;

  await query("ALTER TABLE marketplace_order ADD COLUMN delivered_at DATETIME NULL AFTER status");
  // Older orders have no delivery event timestamp. Use their last recorded
  // update once, when adding this column, and retain their original audit time.
  // Restarting the server must never restart an existing return window.
  await query(`UPDATE marketplace_order
    SET delivered_at = COALESCE(updated_at, created_at), updated_at = updated_at
    WHERE status = 'Delivered' AND delivered_at IS NULL`);
};

const orderItemTableSql = `
  CREATE TABLE IF NOT EXISTS marketplace_order_item (
    order_item_id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    artwork_id INT NULL,
    title VARCHAR(255) NOT NULL,
    artist_name VARCHAR(201) NOT NULL,
    image VARCHAR(255) NULL,
    unit_price DECIMAL(12, 2) NOT NULL,
    original_unit_price DECIMAL(12, 2) NULL,
    quantity INT NOT NULL DEFAULT 1,
    CONSTRAINT fk_marketplace_order_item_order
      FOREIGN KEY (order_id) REFERENCES marketplace_order (order_id) ON DELETE CASCADE,
    CONSTRAINT fk_marketplace_order_item_artwork
      FOREIGN KEY (artwork_id) REFERENCES artwork (artwork_id) ON DELETE SET NULL,
    INDEX idx_marketplace_order_item_artwork (artwork_id)
  ) ENGINE=InnoDB
`;

const recommendationTableSql = `
  CREATE TABLE IF NOT EXISTS recommendation_interaction (
    interaction_id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NULL,
    artwork_id INT NULL,
    session_id VARCHAR(100) NULL,
    event_type VARCHAR(32) NOT NULL,
    search_query VARCHAR(255) NULL,
    filter_type VARCHAR(50) NULL,
    filter_value VARCHAR(255) NULL,
    min_price DECIMAL(12, 2) NULL,
    max_price DECIMAL(12, 2) NULL,
    source_page VARCHAR(100) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_recommendation_customer (customer_id, created_at),
    INDEX idx_recommendation_artwork (artwork_id, created_at),
    INDEX idx_recommendation_session (session_id, created_at)
  ) ENGINE=InnoDB
`;

export const ensureOrderTables = async () => {
  await query(orderTableSql);
  await query(orderItemTableSql);
  await ensureArtworkReviewSchema(query);
  await query(recommendationTableSql);
  await ensureOrderColumns();
  const itemColumns = await query("SHOW COLUMNS FROM marketplace_order_item LIKE 'original_unit_price'");
  if (!itemColumns.length) {
    await query("ALTER TABLE marketplace_order_item ADD COLUMN original_unit_price DECIMAL(12, 2) NULL AFTER unit_price");
  }
  await ensureDeliveryColumn();
};
