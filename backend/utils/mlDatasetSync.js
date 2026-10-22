import { createHash, randomUUID } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { lstat, mkdir, readdir, realpath, rename, unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";

export const ML_DATASETS = ["features", "mediums_2d", "mediums_3d"];
const PREFIX = "ml-datasets/";
const WINDOWS_RESERVED = /^(?:con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i;
const ORIGINAL_DATASETS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../ml/datasets");
const OWN_PARTIAL = /^\..+\.[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}\.part$/i;

function validateRelativeKey(key) {
  if (typeof key !== "string" || !key.startsWith(PREFIX)) {
    throw new Error("Dataset object has an unexpected prefix.");
  }
  const relative = key.slice(PREFIX.length);
  const components = relative.split("/");
  if (!relative || components.some((part) =>
    !part || part === "." || part === ".." ||
    /[\\<>:"|?*\u0000-\u001f\u007f]/.test(part) ||
    /[. ]$/.test(part) || WINDOWS_RESERVED.test(part)
  )) {
    throw new Error(`Unsafe dataset object key: ${JSON.stringify(key)}`);
  }
  return components;
}

async function statIfPresent(file) {
  try {
    return await lstat(file);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

function validateLocalDirectory(directory) {
  const absolute = path.resolve(directory);
  if (/^\\\\[?.]\\/.test(absolute)) throw new Error("Windows namespace paths cannot be used for a dataset cache or seed.");
  const parsed = path.parse(absolute);
  const components = absolute.slice(parsed.root.length).split(path.sep).filter(Boolean);
  if (components.some((component) => /[. ]$/.test(component) || /[<>:"|?*\u0000-\u001f]/.test(component) || WINDOWS_RESERVED.test(component))) {
    throw new Error(`Unsafe local dataset directory: ${absolute}`);
  }
  return absolute;
}

// Resolve existing ancestors so Windows short-name and case aliases cannot bypass
// protection of the original datasets, even when the final cache does not exist.
async function canonicalLocation(directory) {
  let current = directory;
  const missing = [];
  while (true) {
    try {
      return path.join(await realpath(current), ...missing.reverse());
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      const parent = path.dirname(current);
      if (parent === current) throw error;
      missing.push(path.basename(current));
      current = parent;
    }
  }
}

// Inspect every ancestor, including the destination itself, before creating files.
// Reject junctions/symlinks even when they currently point inside the cache.
async function safeDirectory(directory, create) {
  const absolute = validateLocalDirectory(directory);
  const parsed = path.parse(absolute);
  const components = absolute.slice(parsed.root.length).split(path.sep).filter(Boolean);
  let current = parsed.root;
  for (const component of components) {
    current = path.join(current, component);
    let stat = await statIfPresent(current);
    if (!stat && create) {
      try {
        await mkdir(current);
      } catch (error) {
        if (error.code !== "EEXIST") throw error;
      }
      stat = await lstat(current);
    }
    if (!stat) return false;
    if (stat.isSymbolicLink() || !stat.isDirectory()) {
      throw new Error(`Unsafe dataset directory (must be a real directory): ${current}`);
    }
  }
  return true;
}

async function inspectFile(file) {
  const stat = await statIfPresent(file);
  if (stat && (stat.isSymbolicLink() || !stat.isFile())) {
    throw new Error(`Unsafe dataset cache entry (must be a regular file): ${file}`);
  }
  return stat;
}

async function validateCacheInventory(root, objects, dataset) {
  if (!await safeDirectory(root, false)) return;
  const expectedFiles = new Set(objects.map((object) => object.components.join("/")));
  const expectedDirectories = new Set();
  for (const object of objects) {
    for (let length = 1; length < object.components.length; length += 1) {
      expectedDirectories.add(object.components.slice(0, length).join("/"));
    }
  }
  const visit = async (components) => {
    const directory = path.join(root, ...components);
    if (!await safeDirectory(directory, false)) return;
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const childComponents = [...components, entry.name];
      const relative = childComponents.join("/");
      if (entry.isSymbolicLink()) throw new Error(`Unsafe symlink or junction in dataset cache: ${relative}`);
      if (entry.isDirectory()) {
        if (!expectedDirectories.has(relative)) {
          throw new Error(`Unexpected dataset cache directory: ${relative}. Use a fresh --destination or move local additions outside the cache; no files were deleted.`);
        }
        await visit(childComponents);
      } else if (!entry.isFile()) {
        throw new Error(`Unsafe non-regular dataset cache entry: ${relative}`);
      } else if (!expectedFiles.has(relative) && !OWN_PARTIAL.test(entry.name)) {
        throw new Error(`Unexpected dataset cache file: ${relative}. Use a fresh --destination or move local additions outside the cache; no files were deleted.`);
      }
    }
  };
  for (const name of dataset === "all" ? ML_DATASETS : [dataset]) await visit([name]);
}

async function matchesFile(file, object) {
  const stat = await inspectFile(file);
  if (!stat || stat.size !== object.size) return false;
  const hash = createHash("md5");
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest("hex") === object.md5;
}

function isForbidden(error) {
  return error?.$metadata?.httpStatusCode === 403 ||
    ["AccessDenied", "Forbidden", "InvalidAccessKeyId", "SignatureDoesNotMatch"].includes(error?.name);
}

function isTransient(error) {
  const status = error?.$metadata?.httpStatusCode;
  return status === 408 || status === 429 || status >= 500 ||
    ["AbortError", "TimeoutError", "RequestTimeout", "SlowDown", "InternalError", "ServiceUnavailable", "DatasetChecksumMismatch"].includes(error?.name) ||
    ["ECONNRESET", "ETIMEDOUT", "EPIPE", "ECONNREFUSED", "EAI_AGAIN", "ERR_STREAM_PREMATURE_CLOSE"].includes(error?.code);
}

async function retry(operation, delayMs) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= 3 || isForbidden(error) || !isTransient(error)) throw error;
      await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
    }
  }
}

function readableBody(body) {
  if (body?.pipe) return body;
  if (body instanceof Uint8Array) return Readable.from([body]);
  if (body?.[Symbol.asyncIterator]) return Readable.from(body);
  if (body?.getReader) return Readable.fromWeb(body);
  throw new Error("B2 returned an unsupported or empty dataset response body.");
}

async function writeVerifiedFile({ target, object, source }) {
  await safeDirectory(path.dirname(target), true);
  await inspectFile(target);
  const temporary = path.join(path.dirname(target), `.${path.basename(target)}.${randomUUID()}.part`);
  let ownsTemporary = false;
  let body;
  try {
    // Exclusive creation means cleanup can never remove another process's file.
    const output = createWriteStream(temporary, { flags: "wx", mode: 0o600 });
    await new Promise((resolve, reject) => {
      output.once("open", () => { ownsTemporary = true; resolve(); });
      output.once("error", reject);
    });
    const hash = createHash("md5");
    let bytes = 0;
    const check = new Transform({
      transform(chunk, encoding, callback) {
        bytes += chunk.length;
        hash.update(chunk);
        if (bytes > object.size) {
          const error = new Error(`Dataset size mismatch: ${object.key}`);
          error.name = "DatasetChecksumMismatch";
          callback(error);
        } else callback(null, chunk);
      },
    });
    try {
      body = readableBody(await source());
      await pipeline(body, check, output);
    } catch (error) {
      output.destroy();
      // Wait for the handle to close before removing a partial file on Windows.
      if (!output.closed) await new Promise((resolve) => output.once("close", resolve));
      throw error;
    }
    if (bytes !== object.size || hash.digest("hex") !== object.md5) {
      const error = new Error(`Dataset checksum mismatch: ${object.key}`);
      error.name = "DatasetChecksumMismatch";
      throw error;
    }
    // Recheck the parent and target after streaming, before replacing anything.
    await safeDirectory(path.dirname(target), false);
    await inspectFile(target);
    await rename(temporary, target);
    ownsTemporary = false;
  } finally {
    body?.destroy?.();
    if (ownsTemporary) await unlink(temporary).catch((error) => {
      if (error.code !== "ENOENT") throw error;
    });
  }
}

async function listFiles({ client, bucket, dataset, retryDelayMs }) {
  const prefix = dataset === "all" ? PREFIX : `${PREFIX}${dataset}/`;
  const objects = [];
  const seenKeys = new Set();
  const seenPaths = new Set();
  const seenTokens = new Set();
  let token;
  do {
    const page = await retry(() => client.send(new ListObjectsV2Command({
      Bucket: bucket, Prefix: prefix, ...(token ? { ContinuationToken: token } : {}),
    }), { abortSignal: AbortSignal.timeout(30_000) }), retryDelayMs);
    for (const item of page.Contents || []) {
      if (!item.Key?.startsWith(prefix)) throw new Error("B2 returned an object outside the requested dataset prefix.");
      const components = validateRelativeKey(item.Key);
      const etagMatch = /^(?:"([a-f\d]{32})"|([a-f\d]{32}))$/i.exec(item.ETag || "");
      const checksum = (etagMatch?.[1] || etagMatch?.[2])?.toLowerCase();
      if (!checksum) throw new Error(`Dataset object requires a single-part MD5 ETag: ${item.Key}`);
      if (!Number.isSafeInteger(item.Size) || item.Size < 0) throw new Error(`Invalid dataset object size: ${item.Key}`);
      const folded = components.join("/").toLowerCase();
      if (seenKeys.has(item.Key) || seenPaths.has(folded)) {
        throw new Error(`Duplicate or case-conflicting dataset object: ${item.Key}`);
      }
      seenKeys.add(item.Key);
      seenPaths.add(folded);
      objects.push({ key: item.Key, components, md5: checksum, size: item.Size, etag: item.ETag });
    }
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
    if (page.IsTruncated && (!token || seenTokens.has(token))) {
      throw new Error("B2 returned an invalid dataset listing continuation token.");
    }
    if (token) seenTokens.add(token);
  } while (token);
  if (!objects.length) throw new Error(`No dataset files found in B2 prefix ${prefix}`);
  if (dataset === "all") {
    for (const name of ML_DATASETS) {
      if (!objects.some((object) => object.components[0] === name && object.components.length > 1)) {
        throw new Error(`B2 dataset inventory is missing the ${name} dataset.`);
      }
    }
  }
  // Catch file/directory conflicts on all platforms before any files are written.
  for (const object of objects) {
    for (let length = 1; length < object.components.length; length += 1) {
      if (seenPaths.has(object.components.slice(0, length).join("/").toLowerCase())) {
        throw new Error(`Dataset object conflicts with a directory: ${object.key}`);
      }
    }
  }
  return objects;
}

/** Download or seed a verified training cache. Never deletes originals or extras. */
export async function syncMlDatasets({
  client, bucket, destination, seedRoot = null, dataset = "all", concurrency = 4,
  onProgress, retryDelayMs = 150,
}) {
  if (!client?.send || !bucket || !destination) throw new Error("client, bucket, and destination are required.");
  if (dataset !== "all" && !ML_DATASETS.includes(dataset)) throw new Error(`Unknown dataset: ${dataset}`);
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 8) throw new Error("Concurrency must be an integer between 1 and 8.");
  const root = validateLocalDirectory(destination);
  const seed = seedRoot ? validateLocalDirectory(seedRoot) : null;
  const foldedRoot = (await canonicalLocation(root)).toLowerCase();
  const contains = (parent, child) => {
    const relative = path.relative(parent, child);
    return relative === "" || (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
  };
  for (const protectedRoot of [ORIGINAL_DATASETS, seed].filter(Boolean)) {
    const protectedPath = (await canonicalLocation(protectedRoot)).toLowerCase();
    if (contains(protectedPath, foldedRoot) || contains(foldedRoot, protectedPath)) {
      throw new Error("Dataset cache and original/seed directories must be separate, non-nested directories.");
    }
  }
  const summary = { dataset, root, files: 0, skipped: 0, seeded: 0, downloaded: 0, bytes: 0, complete: false };
  try {
    const objects = await listFiles({ client, bucket, dataset, retryDelayMs });
    summary.files = objects.length;
    summary.bytes = objects.reduce((total, object) => total + object.size, 0);
    await validateCacheInventory(root, objects, dataset);
    await safeDirectory(root, true);
    const seedExists = seed ? await safeDirectory(seed, false) : false;
    let index = 0;
    let firstError;
    const worker = async () => {
      while (!firstError && index < objects.length) {
        const object = objects[index++];
        try {
          const target = path.join(root, ...object.components);
          await safeDirectory(path.dirname(target), true);
          let status;
          if (await matchesFile(target, object)) {
            status = "skipped";
          } else {
            const original = seedExists ? path.join(seed, ...object.components) : null;
            const seedParentExists = original ? await safeDirectory(path.dirname(original), false) : false;
            if (seedParentExists && await matchesFile(original, object)) {
              // A second hash while copying catches modifications after the seed check.
              await writeVerifiedFile({ target, object, source: () => createReadStream(original) });
              status = "seeded";
            } else {
              if (firstError) return;
              await retry(async () => {
                if (firstError) throw firstError;
                await writeVerifiedFile({ target, object, source: async () => {
                  if (firstError) throw firstError;
                  let response;
                  try {
                    response = await client.send(new GetObjectCommand({
                      Bucket: bucket, Key: object.key, IfMatch: object.etag,
                    }), { abortSignal: AbortSignal.timeout(30_000) });
                  } catch (error) {
                    if (isForbidden(error)) firstError ||= error;
                    throw error;
                  }
                  return response.Body;
                } });
              }, retryDelayMs);
              status = "downloaded";
            }
          }
          summary[status] += 1;
          onProgress?.({ ...summary, current: object.key, status });
        } catch (error) {
          firstError ||= error;
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(concurrency, objects.length) }, worker));
    if (firstError) throw firstError;
    summary.complete = true;
    return summary;
  } catch (error) {
    error.summary = { ...summary };
    throw error;
  }
}
