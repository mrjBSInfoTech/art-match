import { useId } from "react";
import {
  Autocomplete,
  Box,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import {
  ARTWORK_COLOR_PROFILES,
  ARTWORK_FILE_FORMATS,
} from "../../../utils/artworkDetails";

const FINE_ART_MATERIALS = [
  "Oil on canvas", "Acrylic on canvas", "Watercolor on paper", "Charcoal",
  "Pastel", "Pencil", "Ink", "Canvas", "Paper", "Wood", "Mixed media",
];
const PRODUCT_MATERIALS = [
  "Resin", "Wood", "Ceramic", "Clay", "Stainless steel", "Sterling silver",
  "Brass", "Aluminum", "Copper", "Glass", "Acrylic", "Yarn", "Fabric",
];

export default function ArtworkDetailsFields({
  category,
  formData,
  errors,
  onChange,
  materialInput,
  onMaterialInputChange,
  productStockTotal,
  isProductArtwork = false,
}) {
  const headingId = useId();
  const isPhysical = category === "fine_art" || category === "product";
  const formats = ["digital", "digital art"].includes(String(formData.art_type || "").trim().toLowerCase())
    ? ARTWORK_FILE_FORMATS.digital
    : ARTWORK_FILE_FORMATS.photography;

  return (
    <Box
      component="section"
      aria-labelledby={headingId}
      sx={{
        gridColumn: "1 / -1",
        display: "grid",
        gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "repeat(2, minmax(0, 1fr))" },
        gap: 2,
        "& > *": { minWidth: 0 },
      }}
    >
      <Typography id={headingId} component="h3" variant="subtitle2" sx={{ gridColumn: "1 / -1" }}>
        {category === "fine_art" ? "Care and materials" : category === "product" ? "Stock and materials" : "Digital file details"}
      </Typography>

      {category === "fine_art" && (
        <Stack spacing={0.5} sx={{ gridColumn: "1 / -1" }}>
          {[
            ["is_fragile", "Fragile"],
            ["humidity_sensitive", "Sensitive to humidity"],
            ["light_sensitive", "Sensitive to direct light"],
          ].map(([name, label]) => (
            <FormControlLabel
              key={name}
              label={label}
              control={<Switch name={name} checked={formData[name]} onChange={onChange} />}
            />
          ))}
        </Stack>
      )}

      {category === "product" && (
        <TextField
          required
          fullWidth
          label="Stock available"
          name="stock_available"
          type="number"
          value={isProductArtwork ? productStockTotal : formData.stock_available}
          onChange={onChange}
          error={Boolean(errors.stock_available)}
          helperText={errors.stock_available || (isProductArtwork
            ? "Calculated from the quantities of all products."
            : "Whole units available; use 0 for out of stock.")}
          disabled={isProductArtwork}
          slotProps={{ htmlInput: { min: 0, step: 1 } }}
          sx={{ gridColumn: "1 / -1" }}
        />
      )}

      {isPhysical && (
        <Autocomplete
          multiple
          freeSolo
          autoSelect
          filterSelectedOptions
          options={category === "fine_art" ? FINE_ART_MATERIALS : PRODUCT_MATERIALS}
          value={formData.material_composition}
          inputValue={materialInput}
          onInputChange={(_event, value) => onMaterialInputChange(value)}
          onChange={(_event, value) => onChange({ target: { name: "material_composition", value } })}
          renderInput={(params) => (
            <TextField
              {...params}
              label={category === "fine_art" ? "Material composition" : "Materials and specifications"}
              error={Boolean(errors.material_composition)}
              helperText={errors.material_composition || "Add at least one material. Type your own and press Enter, or choose a suggestion."}
              slotProps={{ htmlInput: { ...params.inputProps, "aria-required": true } }}
            />
          )}
          sx={{ gridColumn: "1 / -1" }}
        />
      )}

      {category === "digital" && (
        <>
          {[
            ["resolution_width", "Width (pixels)"],
            ["resolution_height", "Height (pixels)"],
          ].map(([name, label]) => (
            <TextField
              key={name}
              required
              fullWidth
              label={label}
              name={name}
              type="number"
              value={formData[name]}
              onChange={onChange}
              error={Boolean(errors[name])}
              helperText={errors[name] || "Positive whole pixels"}
              slotProps={{ htmlInput: { min: 1, step: 1 } }}
            />
          ))}
          <TextField
            select
            required
            fullWidth
            label="File format"
            name="file_format"
            value={formData.file_format}
            onChange={onChange}
            error={Boolean(errors.file_format)}
            helperText={errors.file_format || "Format of the artwork file"}
          >
            {formats.map((format) => <MenuItem key={format} value={format}>{format}</MenuItem>)}
          </TextField>
          <TextField
            select
            required
            fullWidth
            label="Color profile"
            name="color_profile"
            value={formData.color_profile}
            onChange={onChange}
            error={Boolean(errors.color_profile)}
            helperText={errors.color_profile || "Profile used in the artwork file"}
          >
            {ARTWORK_COLOR_PROFILES.map((profile) => <MenuItem key={profile} value={profile}>{profile}</MenuItem>)}
          </TextField>
        </>
      )}
    </Box>
  );
}
