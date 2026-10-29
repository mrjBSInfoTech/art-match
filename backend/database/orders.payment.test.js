import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = fs.readFileSync(new URL("./orders.js", import.meta.url), "utf8")
  .replace(/^import[\s\S]*?;\s*/gm, "")
  .replaceAll("export const ", "const ");
const expectedStatuses = ["Pending", "Paid", "Failed", "Expired", "Refunded"];
const enumType = (values) => `enum(${values.map((value) => `'${value}'`).join(",")})`;

function migration({ methods = ["paymongo", "cod"], statuses = expectedStatuses,
  missing = [], rows = [], defaultMethod = null } = {}) {
  const fields = ["payment_method", "payment_status", "payment_reference", "paymongo_checkout_session_id",
    "paymongo_checkout_url", "paymongo_payment_id", "paymongo_payment_method", "paid_at",
    "parcel_photos", "courier", "tracking_number", "tracking_url", "handling_instructions", "original_subtotal", "discount_amount", "voucher_code"];
  const columns = fields.filter((Field) => !missing.includes(Field)).map((Field) => ({
    Field, Type: Field === "payment_method" ? enumType(methods)
      : Field === "payment_status" ? enumType(statuses) : "varchar(2048)",
    Null: ["payment_method", "payment_status"].includes(Field) ? "NO" : "YES",
    Default: Field === "payment_method" ? defaultMethod : Field === "payment_status" ? "Pending" : null,
  }));
  const statements = [];
  const warnings = [];
  const db = { query(sql, callback) {
    statements.push(sql);
    if (/SHOW COLUMNS/.test(sql)) return callback(null, columns.map((column) => ({ ...column })));
    if (/SHOW INDEX/.test(sql)) return callback(null, [{ Key_name: "idx_marketplace_order_payment_reference" }]);
    if (/ADD COLUMN/.test(sql)) {
      const Field = sql.match(/ADD COLUMN\s+(\w+)/)[1];
      columns.push({ Field, Type: "varchar(2048)", Null: "YES", Default: null });
    }
    if (/MODIFY COLUMN/.test(sql)) {
      const match = sql.match(/MODIFY COLUMN (\w+) (ENUM\([\s\S]*?\)) (NULL|NOT NULL)(?: DEFAULT '([^']*)')?/);
      assert.ok(match, "migration only changes recognized enum definitions");
      const column = columns.find((entry) => entry.Field === match[1]);
      column.Type = match[2].replace(/^ENUM/, "enum");
      column.Null = match[3] === "NULL" ? "YES" : "NO";
      column.Default = match[4] ?? null;
    }
    if (/UPDATE marketplace_order/.test(sql)) {
      const method = sql.match(/WHERE payment_method = '([^']*)'/)[1];
      const channel = sql.match(/NULLIF\(paymongo_payment_method, ''\), '([^']*)'/)[1];
      for (const row of rows.filter((entry) => entry.payment_method === method)) {
        assert.ok(columns.find((entry) => entry.Field === "payment_method").Type.includes("'paymongo'"),
          "the enum must allow paymongo before converting a legacy row");
        if (!row.paymongo_payment_method) row.paymongo_payment_method = channel;
        row.payment_method = "paymongo";
      }
      assert.doesNotMatch(sql, /payment_status\s*=|paid_at\s*=|total_amount\s*=/);
    }
    callback(null, { affectedRows: 1 });
  } };
  const context = { db, ensureArtworkReviewSchema: async () => {},
    console: { warn(message) { warnings.push(message); } } };
  vm.runInNewContext(source + "\nglobalThis.migrate = ensureOrderColumns; globalThis.createSql = orderTableSql;", context);
  return { run: () => context.migrate(), statements, columns, rows, warnings, createSql: context.createSql };
}

test("current payment schema performs no repeated ALTER or data rewrite", async () => {
  const schema = migration();
  await schema.run();
  await schema.run();
  assert.equal(schema.statements.filter((sql) => /ALTER|UPDATE|DELETE|DROP/i.test(sql)).length, 0);
});

test("courier columns are nullable additive migrations that preserve legacy links and rerun safely", async () => {
  const legacy = { order_id: 1, status: "Shipped", tracking_url: "https://legacy.example/parcel/123" };
  const schema = migration({ missing: ["courier", "tracking_number"], rows: [legacy] });
  await schema.run();
  await schema.run();
  const mutations = schema.statements.filter((sql) => /ALTER|UPDATE|DELETE|DROP/i.test(sql));
  assert.deepEqual(mutations, [
    "ALTER TABLE marketplace_order ADD COLUMN courier VARCHAR(50) NULL",
    "ALTER TABLE marketplace_order ADD COLUMN tracking_number VARCHAR(100) NULL",
  ]);
  assert.deepEqual(legacy, { order_id: 1, status: "Shipped", tracking_url: "https://legacy.example/parcel/123" });
  assert.match(schema.createSql, /courier VARCHAR\(50\) NULL/);
  assert.match(schema.createSql, /tracking_number VARCHAR\(100\) NULL/);
  assert.match(schema.createSql, /tracking_url VARCHAR\(2048\) NULL/);
});

