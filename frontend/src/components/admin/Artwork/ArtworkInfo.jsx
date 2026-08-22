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

  const formatList = (value) => {
    if (!value) return "N/A";
    if (Array.isArray(value)) return value.filter(Boolean).join(", ");
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter(Boolean).join(", ");
    } catch {
      // Stored feature values are usually comma-separated strings.
    }
    return String(value).split(",").map((item) => item.trim()).filter(Boolean).join(", ") || "N/A";
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

            <Typography variant="body2" color="text.secondary">
              <strong>Color Used:</strong> {artwork.color_used || "N/A"}
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
