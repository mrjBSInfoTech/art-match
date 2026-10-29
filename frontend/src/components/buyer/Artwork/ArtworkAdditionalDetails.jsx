import { Stack, Typography } from "@mui/material";
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

function Row({ label, value }) {
  return (
    <Stack
      direction="row"
      justifyContent="space-between"
      alignItems="center"
      columnGap={{ xs: 2, sm: 3 }}
    >
      <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>
        {label}
      </Typography>

      <Typography
        component="div"
        variant="body2"
        fontWeight={500}
        sx={{ textAlign: "right", minWidth: 0, overflowWrap: "anywhere" }}
      >
        {value || "-"}
      </Typography>
    </Stack>
  );
}

export default function ArtworkAdditionalDetails({ artwork, category, RowComponent }) {
  const ROW = RowComponent || Row;
  const details = savedDetails(artwork);
  const isPhysical = category === "fine_art" || category === "product";
  const materials = Array.isArray(details.material_composition)
    ? [...new Set(details.material_composition.filter((value) => typeof value === "string")
      .map((value) => value.trim()).filter(Boolean))]
    : [];
  let fields;

  if (category === "fine_art") {
    fields = [
      ["Fragile", booleanLabel(details.is_fragile)],
      ["Sensitive to humidity", booleanLabel(details.humidity_sensitive)],
      ["Sensitive to direct light", booleanLabel(details.light_sensitive)],
    ];
  } else if (category === "product") {
    const stock = wholeNumber(artwork.stock_available ?? details.stock_available);
    const sold = Number(artwork.sold_quantity);
    const remaining = isArtworkSoldOut(artwork) ? 0 : stock === null ? null
      : Math.max(0, stock - (Number.isFinite(sold) && sold > 0 ? sold : 0));
    fields = [["Stock available", remaining === null ? missingValue : remaining.toLocaleString()]];
  } else if (category === "digital") {
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
    <>
        {fields.map(([label, value]) => (
          <ROW key={label} label={label} value={value} />
        ))}
        {isPhysical && (
          <ROW
            label={category === "fine_art" ? "Material composition" : "Materials and specifications"}
            value={materials.length > 0 ? materials.join(", ") : missingValue}
          />
        )}
    </>
  );
}
