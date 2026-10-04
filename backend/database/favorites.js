import db from "./db.js";

const favoriteTableSql = `
  CREATE TABLE IF NOT EXISTS customer_favorite (
    favorite_id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    artwork_id INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_customer_favorite_customer
      FOREIGN KEY (customer_id) REFERENCES customer (customer_id) ON DELETE CASCADE,
    CONSTRAINT fk_customer_favorite_artwork
      FOREIGN KEY (artwork_id) REFERENCES artwork (artwork_id) ON DELETE CASCADE,
    UNIQUE KEY uq_customer_favorite (customer_id, artwork_id),
    INDEX idx_customer_favorite_customer (customer_id, created_at)
  ) ENGINE=InnoDB
`;

export const ensureFavoriteTable = () =>
  new Promise((resolve, reject) => {
    db.query(favoriteTableSql, (error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
