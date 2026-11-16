import mysql from "mysql2";
import dotenv from "dotenv";

import { fileURLToPath } from "node:url";

dotenv.config({ path: fileURLToPath(new URL("../.env", import.meta.url)), quiet: true });

export function resolveDbConfig(env = process.env) {
  const urlString = String(env.MYSQL_URL || env.DATABASE_URL || env.MYSQL_PUBLIC_URL || "").trim();
  let parsedUrl = null;
  if (urlString) {
    try {
      parsedUrl = new URL(urlString);
    } catch {
      parsedUrl = null;
    }
  }

  const hasExplicitDbHost = Boolean(String(env.DB_HOST || "").trim());
  const hasRailwayMysqlHost = Boolean(String(env.MYSQLHOST || "").trim());

  let host;
  let user;
  let password;
  let database;
  let rawPort;

  if (hasExplicitDbHost) {
    host = String(env.DB_HOST).trim();
    user = String(env.DB_USER || "").trim() || undefined;
    password = env.DB_PASSWORD;
    database = String(env.DB_NAME || "").trim() || undefined;
    rawPort = String(env.DB_PORT || "").trim();
  } else if (hasRailwayMysqlHost) {
    host = String(env.MYSQLHOST).trim();
    user = String(env.MYSQLUSER || "").trim() || undefined;
    password = env.MYSQLPASSWORD;
    database = String(env.MYSQLDATABASE || "").trim() || undefined;
    rawPort = String(env.MYSQLPORT || "").trim();
  } else if (parsedUrl) {
    host = parsedUrl.hostname || undefined;
    user = parsedUrl.username ? decodeURIComponent(parsedUrl.username) : undefined;
    password = parsedUrl.password ? decodeURIComponent(parsedUrl.password) : undefined;
    database = parsedUrl.pathname.replace(/^\//, "") || undefined;
    rawPort = parsedUrl.port || "";
  }

  const parsedPort = rawPort ? Number(rawPort) : undefined;
  const port = Number.isFinite(parsedPort) && parsedPort > 0 ? parsedPort : undefined;

  return { host, user, password, database, port };
}

const dbConfig = resolveDbConfig();

export function formatDbError(error) {
  if (!error) return "Unknown database error";
  const parts = [];
  if (error.code) parts.push(error.code);
  if (error.message) parts.push(error.message);
  if (Array.isArray(error.errors) && error.errors.length > 0) {
    const inner = error.errors
      .map((item) => item?.message || item?.code || String(item))
      .filter(Boolean)
      .join("; ");
    if (inner) parts.push(inner);
  }
  const detail = parts.join(": ") || String(error);
  return `${detail} (host=${dbConfig.host || "unset"}, port=${dbConfig.port || "default"}, database=${dbConfig.database || "unset"})`;
}

const db = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

db.on("error", (err) => {
  console.error("MySQL connection error (caught):", formatDbError(err));
});

export default db;
