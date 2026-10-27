import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { normalizeTrackingUrl, validateParcelPhotoCount } from "../../utils/parcelShipment.js";

const source = fs.readFileSync(new URL("./orders.js", import.meta.url), "utf8")
  .replace(/^import[\s\S]*?;\s*/gm, "")
  .replace("export default router;", "");

function setup(order = {}) {
  const state = { updates: 0, commits: 0, rollbacks: 0, uploads: 0, released: false };
  const currentOrder = {
    seller_id: 8,
    status: "Pending", customer_id: 14, parcel_photos: [], tracking_url: null,
    handling_instructions: [], payment_method: "paymongo", payment_status: "Pending",
    paid_at: null, ...order,
  };
  let statusHandler;
  let listHandler;
  let listSql;
  const connection = {
    async beginTransaction() {},
    async query(sql, params) {
      if (/SELECT status/.test(sql)) {
        assert.match(sql, /WHERE order_id = \? AND seller_id = \?/);
        assert.match(sql, /FOR UPDATE/);
        assert.deepEqual(Array.from(params), [31, Number(params[1])]);
        if (Number(params[1]) !== Number(currentOrder.seller_id)) return [[]];
        return [[{ ...currentOrder }]];
      }
      if (/UPDATE marketplace_order/.test(sql)) {
        state.updates++;
        state.updateSql = sql;
        state.updateParams = Array.from(params);
        return [{ affectedRows: 1 }];
      }
      throw new Error("Unexpected SQL");
    },
    async commit() { state.commits++; },
    async rollback() { state.rollbacks++; },
    release() { state.released = true; },
  };
  const db = {
    promise: () => ({ getConnection: async () => connection }),
    query(sql, params, callback) {
      if (/SELECT/.test(sql)) {
        listSql = sql;
        state.listParams = Array.from(params);
        callback(null, [{ order_id: 31, order_number: "AM-000031", ...currentOrder,
          paymongo_payment_method: "gcash", total_amount: "500.00", subtotal: "350.00",
          shipping_fee: "150.00" }]);
      } else callback(null, { affectedRows: 1 });
    },
  };
  const router = {
    get(path, ...handlers) { if (path === "/") listHandler = handlers.at(-1); },
    put(path, ...handlers) { statusHandler = handlers.at(-1); },
  };
  const multer = () => ({ array: () => () => {} });
  multer.memoryStorage = () => ({});
  vm.runInNewContext(source, {
    express: { Router: () => router }, multer, db, authenticateSeller() {},
    deleteParcelPhoto: async () => {},
    saveParcelPhoto: async () => { state.uploads++; return "test-parcel.webp"; },
    isB2Configured: () => false, normalizeTrackingUrl, validateParcelPhotoCount,
    attachOrderReturns: async (_executor, orders) => orders,
    console: { error() {} },
  });
  const response = {
    statusCode: 200, body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    set() {},
  };
  return {
    state, response,
    async update(status, extra = {}) {
      await statusHandler({ params: { id: "31" }, user: { student_id: extra.sellerId ?? 8 },
        body: { status, ...extra.body }, files: extra.files || [] }, response);
      return response;
    },
    async list() {
      await new Promise((resolve) => {
        const originalJson = response.json;
        response.json = function (body) {
          originalJson.call(this, body);
          resolve();
          return this;
        };
        listHandler({ user: { student_id: 8 } }, response);
      });
      return { response, sql: listSql };
    },
  };
}

for (const [status, next] of [["Pending", "Confirmed"], ["Confirmed", "Packed"],
  ["Packed", "Shipped"], ["Shipped", "Delivered"]]) {
  test(`seller cannot ${next} unpaid PayMongo, even bypassing the UI`, async () => {
    const route = setup({ status });
    const res = await route.update(next, { files: [{ mimetype: "image/webp" }] });
    assert.equal(res.statusCode, 409);
    assert.match(res.body.message, /payment/i);
    assert.equal(route.state.updates, 0);
    assert.equal(route.state.uploads, 0);
    assert.equal(route.state.commits, 0);
    assert.equal(route.state.rollbacks, 1);
    assert.equal(route.state.released, true);
  });
}

