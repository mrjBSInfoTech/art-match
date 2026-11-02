SET @current_database = DATABASE();

SET @add_product_sample_image_column = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `artwork` ADD COLUMN `product_sample_image` VARCHAR(255) NULL AFTER `image`',
    'DO 0'
  )
  FROM `INFORMATION_SCHEMA`.`COLUMNS`
  WHERE `TABLE_SCHEMA` = @current_database
    AND `TABLE_NAME` = 'artwork'
    AND `COLUMN_NAME` = 'product_sample_image'
);
PREPARE add_product_sample_image_column_statement FROM @add_product_sample_image_column;
EXECUTE add_product_sample_image_column_statement;
DEALLOCATE PREPARE add_product_sample_image_column_statement;
