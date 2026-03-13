-- Household Table SQL Schema
-- Run this query in your MySQL database to create the household table

CREATE TABLE IF NOT EXISTS `household` (
  `household_id` int(11) NOT NULL AUTO_INCREMENT,
  `house_number` varchar(50) NOT NULL,
  `street_number` varchar(50) NOT NULL,
  `barangay` varchar(100) NOT NULL,
  `household_members` int(11) NOT NULL,
  `head_family` varchar(100) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`household_id`),
  INDEX `idx_house_number` (`house_number`),
  INDEX `idx_barangay` (`barangay`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
