import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { normalizeTrackingUrl } from "../utils/parcelShipment.js";

// Exercise the real service without credentials or network. Real concurrent
// requests, DB timestamps and SQL are covered by scripts/testReturnsFlow.js.
const serviceSource = fs.readFileSync(new URL("../utils/returns.js", import.meta.url), "utf8")
  .replace(/^import[\s\S]*?;\s*/gm, "")
  .replace(/^export /gm, "");
const statuses = ["Requested", "Approved", "Rejected", "Cancelled", "Return Shipped", "Received", "Completed"];
const body = { order_id: 41, order_item_ids: [51], reason: "Shipping damage", details: "The frame arrived with a damaged corner." };

function fixture({ status = "Requested", secondClockExpired = false, failSql } = {}) {
  let state = {
    order: { order_id: 41, customer_id: 7, seller_id: 17, status: "Delivered", delivered_at: "2026-10-25 12:00:00", in_return_window: 1 },
    request: { return_request_id: 61, order_id: 41, conversation_id: 31, customer_id: 7, seller_id: 17, status,
      reason: body.reason, details: body.details, requested_at: "2026-10-26 12:00:00" },
    items: [], notifications: [],
  };
  let saved;
  const calls = [];
  const events = [];
  const connection = {
    async beginTransaction() { calls.push("BEGIN"); saved = structuredClone(state); },
    async commit() { calls.push("COMMIT"); saved = null; },
    async rollback() { calls.push("ROLLBACK"); if (saved) state = saved; saved = null; },
    release() { calls.push("RELEASE"); },
    async query(sql, params = []) {
      sql = sql.replace(/\s+/g, " ").trim();
      calls.push({ sql, params: structuredClone(params) });
      if (failSql?.(sql, params)) throw new Error("Injected transaction failure");
      if (/^SELECT order_id, customer_id/.test(sql)) {
        assert.match(sql, /WHERE order_id = \? AND customer_id = \? FOR UPDATE$/);
        return [[Number(params[1]) === 7 ? state.order : undefined].filter(Boolean)];
      }
      if (/^SELECT order_item_id, quantity/.test(sql)) return [[{ order_item_id: 51, quantity: 3 }]];
      if (/^SELECT ri.order_item_id/.test(sql)) return [[]];
      if (/^INSERT INTO conversation/.test(sql)) return [{ insertId: 31, affectedRows: 1 }];
      if (/^SELECT conversation_id FROM conversation/.test(sql)) return [[{ conversation_id: 31 }]];
      if (/^UPDATE conversation_read_state/.test(sql)) return [{ affectedRows: 1 }];
      if (/^INSERT INTO marketplace_return_request/.test(sql)) {
        assert.match(sql, /CURRENT_TIMESTAMP <= DATE_ADD\(delivered_at, INTERVAL 7 DAY\)/);
        if (secondClockExpired) return [{ affectedRows: 0, insertId: 0 }];
        state.request.status = "Requested";
        return [{ affectedRows: 1, insertId: 61 }];
      }
      if (/^INSERT INTO marketplace_return_item/.test(sql)) {
        state.items.push({ return_request_id: params[0], order_item_id: params[1], quantity: params[2] });
        return [{ affectedRows: 1 }];
      }
      if (/^INSERT INTO account_notifications/.test(sql)) {
        state.notifications.push([...params]);
        return [{ affectedRows: 1 }];
      }
      if (/^SELECT r\.\*/.test(sql)) return [[{ ...state.request, order_item_id: 51, return_quantity: 3, title: "Fixture artwork" }]];
      if (/^SELECT order_id FROM marketplace_return_request/.test(sql)) {
        const expected = /seller_id =/.test(sql) ? 17 : 7;
        return [Number(params[1]) === expected ? [{ order_id: 41 }] : []];
      }
      if (/^SELECT order_id FROM marketplace_order/.test(sql)) {
        assert.match(sql, /FOR UPDATE$/);
        return [[{ order_id: 41 }]];
      }
      if (/^SELECT \* FROM marketplace_return_request/.test(sql)) {
        assert.match(sql, /FOR UPDATE$/);
        return [[{ ...state.request }]];
      }
      if (/^UPDATE marketplace_return_request/.test(sql)) {
        const next = /SET status = \?/.test(sql) ? params[0] : sql.match(/SET status = '([^']+)'/)[1];
        state.request.status = next;
        if (/decision_at/.test(sql)) { state.request.decision_at = "2026-10-26 12:00:00"; state.request.seller_response = params[1]; }
        if (/return_shipped_at/.test(sql)) { state.request.return_shipped_at = "2026-10-26 12:00:00"; state.request.return_tracking_url = params[0]; }
        if (/received_at/.test(sql)) state.request.received_at = "2026-10-26 12:00:00";
        if (/completed_at/.test(sql)) state.request.completed_at = "2026-10-26 12:00:00";
        return [{ affectedRows: 1 }];
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    },
  };
  const context = {
    db: { promise: () => ({ getConnection: async () => connection }) },
    normalizeTrackingUrl, publishReturnUpdated: (...args) => events.push(args),
    console: { error() {} },
  };
  vm.runInNewContext(serviceSource + "\nglobalThis.service = { createReturnRequest, transitionReturnRequest, listReturnRequests, attachOrderReturns };", context);
  return { service: context.service, calls, events, get state() { return state; } };
}

