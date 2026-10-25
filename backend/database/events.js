import db from "./db.js";

const query = async (sql, params = []) => {
  const [rows] = await db.promise().query(sql, params);
  return rows;
};

const eventsTableSql = `
  CREATE TABLE IF NOT EXISTS events (
    event_id INT AUTO_INCREMENT PRIMARY KEY,

    admin_id INT NULL,

    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,

    location VARCHAR(255) NULL, 

    start_at DATETIME NOT NULL,
    end_at DATETIME NULL,

    image_key VARCHAR(500) NULL,
    image_original_name VARCHAR(255) NULL,
    image_content_type VARCHAR(100) NULL,
    image_size INT UNSIGNED NULL,

    status ENUM(
      'Draft',
      'Published',
      'Archived'
    ) NOT NULL DEFAULT 'Draft',

    created_at DATETIME NOT NULL
      DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL
      DEFAULT CURRENT_TIMESTAMP
      ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_events_admin
      FOREIGN KEY (admin_id)
      REFERENCES admin (admin_id)
      ON DELETE SET NULL,

    INDEX idx_events_admin (admin_id),
    INDEX idx_events_status_start (
      status,
      start_at
    )
  ) ENGINE=InnoDB
    DEFAULT CHARSET=utf8mb4
    COLLATE=utf8mb4_general_ci
`;

export const ensureEventsTable = async () => {
  await query(eventsTableSql);
};

// DATETIME values represent the local date/time entered in the admin form.
// Format them in SQL so JSON serialization cannot shift them to another timezone.
const eventColumns = `event_id, admin_id, title, description, location,
  DATE_FORMAT(start_at, '%Y-%m-%dT%H:%i:%s') AS start_at,
  DATE_FORMAT(end_at, '%Y-%m-%dT%H:%i:%s') AS end_at,
  image_key, image_original_name, image_content_type, image_size,
  status, created_at, updated_at`;

export async function listEvents() {
  return query(`SELECT ${eventColumns} FROM events ORDER BY start_at ASC, event_id DESC`);
}

export async function findEvent(eventId, connection = db.promise(), lock = false) {
  const [rows] = await connection.query(
    `SELECT ${eventColumns} FROM events WHERE event_id = ?${lock ? " FOR UPDATE" : ""}`,
    [eventId],
  );
  return rows[0] || null;
}

const editableColumns = ["title", "description", "location", "start_at", "end_at", "status",
  "image_key", "image_original_name", "image_content_type", "image_size"];

export async function insertEvent(data, adminId, connection = db.promise()) {
  const [result] = await connection.query(
    `INSERT INTO events (admin_id, ${editableColumns.join(", ")}) VALUES (${["admin_id", ...editableColumns].map(() => "?").join(", ")})`,
    [adminId, ...editableColumns.map((column) => data[column] ?? null)],
  );
  return result.insertId;
}

export async function saveEvent(eventId, data, connection = db.promise()) {
  await connection.query(
    `UPDATE events SET ${editableColumns.map((column) => `${column} = ?`).join(", ")} WHERE event_id = ?`,
    [...editableColumns.map((column) => data[column] ?? null), eventId],
  );
}

export async function removeEvent(eventId, connection = db.promise()) {
  await connection.query("DELETE FROM events WHERE event_id = ?", [eventId]);
}
