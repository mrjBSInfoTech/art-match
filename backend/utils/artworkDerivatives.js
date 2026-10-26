import sharp from "sharp";

/*
 * Artwork protection: every upload produces small, public-safe derived files.
 * The original (the seller's upload) is never published.
 *
 *   web    1600 px long side  gallery / detail views
 *   thumb   400 px long side  grids and listings
 *
 * Both are WebP, carry no camera/GPS/path metadata, and get our own
 * copyright notice instead.
 */
export const ARTWORK_IMAGE_VARIANTS = Object.freeze({
  web: Object.freeze({ longSide: 1600, quality: 80 }),
  thumb: Object.freeze({ longSide: 400, quality: 78 }),
});

export const DEFAULT_ARTWORK_VARIANT = "web";

export const ARTWORK_VARIANT_NAMES = Object.freeze(
  Object.keys(ARTWORK_IMAGE_VARIANTS),
);

export const isArtworkVariant = (name) =>
  Object.prototype.hasOwnProperty.call(ARTWORK_IMAGE_VARIANTS, name);

export const ARTWORK_COPYRIGHT = "Red Nexus / ArtMatch";

// A plain sharp encode already drops EXIF/IPTC/XMP/GPS. `withExif` writes a
// brand-new block containing only what is listed here — unlike withExifMerge,
// which would keep the camera, GPS and artist tags from the seller's upload.
const writeOwnCopyright = (pipeline) =>
  pipeline.withExif({
    IFD0: {
      Copyright: ARTWORK_COPYRIGHT,
      Artist: ARTWORK_COPYRIGHT,
      ImageDescription: "ArtMatch protected preview",
    },
  });

export const createArtworkDerivatives = async (source) => {
  const input = sharp(source, { failOn: "error" }).rotate();
  const metadata = await input.metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error("Artwork image has invalid dimensions.");
  }

  const derivatives = {};
  for (const [variant, { longSide, quality }] of Object.entries(
    ARTWORK_IMAGE_VARIANTS,
  )) {
    // withoutEnlargement keeps small seller images from being upscaled, so the
    // public file is never larger than what the artist supplied.
    const resized = sharp(source, { failOn: "error" })
      .rotate()
      .resize({
        width: longSide,
        height: longSide,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality, effort: 4 });

    derivatives[variant] = await writeOwnCopyright(resized).toBuffer();
  }

  return derivatives;
};

export const derivativeFileName = (baseName, variant) =>
  `${baseName}.${variant}.webp`;
