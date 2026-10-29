import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync(new URL("./vouchers.js", import.meta.url), "utf8")
  .replace(/^import[\s\S]*?;\s*/gm, "")
  .replace("export default router;", "");
const payload = {
  code: "OWN-CODE", discount_type: "percentage", discount_value: 15,
  minimum_purchase: 200, starts_on: "2026-10-01", expires_on: "2026-11-30",
  applies_to_all: false, artwork_ids: [7, 12],
};
const initial = () => ({
  vouchers: [
    { voucher_id: 1, student_id: 8, code: "OWN-CODE", discount_type: "percentage", discount_value: 10,
      minimum_purchase: 0, starts_on: "2026-10-01", expires_on: "2026-11-30", applies_to_all: false },
    { voucher_id: 2, student_id: 9, code: "TAKEN", starts_on: "2026-10-01", expires_on: "2026-11-30" },
  ],
  scopes: [{ voucher_id: 1, artwork_id: 7 }, { voucher_id: 2, artwork_id: 99 }],
});

function fixture({ failSql, lockAvailable = true } = {}) {
  let state = initial();
  let snapshot;
  const calls = [];
  const audits = [];
  const routes = new Map();
  const authenticateSeller = () => {};
  const connection = {
    async beginTransaction() { calls.push("BEGIN"); snapshot = structuredClone(state); },
    async commit() { calls.push("COMMIT"); snapshot = null; },
    async rollback() {
      calls.push("ROLLBACK");
      if (snapshot) state = structuredClone(snapshot);
      snapshot = null;
    },
    release() { calls.push("RELEASE"); },
    async query(rawSql, rawParams = []) {
      const sql = rawSql.replace(/\s+/g, " ").trim();
      const params = JSON.parse(JSON.stringify(rawParams));
      calls.push({ sql, params });
      if (failSql?.test(sql)) throw new Error("Injected SQL failure");
      if (sql.includes("GET_LOCK")) return [[{ acquired: Number(lockAvailable) }]];
      if (sql.includes("RELEASE_LOCK")) return [[{ released: 1 }]];
      if (sql.startsWith("SELECT voucher_id FROM seller_voucher WHERE voucher_id")) {
        assert.match(sql, /AND student_id = \? FOR UPDATE$/);
        return [state.vouchers.filter((voucher) => voucher.voucher_id === params[0] && voucher.student_id === params[1])];
      }
      if (sql.startsWith("SELECT voucher_id FROM seller_voucher WHERE UPPER(code)")) {
        return [state.vouchers.filter((voucher) => voucher.code === params[0]
          && voucher.starts_on <= "2026-10-29" && voucher.expires_on >= "2026-10-29"
          && (!sql.includes("voucher_id <>") || voucher.voucher_id !== params[1]))];
      }
      if (sql.startsWith("SELECT artwork_id FROM artwork")) {
        assert.match(sql, /WHERE student_id = \? AND artwork_id IN/);
        return [params[0] === 8 ? params[1].filter((id) => [7, 12].includes(id)).map((artwork_id) => ({ artwork_id })) : []];
      }
      if (sql.startsWith("UPDATE seller_voucher")) {
        assert.match(sql, /WHERE voucher_id = \? AND student_id = \?$/);
        const voucher = state.vouchers.find((row) => row.voucher_id === params[7] && row.student_id === params[8]);
        assert.ok(voucher);
        [voucher.code, voucher.discount_type, voucher.discount_value, voucher.minimum_purchase,
          voucher.starts_on, voucher.expires_on, voucher.applies_to_all] = params;
        return [{ affectedRows: 0 }]; // MySQL may report zero changed rows for a no-op save.
      }
      if (sql.startsWith("DELETE FROM seller_voucher_artwork")) {
        state.scopes = state.scopes.filter((scope) => scope.voucher_id !== params[0]);
        return [{ affectedRows: 1 }];
      }
      if (sql.startsWith("INSERT INTO seller_voucher_artwork")) {
        state.scopes.push(...params[0].map(([voucher_id, artwork_id]) => ({ voucher_id, artwork_id })));
        return [{ affectedRows: params[0].length }];
      }
      if (sql.startsWith("INSERT INTO seller_voucher ")) {
        const voucher_id = 3;
        const [student_id, code, discount_type, discount_value, minimum_purchase, starts_on, expires_on, applies_to_all] = params;
        state.vouchers.push({ voucher_id, student_id, code, discount_type, discount_value, minimum_purchase, starts_on, expires_on, applies_to_all });
        return [{ insertId: voucher_id }];
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    },
  };
  const router = Object.fromEntries(["get", "post", "put", "delete"].map((method) => [method,
    (path, ...handlers) => routes.set(`${method} ${path}`, handlers)]));
  vm.runInNewContext(source, {
    express: { Router: () => router }, db: { promise: () => ({ getConnection: async () => connection }) },
    authenticateSeller, randomBytes: () => ({ toString: () => "0123456789" }),
    logSellerAudit: async (_user, audit) => audits.push(audit), console: { error() {} },
  });
  return {
    calls, audits, state: () => structuredClone(state),
    async save({ body = payload, studentId = 8, id = "1", create = false } = {}) {
      const handlers = routes.get(create ? "post /" : "put /:voucherId");
      assert.equal(handlers[0], authenticateSeller, "Writes require seller authentication");
      const response = { statusCode: 200, body: null,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = JSON.parse(JSON.stringify(body)); return this; } };
      await handlers.at(-1)({ params: create ? {} : { voucherId: id }, user: { student_id: studentId }, body }, response);
      return response;
    },
  };
}

