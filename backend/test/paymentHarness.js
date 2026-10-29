import fs from "node:fs";
import vm from "node:vm";
import { createHmac, timingSafeEqual, randomUUID } from "node:crypto";
import * as paymongo from "../utils/paymongo.js";
import * as availability from "../utils/artworkAvailability.js";
import * as paymentSplit from "../utils/paymentSplit.js";
import * as paymongoReconciliation from "../utils/paymongoReconciliation.js";
import * as checkoutVouchers from "../utils/checkoutVouchers.js";

// Execute the real route handlers with isolated dependencies: no TCP, MySQL,
// environment credentials, or PayMongo calls are used by these tests.
export function loadPaymentRoute(relativePath, dependencies = {}) {
  const routes = new Map();
  const router = {};
  for (const method of ["get", "post", "put", "patch", "delete"]) {
    router[method] = (path, ...handlers) => routes.set(`${method}:${path}`, handlers.at(-1));
  }
  const source = fs.readFileSync(new URL(relativePath, import.meta.url), "utf8")
    .replace(/^import[\s\S]*?;\s*/gm, "")
    .replace(/export default router;?/, "");
  const context = {
    ...paymongo, ...availability, ...paymentSplit, ...paymongoReconciliation, ...checkoutVouchers, createHmac, timingSafeEqual, randomUUID,
    Buffer, URL, URLSearchParams, Date, setTimeout, clearTimeout,
    express: { Router: () => router },
    authenticateBuyer: () => {},
    attachOrderReturns: async (_executor, orders) => orders,
    getCommissionRate: () => 0,
    getRecommendationSessionIdFromRequest: () => "test-browser-session",
    logSellerAudit: async () => {},
    payoutService: {
      list: async () => ({ currency: "PHP", totals: {}, orders: [] }),
      handleTransferEvent: async () => false,
    },
    readParcelPhoto: () => { throw new Error("Unexpected parcel photo access"); },
    process: { env: {
      PAYMONGO_SECRET_KEY: "sk_test_isolated_fixture",
      PAYMONGO_WEBHOOK_SECRET: "isolated-webhook-fixture",
      FRONTEND_URL: "http://localhost:5173",
    } },
    console: { log() {}, warn() {}, error() {} },
    ...dependencies,
  };
  vm.runInNewContext(source, context, { filename: relativePath });
  return routes;
}

export async function invoke(routes, method, path, overrides = {}) {
  const handler = routes.get(`${method}:${path}`);
  if (!handler) throw new Error(`Missing route ${method}:${path}`);
  let status = 200;
  let body;
  const request = {
    user: { customer_id: 1 }, body: {}, params: {}, query: {},
    get: () => null, ...overrides,
  };
  const response = {
    status(value) { status = value; return this; },
    json(value) { body = value; return this; },
    set() { return this; },
  };
  await handler(request, response);
  return { status, body: JSON.parse(JSON.stringify(body ?? null)) };
}

export function signedEvent(overrides = {}, options = {}) {
  const session = {
    id: "cs_test_checkout", type: "checkout_session",
    attributes: {
      reference_number: "AM-fixture-group", livemode: false,
      payments: [{ id: "pay_test_paid", type: "payment", attributes: {
        status: "paid", amount: 330000, currency: "PHP", livemode: false,
        source: { type: "card" }, paid_at: 1792872000,
      } }],
    },
  };
  overrides.mutate?.(session);
  const body = { data: { id: "evt_test_paid", type: "event", attributes: {
    type: overrides.eventType || "checkout_session.payment.paid",
    livemode: false, data: session,
  } } };
  if (options.live) {
    body.data.attributes.livemode = true;
    session.attributes.livemode = true;
    session.attributes.payments[0].attributes.livemode = true;
  }
  const rawBody = Buffer.from(JSON.stringify(body));
  const timestamp = String(options.timestamp ?? Math.floor(Date.now() / 1000));
  const digest = createHmac("sha256", "isolated-webhook-fixture")
    .update(`${timestamp}.${rawBody.toString("utf8")}`).digest("hex");
  const signature = `t=${timestamp},te=${options.live ? "" : digest},li=${options.live ? digest : ""}`;
  return { body, rawBody, get: () => options.invalid ? signature.replace(digest, `${digest}x`) : signature };
}

