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
import { useTheme } from "@mui/material/styles";
import ArtworkInfo from "./ArtworkInfo";
// Icons
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import InfoIcon from "@mui/icons-material/Info";

export default function ArtworkCard({ artworks, onEdit, onDelete }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedArtwork, setSelectedArtwork] = useState(null);
  const [openInfoDialog, setOpenInfoDialog] = useState(false);
  const open = Boolean(anchorEl);
  const theme = useTheme();

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
        <Card
          key={artwork.artwork_id}
          sx={{
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            minHeight: 390,
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 2.5,
            boxShadow: "none",
            transition: "border-color 0.2s, box-shadow 0.2s",
            "&:hover": {
              borderColor: "text.secondary",
              boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
            },
          }}
        >
          <Box
            sx={{
              width: "100%",
              aspectRatio: "5 / 4",
              position: "relative",
              backgroundColor: theme.palette.background.default,
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
                backgroundColor: theme.palette.background.paper,
                color: isVerified(artwork)
                  ? theme.palette.success.main
                  : theme.palette.warning.main,
                fontSize: 10,
                fontWeight: 700,
                boxShadow: "0 1px 4px rgba(15, 23, 42, 0.14)",
              }}
            />
          </Box>
          <CardContent
            sx={{
              p: 2,
              "&:last-child": { pb: 2 },
              flex: 1,
              minHeight: 150,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                mb: 1,
              }}
            >
              <Box>
                <Typography
                  variant="subtitle2"
                  sx={{
                    color: theme.palette.text.primary,
                    fontWeight: 700,
                    lineHeight: 1.25,
                  }}
                  noWrap
                >
                  {artwork.title}
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
                    sx={{ color: "#ff5a5f", fontWeight: 700 }}
                    noWrap
                  >
                    ₱{Number(artwork.price || 0).toLocaleString()}
                  </Typography>
                </Box>
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

            {/* Details Button */}
            <Button
              variant="contained"
              size="small"
              fullWidth
              startIcon={<VisibilityOutlinedIcon sx={{ fontSize: 15 }} />}
              onClick={() => handleInfoOpen(artwork)}
              sx={{
                mt: "auto",
                py: 0.65,
                backgroundColor: "#eef2f7",
                color: "#172033",
                border: "1px solid #cbd5e1",
                boxShadow: "none",
                fontSize: 11,
                "& .MuiButton-startIcon": { color: "#172033" },
                "&:hover": {
                  backgroundColor: "#ffffff",
                  borderColor: "#94a3b8",
                  boxShadow: "none",
                },
              }}
            >
              View Details
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
