import db from "./db.js";

export const artistFollowTableSql = `
  CREATE TABLE IF NOT EXISTS customer_artist_follow (
    follow_id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    student_id INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_customer_artist_follow_customer
      FOREIGN KEY (customer_id) REFERENCES customer (customer_id) ON DELETE CASCADE,
    CONSTRAINT fk_customer_artist_follow_student
      FOREIGN KEY (student_id) REFERENCES student (student_id) ON DELETE CASCADE,
    UNIQUE KEY uq_customer_artist_follow (customer_id, student_id),
    INDEX idx_customer_artist_follow_student (student_id, created_at)
  ) ENGINE=InnoDB
`;

export const ensureArtistFollowTable = () =>
  new Promise((resolve, reject) => {
    db.query(artistFollowTableSql, (error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