export function databaseFixture(overrides = {}) {
  let state = {
    orders: [
      { order_id: 101, customer_id: 1, seller_id: 5, total_amount: "1150.00", payment_method: "paymongo", payment_status: "Pending", payment_reference: "AM-fixture-group", paymongo_checkout_session_id: "cs_test_checkout", status: "Pending" },
      { order_id: 102, customer_id: 1, seller_id: 7, total_amount: "2150.00", payment_method: "paymongo", payment_status: "Pending", payment_reference: "AM-fixture-group", paymongo_checkout_session_id: "cs_test_checkout", status: "Pending" },
    ],
    orderItems: [{ order_id: 101, artwork_id: 20, quantity: 1 }, { order_id: 102, artwork_id: 21, quantity: 1 }],
    carts: [{ add_to_id: 1, customer_id: 1, total_price: 3500 }, { add_to_id: 2, customer_id: 2, total_price: 1000 }],
    cartItems: [{ add_to_id: 1, artwork_id: 20 }, { add_to_id: 1, artwork_id: 21 }, { add_to_id: 1, artwork_id: 30 }, { add_to_id: 2, artwork_id: 20 }],
    artworks: [
      { artwork_id: 20, student_id: 5, title: "Artwork A", price: "1000.00", artist_name: "Seller A", stock_available: null, status: "Available", is_verified: 1, is_sold: 0 },
      { artwork_id: 21, student_id: 7, title: "Artwork B", price: "2000.00", artist_name: "Seller B", stock_available: null, status: "Available", is_verified: 1, is_sold: 0 },
      { artwork_id: 30, student_id: 5, title: "Added in another tab", price: "500.00", stock_available: null, status: "Available", is_verified: 1, is_sold: 0 },
    ],
    interactions: [],
    vouchers: [],
    voucherListings: [],
    ...overrides,
  };
  state.paymentSplits ??= state.orders.map(order => ({
    order_id: order.order_id, seller_id: order.seller_id,
    payment_reference: order.payment_reference, gross_amount: Number(order.total_amount),
    commission_rate: 0, commission_amount: 0, processing_fee_amount: 0,
    net_amount: Number(order.total_amount), payout_status: "Held", eligible_at: null,
  }));
  let snapshot;
  const calls = [];
  let fail;
  const copy = value => structuredClone(value);
  const connection = {
    async beginTransaction() { calls.push({ type: "begin" }); snapshot = copy(state); },
    async commit() { calls.push({ type: "commit" }); snapshot = undefined; },
    async rollback() { calls.push({ type: "rollback" }); if (snapshot) state = snapshot; snapshot = undefined; },
    release() { calls.push({ type: "release" }); },
    async query(sql, params = []) {
      sql = sql.replace(/\s+/g, " ").trim();
      calls.push({ type: "query", sql, params: copy(params) });
      if (fail?.(sql, params)) throw new Error("Injected database failure");
      let rows;
      if (/^SELECT/i.test(sql)) {
        if (/FROM seller_voucher_artwork/i.test(sql)) {
          rows = state.voucherListings.filter(row => Number(row.voucher_id) === Number(params[0]));
        } else if (/FROM seller_voucher/i.test(sql)) {
          rows = state.vouchers.filter(row => row.code.toUpperCase() === params[0]);
        } else if (/FROM add_cart ac JOIN cart_item/i.test(sql)) {
          const cartIds = state.carts.filter(cart => cart.customer_id === Number(params[0])).map(cart => cart.add_to_id);
          rows = state.cartItems.filter(item => cartIds.includes(item.add_to_id) && params[1].includes(item.artwork_id))
            .map(item => ({ ...state.artworks.find(art => art.artwork_id === item.artwork_id), sold_quantity: 0 }));
        } else if (/FROM add_cart/i.test(sql)) {
          rows = state.carts.filter(cart => cart.customer_id === Number(params[0]));
        } else if (/FROM cart_item ci/i.test(sql)) {
          rows = state.cartItems.filter(item => item.add_to_id === Number(params[0]))
            .filter(item => !/ci\.artwork_id IN \(\?\)/i.test(sql) || params[1].includes(item.artwork_id))
            .map(item => state.artworks.find(art => art.artwork_id === item.artwork_id)).filter(Boolean);
        } else if (/FROM address/i.test(sql)) {
          rows = Number(params[0]) === 4 && Number(params[1]) === 1 ? [{ street_name: "1 Test St", barangay: "Test", city: "Test City", province: "Test Province", region: "Test Region", postal_code: "1000" }] : [];
        } else if (/FROM customer/i.test(sql)) {
          rows = [{ first_name: "Test", last_name: "Buyer", email: "buyer@example.invalid" }];
        } else if (/FROM marketplace_order_item oi/i.test(sql)) {
          if (/JOIN artwork a/i.test(sql)) {
            const orderIds = params.flat().map(Number);
            rows = state.orderItems.filter(item => orderIds.includes(item.order_id)).map(item => {
              const art = state.artworks.find(art => art.artwork_id === item.artwork_id) || {};
              const sold = state.orderItems.filter(other => other.artwork_id === item.artwork_id).reduce((total, other) => {
                const order = state.orders.find(order => order.order_id === other.order_id);
                return total + (order && order.status !== "Cancelled" && (order.payment_method === "cod" || (order.payment_method === "paymongo" && order.payment_status === "Paid")) ? Number(other.quantity) : 0);
              }, 0);
              return { ...art, ...item, sold_quantity: sold };
            });
          } else {
            const artworkIds = (Array.isArray(params[0]) ? params[0] : params).map(String);
            const excludedOrders = /oi\.order_id NOT IN \(\?\)/i.test(sql) ? new Set((params[1] || []).map(Number)) : new Set();
            rows = state.orderItems.filter(item => artworkIds.includes(String(item.artwork_id)) && !excludedOrders.has(item.order_id))
              .filter(item => {
                const order = state.orders.find(order => order.order_id === item.order_id);
                return order && order.status !== "Cancelled" && (order.payment_method === "cod" || (order.payment_method === "paymongo" && order.payment_status === "Paid"));
              });
          }
        } else if (/FROM marketplace_order(?: o)?\b/i.test(sql)) {
          rows = state.orders;
          if (/JOIN marketplace_order_item/i.test(sql)) {
            if (/LEFT JOIN marketplace_order_item i /i.test(sql)) {
              rows = rows.filter(order => order.customer_id === Number(params[0]));
              if (/o\.payment_reference = \?/i.test(sql)) rows = rows.filter(order => order.payment_reference === params[1]);
              if (/AND o\.payment_method = 'paymongo'/i.test(sql)) rows = rows.filter(order => order.payment_method === "paymongo");
              if (/o\.payment_method <> 'paymongo' OR o\.payment_status IN \('Paid', 'Refunded'\)/i.test(sql)) {
                rows = rows.filter(order => order.payment_method !== "paymongo" || ["Paid", "Refunded"].includes(order.payment_status));
              }
              rows = rows.flatMap(order => {
                const items = state.orderItems.filter(item => item.order_id === order.order_id);
                return items.length ? items.map((item, index) => ({ ...order, ...item,
                  order_item_id: item.order_item_id || index + 1,
                  order_number: `AM-${String(order.order_id).padStart(6, "0")}`,
                })) : [order];
              });
              return [copy(rows), []];
            }
            const itemIds = params.find(Array.isArray);
            const ids = new Set((itemIds || params).flat().map(Number));
            const matchArtwork = /(?:oi|i)\.artwork_id IN/i.test(sql);
            rows = state.orderItems.filter(item => ids.has(matchArtwork ? item.artwork_id : item.order_id)).flatMap(item => {
              const order = state.orders.find(order => order.order_id === item.order_id);
              if (!order || (/status <> 'Cancelled'/i.test(sql) && order.status === "Cancelled")) return [];
              if (matchArtwork && /payment_status = 'Pending'/i.test(sql) && order.payment_status !== "Pending") return [];
              if (matchArtwork && /payment_status IN \('Pending', 'Failed'\)/i.test(sql) && !["Pending", "Failed"].includes(order.payment_status)) return [];
              if (matchArtwork && /payment_method = 'paymongo'/i.test(sql) && order.payment_method !== "paymongo") return [];
              if (matchArtwork && /customer_id = \?/i.test(sql) && order.customer_id !== Number(params[0])) return [];
              return [{ ...order, ...item }];
            });
          } else if (/payment_reference = \?/i.test(sql)) {
            const reference = params.find(value => typeof value === "string" && value.startsWith("AM-"));
            if (reference) rows = rows.filter(order => order.payment_reference === reference);
            if (/paymongo_checkout_session_id = \?/i.test(sql)) rows = rows.filter(order => order.paymongo_checkout_session_id === params.find(value => typeof value === "string" && value.startsWith("cs_")));
            if (/customer_id = \?/i.test(sql)) rows = rows.filter(order => order.customer_id === 1);
          } else if (/order_id = \?/i.test(sql)) {
            rows = rows.filter(order => order.order_id === Number(params[0]) && order.customer_id === Number(params[1] ?? 1));
          } else if (/payment_method = 'paymongo'/i.test(sql)) {
            rows = rows.filter(order => order.payment_method === "paymongo" && order.customer_id === Number(params[0]) && order.payment_status === "Pending" && order.status === "Pending");
          }
        } else throw new Error(`Unhandled test SELECT: ${sql}`);
        return [copy(rows), []];
      }
      if (/^INSERT INTO marketplace_order\s*\(/i.test(sql)) {
        const columns = sql.match(/^INSERT INTO marketplace_order\s*\(([^)]+)\)/i)[1].split(",").map(value => value.trim());
        const order = Object.fromEntries(columns.map((column, index) => [column, params[index]]));
        order.order_id = Math.max(100, ...state.orders.map(item => item.order_id)) + 1;
        order.status ??= "Pending";
        state.orders.push(order);
        return [{ insertId: order.order_id, affectedRows: 1 }];
      }
      if (/^INSERT INTO marketplace_order_item/i.test(sql)) {
        state.orderItems.push({ order_id: params[0], artwork_id: params[1], title: params[2], unit_price: params[5], original_unit_price: params[6], quantity: 1 });
        return [{ insertId: state.orderItems.length, affectedRows: 1 }];
      }
      if (/^INSERT INTO seller_payment_split/i.test(sql)) {
        const columns = ["order_id", "seller_id", "payment_reference", "gross_amount", "commission_rate",
          "commission_amount", "processing_fee_amount", "net_amount", "payout_status"];
        const split = Object.fromEntries(columns.map((column, index) => [column, params[index]]));
        const existing = state.paymentSplits.find(row => row.order_id === split.order_id);
        if (existing) existing.payment_reference = split.payment_reference;
        else state.paymentSplits.push(split);
        return [{ insertId: state.paymentSplits.length, affectedRows: 1 }];
      }
      if (/^UPDATE seller_payment_split s/i.test(sql)) {
        const ids = new Set(params[0].map(Number));
        const selected = state.paymentSplits.filter(split => ids.has(Number(split.order_id)) && split.payout_status === "Held");
        for (const split of selected) {
          split.payout_status = "Held";
          split.eligible_at = null;
          split.payment_reference ??= state.orders.find(order => order.order_id === split.order_id)?.payment_reference;
        }
        return [{ affectedRows: selected.length }];
      }
      if (/^UPDATE marketplace_order/i.test(sql)) {
        const assignmentSql = sql.split(/\bSET\b/i)[1].split(/\bWHERE\b/i)[0];
        let parameterIndex = 0;
        const changes = {};
        for (const [, column, expression] of assignmentSql.matchAll(/([a-z_]+)\s*=\s*(\?|'[^']*'|NULL|NOW\(\))/gi)) {
          changes[column] = expression === "?" ? params[parameterIndex++] : expression === "NULL" ? null : /^NOW/i.test(expression) ? new Date() : expression.slice(1, -1);
        }
        const whereParams = params.slice(parameterIndex);
        let selected = state.orders;
        if (/order_id IN \(\?\)/i.test(sql)) selected = selected.filter(order => whereParams.flat().map(Number).includes(order.order_id));
        else if (/order_id = \?/i.test(sql)) selected = selected.filter(order => order.order_id === Number(whereParams[0]) && order.customer_id === Number(whereParams[1] ?? 1));
        else if (/payment_reference = \?/i.test(sql)) selected = selected.filter(order => order.payment_reference === whereParams.find(value => typeof value === "string" && value.startsWith("AM-")));
        if (/AND status = 'Pending'/i.test(sql)) selected = selected.filter(order => order.status === "Pending");
        if (/payment_status <> 'Paid'/i.test(sql)) selected = selected.filter(order => order.payment_status !== "Paid");
        selected.forEach(order => Object.assign(order, changes));
        return [{ affectedRows: selected.length }];
      }
      if (/^DELETE (?:ci|FROM cart_item)/i.test(sql)) {
        const owner = Number(params[0]);
        const artworkIds = new Set(params.slice(1).flat().map(Number));
        const cartIds = /JOIN add_cart/i.test(sql) ? state.carts.filter(cart => cart.customer_id === owner).map(cart => cart.add_to_id) : [owner];
        const before = state.cartItems.length;
        state.cartItems = state.cartItems.filter(item => !(cartIds.includes(item.add_to_id) && artworkIds.has(item.artwork_id)));
        return [{ affectedRows: before - state.cartItems.length }];
      }
      if (/^UPDATE add_cart/i.test(sql)) {
        for (const cart of state.carts) {
          if (/ac.customer_id = \?/i.test(sql) ? cart.customer_id !== Number(params[0]) : cart.add_to_id !== Number(params[0])) continue;
          cart.total_price = state.cartItems.filter(item => item.add_to_id === cart.add_to_id).reduce((total, item) => total + Number(state.artworks.find(art => art.artwork_id === item.artwork_id)?.price || 0), 0);
        }
        return [{ affectedRows: 1 }];
      }
      throw new Error(`Unhandled test SQL: ${sql}`);
    },
  };
  return {
    db: { promise: () => ({ getConnection: async () => { calls.push({ type: "connect" }); return connection; }, query: (...args) => connection.query(...args) }) },
    connection, calls, get state() { return state; }, setFail(predicate) { fail = predicate; },
    async recordRecommendationInteraction(value) {
      const { executor, ...interaction } = value;
      if (executor !== connection) throw new Error("Purchase was not transaction-scoped");
      state.interactions.push(interaction);
    },
  };
}
