import { useState, useEffect } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Divider,
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import CheckIcon from "@mui/icons-material/Check";
import DeleteIcon from "@mui/icons-material/Delete";
import InfoIcon from "@mui/icons-material/Info";
import CitizenForm from "./CitizenForm";

const getStatusStyle = (status) => {
  switch (status) {
    case "verified":
      return {
        label: "Verified",
        bg: "#c6d8ef",
        text: "#0369A1",
        border: "1px solid #0369A1",
        cardBorder: "4px solid #0369A1",
      };
    case "pending":
    default:
      return {
        label: "Pending",
        bg: "#FED7AA",
        text: "#92400E",
        border: "1px solid #92400E",
        cardBorder: "4px solid #92400E",
      };
  }
};

// Helper component for info display
const InfoRow = ({ label, value }) => (
  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
    <strong>{label}:</strong> {value}
  </Typography>
);

export default function CitizenCard({
  citizens,
  residents = [],
  onEdit,
  onDelete,
}) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedCitizen, setSelectedCitizen] = useState(null);
  const [openFormDialog, setOpenFormDialog] = useState(false);
  const [formData, setFormData] = useState({
    type: "",
    resident_id: "",
  });
  const open = Boolean(anchorEl);

  // Helper function to get resident info
  const getResidentInfo = (residentId) => {
    if (!residentId) return "Not Found";
    const resident = residents.find((r) => r.resident_id === residentId);
    return resident ? `${resident.first_name} ${resident.last_name}` : "Not Found";
  };

  useEffect(() => {
    if (selectedCitizen) {
      setFormData({
        type: selectedCitizen.type || "",
        resident_id: selectedCitizen.resident_id || "",
      });
    } else {
      setFormData({
        type: "",
        resident_id: "",
      });
    }
  }, [selectedCitizen]);

  // Update selectedCitizen when citizens prop changes to keep it fresh
  useEffect(() => {
    if (selectedCitizen && citizens.length > 0) {
      const updatedCitizen = citizens.find(
        (c) => c.citizen_id === selectedCitizen.citizen_id
      );
      if (updatedCitizen) {
        setSelectedCitizen(updatedCitizen);
      }
    }
  }, [citizens]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleMenuOpen = (event, citizen) => {
    setAnchorEl(event.currentTarget);
    setSelectedCitizen(citizen);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  // Open Citizen Form dialog
  const handleFormOpen = (citizen) => {
    setSelectedCitizen(citizen);
    setOpenFormDialog(true);
  };

  const handleFormClose = () => {
    setOpenFormDialog(false);
    setSelectedCitizen(null); // Clear selected citizen when closing
  };

  const residentOptions = residents.map((resident) => ({
    id: resident.resident_id,
    label: `${resident.first_name} ${resident.last_name}`,
  }));

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "1fr",
          sm: "repeat(2, 1fr)",
          md: "repeat(2, 1fr)",
          lg: "repeat(3, 1fr)",
        },
        gap: 2,
      }}
    >
      {citizens.map((citizen) => (
        <Card
          key={citizen.citizen_id}
          sx={{
            width: "100%",
            opacity: citizen.status === "solved" ? 0.75 : 1,
            borderLeft: getStatusStyle(citizen.status).cardBorder,
            transition: "box-shadow 0.2s ease",
            "&:hover": { boxShadow: 4 },
          }}
        >
          {/* Citizen Details */}
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
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    mb: 1,
                  }}
                >
                  <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                    {citizen.first_name} {citizen.last_name}
                  </Typography>

                  <IconButton
                    size="small"
                    onClick={(e) => handleMenuOpen(e, citizen)}
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

                {/* Citizen Info */}
                <Box sx={{ mb: 2 }}>
                  <InfoRow label="Email" value={citizen.email} />
                  <InfoRow label="Contact" value={citizen.contact} />
                  {citizen.status === "verified" && (
                    <>
                      <InfoRow
                        label="Type"
                        value={
                          citizen.type.toUpperCase().charAt(0) +
                          citizen.type.slice(1)
                        }
                      />
                      <InfoRow label="Resident" value={getResidentInfo(citizen.resident_id)} />
                    </>
                  )}
                  <Box
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      px: 1.5,
                      py: 0.4,
                      mt: 1,
                      
                      borderRadius: "20px",
                      fontSize: "12px",
                      fontWeight: 700,
                      letterSpacing: "0.3px",
                      backgroundColor: getStatusStyle(citizen.status).bg,
                      color: getStatusStyle(citizen.status).text,
                      border: getStatusStyle(citizen.status).border,
                      userSelect: "none",
                    }}
                  >
                    {getStatusStyle(citizen.status).label}
                  </Box>
                </Box>

                {/* Info Button */}
                <Button
                  variant="outlined"
                  size="small"
                  fullWidth
                  startIcon={<InfoIcon />}
                  onClick={() => handleFormOpen(citizen)}
                  sx={{ mb: -5 }}
                >
                  Update Info
                </Button>
              </Box>
            </Box>

            {/* Options Menu */}
            <Menu
              anchorEl={anchorEl}
              open={open && selectedCitizen?.citizen_id === citizen.citizen_id}
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
                  onDelete(selectedCitizen.citizen_id);
                  handleMenuClose();
                }}
                sx={{
                  color: "error.main",
                }}
              >
                <DeleteIcon sx={{ mr: 1, fontSize: "20px" }} />
                {citizen.status === "verified" ? "Remove" : "Delete"}
              </MenuItem>
            </Menu>
          </CardContent>
        </Card>
      ))}
      {/* Citizen Form Dialog */}
      <CitizenForm
        open={openFormDialog}
        handleClose={() => setOpenFormDialog(false)}
        onSubmit={onEdit}
        selectedCitizen={selectedCitizen}
        residents={residents}
      />
    </Box>
  );
}
