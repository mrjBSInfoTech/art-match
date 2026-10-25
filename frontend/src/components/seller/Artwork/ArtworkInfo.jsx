import React, { useEffect, useState } from "react";
import {
  Dialog,
  Alert,
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
import { useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import PaletteOutlinedIcon from "@mui/icons-material/PaletteOutlined";
import CheckIcon from "@mui/icons-material/Check";
import { getSellerProfile } from "../../../api/seller/sellerAPI";
import ArtworkImage from "../../common/ArtworkImage";

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
  const theme = useTheme();
  const artwork = selectedArtwork;
  const [sellerDetails, setSellerDetails] = useState(null);
  const ownerId = artwork?.student_id;
  const needsProfile = Boolean(artwork) &&
    (!artwork.first_name || !artwork.last_name || !artwork.student_number || !artwork.course);

  useEffect(() => {
    if (!open || !needsProfile || !ownerId) return;
    let active = true;
    getSellerProfile()
      .then((profile) => {
        if (String(profile.student_id) !== String(ownerId)) {
          throw new Error("Seller profile does not match this artwork's owner.");
        }
        if (active) setSellerDetails({ ownerId, profile });
      })
      .catch((error) => {
        if (active) setSellerDetails({ ownerId, error: error.message });
      });
    return () => { active = false; };
  }, [open, ownerId, needsProfile]);

  const profileState = sellerDetails && String(sellerDetails.ownerId) === String(ownerId)
    ? sellerDetails : null;
  const sellerProfile = profileState?.profile;
  const profileFallback = needsProfile && open && ownerId && !profileState
    ? "Loading seller details..." : "Not provided";
  const sellerName = [
    artwork?.first_name || sellerProfile?.first_name,
    artwork?.last_name || sellerProfile?.last_name,
  ].filter(Boolean).join(" ");

  const formatList = (value, fallback = "Not provided") => {
    if (!value) return fallback;

    let list = value;
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        list = Array.isArray(parsed) ? parsed : typeof parsed === "string" ? parsed.split(",") : value.split(",");
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

    return formatted.length > 0 ? formatted.join(", ") : fallback;
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
  const requestStatus = String(artwork?.request_status || artwork?.status || "Unverified").trim().toLowerCase();
  const statusShade = theme.palette.mode === "dark" ? "light" : "dark";
  const statusColor = ["verified", "approved"].includes(requestStatus)
    ? theme.palette.success[statusShade]
    : requestStatus === "rejected"
      ? theme.palette.error[statusShade]
      : ["pending", "requested"].includes(requestStatus)
        ? theme.palette.warning[statusShade]
        : theme.palette.text.secondary;

  const imageUrl = artwork?.image || artwork?.image_url;

  const detailLabelSx = {
    display: "block",
    color: theme.palette.text.secondary,
    fontSize: 11,
    lineHeight: 1.2,
    mb: 0.35,
  };

  const detailValueSx = {
    color: theme.palette.text.primary,
    fontSize: 12,
    fontWeight: 600,
    lineHeight: 1.35,
    overflowWrap: "anywhere",
    whiteSpace: "pre-wrap",
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
          backgroundColor: theme.palette.background.paper,
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
          color: theme.palette.text.primary,
          fontSize: 16,
          fontWeight: 700,
          borderBottom: `1px solid ${theme.palette.divider}`,
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
            color: theme.palette.text.secondary,
          }}
        >
          <CloseIcon sx={{ fontSize: 18 }} />
        </Button>
      </DialogTitle>

      <DialogContent dividers>
        {needsProfile && profileState?.error && (
          <Alert severity="warning" sx={{ mt: 1 }}>
            Unable to load seller information: {profileState.error}
          </Alert>
        )}
        {artwork ? (
          <Box>
            <Box
              sx={{
                position: "relative",
                width: "100%",
                aspectRatio: "16 / 7",
                overflow: "hidden",
                borderRadius: 2,
                border: `1px solid ${theme.palette.divider}`,
                backgroundColor: theme.palette.background.default,
                mt: 1.5,
              }}
            >
              <ArtworkImage
                image={imageUrl}
                alt={artwork.title || "Artwork preview"}
                sx={{
                  width: "100%",
                  height: "100%",
                  display: "block",
                  objectFit: "cover",
                }}
              />
              <Chip
                label={requestStatus.toUpperCase()}
                size="small"
                sx={{
                  position: "absolute",
                  top: 10,
                  right: 10,
                  height: 22,
                  backgroundColor: theme.palette.background.paper,
                  color: statusColor,
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
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2,
                backgroundColor: theme.palette.background.default,
              }}
            >
              <Box>
                <Typography sx={detailLabelSx}>Name</Typography>
                <Typography sx={detailValueSx}>
                  {sellerName || profileFallback}
                </Typography>
              </Box>
              <Box>
                <Typography sx={detailLabelSx}>School Number</Typography>
                <Typography sx={detailValueSx}>
                  {artwork.student_number || sellerProfile?.student_number || profileFallback}
                </Typography>
              </Box>
              <Box sx={{ gridColumn: { xs: "auto", sm: "1 / -1" } }}>
                <Typography sx={detailLabelSx}>Course</Typography>
                <Typography sx={detailValueSx}>
                  {artwork.course || sellerProfile?.course || profileFallback}
                </Typography>
              </Box>
              <Box>
                <Typography sx={detailLabelSx}>Title</Typography>
                <Typography sx={detailValueSx}>
                  {artwork.title || "Not provided"}
                </Typography>
              </Box>
              <Box>
                <Typography sx={detailLabelSx}>Genre</Typography>
                <Typography sx={detailValueSx}>
                  {artwork.genre || "Not provided"}
                </Typography>
              </Box>
              <Box>
                <Typography sx={detailLabelSx}>Size</Typography>
                <Typography sx={detailValueSx}>
                  {artwork.art_size || "Not provided"}
                </Typography>
              </Box>
              <Box>
                <Typography sx={detailLabelSx}>Price</Typography>
                <Typography sx={{ ...detailValueSx, color: "#dc2626" }}>
                  {artwork.price !== null && artwork.price !== undefined && artwork.price !== "" && Number.isFinite(Number(artwork.price))
                    ? new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(Number(artwork.price))
                    : "Not provided"}
                </Typography>
              </Box>
              <Box>
                <Typography sx={detailLabelSx}>Art Type</Typography>
                <Typography sx={detailValueSx}>
                  {formatList(artwork.art_type) || "Not provided"}
                </Typography>
              </Box>
              <Box>
                <Typography sx={detailLabelSx}>Product</Typography>
                <Typography sx={detailValueSx}>
                  {formatList(artwork.product) || "Not provided"}
                </Typography>
              </Box>

              <Box sx={{ gridColumn: { xs: "auto", sm: "1 / -1" } }}>
                <Typography sx={detailLabelSx}>Color(s) Used</Typography>
                {colors.length > 0 ? (
                  <Stack direction="row" flexWrap="wrap" gap={0.75}>
                    {colors.map((color, index) => (
                      <Chip
                        key={`${color}-${index}`}
                        label={formatList(color)}
                        size="small"
                        sx={{
                          height: 20,
                          backgroundColor: isHexColor(color)
                            ? color
                            : theme.palette.background.paper,
                          color: getChipTextColor(color),
                          border: `1px solid ${theme.palette.divider}`,
                          fontSize: 10,
                        }}
                      />
                    ))}
                  </Stack>
                ) : (
                  <Typography sx={detailValueSx}>No color results available</Typography>
                )}
              </Box>

              <Box sx={{ gridColumn: { xs: "auto", sm: "1 / -1" } }}>
                <Typography sx={detailLabelSx}>Description</Typography>
                <Typography sx={detailValueSx}>
                  {artwork.description || "Not provided"}
                </Typography>
              </Box>
              <Box>
                <Typography sx={detailLabelSx}>Features</Typography>
                <Typography sx={detailValueSx}>
                  {formatList(artwork.feature_scanned || artwork.features, "No scan results available")}
                </Typography>
              </Box>
              <Box>
                <Typography sx={detailLabelSx}>Mediums Used</Typography>
                <Typography sx={detailValueSx}>
                  {formatList(artwork.mediums_used || artwork.mediums, "No scan results available")}
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
                    : "Not provided"}
                </Typography>
              </Box>
            </Box>
          </Box>
        ) : (
          <Typography sx={{ color: theme.palette.text.secondary }}>
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
          borderTop: `1px solid ${theme.palette.divider}`,
        }}
      >
        {["unverified", "rejected"].includes(String(artwork?.request_status || artwork?.status || "").trim().toLowerCase()) && canEdit && (
          <Button
            onClick={() => onVerify?.(artwork)}
            variant="contained"
            startIcon={<CheckIcon />}
            sx={{
              backgroundColor: "success.main",
              color: "#fff",
              fontSize: 11,
              fontWeight: 700,
              "&:hover": { backgroundColor: "success.dark" },
            }}
          >
            Verify Artwork
          </Button>
        )}
        <Button
          onClick={handleClose}
          sx={{
            backgroundColor: theme.palette.action.hover,
            color: theme.palette.text.primary,
            fontSize: 11,
            fontWeight: 600,
            "&:hover": { backgroundColor: theme.palette.action.selected },
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ArtworkInfo;
