import assert from "node:assert/strict";
import sharp from "sharp";
import test from "node:test";
import {
  ArtworkImageProcessingError,
  compressArtworkImage,
} from "./compressArtworkImage.js";

test("resizes artwork by two percent and encodes it as WebP", async () => {
  const source = await sharp({
    create: {
      width: 1000,
      height: 500,
      channels: 3,
      background: "#8a6b4f",
    },
  })
    .png()
    .toBuffer();
  const compressed = await compressArtworkImage(source);
  const metadata = await sharp(compressed).metadata();

  assert.equal(metadata.format, "webp");
  assert.equal(metadata.width, 980);
  assert.equal(metadata.height, 490);
  assert.ok(compressed.length < source.length);
});

test("preserves transparency when converting artwork to WebP", async () => {
  const source = await sharp({
    create: {
      width: 100,
      height: 60,
      channels: 4,
      background: { r: 80, g: 120, b: 160, alpha: 0 },
    },
  })
    .png()
    .toBuffer();
  const compressed = await compressArtworkImage(source);
  const metadata = await sharp(compressed).metadata();

  assert.equal(metadata.format, "webp");
  assert.equal(metadata.width, 98);
  assert.equal(metadata.height, 59);
  assert.equal(metadata.hasAlpha, true);
});

test("rejects files that cannot be processed as artwork images", async () => {
  await assert.rejects(
    compressArtworkImage(Buffer.from("not an image")),
    ArtworkImageProcessingError,
  );
});
