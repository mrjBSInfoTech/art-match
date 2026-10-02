import db from "./db.js";

export const ensureBuyerPrivacyColumn = () =>
  new Promise((resolve, reject) => {
    db.query(
      "ALTER TABLE customer ADD COLUMN is_private TINYINT(1) NOT NULL DEFAULT 0",
      (error) => {
        if (error && error.code !== "ER_DUP_FIELDNAME") {
          reject(error);
          return;
        }
        resolve();
      },
    );
  });