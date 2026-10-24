export const reviewTableSql = `
  CREATE TABLE IF NOT EXISTS artwork_reviews (
    review_id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NULL,
    order_item_id INT NULL UNIQUE,
    customer_id INT NOT NULL,
    seller_id INT NOT NULL,
    artwork_id INT NULL,
    rating TINYINT UNSIGNED NOT NULL,
    comment TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_artwork_reviews_order
      FOREIGN KEY (order_id) REFERENCES marketplace_order (order_id) ON DELETE CASCADE,
    CONSTRAINT fk_artwork_reviews_order_item
      FOREIGN KEY (order_item_id) REFERENCES marketplace_order_item (order_item_id) ON DELETE CASCADE,
    CONSTRAINT fk_artwork_reviews_artwork
      FOREIGN KEY (artwork_id) REFERENCES artwork (artwork_id) ON DELETE SET NULL,
    CONSTRAINT fk_artwork_reviews_customer
      FOREIGN KEY (customer_id) REFERENCES customer (customer_id) ON DELETE CASCADE,
    CONSTRAINT fk_artwork_reviews_seller
      FOREIGN KEY (seller_id) REFERENCES student (student_id) ON DELETE CASCADE,
    CONSTRAINT chk_artwork_reviews_rating CHECK (rating BETWEEN 1 AND 5),
    INDEX idx_artwork_reviews_artwork (artwork_id, created_at),
    INDEX idx_artwork_reviews_seller (seller_id, created_at),
    INDEX idx_artwork_reviews_customer (customer_id, created_at)
  ) ENGINE=InnoDB
`;

// Renaming the original table preserves its IDs, associations, indexes and data.
// When both names already exist, copy missing purchases and retain the legacy
// table unchanged so conflicting historical records are never deleted.
export async function ensureArtworkReviewSchema(query, logger = console) {
  const tables = await query(`
    SELECT TABLE_NAME AS table_name FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('artwork_review', 'artwork_reviews')
  `);
  const names = new Set(tables.map((row) => row.table_name));
  if (names.has("artwork_review") && !names.has("artwork_reviews")) {
    await query("RENAME TABLE artwork_review TO artwork_reviews");
  }
  await query(reviewTableSql);

  const columns = await query("SHOW COLUMNS FROM artwork_reviews");
  for (const name of ["order_id", "order_item_id"]) {
    const column = columns.find((existing) => existing.Field === name);
    if (column && column.Null !== "YES") {
      await query(`ALTER TABLE artwork_reviews MODIFY COLUMN ${name} ${column.Type} NULL`);
    }
  }
  const comment = columns.find((column) => column.Field === "comment");
  if (comment && (comment.Type.toLowerCase() !== "text" || comment.Null !== "YES")) {
    await query("ALTER TABLE artwork_reviews MODIFY COLUMN comment TEXT NULL");
  }
  const createdAt = columns.find((column) => column.Field === "created_at");
  if (createdAt && !createdAt.Type.toLowerCase().startsWith("datetime")) {
    await query("ALTER TABLE artwork_reviews MODIFY COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP");
  }

  const constraints = await query(`
    SELECT CONSTRAINT_NAME AS constraint_name, COLUMN_NAME AS column_name,
      REFERENCED_TABLE_NAME AS referenced_table, REFERENCED_COLUMN_NAME AS referenced_column
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'artwork_reviews'
      AND REFERENCED_TABLE_NAME IS NOT NULL
  `);

  if (names.has("artwork_review") && names.has("artwork_reviews")) {
    const fields = "order_id, order_item_id, customer_id, seller_id, artwork_id, rating, comment, created_at";
    const safeIdentifier = (value) => typeof value === "string" && /^[A-Za-z0-9_]+$/.test(value);
    const validReferences = constraints.filter((constraint) => [
      constraint.column_name, constraint.referenced_table, constraint.referenced_column,
    ].every(safeIdentifier)).map((constraint) => `AND (r.\`${constraint.column_name}\` IS NULL OR EXISTS (
      SELECT 1 FROM \`${constraint.referenced_table}\` p
      WHERE p.\`${constraint.referenced_column}\` = r.\`${constraint.column_name}\`))`).join("\n");
    await query(`
      INSERT INTO artwork_reviews (review_id, ${fields})
      SELECT r.review_id, ${fields.split(", ").map((field) => `r.${field}`).join(", ")}
      FROM artwork_review r
      WHERE NOT EXISTS (SELECT 1 FROM artwork_reviews n WHERE n.order_item_id = r.order_item_id)
        AND NOT EXISTS (SELECT 1 FROM artwork_reviews n WHERE n.review_id = r.review_id)
        AND r.rating BETWEEN 1 AND 5 AND r.rating = FLOOR(r.rating) ${validReferences}
    `);
    await query(`
      INSERT INTO artwork_reviews (${fields})
      SELECT ${fields.split(", ").map((field) => `r.${field}`).join(", ")}
      FROM artwork_review r
      WHERE r.order_item_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM artwork_reviews n WHERE n.order_item_id = r.order_item_id)
        AND r.rating BETWEEN 1 AND 5 AND r.rating = FLOOR(r.rating) ${validReferences}
    `);
    logger.warn("Legacy artwork_review table retained after merging compatible missing purchases into artwork_reviews; conflicting or orphan historical rows remain preserved there.");
  }

  const protectedColumns = new Set(constraints.map((row) => row.column_name));
  for (const [column, table, target] of [
    ["customer_id", "customer", "customer_id"],
    ["seller_id", "student", "student_id"],
  ]) {
    if (protectedColumns.has(column)) continue;
    const orphanRows = await query(`
      SELECT COUNT(*) AS count FROM artwork_reviews r
      LEFT JOIN ${table} p ON p.${target} = r.${column}
      WHERE p.${target} IS NULL
    `);
    if (Number(orphanRows[0]?.count) > 0) {
      logger.warn(`Cannot add artwork_reviews.${column} foreign key: existing orphan reviews were preserved.`);
      continue;
    }
    await query(`
      ALTER TABLE artwork_reviews ADD CONSTRAINT fk_artwork_reviews_${column === "customer_id" ? "customer" : "seller"}
      FOREIGN KEY (${column}) REFERENCES ${table} (${target}) ON DELETE CASCADE
    `);
  }
}
