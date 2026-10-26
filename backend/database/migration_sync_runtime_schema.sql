-- Art Match: idempotent schema sync for the runtime (art_match) database.
--
-- The live database had drifted from the schema the backend queries expect.
-- Running this file brings it back in line without dropping tables or columns
-- and without discarding existing rows:
--
--   student            + created_at, account_status, expire_date
--   artwork            + care_instructions
--   artupload            request_status gains 'Unverified' and 'Rejected'
--   accregistration      register_status aligned to 'Pending' / 'Verified'
--   artwork_reviews      missing foreign keys on customer_id / seller_id
--   marketplace_order    order_number uniqueness + unique key on order_number
--
-- Safe to run more than once. Every statement is guarded.
--
-- Usage (XAMPP):
--   C:\xampp\mysql\bin\mysql.exe -u root < backend\database\migration_sync_runtime_schema.sql

CREATE DATABASE IF NOT EXISTS art_match;
USE art_match;

-- ---------------------------------------------------------------------------
-- student: account expiry tracking (required by seller/admin login queries)
-- ---------------------------------------------------------------------------
SET @sql = (
  SELECT IF(COUNT(*) = 0,
    'ALTER TABLE student ADD COLUMN created_at DATETIME NULL',
    'SELECT 1')
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'student' AND COLUMN_NAME = 'created_at'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(COUNT(*) = 0,
    'ALTER TABLE student ADD COLUMN account_status ENUM(''active'', ''expired'') NOT NULL DEFAULT ''active''',
    'SELECT 1')
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'student' AND COLUMN_NAME = 'account_status'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(COUNT(*) = 0,
    'ALTER TABLE student ADD COLUMN expire_date DATETIME NULL',
    'SELECT 1')
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'student' AND COLUMN_NAME = 'expire_date'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Backfill the new expiry columns from the registration record. Existing
-- values are never overwritten.
UPDATE student s
LEFT JOIN accregistration a ON a.student_id = s.student_id
SET s.created_at = COALESCE(s.created_at, a.registered_date, CURRENT_TIMESTAMP),
    s.expire_date = COALESCE(
      s.expire_date,
      DATE_ADD(COALESCE(a.registered_date, CURRENT_TIMESTAMP), INTERVAL 3 MONTH)
    ),
    s.account_status = CASE
      WHEN COALESCE(s.expire_date, DATE_ADD(COALESCE(a.registered_date, CURRENT_TIMESTAMP), INTERVAL 3 MONTH))
           <= CURRENT_TIMESTAMP THEN 'expired'
      ELSE 'active'
    END;

-- Only tighten to NOT NULL once every row is populated.
SET @sql = (
  SELECT IF(
    (SELECT IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'student' AND COLUMN_NAME = 'created_at') = 'YES'
    AND (SELECT COUNT(*) FROM student WHERE created_at IS NULL) = 0,
    'ALTER TABLE student MODIFY COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP',
    'SELECT 1')
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    (SELECT IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'student' AND COLUMN_NAME = 'expire_date') = 'YES'
    AND (SELECT COUNT(*) FROM student WHERE expire_date IS NULL) = 0,
    'ALTER TABLE student MODIFY COLUMN expire_date DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL 3 MONTH)',
    'SELECT 1')
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ---------------------------------------------------------------------------
-- artwork: care_instructions (read and written by seller/buyer/admin routes)
-- ---------------------------------------------------------------------------
SET @sql = (
  SELECT IF(COUNT(*) = 0,
    'ALTER TABLE artwork ADD COLUMN care_instructions TEXT NULL',
    'SELECT 1')
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'artwork' AND COLUMN_NAME = 'care_instructions'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ---------------------------------------------------------------------------
-- artupload: seller uploads are created as 'Unverified' and admins reject as
-- 'Rejected'. Preserve every existing row while widening the ENUM.
-- ---------------------------------------------------------------------------
ALTER TABLE artupload
  MODIFY COLUMN request_status
    ENUM('Pending', 'Verified', 'Unverified', 'Rejected') NULL DEFAULT 'Unverified';

-- ---------------------------------------------------------------------------
-- accregistration: routes compare against 'Verified'. The previous ENUM used
-- 'verified' which MySQL matches case-insensitively, so data is retained.
-- ---------------------------------------------------------------------------
ALTER TABLE accregistration
  MODIFY COLUMN register_status
    ENUM('Pending', 'Verified') NULL DEFAULT 'Pending';

-- ---------------------------------------------------------------------------
-- artwork_reviews: candidate foreign keys (added by the startup migration)
-- ---------------------------------------------------------------------------
SET @sql = (
  SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'artwork_reviews'
        AND COLUMN_NAME = 'customer_id' AND REFERENCED_TABLE_NAME = 'customer') = 0
    AND (SELECT COUNT(*) FROM artwork_reviews r
      LEFT JOIN customer c ON c.customer_id = r.customer_id
      WHERE c.customer_id IS NULL) = 0,
    'ALTER TABLE artwork_reviews ADD CONSTRAINT fk_artwork_reviews_customer FOREIGN KEY (customer_id) REFERENCES customer (customer_id) ON DELETE CASCADE',
    'SELECT 1')
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'artwork_reviews'
        AND COLUMN_NAME = 'seller_id' AND REFERENCED_TABLE_NAME = 'student') = 0
    AND (SELECT COUNT(*) FROM artwork_reviews r
      LEFT JOIN student s ON s.student_id = r.seller_id
      WHERE s.student_id IS NULL) = 0,
    'ALTER TABLE artwork_reviews ADD CONSTRAINT fk_artwork_reviews_seller FOREIGN KEY (seller_id) REFERENCES student (student_id) ON DELETE CASCADE',
    'SELECT 1')
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(COUNT(*) = 0,
    'ALTER TABLE artwork_reviews ADD INDEX idx_artwork_reviews_artwork (artwork_id, created_at)',
    'SELECT 1')
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'artwork_reviews' AND INDEX_NAME = 'idx_artwork_reviews_artwork'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- The older artwork_review table already indexes these as
-- idx_artwork_review_seller / idx_artwork_review_customer, so only add the
-- plural names when no index on the same leading column exists.
SET @sql = (
  SELECT IF(COUNT(*) = 0,
    'ALTER TABLE artwork_reviews ADD INDEX idx_artwork_reviews_seller (seller_id, created_at)',
    'SELECT 1')
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'artwork_reviews'
    AND COLUMN_NAME = 'seller_id' AND SEQ_IN_INDEX = 1
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(COUNT(*) = 0,
    'ALTER TABLE artwork_reviews ADD INDEX idx_artwork_reviews_customer (customer_id, created_at)',
    'SELECT 1')
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'artwork_reviews'
    AND COLUMN_NAME = 'customer_id' AND SEQ_IN_INDEX = 1
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ---------------------------------------------------------------------------
-- marketplace_order: unique order numbers
-- ---------------------------------------------------------------------------
-- order_number already carries an inline UNIQUE KEY named order_number.
SET @sql = (
  SELECT IF(COUNT(*) = 0,
    'ALTER TABLE marketplace_order ADD UNIQUE KEY uq_marketplace_order_number (order_number)',
    'SELECT 1')
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'marketplace_order'
    AND COLUMN_NAME = 'order_number' AND NON_UNIQUE = 0
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(COUNT(*) = 0,
    'ALTER TABLE marketplace_order ADD INDEX idx_marketplace_order_customer (customer_id, created_at)',
    'SELECT 1')
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'marketplace_order' AND INDEX_NAME = 'idx_marketplace_order_customer'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(COUNT(*) = 0,
    'ALTER TABLE marketplace_order ADD INDEX idx_marketplace_order_seller (seller_id, created_at)',
    'SELECT 1')
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'marketplace_order' AND INDEX_NAME = 'idx_marketplace_order_seller'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(COUNT(*) = 0,
    'ALTER TABLE marketplace_order ADD INDEX idx_marketplace_order_payment_reference (payment_reference)',
    'SELECT 1')
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'marketplace_order' AND INDEX_NAME = 'idx_marketplace_order_payment_reference'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
