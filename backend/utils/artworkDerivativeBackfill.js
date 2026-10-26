import fs from "node:fs";
import path from "node:path";
import db from "../database/db.js";
import {
  ARTWORK_VARIANT_NAMES,
  derivativeFileName,
} from "./artworkDerivatives.js";
import {
  artworkUploadDir,
  baseNameOf,
  writeDerivatives,
} from "./artworkStorage.js";

const query = (sql, values = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, values, (error, rows) =>
      error ? reject(error) : resolve(rows),
    );
  });

const hasDerivatives = (baseName) =>
  ARTWORK_VARIANT_NAMES.every((variant) =>
    fs.existsSync(path.join(artworkUploadDir, derivativeFileName(baseName, variant))),
  );

/*
 * Artworks uploaded before derivatives existed would otherwise have no public
 * file and render as unavailable. Generate the missing ones at startup.
 *
 * Runs in the background and never rejects: a partial backfill is retried on
 * the next start.
 */
export const ensureArtworkDerivatives = async ({ logger = console } = {}) => {
  let rows;
  try {
    rows = await query(
      "SELECT DISTINCT image FROM artwork WHERE image IS NOT NULL AND image <> ''",
    );
  } catch (error) {
    logger.error("Unable to list artwork images for derivative backfill:", error.message);
    return;
  }

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const { image } of rows) {
    const baseName = baseNameOf(image);
    if (!baseName) continue;
    if (hasDerivatives(baseName)) {
      skipped += 1;
      continue;
    }

    // Prefer the stored source; fall back to whichever upload matches the name.
    const candidates = fs
      .readdirSync(artworkUploadDir)
      .filter((file) => baseNameOf(file) === baseName && !/\.(?:web|thumb)\.webp$/.test(file));
    const source = candidates.find((file) => file === image) || candidates[0];
    if (!source) {
      // Remote (B2) images are generated on demand at delivery time instead.
      skipped += 1;
      continue;
    }

    try {
      await writeDerivatives(path.join(artworkUploadDir, source), baseName);
      created += 1;
    } catch (error) {
      failed += 1;
      logger.warn(`Derivative backfill failed for ${image}: ${error.message}`);
    }
  }

  if (created || failed) {
    logger.log(
      `Artwork derivatives ready: ${created} generated, ${skipped} already present, ${failed} failed.`,
    );
  }
  return { created, skipped, failed };
};
