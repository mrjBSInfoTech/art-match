import sharp from "sharp";

const RESIZE_SCALE = 0.98;

export class ArtworkImageProcessingError extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = "ArtworkImageProcessingError";
  }
}

export async function compressArtworkImage(sourcePath) {
  try {
    const image = sharp(sourcePath, { failOn: "error" }).rotate();
    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) {
      throw new ArtworkImageProcessingError(
        "Artwork image has invalid dimensions.",
      );
    }

    const swapsDimensions = [5, 6, 7, 8].includes(metadata.orientation);
    const sourceWidth = swapsDimensions ? metadata.height : metadata.width;
    const sourceHeight = swapsDimensions ? metadata.width : metadata.height;
    const width = Math.max(1, Math.round(sourceWidth * RESIZE_SCALE));
    const height = Math.max(1, Math.round(sourceHeight * RESIZE_SCALE));

    return await image
      .resize({ width, height, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 92, effort: 4 })
      .toBuffer();
  } catch (error) {
    if (error instanceof ArtworkImageProcessingError) throw error;
    throw new ArtworkImageProcessingError(
      "Unable to process uploaded artwork image.",
      { cause: error },
    );
  }
}
