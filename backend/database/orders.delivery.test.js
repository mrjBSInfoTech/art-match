import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = fs.readFileSync(new URL("./orders.js", import.meta.url), "utf8")
  .replace(/^import[\s\S]*?;\s*/gm, "")
  .replaceAll("export const ", "const ");

function migration({ hasColumn = false, rows = [] } = {}) {
  const statements = [];
  const db = { query(sql, callback) {
    statements.push(sql);
    if (/SHOW COLUMNS/.test(sql)) return callback(null, hasColumn ? [{ Field: "delivered_at" }] : []);
    if (/ALTER TABLE/.test(sql)) hasColumn = true;
    if (/UPDATE marketplace_order/.test(sql)) {
      assert.match(sql, /WHERE status = 'Delivered' AND delivered_at IS NULL/);
      assert.match(sql, /updated_at = updated_at/);
      for (const row of rows) {
        if (row.status === "Delivered" && row.delivered_at == null) {
          row.delivered_at = row.updated_at ?? row.created_at;
        }
      }
    }
    callback(null, { affectedRows: 1 });
  } };
  const context = { db, ensureArtworkReviewSchema: async () => {} };
  vm.runInNewContext(`${source}\nglobalThis.migrate = ensureDeliveryColumn; globalThis.createSql = orderTableSql;`, context);
  return { run: () => context.migrate(), statements, rows, createSql: context.createSql };
}

test("delivery migration uses historical timestamps once and never renews return windows on restart", async () => {
  const rows = [
    { status: "Delivered", updated_at: "2026-10-01 12:00:00", created_at: "2026-09-20 12:00:00", delivered_at: null },
    { status: "Delivered", updated_at: null, created_at: "2026-09-15 12:00:00", delivered_at: null },
    { status: "Shipped", updated_at: "2026-10-01 12:00:00", delivered_at: null },
    { status: "Delivered", updated_at: "2026-10-20 12:00:00", delivered_at: "2026-10-01 12:00:00" },
  ];
  const schema = migration({ rows });
  await schema.run();
  assert.equal(rows[0].delivered_at, "2026-10-01 12:00:00");
  assert.equal(rows[0].updated_at, "2026-10-01 12:00:00");
  assert.equal(rows[1].delivered_at, "2026-09-15 12:00:00");
  assert.equal(rows[2].delivered_at, null);
  assert.equal(rows[3].delivered_at, "2026-10-01 12:00:00");
  const before = schema.statements.length;
  await schema.run();
  assert.equal(schema.statements.slice(before).filter((sql) => /ALTER|UPDATE/.test(sql)).length, 0);
  assert.equal(schema.statements.filter((sql) => /ADD COLUMN delivered_at/.test(sql)).length, 1);
  assert.match(schema.createSql, /delivered_at DATETIME NULL/);
});

test("an existing delivery column is never backfilled again", async () => {
  const schema = migration({ hasColumn: true, rows: [{ status: "Delivered", delivered_at: null }] });
  await schema.run();
  assert.equal(schema.rows[0].delivered_at, null);
  assert.equal(schema.statements.filter((sql) => /ALTER|UPDATE/.test(sql)).length, 0);
});
