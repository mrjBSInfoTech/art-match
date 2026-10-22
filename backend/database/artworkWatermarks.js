import db from "./db.js";

const tables = [
  `CREATE TABLE IF NOT EXISTS buyer_watermark_code (
    customer_id INT NOT NULL PRIMARY KEY,
    watermark_code CHAR(5) NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_buyer_watermark_code_customer
      FOREIGN KEY (customer_id) REFERENCES customer (customer_id) ON DELETE CASCADE
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS buyer_artwork_image_view (
    view_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NULL,
    artwork_id INT NULL,
    image_filename VARCHAR(255) NOT NULL,
    watermark_code VARCHAR(10) NOT NULL,
    viewed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_buyer_artwork_image_view_customer
      FOREIGN KEY (customer_id) REFERENCES customer (customer_id) ON DELETE SET NULL,
    CONSTRAINT fk_buyer_artwork_image_view_artwork
      FOREIGN KEY (artwork_id) REFERENCES artwork (artwork_id) ON DELETE SET NULL,
    INDEX idx_buyer_artwork_image_view_code (watermark_code, viewed_at),
    INDEX idx_buyer_artwork_image_view_artwork (artwork_id, viewed_at),
    INDEX idx_buyer_artwork_image_view_customer (customer_id, viewed_at)
  ) ENGINE=InnoDB`,
];

export const ensureArtworkWatermarkTables = () =>
  tables.reduce(
    (ready, sql) =>
      ready.then(
        () =>
          new Promise((resolve, reject) => {
            db.query(sql, (error) => (error ? reject(error) : resolve()));
          }),
      ),
    Promise.resolve(),
  );
