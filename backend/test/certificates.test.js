import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../utils/certificates.js", import.meta.url), "utf8")
  .replace(/^import[\s\S]*?;\s*/gm, "")
  .replace(/^export /gm, "");

function loadService({ queryHandler, connectionFactory } = {}) {
  const calls = [];
  const events = [];
  const connection = connectionFactory?.(calls);
  const db = {
    promise: () => ({
      query: async (sql, params = []) => {
        calls.push({ sql, params });
        return queryHandler ? queryHandler(sql, params, calls) : [[]];
      },
      getConnection: async () => connection,
    }),
  };
  const context = {
    db,
    publishChatMessage: (...args) => events.push(args),
    console: { error() {} },
  };
  vm.runInNewContext(
    `${source}\nglobalThis.service = { publishCertificate, getSellerCertificate, processDueCertificateDeliveries, getBuyerCertificate };`,
    context,
  );
  return { service: context.service, calls, events };
}

test("certificate publication rejects unsafe SVG before database access", async () => {
  const current = loadService();
  for (const svg of ["", "<svg><script>alert(1)</script></svg>", "<svg onclick='run()'></svg>"]) {
    await assert.rejects(current.service.publishCertificate(3, 21, "RN-2026-ABCD", svg),
      (error) => error.status === 400);
  }
  assert.deepEqual(current.calls, []);
});

test("seller publication requires an approved owned artwork and stores one immutable certificate", async () => {
  const sqlCalls = [];
  const current = loadService({
    queryHandler: async (sql, params) => {
      sqlCalls.push({ sql, params });
      if (/SELECT a\.artwork_id/.test(sql)) return [[{ artwork_id: 21 }]];
      if (/INSERT IGNORE INTO marketplace_certificate/.test(sql)) return [{ affectedRows: 1 }];
      throw new Error(`Unexpected SQL: ${sql}`);
    },
  });
  const result = await current.service.publishCertificate(3, 21, "RN-2026-ABCD", "<svg xmlns=\"http://www.w3.org/2000/svg\"></svg>");
  assert.deepEqual(JSON.parse(JSON.stringify(result)), {
    artworkId: 21, certificateId: "RN-2026-ABCD", published: true,
  });
  assert.match(sqlCalls[0].sql, /a\.student_id = \?/);
  assert.match(sqlCalls[0].sql, /request_status.*verified.*approved/i);
  assert.match(sqlCalls[1].sql, /INSERT IGNORE/);
  assert.deepEqual(JSON.parse(JSON.stringify(sqlCalls[1].params.slice(0, 3))), [21, 3, "RN-2026-ABCD"]);
});

test("buyer certificate access is order-owned, delayed until delivery plus one day, and blocked after a completed return", async () => {
  let completed = 0;
  const current = loadService({
    queryHandler: async (sql) => {
      assert.match(sql, /o\.customer_id = \?/);
      assert.match(sql, /o\.status = 'Delivered'/);
      assert.match(sql, /DATE_SUB\(CURRENT_TIMESTAMP, INTERVAL 1 DAY\)/);
      assert.match(sql, /o\.paid_at IS NOT NULL/);
      assert.match(sql, /r\.status = 'Completed'/);
      return [[{ certificate_svg: "<svg></svg>", return_completed: completed }]];
    },
  });
  assert.equal(await current.service.getBuyerCertificate(7, 51), "<svg></svg>");
  completed = 1;
  await assert.rejects(current.service.getBuyerCertificate(7, 51),
    (error) => error.status === 410 && /return is completed/.test(error.message));
});

function deliveryConnection(calls, { alreadySent = false, completedReturn = false } = {}) {
  return {
    async beginTransaction() { calls.push({ action: "BEGIN" }); },
    async commit() { calls.push({ action: "COMMIT" }); },
    async rollback() { calls.push({ action: "ROLLBACK" }); },
    release() { calls.push({ action: "RELEASE" }); },
    async query(sql, params = []) {
      calls.push({ sql, params });
      if (/^SELECT oi\.order_item_id/.test(sql)) {
        return [[{ order_item_id: 51, order_id: 41, artwork_id: 21, title: "Portrait",
          customer_id: 7, seller_id: 3 }]];
      }
      if (/^SELECT order_item_id FROM marketplace_certificate_delivery/.test(sql)) {
        return [alreadySent ? [{ order_item_id: 51 }] : []];
      }
      if (/^SELECT certificate_id FROM marketplace_certificate/.test(sql)) return [[{ certificate_id: "RN-2026-ABCD" }]];
      if (/^SELECT r\.return_request_id/.test(sql)) return [completedReturn ? [{ return_request_id: 81 }] : []];
      if (/^INSERT INTO conversation/.test(sql)) return [{ affectedRows: 1 }];
      if (/^SELECT conversation_id FROM conversation/.test(sql)) return [[{ conversation_id: 31 }]];
      if (/^UPDATE conversation_read_state/.test(sql)) return [{ affectedRows: 1 }];
      if (/^INSERT INTO message/.test(sql)) return [{ insertId: 91, affectedRows: 1 }];
      if (/^INSERT INTO marketplace_certificate_delivery/.test(sql)) return [{ affectedRows: 1 }];
      throw new Error(`Unexpected SQL: ${sql}`);
    },
  };
}

test("due delivery adds a chat certificate link once and publishes a live message update", async () => {
  const current = loadService({
    queryHandler: async (sql) => {
      assert.match(sql, /delivered_at <= DATE_SUB\(CURRENT_TIMESTAMP, INTERVAL 1 DAY\)/);
      return [[{ order_item_id: 51 }]];
    },
    connectionFactory: (calls) => deliveryConnection(calls),
  });
  assert.equal(await current.service.processDueCertificateDeliveries(), 1);
  assert.ok(current.calls.some((call) => call.action === "COMMIT"));
  const message = current.calls.find((call) => /^INSERT INTO message/.test(call.sql || ""));
  assert.deepEqual(JSON.parse(JSON.stringify(message.params)), [
    31,
    'Your Certificate of Authenticity for "Portrait" is ready.',
    "/buyer/certificate/51",
    "application/vnd.artmatch.certificate-link",
  ]);
  assert.deepEqual(current.events, [[3, 7, 31, 91]]);
});

test("delivery skips already-sent items and items whose return is completed", async () => {
  for (const options of [{ alreadySent: true }, { completedReturn: true }]) {
    const current = loadService({
      queryHandler: async () => [[{ order_item_id: 51 }]],
      connectionFactory: (calls) => deliveryConnection(calls, options),
    });
    assert.equal(await current.service.processDueCertificateDeliveries(), 0);
    assert.ok(!current.calls.some((call) => /^INSERT INTO message/.test(call.sql || "")));
    assert.deepEqual(current.events, []);
  }
});
