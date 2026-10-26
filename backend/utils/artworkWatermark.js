import { randomInt } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import db from "../database/db.js";
import { getFromB2, isB2Configured, uploadToB2 } from "./b2Storage.js";
import { renderWatermarkedArtwork } from "./artworkWatermarkImage.js";
import {
  ARTWORK_VARIANT_NAMES,
  DEFAULT_ARTWORK_VARIANT,
  createArtworkDerivatives,
  derivativeFileName,
  isArtworkVariant,
} from "./artworkDerivatives.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, "..");
const localArtworkFolder = path.join(
  backendRoot,
  "uploads",
  "seller",
  "uploadArtwork",
);
const b2CacheFolder = path.join(
  backendRoot,
  ".cache",
  "b2",
  "app-uploads",
  "seller",
  "uploadArtwork",
);
const derivativeFolder = localArtworkFolder;
const derivativeB2Prefix = "app-uploads/seller/uploadArtwork";
const cacheTtlMs = 3 * 60 * 1000;
const maxCacheEntries = 12;
const watermarkCache = new Map();
const imageInFlight = new Map();
const sourceInFlight = new Map();
const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

const query = (sql, values = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, values, (error, rows) => {
      if (error) return reject(error);
      resolve(rows);
    });
  });

export const getWatermarkCode = async (customerId) => {
  const existing = await query(
    "SELECT watermark_code FROM buyer_watermark_code WHERE customer_id = ?",
    [customerId],
  );
  if (existing[0]) return existing[0].watermark_code;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate = Array.from(
      { length: 5 },
      () => alphabet[randomInt(alphabet.length)],
    ).join("");

    await query(
      "INSERT IGNORE INTO buyer_watermark_code (customer_id, watermark_code) VALUES (?, ?)",
      [customerId, candidate],
    );
    const assigned = await query(
      "SELECT watermark_code FROM buyer_watermark_code WHERE customer_id = ?",
      [customerId],
    );
    if (assigned[0]) return assigned[0].watermark_code;
  }

  throw new Error("Unable to assign a unique artwork watermark code.");
};

export const getCustomerIdForWatermarkCode = async (code) => {
  const rows = await query(
    "SELECT customer_id FROM buyer_watermark_code WHERE watermark_code = ?",
    [code],
  );
  return rows[0]?.customer_id ?? null;
};

// Public delivery only ever uses the small derived files. If one is missing
// (an artwork uploaded before derivatives existed, or a B2-hosted original),
// it is generated from the private source on demand and stored for reuse.
const readDerivative = async (filename, variant) => {
  if (!isArtworkVariant(variant)) {
    const error = new Error("Invalid artwork image variant.");
    error.status = 400;
    throw error;
  }

  const baseName = path.parse(filename).name;
  const target = derivativeFileName(baseName, variant);
  const localPath = path.join(derivativeFolder, target);
  if (fs.existsSync(localPath)) return fs.promises.readFile(localPath);

  const source = await readSourceImageOnce(filename);
  const derivatives = await createArtworkDerivatives(source);

  for (const name of ARTWORK_VARIANT_NAMES) {
    const fileName = derivativeFileName(baseName, name);
    if (isB2Configured()) {
      await uploadToB2({
        key: `${derivativeB2Prefix}/${fileName}`,
        body: derivatives[name],
        contentType: "image/webp",
      }).catch((error) =>
        console.warn(`Unable to store ${fileName} derivative:`, error.message),
      );
    } else {
      await fs.promises.mkdir(derivativeFolder, { recursive: true });
      await fs.promises.writeFile(
        path.join(derivativeFolder, fileName),
        derivatives[name],
      );
    }
  }

  return derivatives[variant];
};