for (const payment_status of ["Failed", "Expired", "Refunded"]) {
  test(`seller cannot process ${payment_status} PayMongo`, async () => {
    const route = setup({ payment_status });
    assert.equal((await route.update("Confirmed")).statusCode, 409);
    assert.equal(route.state.updates, 0);
  });
}

test("seller can process Paid PayMongo under normal transitions", async () => {
  const route = setup({ payment_status: "Paid" });
  assert.equal((await route.update("Confirmed")).statusCode, 200);
  assert.equal(route.state.updates, 1);
  assert.equal(route.state.commits, 1);
  assert.equal(route.response.body.paymentStatus, "Paid");
});

for (const [status, next] of [["Confirmed", "Packed"], ["Packed", "Shipped"], ["Shipped", "Delivered"]]) {
  test(`seller can ${next} a Paid PayMongo order`, async () => {
    const route = setup({ status, payment_status: "Paid", parcel_photos: ["parcel.webp"] });
    const extra = next === "Packed"
      ? { files: [{ mimetype: "image/webp", buffer: Buffer.from("photo") }] }
      : next === "Shipped"
        ? { body: { tracking_url: "https://tracking.example/parcel/123" } }
      : {};
    assert.equal((await route.update(next, extra)).statusCode, 200);
    assert.equal(route.state.commits, 1);
    assert.equal(route.response.body.paymentStatus, "Paid");
  });
}

test("seller cannot cancel a Paid online order without refund handling", async () => {
  const route = setup({ payment_status: "Paid" });
  assert.equal((await route.update("Cancelled")).statusCode, 409);
  assert.match(route.response.body.message, /refund/i);
  assert.equal(route.state.updates, 0);
});

test("seller cannot cancel an unpaid checkout while its PayMongo session may remain payable", async () => {
  const route = setup();
  assert.equal((await route.update("Cancelled")).statusCode, 409);
  assert.match(route.response.body.message, /buyer.*cancel.*payment session.*expired/i);
  assert.equal(route.state.updates, 0);
  assert.equal(route.state.commits, 0);
});

test("seller may still cancel a Pending COD order", async () => {
  const route = setup({ payment_method: "cod" });
  assert.equal((await route.update("Cancelled")).statusCode, 200);
  assert.equal(route.response.body.paymentStatus, "Pending");
});

test("COD can be confirmed before collection", async () => {
  const route = setup({ payment_method: "cod" });
  assert.equal((await route.update("Confirmed")).statusCode, 200);
  assert.equal(route.response.body.paymentStatus, "Pending");
});

test("COD delivery atomically records collected payment with its timestamp", async () => {
  const route = setup({ status: "Shipped", payment_method: "cod", parcel_photos: ["parcel.webp"] });
  assert.equal((await route.update("Delivered")).statusCode, 200);
  assert.equal(route.response.body.paymentStatus, "Paid");
  assert.match(route.state.updateSql, /payment_status = CASE[\s\S]*payment_method = 'cod' AND \? = 'Delivered' THEN 'Paid'/);
  assert.match(route.state.updateSql, /paid_at = CASE[\s\S]*COALESCE\(paid_at, NOW\(\)\)/);
  assert.match(route.state.updateSql, /delivered_at = CASE\s+WHEN \? = 'Delivered' THEN COALESCE\(delivered_at, NOW\(\)\)\s+ELSE delivered_at/);
  assert.deepEqual(route.state.updateParams.slice(4, 6), ["Delivered", "Delivered"]);
  assert.equal(route.state.updateParams[6], "Delivered");
  assert.equal(route.state.commits, 1);
});

