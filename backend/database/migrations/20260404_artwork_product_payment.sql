-- Add product and payment terms to existing artwork rows.
-- Existing artworks default to Premade with straight payment.
SET @current_database = DATABASE();

SET @add_product_type = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `artwork` ADD COLUMN `product_type` ENUM(''Premade'', ''Digital'', ''Customize'') NOT NULL DEFAULT ''Premade''',
    'DO 0'
  )
  FROM `INFORMATION_SCHEMA`.`COLUMNS`
  WHERE `TABLE_SCHEMA` = @current_database
    AND `TABLE_NAME` = 'artwork'
    AND `COLUMN_NAME` = 'product_type'
);
PREPARE add_product_type_statement FROM @add_product_type;
EXECUTE add_product_type_statement;
DEALLOCATE PREPARE add_product_type_statement;

SET @add_payment_mode = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `artwork` ADD COLUMN `payment_mode` ENUM(''straight'', ''stage_by_stage'') NOT NULL DEFAULT ''straight''',
    'DO 0'
  )
  FROM `INFORMATION_SCHEMA`.`COLUMNS`
  WHERE `TABLE_SCHEMA` = @current_database
    AND `TABLE_NAME` = 'artwork'
    AND `COLUMN_NAME` = 'payment_mode'
);
PREPARE add_payment_mode_statement FROM @add_payment_mode;
EXECUTE add_payment_mode_statement;
DEALLOCATE PREPARE add_payment_mode_statement;

SET @add_upfront_percentage = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `artwork` ADD COLUMN `upfront_percentage` DECIMAL(5,2) NULL',
    'DO 0'
  )
  FROM `INFORMATION_SCHEMA`.`COLUMNS`
  WHERE `TABLE_SCHEMA` = @current_database
    AND `TABLE_NAME` = 'artwork'
    AND `COLUMN_NAME` = 'upfront_percentage'
);
PREPARE add_upfront_percentage_statement FROM @add_upfront_percentage;
EXECUTE add_upfront_percentage_statement;
DEALLOCATE PREPARE add_upfront_percentage_statement;
