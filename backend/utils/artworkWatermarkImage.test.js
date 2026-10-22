import assert from "node:assert/strict";
import sharp from "sharp";
import test from "node:test";
import { renderWatermarkedArtwork } from "./artworkWatermarkImage.js";
import { readInvisibleArtworkWatermark } from "./invisibleArtworkWatermark.js";

const createGradientArtwork = (width, height) =>
  sharp(
    Buffer.from(
      `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="paint" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#566b7a"/>
            <stop offset="1" stop-color="#d6c3a4"/>
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#paint)"/>
      </svg>`,
    ),
  )
    .png()
    .toBuffer();

test("renders a tiled ID watermark onto the artwork image", async () => {
  const source = await createGradientArtwork(800, 600);
  const rendered = await renderWatermarkedArtwork(source, "AB23C");
  const sourcePixels = await sharp(source).raw().toBuffer();
  const renderedPixels = await sharp(rendered.body).raw().toBuffer();

  assert.equal(rendered.contentType, "image/png");
  assert.notDeepEqual(renderedPixels, sourcePixels);
  assert.deepEqual(await sharp(rendered.body).metadata().then(({ width, height }) => ({
    width,
    height,
  })), { width: 800, height: 600 });
  assert.equal(await readInvisibleArtworkWatermark(rendered.body), "AB23C");
});

test("resizes oversized artwork images before delivering them", async () => {
  const source = await sharp({
    create: {
      width: 3000,
      height: 1000,
      channels: 3,
      background: "#ffffff",
    },
  })
    .png()
    .toBuffer();
  const rendered = await renderWatermarkedArtwork(source, "AB23C");
  const { width, height } = await sharp(rendered.body).metadata();

  assert.equal(width, 2400);
  assert.equal(height, 800);
  assert.equal(await readInvisibleArtworkWatermark(rendered.body), "AB23C");
});

test("invisible watermark remains readable after moderate JPEG recompression", async () => {
  const source = await createGradientArtwork(1200, 900);
  const rendered = await renderWatermarkedArtwork(source, "AB23C");
  const recompressed = await sharp(rendered.body)
    .jpeg({ quality: 88 })
    .toBuffer();

  assert.equal(await readInvisibleArtworkWatermark(recompressed), "AB23C");
});

test("embeds an invisible watermark in transparent PNG artwork", async () => {
  const source = await sharp({
    create: {
      width: 800,
      height: 600,
      channels: 4,
      background: { r: 80, g: 120, b: 160, alpha: 0 },
    },
  })
    .png()
    .toBuffer();
  const rendered = await renderWatermarkedArtwork(source, "AB23C");

  assert.equal(await sharp(rendered.body).metadata().then(({ channels }) => channels), 4);
  assert.equal(await readInvisibleArtworkWatermark(rendered.body), "AB23C");
});
