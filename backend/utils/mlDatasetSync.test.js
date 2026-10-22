import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { syncMlDatasets } from "./mlDatasetSync.js";

const md5 = (value) => createHash("md5").update(value).digest("hex");
const object = (key, data = "sample") => ({ Key: key, Size: Buffer.byteLength(data), ETag: `"${md5(data)}"` });
const KEY = "ml-datasets/features/landscape/one.jpg";
const RELATIVE = "features/landscape/one.jpg";
const backend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function fixture(t) {
  const temporary = await mkdtemp(path.join(os.tmpdir(), "artmatch-dataset-sync-test-"));
  t.after(async () => {
    const resolved = path.resolve(temporary);
    assert.ok(resolved.startsWith(`${path.resolve(os.tmpdir())}${path.sep}artmatch-dataset-sync-test-`));
    await rm(resolved, { recursive: true, force: true });
  });
  return { temporary, root: path.join(temporary, "cache"), seed: path.join(temporary, "seed") };
}

function fakeClient({ pages = [{ Contents: [object(KEY)] }], get = () => Readable.from(["sample"]), list } = {}) {
  const calls = [];
  return {
    calls,
    async send(command) {
      calls.push({ type: command.constructor.name, input: command.input });
      if (command.constructor.name === "ListObjectsV2Command") {
        if (list) return list(command.input, calls);
        return pages[command.input.ContinuationToken ? Number(command.input.ContinuationToken) : 0];
      }
      return { Body: await get(command.input, calls) };
    },
  };
}

const synchronize = (root, client, extra = {}) => syncMlDatasets({
  client, bucket: "test-bucket", destination: root, dataset: "features", retryDelayMs: 0, ...extra,
});

async function put(root, relative, data) {
  const target = path.join(root, relative);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, data);
  return target;
}

test("downloads all paginated files and sends IfMatch, then resumes by content checksum", async (t) => {
  const { root } = await fixture(t);
  const second = "ml-datasets/features/landscape/two.csv";
  const client = fakeClient({ pages: [
    { Contents: [object(KEY)], IsTruncated: true, NextContinuationToken: "1" },
    { Contents: [object(second)] },
  ] });
  const first = await synchronize(root, client);
  assert.deepEqual(first, { dataset: "features", root, files: 2, skipped: 0, seeded: 0, downloaded: 2, bytes: 12, complete: true });
  assert.equal(await readFile(path.join(root, RELATIVE), "utf8"), "sample");
  assert.equal(client.calls.find((call) => call.type === "GetObjectCommand").input.IfMatch, object(KEY).ETag);
  const getCount = client.calls.filter((call) => call.type === "GetObjectCommand").length;
  const resumed = await synchronize(root, client);
  assert.equal(resumed.skipped, 2);
  assert.equal(client.calls.filter((call) => call.type === "GetObjectCommand").length, getCount);
});

test("repairs same-size corrupt cache contents instead of skipping by size", async (t) => {
  const { root } = await fixture(t);
  await put(root, RELATIVE, "broken");
  const result = await synchronize(root, fakeClient());
  assert.equal(result.downloaded, 1);
  assert.equal(await readFile(path.join(root, RELATIVE), "utf8"), "sample");
});

test("seeds by copying matching original files without downloads or hardlinks", async (t) => {
  const { root, seed } = await fixture(t);
  const original = await put(seed, RELATIVE, "sample");
  const client = fakeClient({ get: () => { throw new Error("Must not download"); } });
  const result = await synchronize(root, client, { seedRoot: seed });
  assert.equal(result.seeded, 1);
  await writeFile(path.join(root, RELATIVE), "change");
  assert.equal(await readFile(original, "utf8"), "sample");
  assert.equal(client.calls.filter((call) => call.type === "GetObjectCommand").length, 0);
});

test("downloads when a local seed has a bad checksum", async (t) => {
  const { root, seed } = await fixture(t);
  const original = await put(seed, RELATIVE, "broken");
  const result = await synchronize(root, fakeClient(), { seedRoot: seed });
  assert.equal(result.downloaded, 1);
  assert.equal(await readFile(original, "utf8"), "broken");
});

