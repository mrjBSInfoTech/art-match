import db from "./db.js";

const query = async (sql, params = []) => {
  const [rows] = await db.promise().query(sql, params);
  return rows;
};

const promotionSlidesTableSql = `
  CREATE TABLE IF NOT EXISTS promotion_slides (
    slide_id INT AUTO_INCREMENT PRIMARY KEY,
    admin_id INT NULL,
    student_id INT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NULL,
    button_label VARCHAR(60) NULL,
    button_url VARCHAR(2048) NULL,
    image_key VARCHAR(500) NOT NULL,
    image_original_name VARCHAR(255) NULL,
    image_content_type VARCHAR(100) NULL,
    image_size INT UNSIGNED NULL,
    status ENUM('Draft', 'Published') NOT NULL DEFAULT 'Draft',
    review_status ENUM('none', 'pending', 'accepted', 'rejected') NOT NULL DEFAULT 'none',
    review_requested_at DATETIME NULL,
    reviewed_at DATETIME NULL,
    published_until DATETIME NULL,
    sort_order INT NOT NULL DEFAULT 2,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_promotion_slides_admin
      FOREIGN KEY (admin_id) REFERENCES admin (admin_id) ON DELETE SET NULL,
    CONSTRAINT fk_promotion_slides_student
      FOREIGN KEY (student_id) REFERENCES student (student_id) ON DELETE CASCADE,
    INDEX idx_promotion_slides_student (student_id, slide_id),
    INDEX idx_promotion_slides_review (review_status, review_requested_at),
    INDEX idx_promotion_slides_status_order (status, sort_order, slide_id),
    UNIQUE KEY uq_promotion_slides_sort_order (sort_order)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
`;

const promotionSlideActivityTableSql = `
  CREATE TABLE IF NOT EXISTS promotion_slide_activity (
    activity_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    slide_id INT NOT NULL,
    student_id INT NULL,
    actor_type ENUM('admin', 'student') NOT NULL,
    actor_id INT NULL,
    actor_name VARCHAR(255) NULL,
    action VARCHAR(40) NOT NULL,
    slide_title VARCHAR(200) NOT NULL,
    details JSON NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_promotion_slide_activity_slide (slide_id, created_at),
    INDEX idx_promotion_slide_activity_student (student_id, created_at),
    INDEX idx_promotion_slide_activity_actor (actor_type, actor_id, created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
`;

const slideColumns = `slide_id, admin_id, title, description, button_label,
  button_url, image_key, image_original_name, image_content_type, image_size,
  status, student_id, review_status, review_requested_at, reviewed_at,
  published_until, sort_order, created_at, updated_at`;

