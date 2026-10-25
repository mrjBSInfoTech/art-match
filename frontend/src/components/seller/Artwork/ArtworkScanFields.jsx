import { Box, Button, Chip, MenuItem, Stack, TextField, Typography } from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import { ART_FEATURES } from "../../../constants/artworkOptions";
import { getArtworkMediumOptions } from "../../../utils/artworkScanAttributes";

const featureKey = (feature) => feature.toLowerCase().replace(/[_\s]+/g, " ").trim();

export default function ArtworkScanFields({
  formData,
  onMediumChange,
  onRemoveFeature,
  featureInput,
  onFeatureInputChange,
  onAddFeature,
  onSelectFeature,
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
                sx={{ maxWidth: "100%", fontWeight:"bold", }}
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

      {isEditing && (
        <Box component="section" aria-label="Suggested artwork features">
          <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 600 }}>
            Suggested features
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
            Select a chip to add it. Select it again to remove it.
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
            {ART_FEATURES.map((feature) => {
              const selectedFeature = features.find((value) => featureKey(value) === featureKey(feature));
              const isSelected = Boolean(selectedFeature);
              return (
                <Chip
                  key={feature}
                  label={feature.replace(/_/g, " ")}
                  clickable
                  aria-pressed={isSelected}
                  color={isSelected ? "primary" : "default"}
                  variant="filled"
                  icon={isSelected ? <CheckIcon /> : undefined}
                  onClick={() => isSelected ? onRemoveFeature(selectedFeature) : onSelectFeature(feature)}
                  sx={{
                    maxWidth: "100%",
                    height: 32,
                    borderRadius: 16,
                    fontWeight: "bold",
                    color: isSelected ? "#fff" : undefined,
                    "& .MuiChip-label": {
                      px: 1.25,
                    },
                  }}
                />
              );
            })}
          </Box>
        </Box>
      )}
    </Stack>
  );
}
