-- migration_add_roles.sql

ALTER TABLE `admin`
ADD COLUMN IF NOT EXISTS `role` ENUM('admin', 'super admin', 'moderator') NOT NULL DEFAULT 'admin' AFTER `password`,
ADD COLUMN IF NOT EXISTS `can_add` TINYINT(1) NOT NULL DEFAULT 1 AFTER `role`,
ADD COLUMN IF NOT EXISTS `can_edit` TINYINT(1) NOT NULL DEFAULT 1 AFTER `can_add`,
ADD COLUMN IF NOT EXISTS `can_delete` TINYINT(1) NOT NULL DEFAULT 1 AFTER `can_edit`;
ADD COLUMN IF NOT EXISTS `password_changed` INT NOT NULL DEFAULT 0 AFTER `can_delete`;

ALTER TABLE `student`
ADD COLUMN IF NOT EXISTS `password_changed` INT NOT NULL DEFAULT 0 AFTER `password`,

CREATE TABLE admin_role (
    admin_role_id INT AUTO_INCREMENT PRIMARY KEY,
    admin_id INT NOT NULL,
    role ENUM('super admin', 'admin', 'moderator', 'customize') NOT NULL DEFAULT 'admin',
    can_add TINYINT(1) NOT NULL DEFAULT 0,
    can_edit TINYINT(1) NOT NULL DEFAULT 0,
    can_delete TINYINT(1) NOT NULL DEFAULT 0,
    can_promote TINYINT(1) NOT NULL DEFAULT 0,
    can_demote TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES admin(admin_id) ON DELETE CASCADE
);