test("corrupt transfers retry three times, preserve existing file, and clean own partials", async (t) => {
  const { root } = await fixture(t);
  await put(root, RELATIVE, "oldbad");
  const client = fakeClient({ get: () => Readable.from(["badbad"]) });
  await assert.rejects(synchronize(root, client), (error) => {
    assert.equal(error.name, "DatasetChecksumMismatch");
    assert.equal(error.summary.complete, false);
    return true;
  });
  assert.equal(client.calls.filter((call) => call.type === "GetObjectCommand").length, 3);
  assert.equal(await readFile(path.join(root, RELATIVE), "utf8"), "oldbad");
  assert.deepEqual(await readdir(path.dirname(path.join(root, RELATIVE))), ["one.jpg"]);
});

test("interrupted stream cleans partials before retrying successfully", async (t) => {
  const { root } = await fixture(t);
  let count = 0;
  const client = fakeClient({ get: () => {
    count += 1;
    if (count > 1) return Readable.from(["sample"]);
    return Readable.from((async function* () {
      yield Buffer.from("sam");
      const error = new Error("connection reset"); error.code = "ECONNRESET"; throw error;
    })());
  } });
  assert.equal((await synchronize(root, client)).downloaded, 1);
  assert.equal(count, 2);
  assert.deepEqual(await readdir(path.dirname(path.join(root, RELATIVE))), ["one.jpg"]);
});

test("missing remote file in cache fails closed without deleting cache extras", async (t) => {
  const { root } = await fixture(t);
  const extra = await put(root, "features/landscape/removed.jpg", "keep");
  const client = fakeClient();
  await assert.rejects(synchronize(root, client), /Unexpected dataset cache file.*fresh --destination/);
  assert.equal(await readFile(extra, "utf8"), "keep");
  assert.equal(client.calls.filter((call) => call.type === "GetObjectCommand").length, 0);
});

test("unexpected empty class directories fail closed; unrelated groups are preserved", async (t) => {
  const { root } = await fixture(t);
  await put(root, "mediums_2d/extra/file.jpg", "keep");
  assert.equal((await synchronize(root, fakeClient())).complete, true);
  await mkdir(path.join(root, "features/obsolete"));
  await assert.rejects(synchronize(root, fakeClient()), /Unexpected dataset cache directory/);
});

test("old own-pattern partials are preserved and ignored, never wholesale-cleaned", async (t) => {
  const { root } = await fixture(t);
  const partial = await put(root, "features/landscape/.one.jpg.12345678-1234-4123-8123-123456789abc.part", "partial");
  assert.equal((await synchronize(root, fakeClient())).complete, true);
  assert.equal(await readFile(partial, "utf8"), "partial");
});

test("validates all pages before any writes, including unsafe final-page keys", async (t) => {
  const { root } = await fixture(t);
  const client = fakeClient({ pages: [
    { Contents: [object(KEY)], IsTruncated: true, NextContinuationToken: "1" },
    { Contents: [object("ml-datasets/features/../../escape.jpg")] },
  ] });
  await assert.rejects(synchronize(root, client), /Unsafe dataset object key/);
  await assert.rejects(readFile(path.join(root, RELATIVE)), { code: "ENOENT" });
  assert.equal(client.calls.filter((call) => call.type === "GetObjectCommand").length, 0);
});

test("rejects unsafe Windows and traversal object keys", async (t) => {
  const { root } = await fixture(t);
  for (const relative of ["features/../escape", "features/a\\b.jpg", "features/C:drive.jpg", "features/CON.jpg", "features/nul", "features/dot. /a", "features/trail.", "features//empty", "/absolute", "features/a\u0000.jpg"]) {
    await assert.rejects(synchronize(root, fakeClient({ pages: [{ Contents: [object(`ml-datasets/${relative}`)] }] })), /Unsafe dataset object key|outside the requested dataset prefix/);
  }
});

