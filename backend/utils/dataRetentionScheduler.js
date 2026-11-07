import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import db from "../database/db.js";
import { logAudit } from "./auditLogger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const corUploadFolder = path.join(
  __dirname,
  "..",
  "uploads",
  "seller",
  "uploadCOR",
);

export async function runDataRetentionCycle({ logger = console } = {}) {
  let expiredAccountsCount = 0;
  let disposedAccountsCount = 0;
  let purgedInteractionsCount = 0;

  // 1. Automatically mark student accounts whose expire_date has passed as 'expired'
  //    and archive their unsold artwork listings.
  try {
    const [dueStudents] = await db.promise().query(
      `SELECT student_id, student_number
       FROM student
       WHERE account_status = 'active'
         AND expire_date IS NOT NULL
         AND expire_date <= CURRENT_TIMESTAMP`,
    );

    if (dueStudents.length > 0) {
      const studentIds = dueStudents.map((row) => row.student_id);
      const placeholders = studentIds.map(() => "?").join(", ");

      const [expireResult] = await db.promise().query(
        `UPDATE student
         SET account_status = 'expired'
         WHERE student_id IN (${placeholders})
           AND account_status = 'active'`,
        studentIds,
      );
      expiredAccountsCount = Number(expireResult?.affectedRows || 0);

      await db
        .promise()
        .query(
          `UPDATE artwork
           SET status = 'Archived'
           WHERE student_id IN (${placeholders})
             AND COALESCE(is_sold, 0) = 0
             AND COALESCE(status, 'Available') <> 'Archived'`,
          studentIds,
        )
        .catch(() => {});

      if (expiredAccountsCount > 0) {
        await logAudit({
          action: "AUTO_EXPIRE_STUDENT_ACCOUNTS",
          actor: "SYSTEM_SCHEDULER",
          role: "System",
          status: "SUCCESS",
          information: `Automatically expired ${expiredAccountsCount} student account(s) past their semester expiration date and archived unsold listings (RA 10173 Retention Policy).`,
        }).catch(() => {});
      }
    }
  } catch (error) {
    logger.warn(
      "Data retention scheduler (student expiration step) warning:",
      error.message,
    );
  }

  // 2. Long-term retention disposal: anonymize sensitive contact/COR fields for student
  //    accounts that have remained expired for > 12 months with no active orders,
  //    while preserving artist name & student_id for artwork attribution and accounting.
  try {
    const [longExpiredStudents] = await db.promise().query(
      `SELECT s.student_id, s.student_number, s.cor
       FROM student s
       WHERE s.account_status = 'expired'
         AND s.expire_date IS NOT NULL
         AND s.expire_date <= (CURRENT_TIMESTAMP - INTERVAL 12 MONTH)
         AND (s.cor IS NULL OR s.address IS NULL OR s.phone_number IS NULL)
         AND NOT EXISTS (
           SELECT 1
           FROM marketplace_order o
           WHERE o.seller_id = s.student_id
             AND o.status IN ('Pending', 'Confirmed', 'Packed', 'Shipped')
         )`,
    );

    if (longExpiredStudents.length > 0) {
      for (const student of longExpiredStudents) {
        if (student.cor) {
          const safeCorFilename = path.basename(String(student.cor));
          const corFilePath = path.join(corUploadFolder, safeCorFilename);
          await fs.promises.unlink(corFilePath).catch(() => {});
        }
      }

      const studentIds = longExpiredStudents.map((row) => row.student_id);
      const placeholders = studentIds.map(() => "?").join(", ");

      const [disposeResult] = await db.promise().query(
        `UPDATE student
         SET cor = NULL,
             address = NULL,
             phone_number = NULL,
             birthdate = NULL
         WHERE student_id IN (${placeholders})`,
        studentIds,
      );
      disposedAccountsCount = Number(disposeResult?.affectedRows || 0);

      if (disposedAccountsCount > 0) {
        await logAudit({
          action: "RETENTION_DISPOSAL_EXPIRED_STUDENTS",
          actor: "SYSTEM_SCHEDULER",
          role: "System",
          status: "SUCCESS",
          information: `Disposed of COR documents and contact PII for ${disposedAccountsCount} student account(s) expired for over 12 months (RA 10173 Sec. 11(e) Retention & Disposal).`,
        }).catch(() => {});
      }
    }
  } catch (error) {
    logger.warn(
      "Data retention scheduler (long-term student disposal step) warning:",
      error.message,
    );
  }

  // 3. Purge stale anonymous recommendation interaction logs (> 6 months old)
  //    and any residual interactions for opted-out buyers.
  try {
    const [guestPurgeResult] = await db.promise().query(
      `DELETE FROM recommendation_interaction
       WHERE (customer_id IS NULL AND created_at < (CURRENT_TIMESTAMP - INTERVAL 6 MONTH))
          OR customer_id IN (
            SELECT customer_id FROM customer WHERE allow_personalized_recommendations = 0
          )`,
    );
    purgedInteractionsCount = Number(guestPurgeResult?.affectedRows || 0);
  } catch {
    // Table may not exist yet in fresh environments
  }

  return {
    expiredAccountsCount,
    disposedAccountsCount,
    purgedInteractionsCount,
  };
}

export function startDataRetentionScheduler({
  intervalMs = 6 * 60 * 60 * 1000,
  logger = console,
} = {}) {
  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try {
      await runDataRetentionCycle({ logger });
    } catch (error) {
      logger.error(
        "Data retention scheduler failed:",
        error.code || error.message,
      );
    } finally {
      running = false;
    }
  };
  void run();
  const timer = setInterval(run, intervalMs);
  timer.unref?.();
  return () => clearInterval(timer);
}

