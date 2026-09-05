import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Chip,
  Slide,
  Stack,
  Box,
  Typography,
} from "@mui/material";

// Animation transition
const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

function ArtworkInfo({ open, handleClose, selectedArtwork }) {
  const [artwork, setArtwork] = useState(null);

  useEffect(() => {
    if (selectedArtwork) {
      setArtwork(selectedArtwork);
    } else {
      setArtwork(null);
    }
  }, [selectedArtwork, open]);

  const formatList = (value) => {
    if (!value) return "N/A";

    let list = value;
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        list = Array.isArray(parsed) ? parsed : value.split(",");
      } catch {
        list = value.split(",");
      }
    }
    if (!Array.isArray(list)) list = [list];

    const formatted = list
      .map((item) => {
        if (typeof item !== "string") return "";

        return item
          .trim()
          .replace(/_/g, " ")
          .replace(/\s+/g, " ")
          .split(" ")
          .map(
            (word) =>
              word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
          )
          .join(" ");
      })
      .filter(Boolean);

    return formatted.length > 0 ? formatted.join(", ") : "N/A";
  };

  const toColorList = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(String).map((item) => item.trim()).filter(Boolean);
    } catch {
      // Scanned colors are usually comma-separated values.
    }
    return String(value).split(",").map((item) => item.trim()).filter(Boolean);
  };

  const isHexColor = (value) => /^#(?:[\da-f]{3}|[\da-f]{6}|[\da-f]{8})$/i.test(value);

  const getChipTextColor = (value) => {
    if (!isHexColor(value)) return "text.primary";
    const hex = value.replace("#", "");
    const expanded = hex.length === 3 ? hex.split("").map((part) => part + part).join("") : hex;
    const red = parseInt(expanded.slice(0, 2), 16);
    const green = parseInt(expanded.slice(2, 4), 16);
    const blue = parseInt(expanded.slice(4, 6), 16);
    return (red * 299 + green * 587 + blue * 114) / 1000 > 150 ? "#111" : "#fff";
  };

  const colors = artwork ? toColorList(artwork.color_used || artwork.colors_used) : [];

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      TransitionComponent={Transition}
      keepMounted
      PaperProps={{
        sx: { minWidth: "350px" },
      }}
    >
      <DialogTitle sx={{ fontWeight: "bold" }}>Artwork Information</DialogTitle>

      <DialogContent dividers>
        {artwork ? (
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              <strong>Name:</strong> {artwork.first_name}{" "}
              {artwork.middle_name ? artwork.middle_name.charAt(0) + ". " : ""}
              {artwork.last_name}
            </Typography>

            <Typography variant="body2" color="text.secondary">
              <strong>School Number:</strong> {artwork.student_number || "N/A"}
            </Typography>

            <Typography variant="body2" color="text.secondary">
              <strong>Course:</strong> {artwork.course || "N/A"}
            </Typography>

            <Typography variant="body2" color="text.secondary">
              <strong>Title:</strong> {artwork.title || "N/A"}
            </Typography>

            <Typography variant="body2" color="text.secondary">
              <strong>Genre:</strong> {artwork.genre || "N/A"}
            </Typography>

            <Typography variant="body2" color="text.secondary">
              <strong>Size:</strong> {artwork.art_size || "N/A"}
            </Typography>

            <Box>
              <Typography variant="body2" color="text.secondary">
                <strong>Colors Used:</strong>
              </Typography>
              {colors.length > 0 ? (
                <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 1, mb: 1 }}>
                  {colors.map((color, index) => (
                    <Chip
                      key={`${color}-${index}`}
                      label={formatList(color)}
                      size="small"
                      sx={{
                        backgroundColor: isHexColor(color) ? color : "action.hover",
                        color: getChipTextColor(color),
                        fontWeight: "bold",
                      }}
                    />
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">N/A</Typography>
              )}
            </Box>

            <Typography variant="body2" color="text.secondary">
              <strong>Price:</strong>{" "}
              {artwork.price
                ? `₱${Number(artwork.price).toLocaleString()}`
                : "N/A"}
            </Typography>

            <Typography variant="body2" color="text.secondary">
              <strong>Description:</strong> {artwork.description || "N/A"}
            </Typography>

            <Typography variant="body2" color="text.secondary">
              <strong>Features:</strong> {formatList(artwork.feature_scanned || artwork.features)}
            </Typography>

            <Typography variant="body2" color="text.secondary">
              <strong>Mediums Used:</strong> {formatList(artwork.mediums_used || artwork.mediums)}
            </Typography>

            <Typography variant="body2" color="text.secondary">
              <strong>Posted:</strong>{" "}
              {artwork.date_created
                ? new Date(artwork.date_created).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })
                : "N/A"}
            </Typography>
          </Box>
        ) : (
          <Typography>No artwork selected.</Typography>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} color="secondary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ArtworkInfo;
