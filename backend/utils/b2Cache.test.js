import assert from "node:assert/strict";
import { once } from "node:events";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import test from "node:test";
import express from "express";

const source = fs.readFileSync(new URL("../server.js", import.meta.url), "utf8");
// Exercise the actual cache middleware without starting schema setup or B2.
const cacheSource = source.slice(source.indexOf("const B2_CACHE_ROOT"), source.indexOf("// Artwork images"));
const errorSource = source.slice(source.indexOf("// Global error handler"), source.indexOf("// Start server"));

async function fixture(t, download) {
  const tempRoot = path.resolve(os.tmpdir());
  const directory = await fs.promises.mkdtemp(path.join(tempRoot, "art-match-cache-test-"));
  const build = new Function("fs", "path", "__dirname", "getFromB2", "console",
    `${cacheSource}; return { serveB2Cached, getCachePath };`);
  const { serveB2Cached, getCachePath } = build(fs, path, directory, download, { log() {}, warn() {}, error() {} });
  const localFolder = path.join(directory, "uploads");
  await fs.promises.mkdir(localFolder);
  const app = express();
  app.get("/images/:filename", serveB2Cached({ keyPrefix: "app-uploads/test", localFolder, label: "Test" }));
  app.get("/missing-sendfile", (req, res) => res.sendFile(path.join(directory, "missing.png")));
  app.use((req, res) => res.status(404).json({ message: "Route not found" }));
  new Function("app", errorSource)(app);
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(async () => {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    // Verify the recursive cleanup stays within this test's temporary root.
    const relative = path.relative(tempRoot, path.resolve(directory));
    assert.ok(relative.startsWith("art-match-cache-test-") && !relative.includes(path.sep) && !path.isAbsolute(relative));
    await fs.promises.rm(directory, { recursive: true, force: true });
  });
  const get = (url) => fetch(`http://127.0.0.1:${server.address().port}${url}`);
  const cacheFile = (name) => getCachePath(`app-uploads/test/${name}`);
  const write = async (file, bytes) => {
    await fs.promises.mkdir(path.dirname(file), { recursive: true });
    await fs.promises.writeFile(file, bytes);
  };
  return { app, get, cacheFile, localFolder, write };
}

test("cached images under .cache are served with correct bytes without B2 requests", async (t) => {
  const { get, cacheFile, write } = await fixture(t, () => { throw new Error("B2 must not be called"); });
  const bytes = Buffer.from("cached image bytes");
  await write(cacheFile("cached.png"), bytes);
  const response = await get("/images/cached.png");
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-artmatch-storage"), "cache");
  assert.equal(response.headers.get("content-type"), "image/png");
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes);
});

test("B2 images are downloaded once and later requests read the cache", async (t) => {
  let downloads = 0;
  const bytes = Buffer.from("B2 image bytes");
  const { get } = await fixture(t, async () => {
    downloads += 1;
    return { Body: Readable.from([bytes]), ContentType: "image/png" };
  });
  for (const storage of ["b2", "cache"]) {
    const response = await get("/images/cloud.png");
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("x-artmatch-storage"), storage);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes);
  }
  assert.equal(downloads, 1);
});

test("old local images also populate a working cache", async (t) => {
  const { get, localFolder, write } = await fixture(t, () => { throw new Error("B2 must not be called"); });
  await write(path.join(localFolder, "local.png"), "local bytes");
  for (const storage of ["local", "cache"]) {
    const response = await get("/images/local.png");
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("x-artmatch-storage"), storage);
    assert.equal(await response.text(), "local bytes");
  }
});

test("a cache file removed before sendFile falls back to B2", async (t) => {
  const { app, get, cacheFile, write } = await fixture(t, async () => ({
    Body: Readable.from(["recovered bytes"]), ContentType: "image/png",
  }));
  await write(cacheFile("removed.png"), "old bytes");
  const original = app.response.sendFile;
  app.response.sendFile = function (file, options, callback) {
    if (file.endsWith("removed.png")) {
      fs.rmSync(cacheFile("removed.png"), { force: true });
    }
    return original.call(this, file, options, callback);
  };
  const response = await get("/images/removed.png");
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-artmatch-storage"), "b2");
  assert.equal(await response.text(), "recovered bytes");
});

test("missing and hidden files stay 404, including sendFile errors", async (t) => {
  const { get, cacheFile, write } = await fixture(t, async () => {
    throw Object.assign(new Error("Not found"), { name: "NoSuchKey", $metadata: { httpStatusCode: 404 } });
  });
  await write(cacheFile(".hidden.png"), "hidden bytes");
  for (const url of ["/images/missing.png", "/images/.hidden.png", "/missing-sendfile"]) {
    const response = await get(url);
    assert.equal(response.status, 404);
    assert.ok(!(await response.text()).includes("hidden bytes"));
  }
});
