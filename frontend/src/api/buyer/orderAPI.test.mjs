import test from "node:test";
import assert from "node:assert/strict";
import axios from "axios";

test("order API uses trusted server payment routes and preserves cart until online payment is confirmed", async (context) => {
  const originalAdapter = axios.defaults.adapter;
  const originalStorage = globalThis.localStorage;
  const originalWindow = globalThis.window;
  const requests = [];
  const events = [];
  let reject = false;
  axios.defaults.adapter = async (config) => {
    requests.push(config);
    if (reject) throw { response: { status: 409, data: { message: "Payment is already paid", can_resume: true, payment_reference: "AM-first" } } };
    return { data: { checkout_url: "https://checkout.test/first", payment_reference: "AM-first", orders: [] }, status: 200, statusText: "OK", headers: {}, config };
  };
  globalThis.localStorage = { getItem: (key) => key === "buyer_token" ? "test-buyer-token" : "test-session" };
  globalThis.window = { dispatchEvent: (event) => events.push(event.type) };
  try {
    const { fetchBuyerOrders, fetchBuyerPayment, fetchPaymentMethods, validateCheckoutVoucher, placeBuyerOrder, retryBuyerPayment, cancelBuyerPayment, cancelBuyerOrder } = await import("./orderAPI.js");
    await context.test("checkout sends only address and canonical method; Pending online checkout does not announce cart removal", async () => {
      await placeBuyerOrder(3, "paymongo");
      assert.equal(requests.at(-1).url, "/checkout");
      assert.deepEqual(JSON.parse(requests.at(-1).data), { address_id: 3, payment_method: "paymongo" });
      assert.equal(requests.at(-1).headers.Authorization, "Bearer test-buyer-token");
      assert.deepEqual(events, []);
      await placeBuyerOrder(3, "cod");
      assert.deepEqual(JSON.parse(requests.at(-1).data), { address_id: 3, payment_method: "cod" });
      assert.deepEqual(events, ["cart-updated"]);
      await placeBuyerOrder(3, "paymongo", [21], "card");
      assert.deepEqual(JSON.parse(requests.at(-1).data), { address_id: 3, payment_method: "paymongo", artwork_ids: [21] });
      assert.deepEqual(events, ["cart-updated"]);
    });
    await context.test("retry reuses a server-owned payment group and cancellation uses the group endpoint", async () => {
      await placeBuyerOrder(3, "paymongo", [21]);
      assert.deepEqual(JSON.parse(requests.at(-1).data), { address_id: 3, payment_method: "paymongo", artwork_ids: [21] });
      await retryBuyerPayment("AM-first");
      assert.equal(requests.at(-1).method, "post");
      assert.equal(requests.at(-1).url, "/payments/AM-first/retry");
      assert.equal(requests.at(-1).data, undefined);
      await cancelBuyerPayment("AM-first");
      assert.equal(requests.at(-1).method, "put");
      assert.equal(requests.at(-1).url, "/payments/AM-first/cancel");
      await cancelBuyerOrder(8);
      assert.equal(requests.at(-1).url, "/8/cancel");
      assert.deepEqual(events, ["cart-updated"]);
    });
    await context.test("order polling is uncached, authenticated and abortable", async () => {
      const controller = new AbortController();
      await fetchBuyerOrders({ signal: controller.signal });
      assert.equal(requests.at(-1).signal, controller.signal);
      assert.equal(requests.at(-1).headers["Cache-Control"], "no-cache");
      controller.abort();
      const count = requests.length;
      await assert.rejects(fetchBuyerOrders({ signal: controller.signal }), (error) => axios.isCancel(error));
      assert.equal(requests.length, count);
    });
    await context.test("checkout status and enabled methods use authenticated uncached read-only endpoints", async () => {
      const controller = new AbortController();
      await fetchBuyerPayment("AM-first", { signal: controller.signal });
      assert.equal(requests.at(-1).url, "/payments/AM-first");
      assert.equal(requests.at(-1).method, "get");
      assert.equal(requests.at(-1).headers.Authorization, "Bearer test-buyer-token");
      assert.equal(requests.at(-1).headers["Cache-Control"], "no-cache");
      assert.equal(requests.at(-1).signal, controller.signal);
      await fetchPaymentMethods({ signal: controller.signal });
      assert.equal(requests.at(-1).url, "/payments/methods");
      assert.equal(requests.at(-1).method, "get");
      controller.abort();
      await assert.rejects(fetchBuyerPayment("AM-first", { signal: controller.signal }), (error) => axios.isCancel(error));
      assert.deepEqual(events, ["cart-updated"]);
    });
    await context.test("server payment errors remain understandable and do not clear the cart", async () => {
      reject = true;
      await assert.rejects(cancelBuyerPayment("AM-first"), /Payment is already paid/);
      await assert.rejects(retryBuyerPayment("AM-first"), /Payment is already paid/);
      await assert.rejects(placeBuyerOrder(3, "paymongo"), (error) =>
        error.status === 409 && error.canResume === true && error.paymentReference === "AM-first");
      assert.deepEqual(events, ["cart-updated"]);
    });
    await context.test("voucher validation sends selected IDs and checkout sends the code without client discount amounts", async () => {
      reject = false;
      const controller = new AbortController();
      await validateCheckoutVoucher("ART-SAVE", [21, 22], { signal: controller.signal });
      assert.equal(requests.at(-1).url, "/vouchers/validate");
      assert.deepEqual(JSON.parse(requests.at(-1).data), { voucher_code: "ART-SAVE", artwork_ids: [21, 22] });
      assert.equal(requests.at(-1).signal, controller.signal);
      await placeBuyerOrder(3, "paymongo", [21, 22], { voucherCode: "ART-SAVE", expectedTotalCentavos: 94000, discountAmount: 9999 });
      assert.deepEqual(JSON.parse(requests.at(-1).data), {
        address_id: 3, payment_method: "paymongo", artwork_ids: [21, 22], voucher_code: "ART-SAVE", expected_total_centavos: 94000,
      });
      reject = true;
      await assert.rejects(validateCheckoutVoucher("ART-SAVE", [21]), /Payment is already paid/);
    });
  } finally {
    axios.defaults.adapter = originalAdapter;
    if (originalStorage === undefined) delete globalThis.localStorage; else globalThis.localStorage = originalStorage;
    if (originalWindow === undefined) delete globalThis.window; else globalThis.window = originalWindow;
  }
});
