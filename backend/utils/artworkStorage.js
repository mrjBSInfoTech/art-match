import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { uploadToB2, deleteFromB2, isB2Configured } from "./b2Storage.js";
import {
  ARTWORK_VARIANT_NAMES,
  createArtworkDerivatives,
  derivativeFileName,
} from "./artworkDerivatives.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const artworkUploadDir = path.join(
  __dirname,
  "..",
  "uploads",
  "seller",
  "uploadArtwork",
);

const B2_PREFIX = "app-uploads/seller/uploadArtwork";

/*
 * Originals are private: they stay on the backend disk (or, once B2 is
 * configured, in the private bucket) and are never referenced by the database
 * or served. Only the derived `web` and `thumb` files are published.
 */
export const originalFileName = (baseName) => `${baseName}.original.webp`;

export const variantKey = (fileName) => `${B2_PREFIX}/${fileName}`;

export const writeDerivatives = async (source, baseName) => {
  const derivatives = await createArtworkDerivatives(source);
  const written = {};

  for (const variant of ARTWORK_VARIANT_NAMES) {
    const body = derivatives[variant];
    const fileName = derivativeFileName(baseName, variant);
    if (isB2Configured()) {
      await uploadToB2({
        key: variantKey(fileName),
        body,
        contentType: "image/webp",
      });
    } else {
      await fs.promises.mkdir(artworkUploadDir, { recursive: true });
      await fs.promises.writeFile(path.join(artworkUploadDir, fileName), body);
    }
    written[variant] = fileName;
  }

  return written;
};

export const writeOriginal = async (body, baseName) => {
  const fileName = originalFileName(baseName);
  if (isB2Configured()) {
    await uploadToB2({
      key: variantKey(fileName),
      body,
      contentType: "image/webp",
    });
  } else {
    await fs.promises.mkdir(artworkUploadDir, { recursive: true });
    await fs.promises.writeFile(path.join(artworkUploadDir, fileName), body);
  }
  return fileName;
};

export const removeDerivatives = async (baseName) => {
  for (const variant of ARTWORK_VARIANT_NAMES) {
    const fileName = derivativeFileName(baseName, variant);
    if (isB2Configured()) {
      await deleteFromB2(variantKey(fileName)).catch(() => { });
    } else {
      await fs.promises
        .unlink(path.join(artworkUploadDir, fileName))
        .catch(() => { });
    }
  }
};

export const baseNameOf = (fileName) =>
  path.basename(String(fileName || ""), path.extname(String(fileName || "")));
