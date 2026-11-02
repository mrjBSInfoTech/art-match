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
      ["exact_art_type", "VARCHAR(100) NULL"],
      ["product", "VARCHAR(50) NULL"],
      ["product_type", "ENUM('Premade', 'Digital', 'Customize') NOT NULL DEFAULT 'Premade'"],
      ["payment_mode", "ENUM('straight') NOT NULL DEFAULT 'straight'"],
      ["upfront_percentage", "DECIMAL(5,2) NULL"],
      ["product_sample_image", "VARCHAR(255) NULL"],
      ["stock_quantity", "INT NULL DEFAULT 0"],
      ["care_instructions", "TEXT NULL"],
      ["artwork_details", "JSON NULL"],
    ]);
    const [paymentModeColumn] = await query(
      "SHOW COLUMNS FROM artwork LIKE 'payment_mode'",
    );
    if (String(paymentModeColumn?.Type || "").includes("stage_by_stage")) {
      await query(
        "UPDATE artwork SET payment_mode = 'straight', upfront_percentage = NULL",
      );
      await query(
        "ALTER TABLE artwork MODIFY COLUMN payment_mode ENUM('straight') NOT NULL DEFAULT 'straight'",
      );
    }
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
