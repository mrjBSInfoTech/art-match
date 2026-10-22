import sharp from "sharp";
import { embedInvisibleArtworkWatermark } from "./invisibleArtworkWatermark.js";

const createWatermarkSvg = (width, height, code) => {
  const safeCode = code.replace(/[^A-Z0-9]/g, "");
  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id="watermark" width="230" height="140" patternUnits="userSpaceOnUse" patternTransform="rotate(-24)">
        <text x="12" y="70" fill="white" fill-opacity="0.16" stroke="#222" stroke-opacity="0.12" stroke-width="1" font-family="Arial,sans-serif" font-size="24" font-weight="700">ID: ${safeCode}</text>
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
  embedInvisibleArtworkWatermark(pixels, code);
  const output = sharp(pixels.data, { raw: pixels.info });

  switch (metadata.format) {
    case "png":
      return { body: await output.png().toBuffer(), contentType: "image/png" };
    case "webp":
      return { body: await output.webp({ quality: 95 }).toBuffer(), contentType: "image/webp" };
    case "avif":
      return { body: await output.avif({ quality: 92 }).toBuffer(), contentType: "image/avif" };
    case "tiff":
      return { body: await output.tiff().toBuffer(), contentType: "image/tiff" };
    default:
      return {
        body: await output.jpeg({ quality: 95, chromaSubsampling: "4:4:4" }).toBuffer(),
        contentType: "image/jpeg",
      };
  }
};
