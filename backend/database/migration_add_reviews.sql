USE art_match;

-- Idempotent migration. Rename the original table before creating the plural
-- table, preserving existing review IDs and order associations. No review
-- tables or historical rows are dropped. The application startup migration
-- additionally adds customer/seller foreign keys when existing data permits.
SET @reviews_legacy_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'artwork_review'
);
SET @reviews_plural_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'artwork_reviews'
);
SET @reviews_rename = IF(@reviews_legacy_exists = 1 AND @reviews_plural_exists = 0,
  'RENAME TABLE artwork_review TO artwork_reviews', 'SELECT 1');
PREPARE reviews_statement FROM @reviews_rename;
EXECUTE reviews_statement;
DEALLOCATE PREPARE reviews_statement;

CREATE TABLE IF NOT EXISTS artwork_reviews (
  review_id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NULL,
  order_item_id INT NULL UNIQUE,
  customer_id INT NOT NULL,
  seller_id INT NOT NULL,
  artwork_id INT NULL,
  rating TINYINT UNSIGNED NOT NULL,
  comment TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_artwork_reviews_order
    FOREIGN KEY (order_id) REFERENCES marketplace_order (order_id) ON DELETE CASCADE,
  CONSTRAINT fk_artwork_reviews_order_item
    FOREIGN KEY (order_item_id) REFERENCES marketplace_order_item (order_item_id) ON DELETE CASCADE,
  CONSTRAINT fk_artwork_reviews_artwork
    FOREIGN KEY (artwork_id) REFERENCES artwork (artwork_id) ON DELETE SET NULL,
  CONSTRAINT fk_artwork_reviews_customer
    FOREIGN KEY (customer_id) REFERENCES customer (customer_id) ON DELETE CASCADE,
  CONSTRAINT fk_artwork_reviews_seller
    FOREIGN KEY (seller_id) REFERENCES student (student_id) ON DELETE CASCADE,
  CONSTRAINT chk_artwork_reviews_rating CHECK (rating BETWEEN 1 AND 5),
  INDEX idx_artwork_reviews_artwork (artwork_id, created_at),
  INDEX idx_artwork_reviews_seller (seller_id, created_at),
  INDEX idx_artwork_reviews_customer (customer_id, created_at)
) ENGINE=InnoDB;

ALTER TABLE artwork_reviews MODIFY COLUMN comment TEXT NULL;
SET @reviews_order_type = (
  SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'artwork_reviews' AND COLUMN_NAME = 'order_id'
);
SET @reviews_order_nullable = (
  SELECT IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'artwork_reviews' AND COLUMN_NAME = 'order_id'
);
SET @reviews_order_migration = IF(@reviews_order_nullable <> 'YES',
  CONCAT('ALTER TABLE artwork_reviews MODIFY COLUMN order_id ', @reviews_order_type, ' NULL'), 'SELECT 1');
PREPARE reviews_statement FROM @reviews_order_migration;
EXECUTE reviews_statement;
DEALLOCATE PREPARE reviews_statement;

SET @reviews_item_type = (
  SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'artwork_reviews' AND COLUMN_NAME = 'order_item_id'
);
SET @reviews_item_nullable = (
  SELECT IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'artwork_reviews' AND COLUMN_NAME = 'order_item_id'
);
SET @reviews_item_migration = IF(@reviews_item_nullable <> 'YES',
  CONCAT('ALTER TABLE artwork_reviews MODIFY COLUMN order_item_id ', @reviews_item_type, ' NULL'), 'SELECT 1');
PREPARE reviews_statement FROM @reviews_item_migration;
EXECUTE reviews_statement;
DEALLOCATE PREPARE reviews_statement;
SET @reviews_created_type = (
  SELECT DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'artwork_reviews' AND COLUMN_NAME = 'created_at'
);
SET @reviews_created_migration = IF(@reviews_created_type <> 'datetime',
  'ALTER TABLE artwork_reviews MODIFY COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP', 'SELECT 1');
PREPARE reviews_statement FROM @reviews_created_migration;
EXECUTE reviews_statement;
DEALLOCATE PREPARE reviews_statement;

-- If both table names predate this migration, copy missing purchased-item
-- reviews. Preserve free review IDs first; allocate a new ID only for collisions.
-- Existing canonical reviews win a duplicate order_item_id. Conflicting and
-- orphan records remain intact in artwork_review for historical recovery.
SET @reviews_copy_ids = IF(@reviews_legacy_exists = 1 AND @reviews_plural_exists = 1,
  'INSERT INTO artwork_reviews
    (review_id, order_id, order_item_id, customer_id, seller_id, artwork_id, rating, comment, created_at)
   SELECT r.review_id, r.order_id, r.order_item_id, r.customer_id, r.seller_id, r.artwork_id, r.rating, r.comment, r.created_at
   FROM artwork_review r
   WHERE NOT EXISTS (SELECT 1 FROM artwork_reviews n WHERE n.order_item_id = r.order_item_id)
     AND NOT EXISTS (SELECT 1 FROM artwork_reviews n WHERE n.review_id = r.review_id)
     AND r.rating BETWEEN 1 AND 5 AND r.rating = FLOOR(r.rating)
     AND (r.order_id IS NULL OR EXISTS (SELECT 1 FROM marketplace_order o WHERE o.order_id = r.order_id))
     AND (r.order_item_id IS NULL OR EXISTS (SELECT 1 FROM marketplace_order_item oi WHERE oi.order_item_id = r.order_item_id))
     AND EXISTS (SELECT 1 FROM customer c WHERE c.customer_id = r.customer_id)
     AND EXISTS (SELECT 1 FROM student s WHERE s.student_id = r.seller_id)
     AND (r.artwork_id IS NULL OR EXISTS (SELECT 1 FROM artwork a WHERE a.artwork_id = r.artwork_id))',
  'SELECT 1');
PREPARE reviews_statement FROM @reviews_copy_ids;
EXECUTE reviews_statement;
DEALLOCATE PREPARE reviews_statement;

SET @reviews_copy_remaining = IF(@reviews_legacy_exists = 1 AND @reviews_plural_exists = 1,
  'INSERT INTO artwork_reviews
    (order_id, order_item_id, customer_id, seller_id, artwork_id, rating, comment, created_at)
   SELECT r.order_id, r.order_item_id, r.customer_id, r.seller_id, r.artwork_id, r.rating, r.comment, r.created_at
   FROM artwork_review r
   WHERE r.order_item_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM artwork_reviews n WHERE n.order_item_id = r.order_item_id)
     AND r.rating BETWEEN 1 AND 5 AND r.rating = FLOOR(r.rating)
     AND (r.order_id IS NULL OR EXISTS (SELECT 1 FROM marketplace_order o WHERE o.order_id = r.order_id))
     AND (r.order_item_id IS NULL OR EXISTS (SELECT 1 FROM marketplace_order_item oi WHERE oi.order_item_id = r.order_item_id))
     AND EXISTS (SELECT 1 FROM customer c WHERE c.customer_id = r.customer_id)
     AND EXISTS (SELECT 1 FROM student s WHERE s.student_id = r.seller_id)
     AND (r.artwork_id IS NULL OR EXISTS (SELECT 1 FROM artwork a WHERE a.artwork_id = r.artwork_id))',
  'SELECT 1');
PREPARE reviews_statement FROM @reviews_copy_remaining;
EXECUTE reviews_statement;
DEALLOCATE PREPARE reviews_statement;
