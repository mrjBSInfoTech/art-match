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
import CloseIcon from "@mui/icons-material/Close";
import PaletteOutlinedIcon from "@mui/icons-material/PaletteOutlined";
import CheckIcon from "@mui/icons-material/Check";

// Animation transition
const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

function ArtworkInfo({
  open,
  handleClose,
  selectedArtwork,
  onVerify,
  canEdit,
}) {
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
    if (Array.isArray(value))
      return value
        .map(String)
        .map((item) => item.trim())
        .filter(Boolean);
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed))
        return parsed
          .map(String)
          .map((item) => item.trim())
          .filter(Boolean);
    } catch {
      // Scanned colors are usually comma-separated values.
    }
    return String(value)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  };

  const isHexColor = (value) =>
    /^#(?:[\da-f]{3}|[\da-f]{6}|[\da-f]{8})$/i.test(value);

  const getChipTextColor = (value) => {
    if (!isHexColor(value)) return "#334155";
    const hex = value.replace("#", "");
    const expanded =
      hex.length === 3
        ? hex
            .split("")
            .map((part) => part + part)
            .join("")
        : hex;
    const red = parseInt(expanded.slice(0, 2), 16);
    const green = parseInt(expanded.slice(2, 4), 16);
    const blue = parseInt(expanded.slice(4, 6), 16);
    return (red * 299 + green * 587 + blue * 114) / 1000 > 150
      ? "#111"
      : "#fff";
  };

  const colors = artwork
    ? toColorList(artwork.color_used || artwork.colors_used)
    : [];
  const isVerified = artwork
    ? String(artwork.request_status || artwork.status || "").toLowerCase() ===
      "verified"
    : false;

  const imageUrl = artwork?.image
    ? `http://localhost:5000/uploads/seller/uploadArtwork/${encodeURIComponent(artwork.image)}`
    : "https://via.placeholder.com/640x360?text=No+Image";

  const detailLabelSx = {
    display: "block",
    color: "#475569",
    fontSize: 11,
    lineHeight: 1.2,
    mb: 0.35,
  };

  const detailValueSx = {
    color: "#0f172a",
    fontSize: 12,
    fontWeight: 600,
    lineHeight: 1.35,
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      TransitionComponent={Transition}
      keepMounted
      PaperProps={{
        sx: {
          width: "min(100% - 24px, 470px)",
          maxWidth: "470px",
          borderRadius: 3,
          overflow: "hidden",
          backgroundColor: "#fff",
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.75,
          px: 2.5,
          py: 1.75,
          color: "#0f172a",
          fontSize: 16,
          fontWeight: 700,
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        <PaletteOutlinedIcon sx={{ color: "#ef3340", fontSize: 20 }} />
        Artwork Information
        <Button
          aria-label="Close artwork information"
          onClick={handleClose}
          sx={{
            minWidth: 28,
            width: 28,
            height: 28,
            ml: "auto",
            p: 0,
            color: "#64748b",
          }}
        >
          <CloseIcon sx={{ fontSize: 18 }} />
        </Button>
      </DialogTitle>

      <DialogContent sx={{ p: 2.5, backgroundColor: "#fff" }}>
        {artwork ? (
          <Box>
            <Box
              sx={{
                position: "relative",
                width: "100%",
                aspectRatio: "16 / 7",
                overflow: "hidden",
                borderRadius: 2,
                border: "1px solid #cbd5e1",
                backgroundColor: "#f1f5f9",
              }}
            >
              <Box
                component="img"
                src={imageUrl}
                alt={artwork.title || "Artwork preview"}
                onError={(event) => {
                  event.currentTarget.src =
                    "https://via.placeholder.com/640x360?text=No+Image";
                }}
                sx={{
                  width: "100%",
                  height: "100%",
                  display: "block",
                  objectFit: "cover",
                }}
              />
              <Chip
                label={isVerified ? "APPROVED" : "PENDING"}
                size="small"
                sx={{
                  position: "absolute",
                  top: 10,
                  right: 10,
                  height: 22,
                  backgroundColor: "#fff",
                  color: isVerified ? "#15803d" : "#d97706",
                  fontSize: 10,
                  fontWeight: 700,
                  boxShadow: "0 1px 4px rgba(15, 23, 42, 0.16)",
                }}
              />
            </Box>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                gap: 1.5,
                mt: 1.75,
                p: 1.5,
                border: "1px solid #e2e8f0",
                borderRadius: 2,
                backgroundColor: "#f8fafc",
              }}
            >
              <Box>
                <Typography sx={detailLabelSx}>Name</Typography>
                <Typography sx={detailValueSx}>
                  {artwork.first_name || "N/A"} {artwork.last_name || ""}
                </Typography>
              </Box>
              <Box>
                <Typography sx={detailLabelSx}>School Number</Typography>
                <Typography sx={detailValueSx}>
                  {artwork.student_number || "N/A"}
                </Typography>
              </Box>
              <Box sx={{ gridColumn: { xs: "auto", sm: "1 / -1" } }}>
                <Typography sx={detailLabelSx}>Course</Typography>
                <Typography sx={detailValueSx}>
                  {artwork.course || "N/A"}
                </Typography>
              </Box>
              <Box>
                <Typography sx={detailLabelSx}>Title</Typography>
                <Typography sx={detailValueSx}>
                  {artwork.title || "N/A"}
                </Typography>
              </Box>
              <Box>
                <Typography sx={detailLabelSx}>Genre</Typography>
                <Typography sx={detailValueSx}>
                  {artwork.genre || "N/A"}
                </Typography>
              </Box>
              <Box>
                <Typography sx={detailLabelSx}>Size</Typography>
                <Typography sx={detailValueSx}>
                  {artwork.art_size || "N/A"}
                </Typography>
              </Box>
              <Box>
                <Typography sx={detailLabelSx}>Price</Typography>
                <Typography sx={{ ...detailValueSx, color: "#dc2626" }}>
                  {artwork.price
                    ? `₱${Number(artwork.price).toLocaleString()}`
                    : "N/A"}
                </Typography>
              </Box>

              <Box sx={{ gridColumn: { xs: "auto", sm: "1 / -1" } }}>
                <Typography sx={detailLabelSx}>Color Used</Typography>
                {colors.length > 0 ? (
                  <Stack direction="row" flexWrap="wrap" gap={0.75}>
                    {colors.map((color, index) => (
                      <Chip
                        key={`${color}-${index}`}
                        label={formatList(color)}
                        size="small"
                        sx={{
                          height: 20,
                          backgroundColor: isHexColor(color) ? color : "#fff",
                          color: getChipTextColor(color),
                          border: "1px solid #cbd5e1",
                          fontSize: 10,
                        }}
                      />
                    ))}
                  </Stack>
                ) : (
                  <Typography sx={detailValueSx}>N/A</Typography>
                )}
              </Box>

              <Box sx={{ gridColumn: { xs: "auto", sm: "1 / -1" } }}>
                <Typography sx={detailLabelSx}>Description</Typography>
                <Typography sx={detailValueSx}>
                  {artwork.description || "N/A"}
                </Typography>
              </Box>
              <Box>
                <Typography sx={detailLabelSx}>Features</Typography>
                <Typography sx={detailValueSx}>
                  {formatList(artwork.feature_scanned || artwork.features)}
                </Typography>
              </Box>
              <Box>
                <Typography sx={detailLabelSx}>Mediums Used</Typography>
                <Typography sx={detailValueSx}>
                  {formatList(artwork.mediums_used || artwork.mediums)}
                </Typography>
              </Box>
              <Box sx={{ gridColumn: { xs: "auto", sm: "1 / -1" } }}>
                <Typography sx={detailLabelSx}>Posted</Typography>
                <Typography sx={detailValueSx}>
                  {artwork.date_created
                    ? new Date(artwork.date_created).toLocaleDateString(
                        "en-US",
                        { month: "long", day: "numeric", year: "numeric" },
                      )
                    : "N/A"}
                </Typography>
              </Box>
            </Box>
          </Box>
        ) : (
          <Typography sx={{ color: "#475569" }}>
            No artwork selected.
          </Typography>
        )}
      </DialogContent>

      <DialogActions
        sx={{
          justifyContent: "flex-end",
          gap: 1,
          px: 2.5,
          py: 1.5,
          borderTop: "1px solid #e2e8f0",
        }}
      >
        {!isVerified && canEdit && (
          <Button
            onClick={async () => {
              await onVerify?.(artwork);
              handleClose();
            }}
            variant="contained"
            startIcon={<CheckIcon />}
            sx={{
              backgroundColor: "#4fbea0",
              color: "#fff",
              fontSize: 11,
              fontWeight: 700,
              "&:hover": { backgroundColor: "#3da98c" },
            }}
          >
            Verify Artwork
          </Button>
        )}
        <Button
          onClick={handleClose}
          sx={{
            backgroundColor: "#e8eef5",
            color: "#172033",
            fontSize: 11,
            fontWeight: 600,
            "&:hover": { backgroundColor: "#dbe4ee" },
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ArtworkInfo;
