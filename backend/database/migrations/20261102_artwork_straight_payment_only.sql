-- Remove stage-by-stage payment from existing artwork records and constrain
-- payment_mode so the database only accepts straight payment.
UPDATE `artwork`
SET `payment_mode` = 'straight',
    `upfront_percentage` = NULL
WHERE `payment_mode` <> 'straight'
   OR `upfront_percentage` IS NOT NULL;

ALTER TABLE `artwork`
  MODIFY COLUMN `payment_mode` ENUM('straight') NOT NULL DEFAULT 'straight';
