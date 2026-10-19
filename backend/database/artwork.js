import db from "./db.js";

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

const ensureColumns = async (tableName, columns) => {
  const existingColumns = await query(`SHOW COLUMNS FROM \`${tableName}\``);
  const existingColumnNames = new Set(
    existingColumns.map((column) => column.Field),
  );

  for (const [columnName, definition] of columns) {
    if (!existingColumnNames.has(columnName)) {
      await query(
        `ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${definition}`,
      );
    }
  }
};

export const ensureArtworkSchema = async () => {
  try {
    await ensureColumns("artwork", [
      ["art_type", "VARCHAR(50) NULL"],
      ["product", "VARCHAR(50) NULL"],
    ]);
    await ensureColumns("artupload", [
      ["rejection_date", "DATETIME NULL"],
      ["rejection_reason", "TEXT NULL"],
    ]);
  } catch (error) {
    console.error("Failed to ensure artwork schema:", error.message);
    throw error;
  }
};
