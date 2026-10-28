import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = fs.readFileSync(new URL("./payouts.js", import.meta.url), "utf8")
  .replace(/^import[\s\S]*?;\s*/gm, "").replace(/^export /gm, "");

function migrationFixture(statusType = "enum('Held','Eligible','Processing','Paid','Reversed','Disputed')") {
  const columns = new Map([["payout_status", statusType]]);
  const indexes = new Set(["PRIMARY", "order_id"]);
  const calls = [];
  const executor = { async query(sql) {
    const normalized = sql.replace(/\s+/g, " ").trim();
    calls.push(normalized);
    if (normalized === "SHOW COLUMNS FROM seller_payment_split") {
      return [[...columns].map(([Field, Type]) => ({ Field, Type }))];
    }
    if (normalized === "SHOW INDEX FROM seller_payment_split") {
      return [[...indexes].map((Key_name) => ({ Key_name }))];
    }
    const added = normalized.match(/^ALTER TABLE seller_payment_split ADD COLUMN ([a-z_]+) (.*)$/);
    if (added) { assert.ok(!columns.has(added[1])); columns.set(added[1], added[2]); return [{}]; }
    const status = normalized.match(/^ALTER TABLE seller_payment_split MODIFY COLUMN payout_status (ENUM\(.*\)) NOT NULL DEFAULT 'Held'$/);
    if (status) { columns.set("payout_status", status[1]); return [{}]; }
    const index = normalized.match(/^ALTER TABLE seller_payment_split ADD UNIQUE KEY ([a-z_]+) /);
    if (index) { assert.ok(!indexes.has(index[1])); indexes.add(index[1]); return [{}]; }
    assert.match(normalized, /^CREATE TABLE IF NOT EXISTS (seller_payout_account|seller_payout_attempt|seller_order_refund) /);
    return [{}];
  } };
  const context = { db: { promise: () => executor } };
  vm.runInNewContext(source + "\nglobalThis.ensure = ensurePayoutTables;", context);
  return { calls, columns, indexes, ensure: context.ensure };
}

test("existing payout ledger is extended without discarding terminal statuses or historical rows", async () => {
  const current = migrationFixture();
  await current.ensure();
  const statuses = current.columns.get("payout_status");
  assert.match(statuses, /'Reversed'/);
  assert.match(statuses, /'Disputed'/);
  assert.match(statuses, /'Failed'/);
  assert.match(statuses, /'Cancelled'/);
  assert.ok(current.columns.has("payout_amount"));
  assert.ok(current.columns.has("refund_amount"));
  assert.ok(current.columns.has("provider_transfer_id"));
  assert.ok(!current.calls.some((sql) => /^(DROP|TRUNCATE|DELETE|UPDATE)/.test(sql)));
});

test("a second server initialization performs no duplicate-column/index alterations", async () => {
  const current = migrationFixture();
  await current.ensure();
  const initialCallCount = current.calls.length;
  await current.ensure();
  const restartCalls = current.calls.slice(initialCallCount);
  assert.equal(restartCalls.filter((sql) => sql.startsWith("CREATE TABLE IF NOT EXISTS")).length, 3);
  assert.ok(!restartCalls.some((sql) => sql.startsWith("ALTER TABLE")));
});

test("database constraints prevent duplicate logical transfers and refund allocation", async () => {
  const current = migrationFixture();
  await current.ensure();
  const tables = current.calls.filter((sql) => sql.startsWith("CREATE TABLE"));
  const account = tables.find((sql) => sql.includes("CREATE TABLE IF NOT EXISTS seller_payout_account"));
  const attempt = tables.find((sql) => sql.includes("CREATE TABLE IF NOT EXISTS seller_payout_attempt"));
  const refund = tables.find((sql) => sql.includes("CREATE TABLE IF NOT EXISTS seller_order_refund"));
  assert.match(account, /UNIQUE KEY uq_seller_payout_account_student \(student_id\)/);
  assert.match(account, /account_number_ciphertext TEXT NOT NULL/);
  assert.match(attempt, /UNIQUE KEY uq_seller_payout_attempt_reference \(provider_reference\)/);
  assert.match(attempt, /UNIQUE KEY uq_seller_payout_attempt_transfer \(provider_transfer_id\)/);
  assert.match(refund, /UNIQUE KEY uq_seller_order_refund_provider \(provider_refund_id\)/);
  assert.match(refund, /FOREIGN KEY \(return_request_id\)/);
});

test("an incompatible status column requires review rather than silently coercing financial state", async () => {
  const current = migrationFixture("varchar(40)");
  await assert.rejects(current.ensure(), /ENUM schema/);
  assert.ok(!current.calls.some((sql) => /MODIFY COLUMN payout_status/.test(sql)));
});
