-- Store the seller-provided art type when the artwork type is Customize.
SET @current_database = DATABASE();

SET @add_exact_art_type = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `artwork` ADD COLUMN `exact_art_type` VARCHAR(100) NULL AFTER `art_type`',
    'DO 0'
  )
  FROM `INFORMATION_SCHEMA`.`COLUMNS`
  WHERE `TABLE_SCHEMA` = @current_database
    AND `TABLE_NAME` = 'artwork'
    AND `COLUMN_NAME` = 'exact_art_type'
);
PREPARE add_exact_art_type_statement FROM @add_exact_art_type;
EXECUTE add_exact_art_type_statement;
DEALLOCATE PREPARE add_exact_art_type_statement;