test("online delivery records the first delivery time without replacing an existing timestamp", async () => {
  const trackingUrl = "https://track.example.com/parcel/keep-after-delivery";
  const route = setup({
    status: "Shipped", payment_status: "Paid", delivered_at: "2026-10-01 09:00:00",
    tracking_url: trackingUrl,
  });
  assert.equal((await route.update("Delivered", { body: { delivered_at: "2099-01-01 00:00:00" } })).statusCode, 200);
  assert.match(route.state.updateSql, /THEN COALESCE\(delivered_at, NOW\(\)\)/);
  assert.equal(route.state.updateParams[6], "Delivered");
  assert.ok(!route.state.updateParams.includes("2099-01-01 00:00:00"));
  assert.equal(route.state.updateParams[2], trackingUrl);
  assert.equal(route.response.body.trackingUrl, trackingUrl);
});

test("seller list exposes payment state and channel for sales/UI decisions", async () => {
  const trackingUrl = "https://track.example.com/parcel/123";
  const route = setup({ payment_status: "Paid", tracking_url: trackingUrl });
  const { response, sql } = await route.list();
  assert.match(sql, /WHERE o\.seller_id = \?/);
  assert.match(sql, /AND \(o\.payment_method <> 'paymongo' OR o\.payment_status IN \('Paid', 'Refunded'\)\)/);
  assert.match(sql, /o\.tracking_url/);
  assert.deepEqual(route.state.listParams, [8]);
  assert.equal(response.body[0].payment, "paymongo");
  assert.equal(response.body[0].paymentStatus, "Paid");
  assert.equal(response.body[0].paymentChannel, "gcash");
  assert.equal(response.body[0].trackingUrl, trackingUrl);
});

test("seller cannot skip fulfillment steps even after online payment", async () => {
  const route = setup({ payment_status: "Paid" });
  assert.equal((await route.update("Shipped")).statusCode, 400);
  assert.match(route.response.body.message, /Pending to Shipped/);
  assert.equal(route.state.updates, 0);
});

test("a paid order still needs parcel photos before it can be packed", async () => {
  const route = setup({ status: "Confirmed", payment_status: "Paid" });
  assert.equal((await route.update("Packed")).statusCode, 400);
  assert.match(route.response.body.message, /parcel photos/);
  assert.equal(route.state.updates, 0);
});

test("a paid packed order without stored photos cannot be shipped", async () => {
  const route = setup({ status: "Packed", payment_status: "Paid" });
  assert.equal((await route.update("Shipped")).statusCode, 409);
  assert.match(route.response.body.message, /parcel photos/);
  assert.equal(route.state.updates, 0);
});

test("seller can attach the carrier tracking link while shipping a paid order", async () => {
  const route = setup({ status: "Packed", payment_status: "Paid", parcel_photos: ["parcel.webp"] });
  const link = "https://share.lalamove.com/order?id=abc%2F123";
  assert.equal((await route.update("Shipped", { body: { tracking_url: link } })).statusCode, 200);
  assert.equal(route.response.body.trackingUrl, link);
  assert.equal(route.state.updateParams[2], link);
  assert.equal(route.state.commits, 1);
});

test("a different seller cannot modify the order tracking URL", async () => {
  const route = setup({ status: "Packed", payment_status: "Paid", parcel_photos: ["parcel.webp"] });
  assert.equal((await route.update("Shipped", {
    sellerId: 99,
    body: { tracking_url: "https://track.example.com/parcel/123" },
  })).statusCode, 404);
  assert.equal(route.state.updates, 0);
  assert.equal(route.state.commits, 0);
  assert.equal(route.state.rollbacks, 1);
});

test("seller must provide a valid HTTPS tracking URL before shipping", async () => {
  for (const link of ["", "hello", "javascript(1)", "javascript:alert(1)", "file:///test", "ftp://example.com", "http://tracking.example/123"]) {
    const route = setup({ status: "Packed", payment_status: "Paid", parcel_photos: ["parcel.webp"] });
    assert.equal((await route.update("Shipped", { body: { tracking_url: link } })).statusCode, 400, link);
    assert.equal(route.state.updates, 0, link);
    assert.equal(route.state.commits, 0, link);
  }
});
