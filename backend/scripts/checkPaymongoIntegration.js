// Read-only diagnostics: never creates payments, changes orders, or prints secrets.
import dotenv from "dotenv";
import mysql from "mysql2/promise";
import { fileURLToPath } from "node:url";

dotenv.config({ path: fileURLToPath(new URL("../.env", import.meta.url)), quiet: true });
const key = String(process.env.PAYMONGO_SECRET_KEY || "").trim();
const report = {
  environment: {
    secretKeyConfigured: Boolean(key),
    keyMode: key.startsWith("sk_test_") ? "test" : key.startsWith("sk_live_") ? "live" : "invalid-or-missing",
    webhookSecretConfigured: Boolean(process.env.PAYMONGO_WEBHOOK_SECRET),
    frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
  },
};

let connection;
try {
  connection = await mysql.createConnection({
    host: process.env.DB_HOST, user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
    port: process.env.DB_PORT, connectTimeout: 5000,
  });
  const [columns] = await connection.query("SHOW COLUMNS FROM marketplace_order");
  const [indexes] = await connection.query("SHOW INDEX FROM marketplace_order");
  const [orders] = await connection.query(`SELECT order_id, payment_method, payment_status,
    payment_reference, paymongo_checkout_session_id, paymongo_payment_id,
    paymongo_payment_method, paid_at, status, total_amount
    FROM marketplace_order ORDER BY order_id DESC LIMIT 5`);
  report.database = {
    connected: true,
    columns: columns.map(({ Field, Type }) => ({ field: Field, type: Type })),
    indexes: [...new Set(indexes.map(({ Key_name }) => Key_name))],
    latestOrders: orders,
  };
} catch (error) {
  report.database = { connected: false, errorCode: error.code || error.name };
} finally {
  await connection?.end();
}

for (const [name, url] of [
  ["backend", "http://localhost:5000/"],
  ["frontend", "http://localhost:5173"],
  ["tunnel", "http://127.0.0.1:4040/api/tunnels"],
]) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    report[name] = { reachable: true, status: response.status };
    if (name === "tunnel" && response.ok) {
      const body = await response.json();
      report.tunnel.urls = (body.tunnels || []).map((tunnel) => ({
        publicUrl: tunnel.public_url, upstream: tunnel.config?.addr,
      }));
    }
  } catch {
    report[name] = { reachable: false };
  }
}

if (report.environment.keyMode === "test") {
  for (const [name, path] of [
    ["capabilities", "/v1/merchants/capabilities/payment_methods"],
    ["webhooks", "/v1/webhooks"],
  ]) {
    try {
      const response = await fetch(`https://api.paymongo.com${path}`, {
        headers: { Authorization: `Basic ${Buffer.from(`${key}:`).toString("base64")}` },
        signal: AbortSignal.timeout(10000),
      });
      const body = await response.json().catch(() => ({}));
      report[name] = { status: response.status, contentType: response.headers.get("content-type"), bodyKeys: Object.keys(body), dataKeys: body.data && typeof body.data === "object" ? Object.keys(body.data) : [] };
      if (response.ok && name === "capabilities") {
        report[name].methods = Array.isArray(body) ? body : body.data?.attributes?.payment_methods || body.data?.payment_methods || body.payment_methods || body.data;
      } else if (response.ok && name === "webhooks") {
        report[name].endpoints = (Array.isArray(body.data) ? body.data : []).map(({ id, attributes }) => ({
          id, url: attributes?.url, status: attributes?.status,
          events: attributes?.events, livemode: attributes?.livemode,
          secretMatchesEnvironment: Boolean(attributes?.secret_key) && attributes.secret_key === process.env.PAYMONGO_WEBHOOK_SECRET,
        }));
        report[name].totalRecords = body.total_records;
      } else {
        report[name].errorCodes = (body.errors || []).map(({ code }) => code);
      }
    } catch (error) {
      report[name] = { reachable: false, errorCode: error.cause?.code || error.name };
    }
  }
}

const output = process.argv.includes("--summary") ? {
  environment: report.environment,
  database: { connected: report.database.connected, errorCode: report.database.errorCode,
    recoveryUrlColumn: report.database.columns?.some(column => column.field === "paymongo_checkout_url") },
  backend: report.backend, frontend: report.frontend, tunnel: report.tunnel,
  capabilities: report.capabilities, webhooks: report.webhooks,
} : report;
console.log(JSON.stringify(output, null, 2));
