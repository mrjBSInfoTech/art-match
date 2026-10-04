import db from "./db.js";

const createTableSql = `
  CREATE TABLE IF NOT EXISTS storefront (
    storefront_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL UNIQUE,
    shop_name VARCHAR(255) NULL,
    shop_description TEXT NULL,
    specialties JSON NULL,
    pinned_artwork_ids JSON NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_storefront_student
      FOREIGN KEY (student_id) REFERENCES student (student_id) ON DELETE CASCADE
  )
`;

const query = (sql) =>
  new Promise((resolve, reject) => {
    db.query(sql, (error, results) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(results);
    });
  });

export const ensureStorefrontTable = async () => {
  try {
    await query(createTableSql);
    const columns = await query("SHOW COLUMNS FROM storefront");
    const existingColumns = new Set(columns.map((column) => column.Field));

    if (!existingColumns.has("specialties")) {
      await query("ALTER TABLE storefront ADD COLUMN specialties JSON NULL");
    }
    if (!existingColumns.has("pinned_artwork_ids")) {
      await query(
        "ALTER TABLE storefront ADD COLUMN pinned_artwork_ids JSON NULL",
      );
    }
  } catch (error) {
    console.error("Failed to ensure storefront table:", error.message);
    throw error;
  }
};
