import db from "./db.js";
import { ensureOrderTables } from "./orders.js";

try {
  await ensureOrderTables();
  console.log("Order tables are ready in the configured database.");
} catch (error) {
  console.error("Order database setup failed:", error.message);
  process.exitCode = 1;
} finally {
  await db.promise().end();
}
