import test from "node:test";
import assert from "node:assert/strict";
import { createArtworkImageLoader } from "./artworkImageLoader.js";

const signed = () => Response.json({ url: "/api/artwork-images/test.webp?signature=test" });
const picture = () => new Response(new Blob(["test image"], { type: "image/webp" }), { headers: { "Content-Type": "image/webp" } });
const args = { filename: "test.webp", variant: "thumb" };

test("duplicate cards and remounts share one signed request and one image download", async () => {
  const calls = [];
  const load = createArtworkImageLoader({ fetcher: async url => { calls.push(String(url)); return String(url).includes("artwork-image-url") ? signed() : picture(); } });
  const [first, second] = await Promise.all([load(args), load(args)]);
  assert.equal(first, second);
  assert.equal(await load(args), first);
  assert.equal(calls.length, 2);
});

test("watermarked blobs are isolated by buyer identity and preview size", async () => {
  const calls = [];
  const load = createArtworkImageLoader({ fetcher: async (url, options) => { calls.push({ url: String(url), options }); return String(url).includes("artwork-image-url") ? signed() : picture(); } });
  await load(args);
  await load({ ...args, token: "buyer-one" });
  await load({ ...args, token: "buyer-two" });
  await load({ ...args, variant: "web", token: "buyer-one" });
  assert.equal(calls.length, 8);
  assert.equal(calls[0].options.headers.Authorization, undefined);
  assert.equal(calls[2].options.headers.Authorization, "Bearer buyer-one");
  assert.equal(calls[4].options.headers.Authorization, "Bearer buyer-two");
  assert.match(calls[6].url, /variant=web/);
});

for (const limitedStage of ["sign", "image"]) {
  test(`429 during ${limitedStage} waits for Retry-After and recovers without a permanent fallback`, async () => {
    let clock = 0, limited = false, calls = 0;
    const waits = [];
    const load = createArtworkImageLoader({ now: () => clock, wait: async ms => { waits.push(ms); clock += ms; },
      fetcher: async url => {
        calls++;
        const isSign = String(url).includes("artwork-image-url");
        if (!limited && isSign === (limitedStage === "sign")) {
          limited = true;
          return new Response("slow down", { status: 429, headers: { "Retry-After": "2" } });
        }
        return isSign ? signed() : picture();
      },
    });
    assert.equal((await load(args)).type, "image/webp");
    assert.equal(calls, 3);
    assert.deepEqual(waits, [2000]);
  });
}

test("missing images are not retried repeatedly or cached as successes", async () => {
  let missing = true, calls = 0;
  const load = createArtworkImageLoader({ fetcher: async url => {
    calls++;
    if (missing) return new Response("missing", { status: 404 });
    return String(url).includes("artwork-image-url") ? signed() : picture();
  } });
  await assert.rejects(load(args), /404/);
  assert.equal(calls, 1);
  missing = false;
  assert.equal((await load(args)).type, "image/webp");
  assert.equal(calls, 3);
});

test("remote signed destinations are rejected before fetching them", async () => {
  let calls = 0;
  const load = createArtworkImageLoader({ fetcher: async () => { calls++; return Response.json({ url: "https://untrusted.example/api/artwork-images/test.webp" }); } });
  await assert.rejects(load(args), /invalid signed artwork URL/);
  assert.equal(calls, 1);
});

test("concurrency and cache size stay bounded while expired entries reload", async () => {
  let clock = 0, running = 0, peak = 0, calls = 0;
  const load = createArtworkImageLoader({ concurrency: 2, cacheLimit: 1, now: () => clock,
    fetcher: async url => {
      calls++; running++; peak = Math.max(peak, running);
      await new Promise(resolve => setTimeout(resolve, 1)); running--;
      return String(url).includes("artwork-image-url") ? signed() : picture();
    },
  });
  await Promise.all(Array.from({ length: 6 }, (_, i) => load({ ...args, filename: `${i}.webp` })));
  assert.ok(peak <= 2);
  assert.equal(calls, 12);
  await load({ ...args, filename: "0.webp" });
  assert.equal(calls, 14);
  clock += 180001;
  await load({ ...args, filename: "0.webp" });
  assert.equal(calls, 16);
});

test("temporary storage/server errors retry but non-image responses are rejected", async () => {
  let calls = 0, clock = 0;
  const load = createArtworkImageLoader({ now: () => clock, wait: async ms => { clock += ms; }, fetcher: async url => {
    calls++;
    if (calls === 1) return new Response("upstream unavailable", { status: 502 });
    return String(url).includes("artwork-image-url") ? signed() : new Response("not an image", { headers: { "Content-Type": "text/html" } });
  } });
  await assert.rejects(load(args), /did not return an artwork image/);
  assert.equal(calls, 3);
  assert.equal(clock, 500);
});
