import db from "./db.js";

const query = (sql) =>
  new Promise((resolve, reject) => {
    db.query(sql, (error, results) => {
      if (error) return reject(error);
      resolve(results);
    });
  });

export const ensureVoucherTables = async () => {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS seller_voucher (
        voucher_id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        code VARCHAR(20) NOT NULL,
        discount_type ENUM('fixed', 'percentage', 'freebie') NOT NULL,
        discount_value DECIMAL(12, 2) NULL,
        minimum_purchase DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        starts_on DATE NOT NULL,
        expires_on DATE NOT NULL,
        applies_to_all TINYINT(1) NOT NULL DEFAULT 1,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_seller_voucher_student
          FOREIGN KEY (student_id) REFERENCES student (student_id) ON DELETE CASCADE,
        INDEX idx_seller_voucher_student (student_id, created_at),
        INDEX idx_seller_voucher_code_active (code, starts_on, expires_on)
      ) ENGINE=InnoDB
    `);
    const indexes = await query("SHOW INDEX FROM seller_voucher");
    const uniqueCodeIndexes = [
      ...new Set(
        indexes
          .filter((index) => Number(index.Non_unique) === 0 && index.Column_name === "code")
          .map((index) => index.Key_name),
      ),
    ];
    for (const indexName of uniqueCodeIndexes) {
      const escapedIndexName = String(indexName).replace(/`/g, "``");
      await query(
        `ALTER TABLE seller_voucher DROP INDEX \`${escapedIndexName}\``,
      );
    }
    if (
      !indexes.some(
        (index) => index.Key_name === "idx_seller_voucher_code_active",
      )
    ) {
      await query(
        `CREATE INDEX idx_seller_voucher_code_active
         ON seller_voucher (code, starts_on, expires_on)`,
      );
    }
    await query(`
      CREATE TABLE IF NOT EXISTS seller_voucher_artwork (
        voucher_id INT NOT NULL,
        artwork_id INT NOT NULL,
        PRIMARY KEY (voucher_id, artwork_id),
        CONSTRAINT fk_seller_voucher_artwork_voucher
          FOREIGN KEY (voucher_id) REFERENCES seller_voucher (voucher_id) ON DELETE CASCADE,
        CONSTRAINT fk_seller_voucher_artwork_artwork
          FOREIGN KEY (artwork_id) REFERENCES artwork (artwork_id) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);
  } catch (error) {
    console.error("Failed to ensure seller voucher tables:", error.message);
    throw error;
  }
};
