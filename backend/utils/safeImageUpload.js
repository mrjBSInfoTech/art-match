import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const supportedFormats = new Set(["jpeg", "png", "webp"]);

export async function encodeSafeWebp(filePath) {
  const input = await fs.readFile(filePath);
  let metadata;

  try {
    metadata = await sharp(input).metadata();
  } catch {
    throw Object.assign(
      new Error("Please upload a valid JPEG, PNG, or WebP image."),
      { status: 400 },
    );
  }

  if (!supportedFormats.has(metadata.format)) {
    throw Object.assign(
      new Error("Please upload a valid JPEG, PNG, or WebP image."),
      { status: 400 },
    );
  }

  return sharp(input).rotate().webp().toBuffer();
}

export const safeWebpFilename = (filename) =>
  `${path.parse(filename).name}.webp`;

export async function replaceUploadWithSafeWebp(file, directory) {
  const buffer = await encodeSafeWebp(file.path);
  const filename = safeWebpFilename(file.filename);
  const safePath = path.join(directory, filename);

  if (path.resolve(safePath) !== path.resolve(file.path)) {
    await fs.writeFile(safePath, buffer);
    await fs.unlink(file.path);
  } else {
    await fs.writeFile(safePath, buffer);
  }

  file.filename = filename;
  file.path = safePath;
  return buffer;
}
