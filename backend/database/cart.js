import db from "./db.js";

const query = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (error, results) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(results);
    });
  });

export const ensureCartItemSchema = async () => {
  try {
    const [table] = await query("SHOW TABLES LIKE 'cart_item'");
    if (!table) {
      return;
    }

    const columns = await query("SHOW COLUMNS FROM cart_item");
    const existingColumnNames = new Set(columns.map((column) => column.Field));

    if (!existingColumnNames.has("quantity")) {
      await query("ALTER TABLE cart_item ADD COLUMN quantity INT NOT NULL DEFAULT 1");
    }

    await query("UPDATE cart_item SET quantity = 1 WHERE quantity IS NULL OR quantity <= 0");
  } catch (error) {
    console.error("Failed to ensure cart item schema:", error.message);
    throw error;
  }
};
