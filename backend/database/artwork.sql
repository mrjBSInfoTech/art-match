CREATE TABLE IF NOT EXISTS `artwork` (
    `artwork_id` INT(11) NOT NULL AUTO_INCREMENT,
    `student_id` INT(11) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `price` DECIMAL(10,2) NOT NULL,
    `description` TEXT NULL,
    `image` VARCHAR(255) NULL,
    `genre` VARCHAR(100) NULL,
    `color_used` VARCHAR(500) NULL,
    `art_size` VARCHAR(100) NULL,
    `art_type` VARCHAR(50) NULL,
    `product` VARCHAR(50) NULL,
    `status` ENUM('Available','Reserved','Sold') NULL DEFAULT 'Available',
    `is_sold` TINYINT(1) NOT NULL DEFAULT 0,
    `date_created` DATE NULL,
    PRIMARY KEY (`artwork_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- CREATE TABLE IF NOT EXISTS does not update an artwork table that already
-- exists. Add the newer form columns only when they are missing so this file
-- can also be used to upgrade an existing collaborator database safely.
SET @current_database = DATABASE();

SET @add_art_type_column = (
    SELECT IF(
        COUNT(*) = 0,
        'ALTER TABLE `artwork` ADD COLUMN `art_type` VARCHAR(50) NULL AFTER `art_size`',
        'DO 0'
    )
    FROM `INFORMATION_SCHEMA`.`COLUMNS`
    WHERE `TABLE_SCHEMA` = @current_database
      AND `TABLE_NAME` = 'artwork'
      AND `COLUMN_NAME` = 'art_type'
);
PREPARE add_art_type_column_statement FROM @add_art_type_column;
EXECUTE add_art_type_column_statement;
DEALLOCATE PREPARE add_art_type_column_statement;

SET @add_product_column = (
    SELECT IF(
        COUNT(*) = 0,
        'ALTER TABLE `artwork` ADD COLUMN `product` VARCHAR(50) NULL AFTER `art_type`',
        'DO 0'
    )
    FROM `INFORMATION_SCHEMA`.`COLUMNS`
    WHERE `TABLE_SCHEMA` = @current_database
      AND `TABLE_NAME` = 'artwork'
      AND `COLUMN_NAME` = 'product'
);
PREPARE add_product_column_statement FROM @add_product_column;
EXECUTE add_product_column_statement;
DEALLOCATE PREPARE add_product_column_statement;
