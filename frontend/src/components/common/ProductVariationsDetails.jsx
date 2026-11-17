import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import ProductVariationThumbnail from "./ProductVariationThumbnail";

const formatPhp = (amount) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(Number(amount));

/**
 * Renders product variation cards (with variation-specific thumbnails and clean
 * fallback handling) inside Seller and Admin ArtworkInfo dialogs.
 */
export default function ProductVariationsDetails({
  artwork,
  productOptions = [],
  detailLabelSx,
  detailValueSx,
}) {
  const theme = useTheme();
  const isProductArtwork =
    String(artwork?.art_type || "").trim().toLowerCase() === "product";

  if (!isProductArtwork || !productOptions.length) return null;

  return (
    <Box sx={{ gridColumn: { xs: "auto", sm: "1 / -1" } }}>
      <Typography sx={detailLabelSx}>Product Details</Typography>
      <Stack spacing={1.25} sx={{ mt: 0.5 }}>
        {productOptions.map((option, index) => {
          const optionImage = option?.imagePreview || option?.image || "";
          const fallbackImage = artwork?.image || "";
          const hasSpecificImage = Boolean(optionImage);
          return (
            <Box
              key={option.id || `${option.name || "product"}-${index}`}
              sx={{
                p: 1.5,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2,
                backgroundColor: theme.palette.background.paper,
              }}
            >
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "72px minmax(0, 1fr)", sm: "84px minmax(0, 1fr)" },
                  gap: 1.25,
                  alignItems: "start",
                }}
              >
                <ProductVariationThumbnail
                  image={optionImage}
                  fallbackImage={fallbackImage}
                  alt={option.name || `Product ${index + 1}`}
                  sx={{
                    width: { xs: 72, sm: 84 },
                    height: { xs: 72, sm: 84 },
                  }}
                />
                <Box sx={{ minWidth: 0 }}>
                  <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap">
                    <Typography sx={{ ...detailValueSx, fontSize: 13 }}>
                      {option.name || `Product ${index + 1}`}
                    </Typography>
                    {!hasSpecificImage && (
                      <Chip
                        size="small"
                        variant="outlined"
                        label={fallbackImage ? "Uses main photo" : "No photo"}
                        sx={{ height: 20, fontSize: 10.5 }}
                      />
                    )}
                  </Stack>
                  <Typography sx={{ ...detailValueSx, mt: 0.5, color: theme.palette.text.secondary }}>
                    {option.description || "No description provided."}
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 0.75 }}>
                    {option.quantity !== undefined && option.quantity !== null && (
                      <Chip
                        size="small"
                        label={`Qty: ${Number(option.quantity).toLocaleString()}`}
                        sx={{ fontWeight: 700 }}
                      />
                    )}
                    {option.stock_quantity !== undefined && option.stock_quantity !== null && (
                      <Chip
                        size="small"
                        label={`Stock: ${Number(option.stock_quantity).toLocaleString()}`}
                        sx={{ fontWeight: 700 }}
                      />
                    )}
                    {option.price !== undefined && option.price !== null && (
                      <Chip
                        size="small"
                        label={formatPhp(option.price)}
                        sx={{ fontWeight: 700 }}
                      />
                    )}
                  </Stack>
                </Box>
              </Box>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}