test("rejects unsupported checksum and invalid size without downloading", async (t) => {
  const { root } = await fixture(t);
  for (const invalid of [
    { ...object(KEY), ETag: '"abcdef-2"' },
    { ...object(KEY), ETag: undefined },
    { ...object(KEY), ETag: `"${md5("sample")}` },
    { ...object(KEY), Size: -1 },
  ]) await assert.rejects(synchronize(root, fakeClient({ pages: [{ Contents: [invalid] }] })), /MD5 ETag|object size/);
});

test("rejects case collisions and file-directory conflicts before writes", async (t) => {
  const { root } = await fixture(t);
  for (const keys of [[KEY, KEY.toUpperCase().replace("ML-DATASETS/FEATURES/", "ml-datasets/features/")], [KEY, "ml-datasets/features/landscape"]]) {
    await assert.rejects(synchronize(root, fakeClient({ pages: [{ Contents: keys.map((key) => object(key)) }] })), /case-conflicting|conflicts with a directory/);
  }
});

test("rejects repeated or missing pagination continuation tokens", async (t) => {
  const { root } = await fixture(t);
  await assert.rejects(synchronize(root, fakeClient({ pages: [{ Contents: [], IsTruncated: true }] })), /continuation token/);
  await assert.rejects(synchronize(root, fakeClient({ pages: [
    { Contents: [], IsTruncated: true, NextContinuationToken: "1" },
    { Contents: [], IsTruncated: true, NextContinuationToken: "1" },
  ] })), /continuation token/);
});

test("rejects empty listings and missing groups in all-dataset mode", async (t) => {
  const { root } = await fixture(t);
  await assert.rejects(synchronize(root, fakeClient({ pages: [{ Contents: [] }] })), /No dataset files/);
  await assert.rejects(synchronize(root, fakeClient(), { dataset: "all" }), /missing the mediums_2d dataset/);
  const all = fakeClient({ pages: [{ Contents: [object(KEY), object("ml-datasets/mediums_2d/oil/a.jpg"), object("ml-datasets/mediums_3d/wood/a.jpg")] }] });
  assert.equal((await synchronize(root, all, { dataset: "all" })).files, 3);
});

test("forbidden response stops new work immediately and is never retried", async (t) => {
  const { root } = await fixture(t);
  const denied = Object.assign(new Error("denied"), { name: "AccessDenied", $metadata: { httpStatusCode: 403 } });
  const client = fakeClient({ pages: [{ Contents: [object(KEY), object("ml-datasets/features/landscape/two.jpg")] }], get: () => { throw denied; } });
  await assert.rejects(synchronize(root, client, { concurrency: 1 }), /denied/);
  assert.equal(client.calls.filter((call) => call.type === "GetObjectCommand").length, 1);
  assert.deepEqual(await readdir(path.dirname(path.join(root, RELATIVE))), []);
});

test("transient listing failures are retried with a bounded budget", async (t) => {
  const { root } = await fixture(t);
  let calls = 0;
  const client = fakeClient({ list: () => {
    calls += 1;
    if (calls < 3) throw Object.assign(new Error("busy"), { $metadata: { httpStatusCode: 503 } });
    return { Contents: [object(KEY)] };
  } });
  assert.equal((await synchronize(root, client)).complete, true);
  assert.equal(calls, 3);
});

test("rejects cache root and ancestor junctions without writing outside the cache", async (t) => {
  const { root, temporary } = await fixture(t);
  const outside = path.join(temporary, "outside");
  await mkdir(outside);
  await symlink(outside, root, process.platform === "win32" ? "junction" : "dir");
  await assert.rejects(synchronize(root, fakeClient()), /Unsafe dataset directory/);
  assert.deepEqual(await readdir(outside), []);
});

