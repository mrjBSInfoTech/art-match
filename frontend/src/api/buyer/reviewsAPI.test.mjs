import test from "node:test";
import assert from "node:assert/strict";
import axios from "axios";

test("review API requests preserve eligibility, optional comments, cancellation and legacy order responses", async (context) => {
  const originalAdapter = axios.defaults.adapter;
  const originalStorage = globalThis.localStorage;
  const requests = [];
  let token = "test-buyer-token";
  let rejectRequest = false;
  axios.defaults.adapter = async (config) => {
    requests.push(config);
    if (rejectRequest) throw { response: { status: 409, data: { message: "Already reviewed" } } };
    const data = config.method === "post"
      ? { review: { reviewId: 3, orderItemId: JSON.parse(config.data).order_item_id ?? null, artworkId: 8, rating: 5, comment: null, createdAt: "2026-10-24T00:00:00Z" } }
      : config.url.endsWith("/eligibility")
        ? { can_review: true, order_item_id: null, reason: "eligible" }
        : { summary: { average_rating: 4.5, total_reviews: 2, rating_counts: { 4: 1, 5: 1 } }, reviews: [], pagination: { page: 2, limit: 5, total: 7, pages: 2 } };
    return { data, status: 200, statusText: "OK", headers: {}, config };
  };
  globalThis.localStorage = { getItem: () => token };
  try {
    const { fetchArtworkReviews, fetchArtworkReviewEligibility, submitBuyerReview } = await import("./reviewsAPI.js");
    await context.test("public pagination and authenticated eligibility use the intended routes", async () => {
      const controller = new AbortController();
      const result = await fetchArtworkReviews(8, { page: 2, limit: 5, signal: controller.signal });
      assert.equal(result.summary.total_reviews, 2);
      assert.equal(requests.at(-1).url, "/artwork/8");
      assert.deepEqual(requests.at(-1).params, { page: 2, limit: 5 });
      assert.equal(requests.at(-1).signal, controller.signal);
      const eligibility = await fetchArtworkReviewEligibility(8, { signal: controller.signal });
      assert.equal(eligibility.can_review, true);
      assert.equal(eligibility.order_item_id, null);
      assert.equal(requests.at(-1).url, "/artwork/8/eligibility");
      assert.equal(requests.at(-1).headers.Authorization, "Bearer test-buyer-token");
      token = null;
      await fetchArtworkReviews(8);
      assert.equal(requests.at(-1).headers.Authorization, undefined);
      token = "test-buyer-token";
    });
    await context.test("rating-only reviews and old Order callers keep compatible response fields", async () => {
      const response = await submitBuyerReview({ orderItemId: 42, rating: 5 });
      assert.deepEqual(JSON.parse(requests.at(-1).data), { order_item_id: 42, rating: 5, comment: "" });
      assert.equal(response.review.reviewId, 3);
      assert.equal(response.review.orderItemId, 42);
      await submitBuyerReview({ orderItemId: 42, artworkId: 8, rating: 5, comment: "  Excellent  " });
      assert.deepEqual(JSON.parse(requests.at(-1).data), { order_item_id: 42, artwork_id: 8, rating: 5, comment: "Excellent" });
    });
    await context.test("artwork discussion accepts repeated comments without an order item", async () => {
      const count = requests.length;
      for (const comment of ["First comment", "Another thought", ""]) {
        const result = await submitBuyerReview({ artworkId: 8, rating: 5, comment });
        assert.deepEqual(JSON.parse(requests.at(-1).data), { artwork_id: 8, rating: 5, comment });
        assert.equal(result.review.orderItemId, null);
      }
      assert.equal(requests.length, count + 3);
    });
    await context.test("invalid ratings and long comments never reach the request adapter", async () => {
      const count = requests.length;
      for (const rating of [0, 3.5, 6, "invalid"]) {
        await assert.rejects(submitBuyerReview({ orderItemId: 42, rating }), /rating/i);
      }
      await assert.rejects(submitBuyerReview({ orderItemId: 42, rating: 5, comment: "x".repeat(601) }), /600/);
      assert.equal(requests.length, count);
    });
    await context.test("server eligibility failures keep their status and cancelled requests stay cancelled", async () => {
      rejectRequest = true;
      await assert.rejects(submitBuyerReview({ orderItemId: 42, rating: 5 }), (error) => error.status === 409 && error.message === "Already reviewed");
      rejectRequest = false;
      const controller = new AbortController();
      controller.abort();
      const count = requests.length;
      await assert.rejects(fetchArtworkReviews(8, { signal: controller.signal }), (error) => axios.isCancel(error));
      assert.equal(requests.length, count);
    });
  } finally {
    axios.defaults.adapter = originalAdapter;
    if (originalStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = originalStorage;
  }
});