test("checkout URL is nullable, added once, and included for fresh installs", async () => {
  const schema = migration({ missing: ["paymongo_checkout_url"] });
  await schema.run();
  await schema.run();
  const additions = schema.statements.filter((sql) => /ADD COLUMN paymongo_checkout_url/.test(sql));
  assert.equal(additions.length, 1);
  assert.match(additions[0], /VARCHAR\(2048\) NULL/);
  assert.match(schema.createSql, /paymongo_checkout_url VARCHAR\(2048\) NULL/);
  assert.match(schema.createSql, /handling_instructions JSON NULL/);
});

test("voucher order snapshots are added once without changing historic financial records", async () => {
  const schema = migration({ missing: ["original_subtotal", "discount_amount", "voucher_code"] });
  await schema.run();
  await schema.run();
  for (const field of ["original_subtotal", "discount_amount", "voucher_code"]) {
    assert.equal(schema.statements.filter((sql) => sql.includes(`ADD COLUMN ${field} `)).length, 1);
    assert.ok(schema.createSql.includes(field));
  }
  assert.ok(schema.statements.every((sql) => !/UPDATE marketplace_order|DELETE|DROP/i.test(sql)));
});

test("older status enums expand without deleting legacy status values or rewriting financial records", async () => {
  const schema = migration({ statuses: ["Pending", "Paid", "LegacyUnpaid"] });
  await schema.run();
  const alterations = schema.statements.filter((sql) => /MODIFY COLUMN payment_status/.test(sql));
  assert.equal(alterations.length, 1);
  for (const value of [...expectedStatuses, "LegacyUnpaid"]) assert.ok(alterations[0].includes(`'${value}'`));
  assert.ok(schema.statements.every((sql) => !/UPDATE|DELETE|DROP/i.test(sql)));
});

test("legacy online methods preserve channel/payment history while unknown methods remain intact", async () => {
  const schema = migration({ methods: ["gcash", "maya", "card", "bank", "cod"],
    missing: ["paymongo_payment_method"], defaultMethod: "gcash", rows: [
      { order_id: 1, payment_method: "gcash", payment_status: "Paid", paymongo_payment_method: null },
      { order_id: 2, payment_method: "maya", payment_status: "Pending", paymongo_payment_method: "" },
      { order_id: 3, payment_method: "card", payment_status: "Paid", paymongo_payment_method: "existing-channel" },
      { order_id: 4, payment_method: "bank", payment_status: "Paid", paymongo_payment_method: null },
    ] });
  await schema.run();
  assert.deepEqual(schema.rows, [
    { order_id: 1, payment_method: "paymongo", payment_status: "Paid", paymongo_payment_method: "gcash" },
    { order_id: 2, payment_method: "paymongo", payment_status: "Pending", paymongo_payment_method: "paymaya" },
    { order_id: 3, payment_method: "paymongo", payment_status: "Paid", paymongo_payment_method: "existing-channel" },
    { order_id: 4, payment_method: "bank", payment_status: "Paid", paymongo_payment_method: null },
  ]);
  const methodColumn = schema.columns.find((entry) => entry.Field === "payment_method");
  assert.equal(methodColumn.Type, "enum('paymongo', 'cod', 'bank')");
  assert.equal(methodColumn.Default, "paymongo");
  assert.ok(schema.warnings.length);
  const before = schema.statements.length;
  await schema.run();
  assert.equal(schema.statements.slice(before).filter((sql) => /ALTER|UPDATE|DELETE|DROP/i.test(sql)).length, 0);
});

test("legacy methods already allowing paymongo convert before enum narrowing", async () => {
  const schema = migration({ methods: ["paymongo", "cod", "gcash"],
    rows: [{ payment_method: "gcash", paymongo_payment_method: null, payment_status: "Failed" }] });
  await schema.run();
  const mutations = schema.statements.filter((sql) => /ALTER|UPDATE/i.test(sql));
  assert.match(mutations[0], /UPDATE marketplace_order/);
  assert.match(mutations[1], /ENUM\('paymongo', 'cod'\)/);
  assert.equal(schema.rows[0].payment_status, "Failed");
});
