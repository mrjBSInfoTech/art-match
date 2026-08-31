import db from "./db.js";
import { logAudit } from "../utils/auditLogger.js";

const createTableSql = `
  CREATE TABLE IF NOT EXISTS account_access (
    role VARCHAR(20) NOT NULL,
    account_id INT NOT NULL,
    strikes TINYINT UNSIGNED NOT NULL DEFAULT 0,
    is_banned BOOLEAN NOT NULL DEFAULT FALSE,
    banned_at DATETIME NULL,
    ban_reason VARCHAR(255) NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (role, account_id)
  )
`;

const createStrikeLogsSql = `
  CREATE TABLE IF NOT EXISTS strike_logs (
    strike_log_id INT AUTO_INCREMENT PRIMARY KEY,
    role VARCHAR(20) NOT NULL,
    account_id INT NOT NULL,
    admin_id INT NULL,
    strike_number TINYINT UNSIGNED NOT NULL,
    reason VARCHAR(255) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_strike_logs_account (role, account_id),
    INDEX idx_strike_logs_created (created_at)
  )
`;

const createBanLogsSql = `
  CREATE TABLE IF NOT EXISTS ban_logs (
    ban_log_id INT AUTO_INCREMENT PRIMARY KEY,
    role VARCHAR(20) NOT NULL,
    account_id INT NOT NULL,
    admin_id INT NULL,
    action ENUM('BAN', 'UNBAN') NOT NULL,
    reason VARCHAR(255) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_ban_logs_account (role, account_id),
    INDEX idx_ban_logs_created (created_at)
  )
`;

export const ensureAccountAccessTable = () => {
  db.query(createTableSql, (error) => {
    if (error) console.error("Unable to initialize account_access table:", error.message);
  });
  db.query(createStrikeLogsSql, (error) => {
    if (error) console.error("Unable to initialize strike_logs table:", error.message);
  });
  db.query(createBanLogsSql, (error) => {
    if (error) console.error("Unable to initialize ban_logs table:", error.message);
  });
};

export const getAccountAccess = (role, accountId) =>
  new Promise((resolve, reject) => {
    db.query(
      "SELECT strikes, is_banned, banned_at, ban_reason FROM account_access WHERE role = ? AND account_id = ?",
      [role, accountId],
      (error, results) => {
        if (error) return reject(error);
        resolve(results[0] || { strikes: 0, is_banned: false });
      },
    );
  });

export const addStrike = (role, accountId, reason, adminId = null) =>
  new Promise((resolve, reject) => {
    const sql = `
      INSERT INTO account_access (role, account_id, strikes, is_banned, banned_at, ban_reason)
      VALUES (?, ?, 1, FALSE, NULL, ?)
      ON DUPLICATE KEY UPDATE
        strikes = LEAST(strikes + 1, 3),
        is_banned = IF(strikes + 1 >= 3, TRUE, is_banned),
        banned_at = IF(strikes + 1 >= 3, COALESCE(banned_at, NOW()), banned_at),
        ban_reason = VALUES(ban_reason)
    `;
    db.query(sql, [role, accountId, reason || "Policy violation"], (error) => {
      if (error) return reject(error);
      getAccountAccess(role, accountId)
        .then((access) => {
          db.query(
            "INSERT INTO strike_logs (role, account_id, admin_id, strike_number, reason) VALUES (?, ?, ?, ?, ?)",
            [role, accountId, adminId, access.strikes, reason || "Policy violation"],
            (logError) => {
              if (logError) return reject(logError);

              logAudit({
                action: access.is_banned ? "STRIKE_BAN" : "STRIKE",
                actor: adminId ? `admin_${adminId}` : "system",
                role,
                status: access.is_banned ? "banned" : "success",
                information: JSON.stringify({
                  account_id: accountId,
                  strike_number: access.strikes,
                  reason: reason || "Policy violation",
                }),
              })
                .then(() => resolve(access))
                .catch(reject);
            },
          );
        })
        .catch(reject);
    });
  });

export const setBanned = (role, accountId, banned, reason, adminId = null) =>
  new Promise((resolve, reject) => {
    const sql = `
      INSERT INTO account_access (role, account_id, strikes, is_banned, banned_at, ban_reason)
      VALUES (?, ?, 0, ?, IF(?, NOW(), NULL), ?)
      ON DUPLICATE KEY UPDATE
        is_banned = VALUES(is_banned),
        banned_at = IF(VALUES(is_banned), COALESCE(banned_at, NOW()), NULL),
        ban_reason = VALUES(ban_reason)
    `;
    db.query(sql, [role, accountId, banned, banned, reason || null], (error) => {
      if (error) return reject(error);
      getAccountAccess(role, accountId)
        .then((access) => {
          db.query(
            "INSERT INTO ban_logs (role, account_id, admin_id, action, reason) VALUES (?, ?, ?, ?, ?)",
            [role, accountId, adminId, banned ? "BAN" : "UNBAN", reason || null],
            (logError) => {
              if (logError) return reject(logError);

              logAudit({
                action: banned ? "BAN" : "UNBAN",
                actor: adminId ? `admin_${adminId}` : "system",
                role,
                status: banned ? "banned" : "unbanned",
                information: JSON.stringify({
                  account_id: accountId,
                  reason: reason || null,
                  is_banned: access.is_banned,
                }),
              })
                .then(() => resolve(access))
                .catch(reject);
            },
          );
        })
        .catch(reject);
    });
  });
