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
import ResidentInfo from "./ResidentInfo";

export default function ResidentCard({ residents, onEdit, onDelete, households = [] }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedResident, setSelectedResident] = useState(null);
  const [openInfoDialog, setOpenInfoDialog] = useState(false);
  const open = Boolean(anchorEl);

  // Helper function to get household info
  const getHouseholdInfo = (householdId) => {
    if (!householdId) return "No Data";
    const household = households.find((h) => h.household_id === householdId);
    return household ? `House #${household.house_number}` : "No Data";
  };

  // Open/Close menu handlers
  const handleMenuOpen = (event, resident) => {
    setAnchorEl(event.currentTarget);
    setSelectedResident(resident);
  };
  const handleMenuClose = () => {
    setAnchorEl(null);
  };  

  // Open Resident Info dialog
  const handleInfoOpen = (resident) => {
    setSelectedResident(resident);
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
      {residents.map((resident) => (
        <Card key={resident.resident_id}>
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
                resident.image
                  ? `http://localhost:5000/uploads/uploadResident/${encodeURIComponent(resident.image)}`
                  : `http://localhost:5000/uploads/uploadResident/profile.jpg`
              }
              onError={(e) => {
                console.error("Image failed to load:", resident.image);
                e.target.onerror = null;
                e.target.src =
                  "https://via.placeholder.com/250x150?text=No+Image";
              }}
              alt={resident.first_name}
            />
          </Box>
          {/* 🧾 Resident Details */}
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
                  {resident.first_name}{" "}
                  {resident.middle_name
                    ? resident.middle_name.charAt(0) + ". "
                    : ""}
                  {resident.last_name}
                </Typography>
              </Box>
              <IconButton
                size="small"
                onClick={(e) => handleMenuOpen(e, resident)}
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
              onClick={() => handleInfoOpen(resident)}
              sx={{ mb: 2 }}
            >
              View Info
            </Button>

            {/* ON HOLD FOR NOW - Household Info */}
            {/* Household Info 
            <Box
              sx={{
                p: 1,
                mb: 2,
                backgroundColor: "#f5f5f5",
                borderRadius: 1,
                textAlign: "center",
              }}
            >
              <Typography variant="caption" sx={{ color: "#999" }}>
                Household
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                {getHouseholdInfo(resident.household_id)}
              </Typography>
            </Box>
            */}
            {/* Options Menu */}
            <Menu
              anchorEl={anchorEl}
              open={open && selectedResident?.resident_id === resident.resident_id}
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
                  onEdit(selectedResident);
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
                  onDelete(selectedResident.resident_id);
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
      <ResidentInfo
        open={openInfoDialog}
        handleClose={handleInfoClose}
        selectedResident={selectedResident}
      />
    </Box>
  );
}
