import sharp from "sharp";
import { embedInvisibleArtworkWatermark } from "./invisibleArtworkWatermark.js";
import { WATERMARK_EM_UNITS, WATERMARK_GLYPHS } from "./watermarkGlyphPaths.js";

const buildWatermarkPathGroup = (text, fontSize, originX, originY, outlineWidth) => {
  const scale = fontSize / WATERMARK_EM_UNITS;
  let cursorX = 0;
  const glyphPaths = [];
  for (const ch of text) {
    const entry = WATERMARK_GLYPHS[ch] || WATERMARK_GLYPHS[" "];
    const [advance, d] = entry;
    if (d) {
      glyphPaths.push(`<path d="${d}" transform="translate(${cursorX},0)"/>`);
    }
    cursorX += advance;
  }

  return {
    textWidth: cursorX * scale,
    svgGroup: `<g transform="translate(${originX},${originY}) scale(${scale.toFixed(6)})" fill="white" fill-opacity="0.10" stroke="#222" stroke-opacity="0.13" stroke-width="${(outlineWidth / scale).toFixed(2)}" paint-order="stroke" stroke-linejoin="round">${glyphPaths.join("")}</g>`,
  };
};

const createWatermarkSvg = (width, height, code) => {
  const safeCode = code.replace(/[^A-Z0-9]/g, "");
  const watermarkText =
    code === "GUEST" ? "ArtMatch: Red Nexus" : `ArtMatch | ID: ${safeCode}`;
  const fontSize = Math.max(12, Math.min(48, Math.round(width * 0.028)));
  const outlineWidth = Math.max(1, Math.round(fontSize * 0.06));
  const preliminaryTileHeight = Math.max(
    Math.round(width * 0.21),
    Math.round(fontSize * 6.5),
  );
  const { textWidth, svgGroup } = buildWatermarkPathGroup(
    watermarkText,
    fontSize,
    Math.round(fontSize * 0.5),
    Math.round(preliminaryTileHeight * 0.55),
    outlineWidth,
  );
  const tileWidth = Math.max(
    Math.round(width * 0.42),
    Math.round(textWidth + fontSize * 2.5),
  );
  const tileHeight = preliminaryTileHeight;
  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id="watermark" width="${tileWidth}" height="${tileHeight}" patternUnits="userSpaceOnUse" patternTransform="rotate(-24)">
        ${svgGroup}
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#watermark)"/>
  </svg>`;
  return Buffer.from(svg);
};

export const renderWatermarkedArtwork = async (source, code) => {
  const image = sharp(source, { failOn: "error" }).rotate();
  const metadata = await image.metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error("Artwork image has invalid dimensions.");
  }

  const swapsDimensions = [5, 6, 7, 8].includes(metadata.orientation);
  const sourceWidth = swapsDimensions ? metadata.height : metadata.width;
  const sourceHeight = swapsDimensions ? metadata.width : metadata.height;
  const scale = Math.min(1, 2400 / sourceWidth, 2400 / sourceHeight);
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));
  const resized = await image
    .resize({ width, height, fit: "inside", withoutEnlargement: true })
    .png()
    .toBuffer();
  const resizedMetadata = await sharp(resized).metadata();
  const outputWidth = resizedMetadata.width;
  const outputHeight = resizedMetadata.height;
  const pixels = await sharp(resized, { failOn: "error" })
    .composite([{ input: createWatermarkSvg(outputWidth, outputHeight, code) }])
    .raw()
    .toBuffer({ resolveWithObject: true });
  let watermarkMode = "invisible-and-visible";
  try {
    embedInvisibleArtworkWatermark(pixels, code);
  } catch (error) {
    if (error.code !== "INSUFFICIENT_WATERMARK_DETAIL") throw error;
    watermarkMode = "visible-only";
  }
  const output = sharp(pixels.data, { raw: pixels.info });

  switch (metadata.format) {
    case "png":
      return {
        body: await output.png().toBuffer(),
        contentType: "image/png",
        watermarkMode,
      };
    case "webp":
      return {
        body: await output.webp({ quality: 95 }).toBuffer(),
        contentType: "image/webp",
        watermarkMode,
      };
    case "avif":
      return {
        body: await output.avif({ quality: 92 }).toBuffer(),
        contentType: "image/avif",
        watermarkMode,
      };
    case "tiff":
      return {
        body: await output.tiff().toBuffer(),
        contentType: "image/tiff",
        watermarkMode,
      };
    default:
      return {
        body: await output.jpeg({ quality: 95, chromaSubsampling: "4:4:4" }).toBuffer(),
        contentType: "image/jpeg",
        watermarkMode,
      };
  }
};
