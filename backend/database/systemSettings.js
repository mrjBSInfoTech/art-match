import db from "./db.js";

const EXPIRATION_SETTING_KEY = "student_account_expiration_date";
const DEFAULT_EXPIRATION_MONTHS = 3;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const query = (connection, sql, params = []) =>
  new Promise((resolve, reject) => {
    connection.query(sql, params, (error, results) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(results);
    });
  });

const isValidDate = (value) => {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) return false;
  if (Number(value.slice(0, 4)) < 1000) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

export const ensureSystemSettingsTable = async () => {
  await query(
    db,
    `CREATE TABLE IF NOT EXISTS system_settings (
      setting_key VARCHAR(100) NOT NULL PRIMARY KEY,
      setting_value VARCHAR(100) NOT NULL,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
    )`,
  );

  const columns = await query(db, "SHOW COLUMNS FROM system_settings");
  const valueColumn = columns.find((column) => column.Field === "setting_value");
  if (!valueColumn?.Type.toLowerCase().startsWith("varchar")) {
    await query(
      db,
      "ALTER TABLE system_settings MODIFY COLUMN setting_value VARCHAR(100) NOT NULL",
    );
  }

  const settings = await query(
    db,
    "SELECT setting_value FROM system_settings WHERE setting_key = ?",
    [EXPIRATION_SETTING_KEY],
  );

  if (!settings.length) {
    const legacySettings = await query(
      db,
      "SELECT setting_value FROM system_settings WHERE setting_key = ?",
      ["student_account_expiration_months"],
    );
    const legacyMonths = Number(legacySettings[0]?.setting_value);
    const months =
      Number.isInteger(legacyMonths) && legacyMonths >= 1 && legacyMonths <= 120
        ? legacyMonths
        : DEFAULT_EXPIRATION_MONTHS;
    const [{ expiration_date: expirationDate }] = await query(
      db,
      "SELECT DATE_FORMAT(DATE_ADD(CURRENT_DATE, INTERVAL ? MONTH), '%Y-%m-%d') AS expiration_date",
      [months],
    );
    await query(
      db,
      `UPDATE student
       SET account_status = 'active',
           expire_date = DATE_ADD(?, INTERVAL 1 DAY)`,
      [expirationDate],
    );
    await query(
      db,
      `INSERT INTO system_settings (setting_key, setting_value)
       VALUES (?, ?)`,
      [EXPIRATION_SETTING_KEY, expirationDate],
    );
    return;
  }

  const existingValue = String(settings[0].setting_value);
  if (/^\d+$/.test(existingValue)) {
    const months = Number(existingValue);
    if (!Number.isInteger(months) || months < 1 || months > 120) {
      throw new Error("Existing account expiration setting is invalid.");
    }
    const [{ expiration_date: expirationDate }] = await query(
      db,
      "SELECT DATE_FORMAT(DATE_ADD(CURRENT_DATE, INTERVAL ? MONTH), '%Y-%m-%d') AS expiration_date",
      [months],
    );
    await query(
      db,
      `UPDATE student
       SET account_status = 'active',
           expire_date = DATE_ADD(?, INTERVAL 1 DAY)`,
      [expirationDate],
    );
    await query(
      db,
      "UPDATE system_settings SET setting_value = ? WHERE setting_key = ?",
      [expirationDate, EXPIRATION_SETTING_KEY],
    );
    return;
  }

  if (!isValidDate(existingValue)) {
    throw new Error("Account expiration date setting is invalid.");
  }
};

export const getAccountExpirationDate = (callback) => {
  db.query(
    "SELECT setting_value FROM system_settings WHERE setting_key = ?",
    [EXPIRATION_SETTING_KEY],
    (error, results) => {
      if (error) {
        callback(error);
        return;
      }

      const expirationDate = String(results[0]?.setting_value || "");
      if (!isValidDate(expirationDate)) {
        callback(new Error("Account expiration date is not configured correctly."));
        return;
      }

      callback(null, expirationDate);
    },
  );
};

export const updateAccountExpirationDate = (expirationDate) =>
  new Promise((resolve, reject) => {
    if (!isValidDate(expirationDate)) {
      reject(Object.assign(new Error("Enter a valid expiration date."), { status: 400 }));
      return;
    }

    db.query(
      "SELECT ? >= CURRENT_DATE AS is_valid",
      [expirationDate],
      (dateError, dateResults) => {
        if (dateError) {
          reject(dateError);
          return;
        }
        if (!dateResults[0]?.is_valid) {
          reject(
            Object.assign(new Error("Expiration date must be today or later."), {
              status: 400,
            }),
          );
          return;
        }

        db.getConnection((connectionError, connection) => {
          if (connectionError) {
            reject(connectionError);
            return;
          }

          connection.beginTransaction(async (transactionError) => {
            if (transactionError) {
              connection.release();
              reject(transactionError);
              return;
            }

            try {
              await query(
                connection,
                `INSERT INTO system_settings (setting_key, setting_value)
                 VALUES (?, ?)
                 ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
                [EXPIRATION_SETTING_KEY, expirationDate],
              );
              const updateResult = await query(
                connection,
                `UPDATE student
                 SET account_status = 'active',
                     expire_date = DATE_ADD(?, INTERVAL 1 DAY)`,
                [expirationDate],
              );
              await new Promise((commitResolve, commitReject) => {
                connection.commit((error) => {
                  if (error) {
                    commitReject(error);
                    return;
                  }
                  commitResolve();
                });
              });
              resolve(updateResult.affectedRows);
            } catch (error) {
              try {
                await new Promise((rollbackResolve, rollbackReject) => {
                  connection.rollback((rollbackError) => {
                    if (rollbackError) {
                      rollbackReject(rollbackError);
                      return;
                    }
                    rollbackResolve();
                  });
                });
              } catch (rollbackError) {
                console.error(
                  "Unable to roll back account expiration date update:",
                  rollbackError,
                );
              }
              reject(error);
            } finally {
              connection.release();
            }
          });
        });
      },
    );
  });
