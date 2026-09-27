import db from "./db.js";

const createTableSql = `
  CREATE TABLE IF NOT EXISTS storefront (
    storefront_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL UNIQUE,
    shop_name VARCHAR(255) NULL,
    shop_description TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_storefront_student
      FOREIGN KEY (student_id) REFERENCES student (student_id) ON DELETE CASCADE
  )
`;

export const ensureStorefrontTable = () =>
  new Promise((resolve, reject) => {
    db.query(createTableSql, (error) => {
      if (error) {
        console.error("Failed to ensure storefront table:", error.message);
        reject(error);
        return;
      }
      resolve();
    });
  });
