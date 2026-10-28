import db from "./db.js";
import { updatePromotionHeader } from "./systemSettings.js";

const requestHeaderTableSql = `
  CREATE TABLE IF NOT EXISTS promotion_header_requests (
    request_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    message VARCHAR(200) NOT NULL,
    button_label VARCHAR(60) NOT NULL,
    button_url VARCHAR(1000) NOT NULL,
    status ENUM('pending', 'accepted', 'rejected') NOT NULL DEFAULT 'pending',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_at DATETIME NULL,
    reviewed_by INT NULL,
    CONSTRAINT fk_promotion_header_request_student
      FOREIGN KEY (student_id) REFERENCES student (student_id) ON DELETE CASCADE,
    CONSTRAINT fk_promotion_header_request_admin
      FOREIGN KEY (reviewed_by) REFERENCES admin (admin_id) ON DELETE SET NULL,
    INDEX idx_promotion_header_request_status (status, created_at),
    INDEX idx_promotion_header_request_student (student_id, created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
`;

const serializeRequest = (request) => ({
  ...request,
  request_id: Number(request.request_id),
  student_id: Number(request.student_id),
});

export const ensurePromotionHeaderRequestsTable = async () => {
  await db.promise().query(requestHeaderTableSql);
};

export const listSellerPromotionHeaderRequests = async (studentId) => {
  const [rows] = await db.promise().query(
    `SELECT request_id, student_id, message, button_label, button_url,
            status, created_at, reviewed_at
     FROM promotion_header_requests
     WHERE student_id = ?
     ORDER BY created_at DESC, request_id DESC
     LIMIT 20`,
    [studentId],
  );
  return rows.map(serializeRequest);
};

export const createPromotionHeaderRequest = async (studentId, header) => {
  const connection = await db.promise().getConnection();
  try {
    await connection.beginTransaction();
    await connection.query(
      "SELECT student_id FROM student WHERE student_id = ? FOR UPDATE",
      [studentId],
    );
    const [pendingRows] = await connection.query(
      `SELECT request_id FROM promotion_header_requests
       WHERE student_id = ? AND status = 'pending'
       LIMIT 1`,
      [studentId],
    );
    if (pendingRows.length) {
      const error = new Error("You already have a promo header request awaiting review.");
      error.status = 409;
      throw error;
    }

    const [result] = await connection.query(
      `INSERT INTO promotion_header_requests
       (student_id, message, button_label, button_url)
       VALUES (?, ?, ?, ?)`,
      [studentId, header.message, header.button_label, header.button_url],
    );
    await connection.commit();
    return {
      request_id: Number(result.insertId),
      student_id: Number(studentId),
      ...header,
      status: "pending",
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const listPendingPromotionHeaderRequests = async () => {
  const [rows] = await db.promise().query(
    `SELECT phr.request_id, phr.student_id, phr.message, phr.button_label,
            phr.button_url, phr.status, phr.created_at,
            s.student_number, s.first_name, s.last_name
     FROM promotion_header_requests phr
     JOIN student s ON s.student_id = phr.student_id
     WHERE phr.status = 'pending'
     ORDER BY phr.created_at ASC, phr.request_id ASC`,
  );
  return rows.map(serializeRequest);
};

export const reviewPromotionHeaderRequest = async (
  requestId,
  adminId,
  decision,
) => {
  const connection = await db.promise().getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query(
      `SELECT request_id, student_id, message, button_label, button_url, status
       FROM promotion_header_requests
       WHERE request_id = ?
       FOR UPDATE`,
      [requestId],
    );
    const request = rows[0];
    if (!request) {
      const error = new Error("Promo header request not found.");
      error.status = 404;
      throw error;
    }
    if (request.status !== "pending") {
      const error = new Error("This promo header request has already been reviewed.");
      error.status = 409;
      throw error;
    }

    if (decision === "accept") {
      await updatePromotionHeader(
        {
          message: request.message,
          button_label: request.button_label,
          button_url: request.button_url,
        },
        connection,
      );
    }
    await connection.query(
      `UPDATE promotion_header_requests
       SET status = ?, reviewed_at = CURRENT_TIMESTAMP, reviewed_by = ?
       WHERE request_id = ?`,
      [decision === "accept" ? "accepted" : "rejected", adminId, requestId],
    );
    await connection.commit();
    return {
      ...serializeRequest(request),
      status: decision === "accept" ? "accepted" : "rejected",
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};
