import { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardMedia,
  CardContent,
  Typography,
  IconButton,
  Menu,
  MenuItem,
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import InfoIcon from "@mui/icons-material/Info";
import OfficialInfo from "./OfficialInfo";

export default function OfficialCard({ officials, onEdit, onDelete }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedOfficial, setSelectedOfficial] = useState(null);
  const [openInfoDialog, setOpenInfoDialog] = useState(false);
  const open = Boolean(anchorEl);

  // Open/Close menu handlers
  const handleMenuOpen = (event, official) => {
    setAnchorEl(event.currentTarget);
    setSelectedOfficial(official);
  };
  const handleMenuClose = () => {
    setAnchorEl(null);
  };  

  // Open Official Info dialog
  const handleInfoOpen = (official) => {
    setSelectedOfficial(official);
    setOpenInfoDialog(true);
  };

  const handleInfoClose = () => {
    setOpenInfoDialog(false);
  };

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
      {officials.map((official) => (
        <Card key={official.official_id}>
          <Box
            sx={{
              width: "100%",
              height: 200,
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
                official.image
                  ? `http://localhost:5000/uploads/uploadOfficial/${encodeURIComponent(official.image)}`
                  : `http://localhost:5000/uploads/uploadOfficial/profile.jpg`
              }
              loading="lazy"
              onError={(e) => {
                console.error("Image failed to load:", official.image);
                e.target.onerror = null;
                e.target.src =
                  "https://via.placeholder.com/250x150?text=No+Image";
              }}
              alt={official.first_name}
            />
          </Box>
          {/* Official Details */}
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
                  {official.first_name}{" "}
                  {official.middle_name
                    ? official.middle_name.charAt(0) + ". "
                    : ""}
                  {official.last_name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {official.position || "N/A"}
                </Typography>
              </Box>
              <IconButton
                size="small"
                onClick={(e) => handleMenuOpen(e, official)}
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
              onClick={() => handleInfoOpen(official)}
              sx={{ mb: 2 }}
            >
              View Info
            </Button>

            {/* Options Menu */}
            <Menu
              anchorEl={anchorEl}
              open={open && selectedOfficial?.official_id === official.official_id}
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
                  onEdit(selectedOfficial);
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
                  onDelete(selectedOfficial.official_id);
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

      {/* Official Info Dialog */}
      <OfficialInfo
        open={openInfoDialog}
        handleClose={handleInfoClose}
        selectedOfficial={selectedOfficial}
      />
    </Box>
  );
}
