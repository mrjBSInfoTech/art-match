ALTER TABLE message
  ADD COLUMN sender_name VARCHAR(201) NULL AFTER sender_type;

UPDATE message m
JOIN conversation c ON c.conversation_id = m.conversation_id
LEFT JOIN student s ON s.student_id = c.student_id
LEFT JOIN customer cu ON cu.customer_id = c.customer_id
SET m.sender_name = CASE
  WHEN m.sender_type = 'buyer' THEN CONCAT(cu.first_name, ' ', cu.last_name)
  ELSE CONCAT(s.first_name, ' ', s.last_name)
END
WHERE m.sender_name IS NULL;
