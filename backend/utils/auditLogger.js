import db from "../database/db.js";

const createTableSql = `CREATE TABLE IF NOT EXISTS audit_logs (
      audit_id INT AUTO_INCREMENT PRIMARY KEY,
      datetime TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      action VARCHAR(50) NOT NULL,
      actor VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL,
      status VARCHAR(30) NOT NULL,
      information TEXT
    )`;

export const createAuditLogsTable = () => new Promise((resolve, reject) => {
  db.query(createTableSql, (error) => {
    if (error) {
      console.error("Unable to initialize audit_logs table:", error.message);
      reject(error);
      return;
    }
    resolve();
  });
});

export const ensureAuditLogsTable = createAuditLogsTable;

export const logAudit = ({ action, actor, role, status, information }) => {
  return new Promise((resolve, reject) => {
    db.query(
      "INSERT INTO audit_logs (action, actor, role, status, information) VALUES (?, ?, ?, ?, ?)",
      [action, actor || "Unknown", role, status, information || null],
      (error) => {
        if (error) {
          console.error("Unable to write audit log:", error.message);
          reject(error);
          return;
        }
        resolve();
      },
    );
  });
};