test("rejects junctions inside cache and local seed trees", async (t) => {
  const { root, seed, temporary } = await fixture(t);
  const outside = path.join(temporary, "outside");
  await put(outside, "landscape/one.jpg", "sample");
  await mkdir(root);
  await symlink(outside, path.join(root, "features"), process.platform === "win32" ? "junction" : "dir");
  await assert.rejects(synchronize(root, fakeClient()), /Unsafe dataset directory/);
  const cleanRoot = path.join(temporary, "clean-cache");
  await mkdir(seed);
  await symlink(outside, path.join(seed, "features"), process.platform === "win32" ? "junction" : "dir");
  await assert.rejects(synchronize(cleanRoot, fakeClient(), { seedRoot: seed }), /Unsafe dataset directory/);
});

test("rejects original/seed overlaps, including filesystem root, before any client call", async (t) => {
  const { root, seed } = await fixture(t);
  const client = fakeClient();
  for (const destination of [path.join(backend, "ml/datasets"), path.join(backend, "ml"), path.parse(backend).root, seed, path.join(seed, "nested")]) {
    await assert.rejects(synchronize(destination, client, { seedRoot: seed }), /must be separate/);
  }
  await assert.rejects(synchronize(root, client, { seedRoot: path.join(root, "nested") }), /must be separate/);
  assert.equal(client.calls.length, 0);
});

test("validates dataset and concurrency before touching the client", async (t) => {
  const { root } = await fixture(t);
  const client = fakeClient();
  for (const extra of [{ dataset: "other" }, { concurrency: 0 }, { concurrency: 9 }, { concurrency: 1.5 }]) {
    await assert.rejects(synchronize(root, client, extra), /Unknown dataset|Concurrency/);
  }
  assert.equal(client.calls.length, 0);
});

test("rejects Windows original-directory aliases before listing or modifying originals", async (t) => {
  const { root } = await fixture(t);
  const client = fakeClient();
  const original = path.join(backend, "ml/datasets");
  for (const destination of [`${original}.`, `${original} `]) {
    await assert.rejects(synchronize(destination, client), /Unsafe local dataset directory/);
  }
  await assert.rejects(synchronize(root, client, { seedRoot: `${original}.` }), /Unsafe local dataset directory/);
  if (process.platform === "win32") {
    await assert.rejects(synchronize(`\\\\?\\${original}`, client), /Windows namespace paths/);
  }
  assert.equal(client.calls.length, 0);
});

test("limits concurrent transfers to the requested worker count", async (t) => {
  const { root } = await fixture(t);
  let active = 0;
  let maximum = 0;
  const client = fakeClient({
    pages: [{ Contents: Array.from({ length: 8 }, (_, index) => object(`ml-datasets/features/landscape/${index}.jpg`)) }],
    get: () => Readable.from((async function* () {
      active += 1;
      maximum = Math.max(maximum, active);
      await new Promise((resolve) => setTimeout(resolve, 10));
      yield Buffer.from("sample");
      active -= 1;
    })()),
  });
  assert.equal((await synchronize(root, client, { concurrency: 2 })).downloaded, 8);
  assert.equal(maximum, 2);
});

test("CLI help works from another cwd without credentials or dotenv logging", async (t) => {
  const { temporary } = await fixture(t);
  const result = spawnSync(process.execPath, [path.join(backend, "scripts/syncMlDatasetsFromB2.js"), "--help"], {
    cwd: temporary, encoding: "utf8", env: { ...process.env, B2_KEY_ID: "", B2_APPLICATION_KEY: "", B2_BUCKET: "", B2_REGION: "", B2_ENDPOINT: "" },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Download verified ML training datasets/);
  assert.doesNotMatch(result.stdout, /dotenv|Missing environment/);
});

test("CLI invalid arguments fail with parseable final JSON and no network setup", () => {
  for (const args of [["--dataset", "bad"], ["--concurrency", "99"], ["--destination"], ["--unknown"]]) {
    const result = spawnSync(process.execPath, [path.join(backend, "scripts/syncMlDatasetsFromB2.js"), "--json", ...args], { encoding: "utf8" });
    assert.equal(result.status, 1);
    assert.equal(JSON.parse(result.stdout.trim()).complete, false);
    assert.match(result.stderr, /Dataset sync failed/);
  }
});
