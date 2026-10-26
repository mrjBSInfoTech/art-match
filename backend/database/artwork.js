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
      ["care_instructions", "TEXT NULL"],
      ["artwork_details", "JSON NULL"],
    ]);
    await ensureColumns("artupload", [
      ["rejection_date", "DATETIME NULL"],
      ["rejection_reason", "TEXT NULL"],
    ]);

    // Seller uploads start as 'Unverified' and admins can reject with
    // 'Rejected'; add the missing values without losing existing rows.
    const [statusColumn] = await query(
      "SHOW COLUMNS FROM artupload LIKE 'request_status'",
    );
    const statusType = String(statusColumn?.Type || "");
    const requiredStatuses = [
      "Pending",
      "Verified",
      "Unverified",
      "Rejected",
    ];
    if (
      !/^enum\(/i.test(statusType) ||
      requiredStatuses.some((value) => !statusType.includes(`'${value}'`))
    ) {
      await query(
        `ALTER TABLE artupload MODIFY COLUMN request_status
         ENUM('Pending', 'Verified', 'Unverified', 'Rejected')
         NULL DEFAULT 'Unverified'`,
      );
    }
  } catch (error) {
    console.error("Failed to ensure artwork schema:", error.message);
    throw error;
  }
};
