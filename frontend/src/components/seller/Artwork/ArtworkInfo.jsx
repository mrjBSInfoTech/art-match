import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Slide,
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

  const formatAndCapitalize = (data) => {
    if (!data) return "N/A";

    let list = data;
    if (typeof data === "string") {
      try {
        const parsed = JSON.parse(data);
        list = Array.isArray(parsed) ? parsed : data.split(",");
      } catch {
        list = data.split(",");
      }
    }
    if (!Array.isArray(list)) list = [list];

    if (list.length === 0) return "N/A";

    const formatted = list
      .map((item) => {
        if (typeof item !== "string") return "";
        const trimmed = item.trim();
        if (!trimmed) return "";

        // Capitalize the first letter of each word (e.g., "vibrant colors" -> "Vibrant Colors")
        return trimmed
          .split(" ")
          .map(
            (word) =>
              word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
          )
          .join(" ");
      })
      .filter(Boolean); // Remove empty strings

    return formatted.length > 0 ? formatted.join(", ") : "N/A";
  };
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
              <strong>Title:</strong> {artwork.title || "N/A"}
            </Typography>

            <Typography variant="body2" color="text.secondary">
              <strong>Genre:</strong> {artwork.genre || "N/A"}
            </Typography>

            <Typography variant="body2" color="text.secondary">
              <strong>Size:</strong> {artwork.art_size || "N/A"}
            </Typography>

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
              <strong>Colors Used:</strong>{" "}
              {artwork.color_used || artwork.colors_used || "N/A"}
            </Typography>

            <Typography variant="body2" color="text.secondary">
              <strong>Features:</strong>{" "}
              {formatAndCapitalize(artwork.feature_scanned || artwork.features)}
            </Typography>

            <Typography variant="body2" color="text.secondary">
              <strong>Mediums Used:</strong>{" "}
              {formatAndCapitalize(artwork.mediums_used || artwork.mediums)}
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
