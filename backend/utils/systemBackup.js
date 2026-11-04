export const quoteSqlIdentifier = (identifier) =>
  `\`${String(identifier).replace(/`/g, "``")}\``;

const sqlValue = (value) => {
  if (value === null || value === undefined) return "NULL";
  if (Buffer.isBuffer(value)) return `X'${value.toString("hex")}'`;
  if (value instanceof Date) {
    return `'${value.toISOString().slice(0, 19).replace("T", " ")}'`;
  }
  if (typeof value === "number" || typeof value === "bigint") {
    return String(value);
  }
  if (typeof value === "boolean") return value ? "1" : "0";
  return `'${String(value)
    .replace(/\\/g, "\\\\")
    .replace(/\0/g, "\\0")
    .replace(/\x08/g, "\\b")
    .replace(/\t/g, "\\t")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\x1a/g, "\\Z")
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')}'`;
};

export const createDatabaseDump = async function* (connection, tables) {
  yield "-- ArtMatch database backup. Restore into an empty database.\n";
  yield "SET NAMES utf8mb4;\nSET FOREIGN_KEY_CHECKS=0;\n\n";
  const orderedTables = [
    ...tables.filter(({ type }) => type !== "VIEW"),
    ...tables.filter(({ type }) => type === "VIEW"),
  ];
  for (const { name, type } of orderedTables) {
    const quotedName = quoteSqlIdentifier(name);
    if (type === "VIEW") {
      const [viewRows] = await connection.promise().query(`SHOW CREATE VIEW ${quotedName}`);
      const createView = viewRows[0]["Create View"];
      yield `DROP VIEW IF EXISTS ${quotedName};\n${createView};\n\n`;
      continue;
    }

    const [createRows] = await connection.promise().query(`SHOW CREATE TABLE ${quotedName}`);
    const createTable = createRows[0]["Create Table"]
      .replace(/^CREATE TABLE /i, "CREATE TABLE IF NOT EXISTS ");
    const [columnRows] = await connection.promise().query(`SHOW COLUMNS FROM ${quotedName}`);
    const insertColumns = columnRows
      .filter((column) => !String(column.Extra || "").toLowerCase().includes("generated"))
      .map((column) => column.Field);

    yield `\n-- Table ${name}\nDROP TABLE IF EXISTS ${quotedName};\n${createTable};\n`;
    const rows = connection.query(`SELECT * FROM ${quotedName}`).stream({ highWaterMark: 100 });
    for await (const row of rows) {
      const values = insertColumns.map((column) => sqlValue(row[column])).join(", ");
      yield `INSERT INTO ${quotedName} (${insertColumns.map(quoteSqlIdentifier).join(", ")}) VALUES (${values});\n`;
    }
    yield "\n";
  }
  yield "SET FOREIGN_KEY_CHECKS=1;\n";
};

export const splitSqlStatements = (sql) => {
  const statements = [];
  let statement = "";
  let quote = null;
  let escaped = false;

  for (let index = 0; index < sql.length; index += 1) {
    const character = sql[index];
    const nextCharacter = sql[index + 1];

    if (!quote && character === "-" && nextCharacter === "-" &&
        (index === 0 || sql[index - 1] === "\n")) {
      const lineEnd = sql.indexOf("\n", index);
      index = lineEnd === -1 ? sql.length : lineEnd;
      continue;
    }

    if (quote) {
      statement += character;
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === quote) {
        if (sql[index + 1] === quote) {
          statement += sql[index + 1];
          index += 1;
        } else {
          quote = null;
        }
      }
      continue;
    }

    if (character === "'" || character === '"' || character === "`") {
      quote = character;
      statement += character;
      continue;
    }
    if (character === ";") {
      if (statement.trim()) statements.push(statement.trim());
      statement = "";
      continue;
    }
    statement += character;
  }

  if (statement.trim()) statements.push(statement.trim());
  return statements;
};

export const restoreDatabaseDump = async (connection, sql) => {
  for (const statement of splitSqlStatements(sql)) {
    await connection.promise().query(statement);
  }
};
