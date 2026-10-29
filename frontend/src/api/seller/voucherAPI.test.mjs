import assert from "node:assert/strict";
import test from "node:test";
import axios from "axios";

test("voucher edits use an authenticated PUT and preserve server validation messages", async () => {
  const originalAdapter = axios.defaults.adapter;
  const originalStorage = globalThis.localStorage;
  const requests = [];
  let reject = false;
  globalThis.localStorage = { getItem: () => "fixture-seller-token" };
  axios.defaults.adapter = async (config) => {
    requests.push(config);
    if (reject) throw { response: { data: { message: "Voucher code is already active." } } };
    return { data: { voucher_id: 7, code: "UPDATED" }, status: 200, headers: {}, config };
  };
  try {
    const { updateSellerVoucher } = await import("./voucherAPI.js");
    const payload = { code: "UPDATED", discount_type: "fixed", discount_value: 100 };
    assert.equal((await updateSellerVoucher(7, payload)).voucher_id, 7);
    assert.equal(requests[0].method, "put");
    assert.equal(requests[0].url, "/7");
    assert.equal(requests[0].headers.Authorization, "Bearer fixture-seller-token");
    assert.deepEqual(JSON.parse(requests[0].data), payload);
    reject = true;
    await assert.rejects(updateSellerVoucher(7, payload), /Voucher code is already active/);
  } finally {
    axios.defaults.adapter = originalAdapter;
    if (originalStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = originalStorage;
  }
});