test("seller edits their voucher in place and atomically replaces only its listing scope", async () => {
  const route = fixture();
  const result = await route.save();
  assert.equal(result.statusCode, 200);
  assert.equal(result.body.voucher_id, 1);
  assert.equal(result.body.discount_value, 15);
  assert.deepEqual(result.body.artwork, [7, 12]);
  assert.equal(route.state().vouchers.length, 2);
  assert.equal(route.state().vouchers[0].discount_value, 15);
  assert.deepEqual(route.state().scopes, [{ voucher_id: 2, artwork_id: 99 }, { voucher_id: 1, artwork_id: 7 }, { voucher_id: 1, artwork_id: 12 }]);
  assert.ok(route.calls.includes("COMMIT"));
  assert.equal(route.audits[0].action, "UPDATE_VOUCHER");
  assert.ok(route.calls.some((call) => call.sql?.includes("voucher_id <> ?") && call.params[1] === 1));
});

test("wrong seller cannot edit a voucher, even with a forged body owner", async () => {
  const route = fixture();
  const before = route.state();
  const result = await route.save({ studentId: 9, body: { ...payload, student_id: 8 } });
  assert.equal(result.statusCode, 404);
  assert.deepEqual(route.state(), before);
  assert.ok(route.calls.includes("ROLLBACK"));
  assert.equal(route.audits.length, 0);
});

test("conflicting active codes and listings belonging to another seller are rejected", async () => {
  for (const [body, expected] of [[{ ...payload, code: "TAKEN" }, 409], [{ ...payload, artwork_ids: [99] }, 400]]) {
    const route = fixture();
    const before = route.state();
    assert.equal((await route.save({ body })).statusCode, expected);
    assert.deepEqual(route.state(), before);
    assert.equal(route.audits.length, 0);
  }
});

test("invalid voucher updates fail validation without writes", async () => {
  for (const body of [
    { ...payload, code: "" }, { ...payload, code: "bad code!" }, { ...payload, discount_type: "invalid" },
    { ...payload, discount_value: 101 }, { ...payload, minimum_purchase: -1 },
    { ...payload, starts_on: "2026-02-30" }, { ...payload, expires_on: "2025-01-01" },
    { ...payload, applies_to_all: "true" }, { ...payload, artwork_ids: [] }, { ...payload, artwork_ids: [0] },
  ]) {
    const route = fixture();
    assert.equal((await route.save({ body })).statusCode, 400);
    assert.deepEqual(route.state(), initial());
    assert.equal(route.calls.length, 0);
  }
  for (const id of ["0", "-1", "invalid", "1.5"]) {
    assert.equal((await fixture().save({ id })).statusCode, 400);
  }
});

test("switching to an all-listings freebie removes old scope without touching other vouchers", async () => {
  const route = fixture();
  const result = await route.save({ body: { ...payload, code: " new-code ", discount_type: "freebie", applies_to_all: true, artwork_ids: [99] } });
  assert.equal(result.statusCode, 200);
  assert.equal(result.body.code, "NEW-CODE");
  assert.equal(result.body.discount_value, null);
  assert.deepEqual(route.state().scopes, [{ voucher_id: 2, artwork_id: 99 }]);
});

test("scope write failures or unavailable code locks leave the saved voucher intact", async () => {
  for (const options of [{ failSql: /^INSERT INTO seller_voucher_artwork/ }, { lockAvailable: false }]) {
    const route = fixture(options);
    assert.equal((await route.save()).statusCode, 500);
    assert.deepEqual(route.state(), initial());
    assert.equal(route.audits.length, 0);
    assert.ok(route.calls.includes("RELEASE"));
  }
});

test("existing creation still supports generated and custom codes with the shared validation", async () => {
  for (const code of [undefined, "NEW-CUSTOM"]) {
    const route = fixture();
    const result = await route.save({ create: true, body: { ...payload, code } });
    assert.equal(result.statusCode, 201);
    assert.equal(result.body.voucher_id, 3);
    assert.equal(result.body.code, code || "ART-0123456789");
    assert.equal(route.audits[0].action, "CREATE_VOUCHER");
  }
  assert.equal((await fixture().save({ create: true })).statusCode, 409);
});