export const getArtworkDerivative = async (
  filename,
  customerId = null,
  variant = DEFAULT_ARTWORK_VARIANT,
) => {
  if (!filename || path.basename(filename) !== filename) {
    const error = new Error("Invalid artwork image.");
    error.status = 400;
    throw error;
  }

  const body = await readDerivative(filename, variant);

  // Keep the per-buyer audit trail: the watermark ID identifies who viewed it.
  if (customerId) {
    const code = await getWatermarkCode(customerId);
    const artworkId = await getArtworkId(filename);
    await query(
      `INSERT INTO buyer_artwork_image_view
        (customer_id, artwork_id, image_filename, watermark_code)
       VALUES (?, ?, ?, ?)`,
      [customerId, artworkId, filename, code],
    );
    return { body, contentType: "image/webp", code };
  }

  return { body, contentType: "image/webp", code: "GUEST" };
};

const getArtworkId = async (filename) => {
  const rows = await query(
    "SELECT artwork_id FROM artwork WHERE image = ? ORDER BY artwork_id DESC LIMIT 1",
    [filename],
  );
  return rows[0]?.artwork_id ?? null;
};

const readSourceImage = async (filename) => {
  const cachePath = path.join(b2CacheFolder, filename);
  const localPath = path.join(localArtworkFolder, filename);

  if (fs.existsSync(cachePath)) return fs.promises.readFile(cachePath);
  if (fs.existsSync(localPath)) return fs.promises.readFile(localPath);

  let response;
  try {
    response = await getFromB2(`app-uploads/seller/uploadArtwork/${filename}`);
  } catch (error) {
    if (error?.$metadata?.httpStatusCode === 404 || error?.name === "NoSuchKey") {
      error.status = 404;
    }
    throw error;
  }
  if (!response.Body) throw new Error("Artwork image storage returned an empty body.");

  const bytes =
    typeof response.Body.transformToByteArray === "function"
      ? Buffer.from(await response.Body.transformToByteArray())
      : await (async () => {
          const chunks = [];
          for await (const chunk of response.Body) chunks.push(Buffer.from(chunk));
          return Buffer.concat(chunks);
        })();

  await fs.promises.mkdir(path.dirname(cachePath), { recursive: true });
  await fs.promises.writeFile(cachePath, bytes);
  return bytes;
};

const readSourceImageOnce = (filename) => {
  if (!sourceInFlight.has(filename)) {
    const pending = readSourceImage(filename).finally(() =>
      sourceInFlight.delete(filename),
    );
    sourceInFlight.set(filename, pending);
  }
  return sourceInFlight.get(filename);
};

const pruneWatermarkCache = () => {
  const now = Date.now();
  for (const [key, entry] of watermarkCache) {
    if (entry.expiresAt <= now) watermarkCache.delete(key);
  }
  while (watermarkCache.size >= maxCacheEntries) {
    watermarkCache.delete(watermarkCache.keys().next().value);
  }
};

export const getWatermarkedArtwork = async (filename, customerId = null) => {
  if (!filename || path.basename(filename) !== filename) {
    const error = new Error("Invalid artwork image.");
    error.status = 400;
    throw error;
  }

  const code = customerId ? await getWatermarkCode(customerId) : "GUEST";
  const cacheKey = `${filename}:${code}`;
  let result = watermarkCache.get(cacheKey);
  if (!result || result.expiresAt <= Date.now()) {
    let pending = imageInFlight.get(cacheKey);
    if (!pending) {
      pending = readSourceImageOnce(filename)
        .then((source) => renderWatermarkedArtwork(source, code))
        .finally(() => imageInFlight.delete(cacheKey));
      imageInFlight.set(cacheKey, pending);
    }
    result = await pending;
    pruneWatermarkCache();
    watermarkCache.set(cacheKey, { ...result, expiresAt: Date.now() + cacheTtlMs });
  }

  if (customerId) {
    const artworkId = await getArtworkId(filename);
    await query(
      `INSERT INTO buyer_artwork_image_view
        (customer_id, artwork_id, image_filename, watermark_code)
       VALUES (?, ?, ?, ?)`,
      [customerId, artworkId, filename, code],
    );
  }

  return { ...result, code };
};
