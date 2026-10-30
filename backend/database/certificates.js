import db from "./db.js";

export async function ensureCertificateTables() {
  await db.promise().query(`
    CREATE TABLE IF NOT EXISTS marketplace_certificate_identity (
      artwork_id INT NOT NULL PRIMARY KEY,
      public_token CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
      FOREIGN KEY (artwork_id) REFERENCES artwork(artwork_id) ON DELETE CASCADE
    ) ENGINE=InnoDB
  `);
  await db.promise().query(`
    CREATE TABLE IF NOT EXISTS marketplace_certificate (
      artwork_id INT NOT NULL PRIMARY KEY,
      seller_id INT NOT NULL,
      certificate_id VARCHAR(64) NOT NULL,
      certificate_svg MEDIUMTEXT NOT NULL,
      published_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_marketplace_certificate_artwork FOREIGN KEY (artwork_id)
        REFERENCES artwork(artwork_id) ON DELETE CASCADE,
      CONSTRAINT fk_marketplace_certificate_seller FOREIGN KEY (seller_id)
        REFERENCES student(student_id) ON DELETE CASCADE,
      INDEX idx_marketplace_certificate_seller (seller_id, published_at)
    ) ENGINE=InnoDB
  `);
  await db.promise().query(`
    CREATE TABLE IF NOT EXISTS marketplace_certificate_delivery (
      order_item_id INT NOT NULL PRIMARY KEY,
      order_id INT NOT NULL,
      conversation_id INT NOT NULL,
      message_id INT NOT NULL,
      sent_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_certificate_delivery_order_item FOREIGN KEY (order_item_id)
        REFERENCES marketplace_order_item(order_item_id) ON DELETE CASCADE,
      CONSTRAINT fk_certificate_delivery_order FOREIGN KEY (order_id)
        REFERENCES marketplace_order(order_id) ON DELETE CASCADE,
      CONSTRAINT fk_certificate_delivery_conversation FOREIGN KEY (conversation_id)
        REFERENCES conversation(conversation_id) ON DELETE CASCADE,
      UNIQUE KEY uq_certificate_delivery_message (message_id),
      INDEX idx_certificate_delivery_order (order_id, sent_at)
    ) ENGINE=InnoDB
  `);
  await db.promise().query(`
    CREATE TABLE IF NOT EXISTS marketplace_certificate_access (
      access_id INT AUTO_INCREMENT PRIMARY KEY,
      artwork_id INT NOT NULL,
      order_id INT NOT NULL,
      order_item_id INT NOT NULL,
      customer_id INT NOT NULL,
      seller_id INT NOT NULL,
      ownership_status ENUM('active', 'revoked') NOT NULL DEFAULT 'active',
      revoked_at DATETIME NULL DEFAULT NULL,
      revocation_reason VARCHAR(255) NULL DEFAULT NULL,
      return_request_id INT NULL DEFAULT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_certificate_access_order_item (order_item_id),
      INDEX idx_certificate_access_customer (customer_id, ownership_status),
      INDEX idx_certificate_access_order (order_id, order_item_id),
      INDEX idx_certificate_access_artwork (artwork_id, ownership_status)
    ) ENGINE=InnoDB
  `);
  try {
    const [cols] = await db.promise().query("SHOW COLUMNS FROM marketplace_certificate_delivery LIKE 'access_status'");
    if (!cols.length) {
      await db.promise().query(`
        ALTER TABLE marketplace_certificate_delivery
          ADD COLUMN access_status ENUM('active', 'revoked') NOT NULL DEFAULT 'active',
          ADD COLUMN revoked_at DATETIME NULL DEFAULT NULL,
          ADD COLUMN revocation_reason VARCHAR(255) NULL DEFAULT NULL,
          ADD COLUMN return_request_id INT NULL DEFAULT NULL
      `);
    }
  } catch (error) {
    if (error.code !== "ER_DUP_FIELDNAME") {
      console.warn("Certificate delivery column migration warning:", error.message);
    }
  }
}
