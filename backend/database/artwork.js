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

export const restoreLegacyProductInventory = async () => {
  let connection;
  let restoredCount = 0;
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS application_migrations (
        migration_key VARCHAR(191) NOT NULL PRIMARY KEY,
        applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB
    `);
    connection = await db.promise().getConnection();
    await connection.beginTransaction();
    const [migration] = await connection.query(
      "INSERT IGNORE INTO application_migrations (migration_key) VALUES (?)",
      ["restore-legacy-product-inventory-v1"],
    );
    if (migration.affectedRows === 1) {
      const [result] = await connection.query(`
        UPDATE artwork
        SET artwork_details = JSON_SET(
          COALESCE(artwork_details, JSON_OBJECT()),
          '$.stockable',
          JSON_EXTRACT('true', '$')
        )
        WHERE LOWER(TRIM(COALESCE(art_type, ''))) = 'product'
          AND LOWER(TRIM(COALESCE(product_type, ''))) NOT IN ('digital', 'customize')
          AND LOWER(JSON_UNQUOTE(JSON_EXTRACT(artwork_details, '$.stockable')))
            IN ('false', '0')
      `);
      restoredCount = result.affectedRows;
    }
    await connection.commit();
    return restoredCount;
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("Legacy product inventory migration rollback error:", rollbackError.message);
      }
    }
    console.error("Failed to restore legacy product inventory:", error.message);
    throw error;
  } finally {
    connection?.release();
  }
};