for (const [name, invalid] of [
  ["no selected items", { order_item_ids: [] }],
  ["duplicate item IDs", { order_item_ids: [51, 51] }],
  ["unsafe integer item ID", { order_item_ids: ["9007199254740992"] }],
  ["negative order ID", { order_id: -41 }],
  ["fractional order ID", { order_id: 41.5 }],
  ["uncontrolled reason", { reason: "Custom reason" }],
  ["blank details", { details: "          " }],
  ["short details", { details: "ninechars" }],
  ["oversized details", { details: "x".repeat(1001) }],
]) {
  test(`return creation rejects ${name} before acquiring a transaction`, async () => {
    const current = fixture();
    await assert.rejects(current.service.createReturnRequest(7, { ...body, ...invalid }), error => error.status === 400);
    assert.deepEqual(current.calls, []);
    assert.deepEqual(current.events, []);
  });
}

test("trusted actor and order rows determine ownership, quantity and initial status despite forged client fields", async () => {
  const current = fixture();
  const created = await current.service.createReturnRequest(7, { ...body, customer_id: 999, seller_id: 999, status: "Approved", quantity: 100 });
  assert.equal(created.customer_id, 7);
  assert.equal(created.seller_id, 17);
  assert.equal(created.status, "Requested");
  assert.equal(created.items[0].quantity, 3);
  assert.ok(current.calls.indexOf("COMMIT") > current.calls.findIndex(call => /INSERT INTO account_notifications/.test(call.sql || "")));
  assert.equal(current.events.length, 1);
});

test("clock recheck rejects a deadline crossed after the order lock and rolls back without a live event", async () => {
  const current = fixture({ secondClockExpired: true });
  await assert.rejects(current.service.createReturnRequest(7, body), error => error.status === 409 && /expired/.test(error.message));
  assert.ok(current.calls.includes("ROLLBACK"));
  assert.ok(current.calls.includes("RELEASE"));
  assert.ok(!current.calls.includes("COMMIT"));
  assert.equal(current.state.items.length, 0);
  assert.equal(current.state.notifications.length, 0);
  assert.equal(current.events.length, 0);
});

test("a failed receipt notification rolls both Received and Completed updates back together", async () => {
  const current = fixture({ status: "Return Shipped", failSql: sql => /^INSERT INTO account_notifications/.test(sql) });
  await assert.rejects(current.service.transitionReturnRequest("seller", 17, 61, "receive", {}), /Injected/);
  assert.equal(current.state.request.status, "Return Shipped");
  assert.equal(current.state.request.received_at, undefined);
  assert.equal(current.state.request.completed_at, undefined);
  assert.equal(current.events.length, 0);
  assert.ok(current.calls.includes("ROLLBACK"));
  assert.ok(!current.calls.includes("COMMIT"));
});

const actions = [
  { name: "cancel", role: "buyer", actor: 7, from: "Requested" },
  { name: "approve", role: "seller", actor: 17, from: "Requested" },
  { name: "reject", role: "seller", actor: 17, from: "Requested", body: { seller_response: "Packaging evidence needed." } },
  { name: "shipped", role: "buyer", actor: 7, from: "Approved" },
  { name: "receive", role: "seller", actor: 17, from: "Return Shipped" },
];
for (const action of actions) {
  for (const status of statuses.filter(value => value !== action.from)) {
    test(`${status} cannot transition using ${action.name}`, async () => {
      const current = fixture({ status });
      await assert.rejects(current.service.transitionReturnRequest(action.role, action.actor, 61, action.name, action.body || {}), error => error.status === 409);
      assert.equal(current.state.request.status, status);
      assert.equal(current.events.length, 0);
      assert.ok(!current.calls.some(call => /^UPDATE marketplace_return_request/.test(call.sql || "")));
    });
  }
  test(`${action.name} rejects the other participant's role before database access`, async () => {
    const current = fixture({ status: action.from });
    const otherRole = action.role === "buyer" ? "seller" : "buyer";
    await assert.rejects(current.service.transitionReturnRequest(otherRole, 99, 61, action.name, action.body || {}), error => error.status === 403);
    assert.deepEqual(current.calls, []);
  });
}

test("a forged seller actor cannot locate or mutate another seller's return", async () => {
  const current = fixture();
  await assert.rejects(current.service.transitionReturnRequest("seller", 18, 61, "approve", {}), error => error.status === 404);
  assert.equal(current.state.request.status, "Requested");
  assert.ok(current.calls.includes("ROLLBACK"));
  assert.equal(current.events.length, 0);
});
