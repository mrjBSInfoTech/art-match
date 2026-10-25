import { Box, Chip, Stack, Typography } from "@mui/material";
import { isArtworkSoldOut } from "../../../utils/artworkAvailability";

const missingValue = "Not provided";

function savedDetails(artwork) {
  let details = artwork.artwork_details;
  if (typeof details === "string") {
    try {
      details = JSON.parse(details);
    } catch {
      details = null;
    }
  }
  return details && typeof details === "object" && !Array.isArray(details)
    ? details : artwork;
}

function booleanLabel(value) {
  if (value === true || value === 1 || value === "1" || value === "true") return "Yes";
  if (value === false || value === 0 || value === "0" || value === "false") return "No";
  return missingValue;
}

function wholeNumber(value, minimum = 0) {
  if (!["number", "string"].includes(typeof value) || String(value).trim() === "") return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= minimum ? number : null;
}

export default function ArtworkAdditionalDetails({ artwork, category }) {
  const details = savedDetails(artwork);
  const isPhysical = category === "fine_art" || category === "product";
  const materials = Array.isArray(details.material_composition)
    ? [...new Set(details.material_composition.filter((value) => typeof value === "string")
      .map((value) => value.trim()).filter(Boolean))]
    : [];
  let heading;
  let fields;

  if (category === "fine_art") {
    heading = "Care and materials";
    fields = [
      ["Fragile", booleanLabel(details.is_fragile)],
      ["Sensitive to humidity", booleanLabel(details.humidity_sensitive)],
      ["Sensitive to direct light", booleanLabel(details.light_sensitive)],
    ];
  } else if (category === "product") {
    heading = "Stock and materials";
    const stock = wholeNumber(artwork.stock_available ?? details.stock_available);
    const sold = Number(artwork.sold_quantity);
    const remaining = isArtworkSoldOut(artwork) ? 0 : stock === null ? null
      : Math.max(0, stock - (Number.isFinite(sold) && sold > 0 ? sold : 0));
    fields = [["Stock available", remaining === null ? missingValue : remaining.toLocaleString()]];
  } else if (category === "digital") {
    heading = "Digital file details";
    const width = wholeNumber(details.resolution_width, 1);
    const height = wholeNumber(details.resolution_height, 1);
    fields = [
      ["Resolution", width !== null && height !== null
        ? `${width.toLocaleString()} × ${height.toLocaleString()} px` : missingValue],
      ["File format", typeof details.file_format === "string" ? details.file_format.trim().toUpperCase() || missingValue : missingValue],
      ["Color profile", typeof details.color_profile === "string" ? details.color_profile.trim() || missingValue : missingValue],
    ];
  } else {
    return null;
  }

  return (
    <Box component="section" aria-label={heading}>
      <Typography variant="caption" fontWeight={700} color="text.secondary"
        sx={{ textTransform: "uppercase", letterSpacing: 0.5, display: "block" }}>
        {heading}
      </Typography>
      <Box component="dl" sx={{
        display: "grid",
        gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "repeat(2, minmax(0, 1fr))", md: "repeat(3, minmax(0, 1fr))" },
        gap: 2, mt: 1.5, mb: 0, "& > *": { minWidth: 0 },
      }}>
        {fields.map(([label, value]) => (
          <Box key={label}>
            <Typography component="dt" variant="caption" color="text.secondary">{label}</Typography>
            <Typography component="dd" variant="body2" sx={{ m: 0, mt: 0.5, overflowWrap: "anywhere" }}>
              {value}
            </Typography>
          </Box>
        ))}
        {isPhysical && (
          <Box sx={{ gridColumn: "1 / -1" }}>
            <Typography component="dt" variant="caption" color="text.secondary">
              {category === "fine_art" ? "Material composition" : "Materials and specifications"}
            </Typography>
            <Box component="dd" sx={{ m: 0, mt: 0.5 }}>
              {materials.length > 0 ? (
                <Stack direction="row" flexWrap="wrap" gap={0.8}>
                  {materials.map((material) => (
                    <Chip key={material} label={material} size="small" variant="outlined"
                      sx={{ maxWidth: "100%", height: "auto", minHeight: 24,
                        "& .MuiChip-label": { whiteSpace: "normal", overflowWrap: "anywhere", py: 0.25 } }} />
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">{missingValue}</Typography>
              )}
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}
