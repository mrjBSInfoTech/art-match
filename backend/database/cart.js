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
    if (!existingColumnNames.has("selected_products")) {
      await query("ALTER TABLE cart_item ADD COLUMN selected_products JSON NULL AFTER quantity");
    }
    if (!existingColumnNames.has("order_note")) {
      await query("ALTER TABLE cart_item ADD COLUMN order_note TEXT NULL AFTER selected_products");
    }

    await query("UPDATE cart_item SET quantity = 1 WHERE quantity IS NULL OR quantity <= 0");

    const [orderTable] = await query("SHOW TABLES LIKE 'marketplace_order_item'");
    if (orderTable) {
      const orderColumns = await query("SHOW COLUMNS FROM marketplace_order_item");
      const existingOrderColumns = new Set(orderColumns.map((column) => column.Field));
      for (const [name, definition] of [
        ["product_option_id", "VARCHAR(100) NULL"],
        ["product_option_name", "VARCHAR(255) NULL"],
        ["selected_products", "JSON NULL"],
        ["line_total", "DECIMAL(12, 2) NULL"],
        ["original_line_total", "DECIMAL(12, 2) NULL"],
        ["order_note", "TEXT NULL"],
      ]) {
        if (!existingOrderColumns.has(name)) {
          await query(`ALTER TABLE marketplace_order_item ADD COLUMN ${name} ${definition}`);
        }
      }
    }
  } catch (error) {
    console.error("Failed to ensure cart item schema:", error.message);
    throw error;
  }
};
