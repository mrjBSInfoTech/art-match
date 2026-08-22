import { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardMedia,
  CardContent,
  Chip,
  Typography,
  IconButton,
  Stack,
} from "@mui/material";
import ArtworkInfo from "../../admin/Artwork/ArtworkInfo";
// Icons
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import PendingIcon from "@mui/icons-material/Pending";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import InfoIcon from "@mui/icons-material/Info";

export default function ArtworkCard({ artworks, onVerify }) {
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

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            md: "repeat(3, 1fr)",
            lg: "repeat(4, 1fr)",
          },
          gap: 2,
        }}
      >
        {pendingArtworks.map((artwork) => (
          <Card key={artwork.artwork_id}>
            <Box
              sx={{
                width: "100%",
                height: 300,
                position: "relative",
                backgroundColor: "#f5f5f5",
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
            </Box>
            <CardContent sx={{ flex: 1, overflow: "auto" }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  mb: 2,
                }}
              >
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                    {artwork.title}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    {artwork.art_size || "No size available."}
                  </Typography>
                  <Chip
                    icon={
                      isVerified(artwork) ? (
                        <CheckCircleIcon />
                      ) : (
                        <PendingIcon />
                      )
                    }
                    label={isVerified(artwork) ? "Verified" : "Pending"}
                    color={isVerified(artwork) ? "success" : "warning"}
                    size="small"
                    sx={{
                      backdropFilter: "blur(4px)",
                      boxShadow: 2,
                      color: "white",
                    }}
                  />
                </Box>
                <IconButton
                  size="small"
                  onClick={() => handleInfoOpen(artwork)}
                  sx={{
                    ml: "auto",
                    "&:hover": {
                      backgroundColor: "action.hover",
                    },
                  }}
                >
                  <InfoOutlinedIcon fontSize="small" />
                </IconButton>
              </Box>

              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1}
                sx={{ mt: "auto" }}
              >
                {!isVerified(artwork) && (
                  <Button
                    variant="contained"
                    size="small"
                    color="success"
                    fullWidth
                    sx={{ color: "#fff" }}
                    onClick={() => onVerify?.(artwork)}
                  >
                    Verify
                  </Button>
                )}
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Box>

      <ArtworkInfo
        open={openInfoDialog}
        handleClose={handleInfoClose}
        selectedArtwork={selectedArtwork}
      />
    </Box>
  );
}
