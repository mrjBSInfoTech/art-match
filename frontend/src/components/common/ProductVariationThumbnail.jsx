import Box from "@mui/material/Box";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import ArtworkImage from "./ArtworkImage";

/**
 * Displays a product variation thumbnail, falling back to the artwork's main
 * image or a neutral placeholder frame when no variation photo was uploaded.
 */
export default function ProductVariationThumbnail({
  image,
  fallbackImage,
  alt,
  sx,
}) {
  const resolvedImage = image || fallbackImage || "";
  const frameSx = {
    width: { xs: 64, sm: 72 },
    height: { xs: 64, sm: 72 },
    flexShrink: 0,
    borderRadius: 1.5,
    border: "1px solid",
    borderColor: "divider",
    bgcolor: "action.hover",
    ...sx,
  };

  if (!resolvedImage) {
    return (
      <Box
        aria-label={alt ? `${alt} placeholder` : "No variation image"}
        sx={{
          ...frameSx,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "text.disabled",
        }}
      >
        <ImageOutlinedIcon fontSize="small" />
      </Box>
    );
  }

  return (
    <ArtworkImage
      image={resolvedImage}
      variant="thumb"
      alt={alt}
      sx={{
        ...frameSx,
        objectFit: "cover",
        display: "block",
      }}
    />
  );
}
