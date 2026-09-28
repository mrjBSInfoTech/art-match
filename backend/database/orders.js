import db from "./db.js";

const orderTableSql = `
  CREATE TABLE IF NOT EXISTS marketplace_order (
    order_id INT AUTO_INCREMENT PRIMARY KEY,
    order_number VARCHAR(32) NULL UNIQUE,
    customer_id INT NOT NULL,
    seller_id INT NOT NULL,
    buyer_name VARCHAR(201) NOT NULL,
    buyer_email VARCHAR(255) NULL,
    payment_method ENUM('gcash', 'cod', 'bank') NOT NULL,
    shipping_street VARCHAR(255) NOT NULL,
    shipping_barangay VARCHAR(100) NOT NULL,
    shipping_city VARCHAR(100) NOT NULL,
    shipping_province VARCHAR(100) NULL,
    shipping_region VARCHAR(100) NOT NULL,
    shipping_postal_code VARCHAR(20) NOT NULL,
    subtotal DECIMAL(12, 2) NOT NULL,
    shipping_fee DECIMAL(12, 2) NOT NULL DEFAULT 150.00,
    total_amount DECIMAL(12, 2) NOT NULL,
    status ENUM('Pending', 'Confirmed', 'Packed', 'Shipped', 'Delivered', 'Cancelled') NOT NULL DEFAULT 'Pending',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_marketplace_order_customer (customer_id, created_at),
    INDEX idx_marketplace_order_seller (seller_id, created_at)
  ) ENGINE=InnoDB
`;

const orderItemTableSql = `
  CREATE TABLE IF NOT EXISTS marketplace_order_item (
    order_item_id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    artwork_id INT NULL,
    title VARCHAR(255) NOT NULL,
    artist_name VARCHAR(201) NOT NULL,
    image VARCHAR(255) NULL,
    unit_price DECIMAL(12, 2) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    CONSTRAINT fk_marketplace_order_item_order
      FOREIGN KEY (order_id) REFERENCES marketplace_order (order_id) ON DELETE CASCADE,
    CONSTRAINT fk_marketplace_order_item_artwork
      FOREIGN KEY (artwork_id) REFERENCES artwork (artwork_id) ON DELETE SET NULL,
    INDEX idx_marketplace_order_item_artwork (artwork_id)
  ) ENGINE=InnoDB
`;

const reviewTableSql = `
  CREATE TABLE IF NOT EXISTS artwork_review (
    review_id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    order_item_id INT NOT NULL UNIQUE,
    customer_id INT NOT NULL,
    seller_id INT NOT NULL,
    artwork_id INT NULL,
    rating TINYINT UNSIGNED NOT NULL,
    comment VARCHAR(600) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_artwork_review_order
      FOREIGN KEY (order_id) REFERENCES marketplace_order (order_id) ON DELETE CASCADE,
    CONSTRAINT fk_artwork_review_order_item
      FOREIGN KEY (order_item_id) REFERENCES marketplace_order_item (order_item_id) ON DELETE CASCADE,
    CONSTRAINT fk_artwork_review_artwork
      FOREIGN KEY (artwork_id) REFERENCES artwork (artwork_id) ON DELETE SET NULL,
    INDEX idx_artwork_review_seller (seller_id, created_at),
    INDEX idx_artwork_review_customer (customer_id, created_at)
  ) ENGINE=InnoDB
`;

export const ensureOrderTables = () =>
  new Promise((resolve, reject) => {
    db.query(orderTableSql, (orderError) => {
      if (orderError) {
        reject(orderError);
        return;
      }
      db.query(orderItemTableSql, (itemError) => {
        if (itemError) {
          reject(itemError);
          return;
        }
        db.query(reviewTableSql, (reviewError) => {
          if (reviewError) {
            reject(reviewError);
            return;
          }
          resolve();
        });
      });
    });
  });