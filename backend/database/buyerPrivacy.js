import db from "./db.js";

const alterCustomerColumn = (sql) =>
  new Promise((resolve, reject) => {
    db.query(sql, (error) => {
      if (error && error.code !== "ER_DUP_FIELDNAME") {
        reject(error);
        return;
      }
      resolve();
    });
  });

export const ensureBuyerPrivacyColumn = async () => {
  await alterCustomerColumn(
    "ALTER TABLE customer ADD COLUMN is_private TINYINT(1) NOT NULL DEFAULT 0",
  );
  await alterCustomerColumn(
    "ALTER TABLE customer ADD COLUMN allow_personalized_recommendations TINYINT(1) NOT NULL DEFAULT 1",
  );
  await alterCustomerColumn(
    "ALTER TABLE customer ADD COLUMN consent_given_at DATETIME NULL",
  );
  await alterCustomerColumn(
    "ALTER TABLE customer ADD COLUMN consent_version VARCHAR(20) NULL",
  );
};