import mysql from "mysql2";
import dotenv from "dotenv";

dotenv.config();

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

db.connect((err) => {
  if (err) {
    console.error("❌ Failed to connect to MySQL:", err.message);
    process.exit(1);
  }
  console.log("✅ Connected to MySQL!");
});

// Prevent uncaught 'error' events from crashing the process
db.on("error", (err) => {
  console.error("MySQL connection error (caught):", err && err.message ? err.message : err);
  // note: do not exit process here; allow higher-level handlers or connection logic to decide
});

export default db;
