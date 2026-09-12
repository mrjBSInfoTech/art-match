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
  Menu,
  MenuItem,
} from "@mui/material";
import ArtworkInfo from "./ArtworkInfo";
// Icons
import VerifiedUserRoundedIcon from '@mui/icons-material/VerifiedUserRounded';
import HourglassBottomRoundedIcon from '@mui/icons-material/HourglassBottomRounded';
import MoreVertIcon from "@mui/icons-material/MoreVert";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import InfoIcon from "@mui/icons-material/Info";

export default function ArtworkCard({ artworks, onEdit, onDelete }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedArtwork, setSelectedArtwork] = useState(null);
  const [openInfoDialog, setOpenInfoDialog] = useState(false);
  const open = Boolean(anchorEl);

  const handleMenuOpen = (event, artwork) => {
    setAnchorEl(event.currentTarget);
    setSelectedArtwork(artwork);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

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
      {artworks.map((artwork) => (
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
                  icon={isVerified(artwork) ? <VerifiedUserRoundedIcon /> : <HourglassBottomRoundedIcon />}
                  label={getRequestStatus(artwork) ? getRequestStatus(artwork) : "Pending"}
                  color={isVerified(artwork) ? "success" : "warning"}
                  size="small"
                  sx={{
                    color: "white",
                    mt: 1,
                  }}
                />
              </Box>
              <IconButton
                size="small"
                onClick={(e) => handleMenuOpen(e, artwork)}
                sx={{
                  ml: "auto",
                  "&:hover": {
                    backgroundColor: "action.hover",
                  },
                }}
              >
                <MoreVertIcon fontSize="small" />
              </IconButton>
            </Box>

            {/* Info Button */}
            <Button
              variant="outlined"
              size="small"
              fullWidth
              startIcon={<InfoIcon />}
              onClick={() => handleInfoOpen(artwork)}
              sx={{ mb: 2 }}
            >
              View Info
            </Button>

            {/* Options Menu */}
            <Menu
              anchorEl={anchorEl}
              open={open && selectedArtwork?.artwork_id === artwork.artwork_id}
              onClose={handleMenuClose}
              anchorOrigin={{
                vertical: "bottom",
                horizontal: "right",
              }}
              transformOrigin={{
                vertical: "top",
                horizontal: "right",
              }}
            >
              <MenuItem
                onClick={() => {
                  onEdit(selectedArtwork);
                  handleMenuClose();
                }}
                sx={{
                  color: "success.main",
                }}
              >
                <EditIcon sx={{ mr: 1, fontSize: "20px" }} />
                Edit
              </MenuItem>
              <MenuItem
                onClick={() => {
                  onDelete(selectedArtwork.artwork_id);
                  handleMenuClose();
                }}
                sx={{
                  color: "error.main",
                }}
              >
                <DeleteIcon sx={{ mr: 1, fontSize: "20px" }} />
                Delete
              </MenuItem>
            </Menu>
          </CardContent>
        </Card>
      ))}

      {/* Resident Info Dialog */}
      <ArtworkInfo
        open={openInfoDialog}
        handleClose={handleInfoClose}
        selectedArtwork={selectedArtwork}
      />
    </Box>
  );
}
