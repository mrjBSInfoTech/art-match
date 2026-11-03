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
  for (const { name, type } of tables) {
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

    yield `\n-- Table ${name}\n${createTable};\n`;
    const rows = connection.query(`SELECT * FROM ${quotedName}`).stream({ highWaterMark: 100 });
    for await (const row of rows) {
      const values = insertColumns.map((column) => sqlValue(row[column])).join(", ");
      yield `INSERT INTO ${quotedName} (${insertColumns.map(quoteSqlIdentifier).join(", ")}) VALUES (${values});\n`;
    }
    yield "\n";
  }
  yield "SET FOREIGN_KEY_CHECKS=1;\n";
};