export const ensurePromotionSlidesTable = async () => {
  await query(promotionSlidesTableSql);
  await query(promotionSlideActivityTableSql);
  const columns = await query("SHOW COLUMNS FROM promotion_slides");
  const existingColumns = new Set(columns.map((column) => column.Field));
  const migrations = [
    ["student_id", "ALTER TABLE promotion_slides ADD COLUMN student_id INT NULL"],
    [
      "review_status",
      "ALTER TABLE promotion_slides ADD COLUMN review_status ENUM('none', 'pending', 'accepted', 'rejected') NOT NULL DEFAULT 'none'",
    ],
    [
      "review_requested_at",
      "ALTER TABLE promotion_slides ADD COLUMN review_requested_at DATETIME NULL",
    ],
    ["reviewed_at", "ALTER TABLE promotion_slides ADD COLUMN reviewed_at DATETIME NULL"],
    [
      "published_until",
      "ALTER TABLE promotion_slides ADD COLUMN published_until DATETIME NULL",
    ],
  ];
  for (const [column, sql] of migrations) {
    if (!existingColumns.has(column)) await query(sql);
  }
  const studentIndex = await query(
    "SHOW INDEX FROM promotion_slides WHERE Key_name = ?",
    ["idx_promotion_slides_student"],
  );
  if (!studentIndex.length) {
    await query("ALTER TABLE promotion_slides ADD INDEX idx_promotion_slides_student (student_id, slide_id)");
  }
  const reviewIndex = await query(
    "SHOW INDEX FROM promotion_slides WHERE Key_name = ?",
    ["idx_promotion_slides_review"],
  );
  if (!reviewIndex.length) {
    await query("ALTER TABLE promotion_slides ADD INDEX idx_promotion_slides_review (review_status, review_requested_at)");
  }
  const [foreignKeys] = await db.promise().query(
    `SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
       AND CONSTRAINT_NAME = ?`,
    ["promotion_slides", "fk_promotion_slides_student"],
  );
  if (!foreignKeys.length) {
    await query(
      "ALTER TABLE promotion_slides ADD CONSTRAINT fk_promotion_slides_student FOREIGN KEY (student_id) REFERENCES student (student_id) ON DELETE CASCADE",
    );
  }
  const indexes = await query(
    "SHOW INDEX FROM promotion_slides WHERE Key_name = ?",
    ["uq_promotion_slides_sort_order"],
  );
  const existingSlides = await query(
    "SELECT slide_id, sort_order FROM promotion_slides ORDER BY sort_order, slide_id",
  );
  const hasExpectedOrder = existingSlides.every(
    (slide, index) => Number(slide.sort_order) === index + 2,
  );
  if (!indexes.length || !hasExpectedOrder) {
    const connection = await db.promise().getConnection();
    try {
      await connection.beginTransaction();
      const [slides] = await connection.query(
        "SELECT slide_id FROM promotion_slides ORDER BY sort_order, slide_id FOR UPDATE",
      );
      for (const [index, slide] of slides.entries()) {
        await connection.query(
          "UPDATE promotion_slides SET sort_order = ? WHERE slide_id = ?",
          [-(index + 1), slide.slide_id],
        );
      }
      for (const [index, slide] of slides.entries()) {
        await connection.query(
          "UPDATE promotion_slides SET sort_order = ? WHERE slide_id = ?",
          [index + 2, slide.slide_id],
        );
      }
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    if (!indexes.length) {
      await query(
        "ALTER TABLE promotion_slides ADD UNIQUE KEY uq_promotion_slides_sort_order (sort_order)",
      );
    }
  }
};

export const recordPromotionSlideActivity = async (
  connection,
  {
    slideId,
    studentId = null,
    actorType,
    actorId = null,
    actorName = null,
    action,
    slideTitle,
    details = {},
  },
) => {
  await connection.query(
    `INSERT INTO promotion_slide_activity
     (slide_id, student_id, actor_type, actor_id, actor_name, action,
      slide_title, details)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      slideId,
      studentId,
      actorType,
      actorId,
      actorName,
      action,
      slideTitle,
      JSON.stringify(details),
    ],
  );
};

export const listPromotionSlides = async ({ publishedOnly = false } = {}) => {
  return query(
    `SELECT ${slideColumns} FROM promotion_slides
     ${publishedOnly
       ? "WHERE status = 'Published' AND (student_id IS NULL OR published_until IS NULL OR published_until > CURRENT_TIMESTAMP)"
       : ""}
     ORDER BY sort_order ASC, slide_id ASC`,
  );
};

export const findPromotionSlide = async (
  slideId,
  connection = db.promise(),
  lock = false,
) => {
  const [rows] = await connection.query(
    `SELECT ${slideColumns} FROM promotion_slides
     WHERE slide_id = ?${lock ? " FOR UPDATE" : ""}`,
    [slideId],
  );
  return rows[0] || null;
};

export const lockPromotionSlides = async (connection) => {
  const [slides] = await connection.query(
    "SELECT slide_id FROM promotion_slides ORDER BY sort_order, slide_id FOR UPDATE",
  );
  return slides;
};

export const ensurePromotionSlideCanBeRemoved = async (
  connection,
  slide,
  lockedSlideCount,
) => {
  const [[setting]] = await connection.query(
    "SELECT setting_value FROM system_settings WHERE setting_key = ?",
    ["promotion_hero_enabled"],
  );
  if (setting?.setting_value !== "0") return;

  if (lockedSlideCount <= 1) {
    throw Object.assign(
      new Error("Keep at least one promotion slide while the default hero is off."),
      { status: 409 },
    );
  }

  const [[visibility]] = await connection.query(
    `SELECT (status = 'Published'
             AND (student_id IS NULL OR published_until IS NULL
                  OR published_until > CURRENT_TIMESTAMP)) AS is_visible
     FROM promotion_slides WHERE slide_id = ?`,
    [slide.slide_id],
  );
  if (Number(visibility?.is_visible) !== 1) return;

  const [remaining] = await connection.query(
    `SELECT COUNT(*) AS slide_count
     FROM promotion_slides
     WHERE slide_id <> ?
       AND status = 'Published'
       AND (student_id IS NULL OR published_until IS NULL
            OR published_until > CURRENT_TIMESTAMP)`,
    [slide.slide_id],
  );
  if (Number(remaining[0]?.slide_count) < 1) {
    throw Object.assign(
      new Error("Publish another promotion slide before removing the last visible slide while the default hero is off."),
      { status: 409 },
    );
  }
};

const editableColumns = [
  "title",
  "description",
  "button_label",
  "button_url",
  "image_key",
  "image_original_name",
  "image_content_type",
  "image_size",
  "status",
];

export const insertPromotionSlide = async (data, adminId, connection) => {
  const columns = ["admin_id", "sort_order", ...editableColumns];
  const [result] = await connection.query(
    `INSERT INTO promotion_slides (${columns.join(", ")})
     VALUES (${columns.map(() => "?").join(", ")})`,
    [adminId, 0, ...editableColumns.map((column) => data[column] ?? null)],
  );
  return result.insertId;
};

export const insertStudentPromotionSlide = async (
  data,
  studentId,
  connection,
) => {
  const columns = [
    "student_id",
    "title",
    "description",
    "button_label",
    "button_url",
    "image_key",
    "image_original_name",
    "image_content_type",
    "image_size",
    "status",
    "sort_order",
  ];
  const [result] = await connection.query(
    `INSERT INTO promotion_slides (${columns.join(", ")})
     VALUES (${columns.map(() => "?").join(", ")})`,
    [
      studentId,
      data.title,
      data.description,
      data.button_label,
      data.button_url,
      data.image_key,
      data.image_original_name,
      data.image_content_type,
      data.image_size,
      "Draft",
      0,
    ],
  );
  return result.insertId;
};

export const listStudentPromotionSlides = async (studentId) =>
  query(
    `SELECT ${slideColumns},
            (published_until > CURRENT_TIMESTAMP) AS is_currently_published
     FROM promotion_slides
     WHERE student_id = ? ORDER BY created_at DESC, slide_id DESC`,
    [studentId],
  );

export const findStudentPromotionSlide = async (
  slideId,
  studentId,
  connection = db.promise(),
  lock = false,
) => {
  const [rows] = await connection.query(
    `SELECT ${slideColumns},
            (published_until > CURRENT_TIMESTAMP) AS is_currently_published
     FROM promotion_slides
     WHERE slide_id = ? AND student_id = ?${lock ? " FOR UPDATE" : ""}`,
    [slideId, studentId],
  );
  return rows[0] || null;
};

export const updateStudentPromotionSlide = async (
  slideId,
  data,
  connection,
) => {
  await connection.query(
    `UPDATE promotion_slides
     SET title = ?, description = ?, button_label = ?, button_url = ?,
         image_key = ?, image_original_name = ?, image_content_type = ?,
         image_size = ?, review_status = 'none', review_requested_at = NULL
     WHERE slide_id = ? AND student_id = ?`,
    [
      data.title,
      data.description,
      data.button_label,
      data.button_url,
      data.image_key,
      data.image_original_name,
      data.image_content_type,
      data.image_size,
      slideId,
      data.student_id,
    ],
  );
};

export const submitStudentPromotionSlide = async (
  slideId,
  studentId,
  connection,
) => {
  await connection.query(
    `UPDATE promotion_slides
     SET review_status = 'pending', review_requested_at = CURRENT_TIMESTAMP,
         reviewed_at = NULL
     WHERE slide_id = ? AND student_id = ?`,
    [slideId, studentId],
  );
};

export const deleteStudentPromotionSlide = async (
  slideId,
  studentId,
  connection,
) => {
  await connection.query(
    "DELETE FROM promotion_slides WHERE slide_id = ? AND student_id = ?",
    [slideId, studentId],
  );
};

export const savePromotionSlide = async (slideId, data, connection) => {
  await connection.query(
    `UPDATE promotion_slides
     SET ${editableColumns.map((column) => `${column} = ?`).join(", ")}
     WHERE slide_id = ?`,
    [...editableColumns.map((column) => data[column] ?? null), slideId],
  );
};

export const removePromotionSlide = async (slideId, connection) => {
  await connection.query("DELETE FROM promotion_slides WHERE slide_id = ?", [
    slideId,
  ]);
};

export const setPromotionSlideOrder = async (
  connection,
  slideId = null,
  targetOrder = null,
) => {
  const [slides] = await connection.query(
    "SELECT slide_id FROM promotion_slides ORDER BY sort_order, slide_id FOR UPDATE",
  );
  const orderedIds = slides.map((slide) => slide.slide_id);

  if (slideId !== null) {
    if (
      !Number.isSafeInteger(targetOrder) ||
      targetOrder < 2 ||
      targetOrder > orderedIds.length + 1
    ) {
      throw Object.assign(
        new Error(`Choose a display position from 2 to ${orderedIds.length + 1}.`),
        { status: 400 },
      );
    }
    const currentIndex = orderedIds.indexOf(slideId);
    if (currentIndex < 0) {
      throw new Error("Promotion slide disappeared while updating its order.");
    }
    orderedIds.splice(currentIndex, 1);
    orderedIds.splice(targetOrder - 2, 0, slideId);
  }

  for (const [index, id] of orderedIds.entries()) {
    await connection.query(
      "UPDATE promotion_slides SET sort_order = ? WHERE slide_id = ?",
      [-(index + 1), id],
    );
  }
  for (const [index, id] of orderedIds.entries()) {
    await connection.query(
      "UPDATE promotion_slides SET sort_order = ? WHERE slide_id = ?",
      [index + 2, id],
    );
  }
};
