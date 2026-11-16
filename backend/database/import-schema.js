import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_SCHEMA_PATH = path.join(__dirname, "schema.sql");

/**
 * Splits a MySQL/phpMyAdmin SQL dump into executable statements while respecting
 * client-side DELIMITER changes, quoted literals, and comments.
 */
export function splitSqlStatements(sql) {
  const statements = [];
  let delimiter = ";";
  let current = "";
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inBacktick = false;
  let i = 0;

  while (i < sql.length) {
    const ch = sql[i];
    const next = sql[i + 1];

    // Check for DELIMITER directive at the start of a statement/line outside quotes & comments
    if (!inSingleQuote && !inDoubleQuote && !inBacktick && current.trim() === "") {
      const rest = sql.slice(i);
      const delimMatch = rest.match(/^DELIMITER\s+(\S+)[ \t]*(?:\r?\n|$)/i);
      if (delimMatch) {
        delimiter = delimMatch[1];
        i += delimMatch[0].length;
        continue;
      }
    }

    if (!inSingleQuote && !inDoubleQuote && !inBacktick) {
      // Line comment (-- ... or # ...)
      if ((ch === "-" && next === "-" && (sql[i + 2] === " " || sql[i + 2] === "\t" || sql[i + 2] === "\r" || sql[i + 2] === "\n")) || ch === "#") {
        const nl = sql.indexOf("\n", i);
        i = nl === -1 ? sql.length : nl + 1;
        continue;
      }

      // Block comment (skip normal comments; preserve MySQL conditional comments /*! ... */)
      if (ch === "/" && next === "*" && sql[i + 2] !== "!") {
        const endComment = sql.indexOf("*/", i + 2);
        i = endComment === -1 ? sql.length : endComment + 2;
        continue;
      }

      // Statement delimiter match
      if (sql.startsWith(delimiter, i)) {
        const trimmed = current.trim();
        if (trimmed) {
          statements.push(trimmed);
        }
        current = "";
        i += delimiter.length;
        continue;
      }
    }

    // Handle quote state transitions and backslash escapes
    if (ch === "\\" && (inSingleQuote || inDoubleQuote)) {
      current += ch + (next ?? "");
      i += 2;
      continue;
    }

    if (ch === "'" && !inDoubleQuote && !inBacktick) {
      if (inSingleQuote && next === "'") {
        current += "''";
        i += 2;
        continue;
      }
      inSingleQuote = !inSingleQuote;
    } else if (ch === '"' && !inSingleQuote && !inBacktick) {
      inDoubleQuote = !inDoubleQuote;
    } else if (ch === "`" && !inSingleQuote && !inDoubleQuote) {
      inBacktick = !inBacktick;
    }

    current += ch;
    i += 1;
  }

  const trailing = current.trim();
  if (trailing) {
    statements.push(trailing);
  }

  return statements;
}

function buildConnectionConfig(connectionUrl) {
  const parsed = new URL(connectionUrl.trim());
  const database = parsed.pathname.replace(/^\//, "");
  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 3306,
    user: decodeURIComponent(parsed.username || "root"),
    password: decodeURIComponent(parsed.password || ""),
    database,
    multipleStatements: false,
  };
}

async function resolveConnectionUrl(cliUrl) {
  if (cliUrl) return cliUrl;
  if (process.env.MYSQL_PUBLIC_URL) return process.env.MYSQL_PUBLIC_URL;

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question("Paste MYSQL_PUBLIC_URL (mysql://root:...@host:port/railway): ");
    return answer.trim();
  } finally {
    rl.close();
  }
}

async function main() {
  const args = process.argv.slice(2);
  let sqlFilePath = DEFAULT_SCHEMA_PATH;
  let cliUrl = "";

  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--file" && args[i + 1]) {
      sqlFilePath = path.resolve(args[i + 1]);
      i += 1;
    } else if (!cliUrl && !args[i].startsWith("--")) {
      cliUrl = args[i];
    }
  }

  const connectionUrl = await resolveConnectionUrl(cliUrl);
  if (!connectionUrl || !connectionUrl.startsWith("mysql://")) {
    console.error("Invalid or missing mysql:// connection URL.");
    process.exitCode = 1;
    return;
  }

  const config = buildConnectionConfig(connectionUrl);
  const rawSql = fs.readFileSync(sqlFilePath, "utf8");
  const statements = splitSqlStatements(rawSql);

  console.log(`Connecting to ${config.host}:${config.port} (${config.database})...`);
  const connection = await mysql.createConnection(config);

  try {
    console.log(`Executing ${statements.length} SQL statements from ${path.basename(sqlFilePath)}...`);
    for (let idx = 0; idx < statements.length; idx += 1) {
      await connection.query(statements[idx]);
    }

    const [[tableRow]] = await connection.query(
      "SELECT COUNT(*) AS table_count FROM information_schema.tables WHERE table_schema = DATABASE()"
    );
    const [routineRows] = await connection.query(
      "SELECT ROUTINE_NAME FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = DATABASE()"
    );
    console.log(
      `Import complete! Tables in '${config.database}': ${tableRow.table_count}. Functions: ${
        routineRows.map((r) => r.ROUTINE_NAME).join(", ") || "none"
      }.`
    );
  } finally {
    await connection.end();
  }
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  main().catch((err) => {
    console.error("Schema import failed:", err.message);
    process.exitCode = 1;
  });
}
