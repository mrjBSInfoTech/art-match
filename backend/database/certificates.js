import db from "./db.js";

export async function ensureCertificateTables() {
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
}
