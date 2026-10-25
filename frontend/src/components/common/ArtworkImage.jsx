import { Box } from "@mui/material";
import WatermarkedArtworkImage from "../buyer/Artwork/WatermarkedArtworkImage";

const fallbackSrc = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480"><rect width="100%" height="100%" fill="#e2e8f0"/><text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" fill="#64748b" font-family="sans-serif" font-size="24">Image unavailable</text></svg>',
);

// Seller/admin previews use the same signed B2 image route as public artwork.
// Their session must never be sent to the buyer authentication endpoint.
export default function ArtworkImage({ image, alt = "Artwork", sx, ...props }) {
  if (!image || /^(?:data:image\/|blob:)/i.test(image)) {
    return <Box component="img" {...props} src={image || fallbackSrc} alt={alt} sx={sx} />;
  }
  return <WatermarkedArtworkImage {...props} image={image} alt={alt} sx={sx}
    useBuyerIdentity={false} fallbackSrc={fallbackSrc} />;
}
