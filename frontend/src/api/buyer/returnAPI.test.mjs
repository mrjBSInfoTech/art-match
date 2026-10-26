import assert from "node:assert/strict";
import test from "node:test";
import axios from "axios";

test("return API authenticates the buyer, keeps selected order items, and preserves server rejection details", async () => {
  const previousAdapter = axios.defaults.adapter;
  const previousStorage = globalThis.localStorage;
  const requests = [];
  let rejection;
  const dto = { return_request_id: 8, order_id: 31, conversation_id: 19, status: "Requested" };
  axios.defaults.adapter = async (config) => {
    requests.push(config);
    if (rejection) throw rejection;
    return { data: dto, status: 200, statusText: "OK", headers: {}, config };
  };
  globalThis.localStorage = { getItem: (key) => key === "buyer_token" ? "buyer-test-token" : null };
  try {
    const { createReturnRequest, fetchReturnRequests, cancelReturnRequest, shipReturnRequest } = await import("./returnAPI.js");
    const payload = { order_id: 31, order_item_ids: [45, 47], reason: "Damaged artwork", details: "The artwork arrived with a torn canvas." };
    assert.deepEqual(await createReturnRequest(payload), dto);
    assert.deepEqual(JSON.parse(requests.at(-1).data), payload);
    assert.equal(requests.at(-1).baseURL, "http://localhost:5000/api/buyer/returns");
    assert.equal(requests.at(-1).headers.Authorization, "Bearer buyer-test-token");

    const controller = new AbortController();
    await fetchReturnRequests(19, { signal: controller.signal });
    assert.deepEqual(requests.at(-1).params, { conversation_id: 19 });
    assert.equal(requests.at(-1).signal, controller.signal);
    assert.equal(requests.at(-1).headers["Cache-Control"], "no-cache");
    await cancelReturnRequest(8);
    assert.equal(requests.at(-1).method, "put");
    assert.equal(requests.at(-1).url, "/8/cancel");
    await shipReturnRequest(8, { return_tracking_url: "https://tracking.example/return/8" });
    assert.equal(requests.at(-1).url, "/8/shipped");
    assert.deepEqual(JSON.parse(requests.at(-1).data), { return_tracking_url: "https://tracking.example/return/8" });

    rejection = { response: { status: 409, data: { message: "The 7-day return period for this order has expired." } } };
    await assert.rejects(createReturnRequest(payload), (error) => error.status === 409 && /7-day.*expired/.test(error.message));
    rejection = undefined;
    controller.abort();
    await assert.rejects(fetchReturnRequests(19, { signal: controller.signal }), (error) => axios.isCancel(error));
  } finally {
    axios.defaults.adapter = previousAdapter;
    if (previousStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = previousStorage;
  }
});
