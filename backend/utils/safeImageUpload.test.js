import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import test from "node:test";
import { encodeSafeWebp } from "./safeImageUpload.js";

test("safe image encoding verifies magic bytes and emits WebP", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "art-match-image-"));
  try {
    const imagePath = path.join(directory, "pixel.png");
    const png = await sharp({
      create: {
        width: 1,
        height: 1,
        channels: 3,
        background: "#ffffff",
      },
    })
      .png()
      .toBuffer();
    await writeFile(imagePath, png);

    const encoded = await encodeSafeWebp(imagePath);
    assert.equal((await sharp(encoded).metadata()).format, "webp");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("safe image encoding rejects SVG and spoofed image content", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "art-match-image-"));
  try {
    const imagePath = path.join(directory, "image.jpg");
    await writeFile(imagePath, '<svg xmlns="http://www.w3.org/2000/svg"></svg>');

    await assert.rejects(encodeSafeWebp(imagePath), { status: 400 });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
