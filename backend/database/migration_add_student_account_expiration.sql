ALTER TABLE student
  ADD COLUMN created_at DATETIME NULL,
  ADD COLUMN account_status ENUM('active', 'expired') NOT NULL DEFAULT 'active',
  ADD COLUMN expire_date DATETIME NULL;

UPDATE student s
LEFT JOIN accregistration a ON a.student_id = s.student_id
SET s.created_at = COALESCE(a.registered_date, CURRENT_TIMESTAMP),
    s.expire_date = DATE_ADD(
      COALESCE(a.registered_date, CURRENT_TIMESTAMP),
      INTERVAL 3 MONTH
    ),
    s.account_status = CASE
      WHEN DATE_ADD(
        COALESCE(a.registered_date, CURRENT_TIMESTAMP),
        INTERVAL 3 MONTH
      ) <= CURRENT_TIMESTAMP THEN 'expired'
      ELSE 'active'
    END;

ALTER TABLE student
  MODIFY COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  MODIFY COLUMN expire_date DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL 3 MONTH);
