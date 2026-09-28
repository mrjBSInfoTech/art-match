USE art_match;

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
) ENGINE=InnoDB;
