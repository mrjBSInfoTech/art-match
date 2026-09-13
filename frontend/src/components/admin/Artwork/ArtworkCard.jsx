import { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardMedia,
  CardContent,
  Chip,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import ArtworkInfo from "../../admin/Artwork/ArtworkInfo";
// Icons
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";

export default function ArtworkCard({ artworks, onVerify }) {
  const theme = useTheme();
  const [selectedArtwork, setSelectedArtwork] = useState(null);
  const [openInfoDialog, setOpenInfoDialog] = useState(false);
  const pendingArtworks = Array.isArray(artworks) ? artworks : [];

  const handleInfoOpen = (artwork) => {
    setSelectedArtwork(artwork);
    setOpenInfoDialog(true);
  };

  const handleInfoClose = () => {
    setOpenInfoDialog(false);
  };

  const getRequestStatus = (artwork) => {
    const raw = artwork?.request_status ?? artwork?.status ?? "";
    return String(raw).trim();
  };

  const isVerified = (artwork) =>
    String(getRequestStatus(artwork)).toLowerCase() === "verified";

  const currentRole = (localStorage.getItem("admin_role") || "")
    .toLowerCase()
    .trim();
  const isSuperAdmin = currentRole === "super admin";
  const canEdit =
    isSuperAdmin ||
    ["admin", "moderator"].includes(currentRole) ||
    (currentRole === "customize" &&
      ["1", "true"].includes(
        String(localStorage.getItem("admin_can_edit")).toLowerCase(),
      ));

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, minmax(0, 1fr))",
            md: "repeat(3, minmax(0, 1fr))",
            lg: "repeat(4, minmax(0, 1fr))",
          },
          gap: { xs: 1.5, sm: 2 },
        }}
      >
        {pendingArtworks.map((artwork) => (
          <Card
            key={artwork.artwork_id}
            sx={{
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              borderRadius: 1.5,
              boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
            }}
          >
            <Box
              sx={{
                width: "100%",
                aspectRatio: "1.35 / 1",
                position: "relative",
                backgroundColor: theme.palette.mode === "dark" ? "#1e293b" : "#f1f5f9",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CardMedia
                component="img"
                sx={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: "center",
                }}
                image={
                  artwork.image
                    ? `http://localhost:5000/uploads/seller/uploadArtwork/${encodeURIComponent(artwork.image)}`
                    : `https://via.placeholder.com/250x150?text=No+Image`
                }
                onError={(e) => {
                  console.error("Image failed to load:", artwork.image);
                  e.target.onerror = null;
                  e.target.src =
                    "https://via.placeholder.com/250x150?text=No+Image";
                }}
                alt={artwork.title}
              />
              <Chip
                label={isVerified(artwork) ? "APPROVED" : "PENDING"}
                size="small"
                sx={{
                  position: "absolute",
                  top: 10,
                  right: 10,
                  height: 22,
                  borderRadius: 2,
                  backgroundColor: "#fff",
                  color: isVerified(artwork) ? "#15803d" : "#d97706",
                  fontSize: 10,
                  fontWeight: 700,
                  boxShadow: "0 1px 4px rgba(15, 23, 42, 0.14)",
                }}
              />
            </Box>
            <CardContent sx={{ p: 1.25, "&:last-child": { pb: 1.25 }, flex: 1 }}>
              <Box
                sx={{
                  minHeight: 78,
                }}
              >
                <Box>
                  <Typography
                    variant="subtitle2"
                    sx={{ color: theme.palette.text.primary, fontWeight: 700, lineHeight: 1.25 }}
                    noWrap
                  >
                    {artwork.title}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ color: theme.palette.text.secondary, display: "block", mt: 0.5 }}
                    noWrap
                  >
                    By {artwork.first_name || "Unknown"}{" "}
                    {artwork.last_name || "Artist"}
                  </Typography>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 1,
                      mt: 1.25,
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{ color: theme.palette.text.secondary }}
                      noWrap
                    >
                      Size: {artwork.art_size || "N/A"}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ color: "#ff5a5f", fontWeight: 700 }}
                      noWrap
                    >
                      ₱{Number(artwork.price || 0).toLocaleString()}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              <Button
                variant="contained"
                size="small"
                fullWidth
                startIcon={<VisibilityOutlinedIcon sx={{ fontSize: 15 }} />}
                onClick={() => handleInfoOpen(artwork)}
                sx={{
                  mt: 0.75,
                  py: 0.55,
                  backgroundColor: theme.palette.mode === "dark" ? "#1e293b" : "#f1f5f9",
                  color: theme.palette.text.primary,
                  border: `1px solid ${theme.palette.divider}`,
                  boxShadow: "none",
                  fontSize: 11,
                  "& .MuiButton-startIcon": { color: theme.palette.error.main },
                  "&:hover": {
                    backgroundColor: theme.palette.action.hover,
                    borderColor: theme.palette.text.secondary,
                    boxShadow: "none",
                  },
                }}
              >
                View Details
              </Button>
            </CardContent>
          </Card>
        ))}
      </Box>

      <ArtworkInfo
        open={openInfoDialog}
        handleClose={handleInfoClose}
        selectedArtwork={selectedArtwork}
        onVerify={onVerify}
        canEdit={canEdit}
      />
    </Box>
  );
}
