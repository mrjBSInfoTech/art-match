import mysql from "mysql2";
import dotenv from "dotenv";

dotenv.config();

const db = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "product_management",
  port: process.env.DB_PORT || 3307,
});

db.connect((err) => {
  if (err) {
    console.error("❌ Failed to connect to MySQL:", err.message);
    process.exit(1);
  }
  console.log("✅ Connected to MySQL!");
});

export default db;
