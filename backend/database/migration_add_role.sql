CREATE TABLE IF NOT EXISTS admin_role (
    admin_role_id INT AUTO_INCREMENT PRIMARY KEY,
    admin_id INT NOT NULL UNIQUE,
    role ENUM('super admin', 'admin', 'moderator', 'customize') NOT NULL DEFAULT 'admin',
    can_add BOOLEAN NOT NULL DEFAULT FALSE,
    can_edit BOOLEAN NOT NULL DEFAULT FALSE,
    can_delete BOOLEAN NOT NULL DEFAULT FALSE,
    can_promote BOOLEAN NOT NULL DEFAULT FALSE,
    can_demote BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_admin_role_admin
        FOREIGN KEY (admin_id) REFERENCES admin (admin_id) ON DELETE CASCADE
);

INSERT INTO admin_role (admin_id, role, can_add, can_edit, can_delete)
SELECT admin_id, 'admin', TRUE, TRUE, TRUE
FROM admin a
WHERE NOT EXISTS (
    SELECT 1 FROM admin_role ar WHERE ar.admin_id = a.admin_id
);