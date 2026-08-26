-- migration_add_roles.sql

ALTER TABLE `admin`
ADD COLUMN IF NOT EXISTS `role` ENUM('admin', 'super admin') NOT NULL DEFAULT 'admin' AFTER `password`,
ADD COLUMN IF NOT EXISTS `can_add` TINYINT(1) NOT NULL DEFAULT 1 AFTER `role`,
ADD COLUMN IF NOT EXISTS `can_edit` TINYINT(1) NOT NULL DEFAULT 1 AFTER `can_add`,
ADD COLUMN IF NOT EXISTS `can_delete` TINYINT(1) NOT NULL DEFAULT 1 AFTER `can_edit`;
ADD COLUMN IF NOT EXISTS `password_changed` INT NOT NULL DEFAULT 0 AFTER `can_delete`;

ALTER TABLE `student`
ADD COLUMN IF NOT EXISTS `password_changed` INT NOT NULL DEFAULT 0 AFTER `password`,