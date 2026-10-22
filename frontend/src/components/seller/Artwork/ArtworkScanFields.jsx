import { Box, Button, Chip, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { getArtworkMediumOptions } from "../../../utils/artworkScanAttributes";

export default function ArtworkScanFields({
  formData,
  onMediumChange,
  onRemoveFeature,
  featureInput,
  onFeatureInputChange,
  onAddFeature,
  featureError,
  isEditing,
}) {
  const mediumOptions = getArtworkMediumOptions(formData.art_type, formData.product);
  const medium = formData.mediums_used ?? "";
  const features = formData.feature_scanned || [];
  const hasLegacyMedium = medium && medium !== "None" && !mediumOptions.includes(medium);

  return (
    <Stack spacing={2} sx={{ gridColumn: "1 / -1", minWidth: 0 }}>
      {mediumOptions.length > 0 && (
        <TextField
          select
          fullWidth
          label="Medium"
          name="mediums_used"
          value={medium}
          onChange={onMediumChange}
          helperText="Choose a medium to correct the scan result."
        >
          <MenuItem value="">{isEditing ? "Keep saved medium" : "Use scan result"}</MenuItem>
          {hasLegacyMedium && <MenuItem value={medium}>{medium} (current)</MenuItem>}
          {mediumOptions.map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}
          <MenuItem value="None">None</MenuItem>
        </TextField>
      )}

      <Box component="section" aria-label="Artwork features">
        <Typography component="h3" variant="subtitle2" sx={{ mb: 1 }}>
          Features
        </Typography>
        {features.length > 0 ? (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {features.map((feature) => (
              <Chip
                key={feature.toLowerCase()}
                label={feature.replace(/_/g, " ")}
                onDelete={() => onRemoveFeature(feature)}
                sx={{ maxWidth: "100%" }}
              />
            ))}
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">
            {formData.feature_scanned === null && !isEditing
              ? "Features will be detected when the artwork is saved. Add features here to use your own list."
              : "No features selected."}
          </Typography>
        )}
      </Box>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems="flex-start">
        <TextField
          fullWidth
          label="Add a feature"
          name="new_feature"
          value={featureInput}
          onChange={(event) => onFeatureInputChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              event.stopPropagation();
              onAddFeature();
            }
          }}
          error={Boolean(featureError)}
          helperText={featureError || "Separate multiple features with commas."}
        />
        <Button
          type="button"
          variant="outlined"
          onClick={onAddFeature}
          disabled={!featureInput.trim()}
          sx={{ flexShrink: 0, minHeight: 56, whiteSpace: "nowrap" }}
        >
          Add Feature
        </Button>
      </Stack>
    </Stack>
  );
}
