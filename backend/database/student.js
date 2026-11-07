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

// Seller/admin login and account listings read these columns directly, so the
// database must always provide them. The expiry is derived from the student's
// registration date, matching migration_add_student_account_expiration.sql.
export const ensureStudentAccountSchema = async () => {
  try {
    const columns = await query("SHOW COLUMNS FROM student");
    const existingColumns = new Set(columns.map((column) => column.Field));

    if (!existingColumns.has("created_at")) {
      await query("ALTER TABLE student ADD COLUMN created_at DATETIME NULL");
      existingColumns.add("created_at");
    }
    if (!existingColumns.has("account_status")) {
      await query(
        "ALTER TABLE student ADD COLUMN account_status ENUM('active', 'expired') NOT NULL DEFAULT 'active'",
      );
    }
    if (!existingColumns.has("expire_date")) {
      await query("ALTER TABLE student ADD COLUMN expire_date DATETIME NULL");
      existingColumns.add("expire_date");
    }
    if (!existingColumns.has("consent_given_at")) {
      await query("ALTER TABLE student ADD COLUMN consent_given_at DATETIME NULL");
      existingColumns.add("consent_given_at");
    }
    if (!existingColumns.has("consent_version")) {
      await query("ALTER TABLE student ADD COLUMN consent_version VARCHAR(20) NULL");
      existingColumns.add("consent_version");
    }
    if (!existingColumns.has("must_change_password")) {
      await query(
        "ALTER TABLE student ADD COLUMN must_change_password TINYINT(1) NOT NULL DEFAULT 0",
      );
      existingColumns.add("must_change_password");
    }

    // Ensure contact/PII fields are nullable for RA 10173 12-month post-expiration disposal
    await query("ALTER TABLE student MODIFY COLUMN birthdate DATE NULL").catch(() => {});
    await query("ALTER TABLE student MODIFY COLUMN address TEXT NULL").catch(() => {});
    await query("ALTER TABLE student MODIFY COLUMN phone_number VARCHAR(30) NULL").catch(() => {});

    // Only backfill rows that are actually missing values so normal startups
    // do not rewrite the whole table.
    await query(`
      UPDATE student s
      LEFT JOIN accregistration a ON a.student_id = s.student_id
      SET s.created_at = COALESCE(s.created_at, a.registered_date, CURRENT_TIMESTAMP),
          s.expire_date = COALESCE(
            s.expire_date,
            DATE_ADD(COALESCE(a.registered_date, CURRENT_TIMESTAMP), INTERVAL 3 MONTH)
          ),
          s.account_status = CASE
            WHEN s.expire_date <= CURRENT_TIMESTAMP THEN 'expired'
            ELSE 'active'
          END
      WHERE s.created_at IS NULL OR s.expire_date IS NULL
    `);

    const [{ missing = 0 } = {}] = await query(
      `SELECT COUNT(*) AS missing FROM student
       WHERE created_at IS NULL OR expire_date IS NULL`,
    );

    if (Number(missing) === 0) {
      await query(
        "ALTER TABLE student MODIFY COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP",
      );
      await query(
        "ALTER TABLE student MODIFY COLUMN expire_date DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL 3 MONTH)",
      );
    }
  } catch (error) {
    console.error("Failed to ensure student account schema:", error.message);
    throw error;
  }
};
