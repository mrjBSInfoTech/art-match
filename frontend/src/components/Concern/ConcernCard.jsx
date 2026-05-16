import { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Chip,
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import CheckIcon from '@mui/icons-material/Check';
import DeleteIcon from "@mui/icons-material/Delete";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";

export default function ConcernCard({ concerns, onEdit, onDelete }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedConcern, setSelectedConcern] = useState(null);
  const open = Boolean(anchorEl);

  const getUrgentStyle = (urgency) => {
    const level = urgency ? urgency.toLowerCase() : "low";
    switch (level) {
      case "low":
        return {
          label: "Low",
          bg: "#DCFCE7",
          text: "#15803D",
          border: "1px solid #86EFAC",
          cardBorder: "4px solid #22C55E",
        };
      case "medium":
        return {
          label: "Medium",
          bg: "#FEF9C3",
          text: "#A16207",
          border: "1px solid #FDE047",
          cardBorder: "4px solid #EAB308",
        };
      default:
        return {
          label: "High",
          bg: "#FEE2E2",
          text: "#B91C1C",
          border: "1px solid #FCA5A5",
          cardBorder: "4px solid #EF4444",
        };
    }
  };

  // Get concern resolution status style
  const getStatusStyle = (status) => {
    switch (status) {
      case "solved":
        return {
          label: "Solved",
          bg: "#c6d8ef", 
          text: "#0369A1",
          border: "1px solid #0369A1",
        };
      case "pending":
      default:
        return {
          label: "Pending",
          bg: "#FED7AA",
          text: "#92400E", 
          border: "1px solid #92400E",
        };
    }
  };


  // Open/Close menu handlers
  const handleMenuOpen = (event, concern) => {
    setAnchorEl(event.currentTarget);
    setSelectedConcern(concern);
  };
  const handleMenuClose = () => {
    setAnchorEl(null);
  };  

  return (
    <Box
      sx={{
        display: "grid",
        gap: 2,
      }}
    >
      {concerns.map((concern) => (
        <Card 
          key={concern.message_id}
          sx={{
            maxWidth: "100%",
            mx: "auto",    
            width: "100%",
            opacity: concern.status === "solved" ? 0.75 : 1,
            borderLeft: getUrgentStyle(concern.message_urgency).cardBorder,
            transition: "box-shadow 0.2s ease",
            "&:hover": { boxShadow: 4 },
          }}
        >
          {/* Concern Details */}
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
                <Typography variant="h6" sx={{ fontWeight: "bold", lineHeight: 1.2, }}>
                  Sender: {concern.first_name} {concern.last_name} ({concern.type.toUpperCase().charAt(0) + concern.type.slice(1)})
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {new Date(concern.date_posted).toLocaleDateString()}
                </Typography>
                <Typography variant="body" color="text.secondary">
                  {concern.message}
                </Typography>
                <Box sx={{ display: "flex", gap: 1, mt: 2, mb: -3, flexWrap: "wrap", alignItems: "center" }}>
                  {/* Urgency Status Badge */}
                  <Box
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 0.5,
                      px: 1.5,
                      py: 0.4,
                      borderRadius: "20px",
                      fontSize: "12px",
                      fontWeight: 700,
                      letterSpacing: "0.3px",
                      backgroundColor: getUrgentStyle(concern.message_urgency).bg,
                      color: getUrgentStyle(concern.message_urgency).text,
                      border: getUrgentStyle(concern.message_urgency).border,
                      userSelect: "none",
                    }}
                  >
                    {getUrgentStyle(concern.message_urgency).label}
                  </Box>

                  {/* Status Badge */}
                  <Box
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      px: 1.5,
                      py: 0.4,
                      borderRadius: "20px",
                      fontSize: "12px",
                      fontWeight: 700,
                      letterSpacing: "0.3px",
                      backgroundColor: getStatusStyle(concern.status).bg,
                      color: getStatusStyle(concern.status).text,
                      border: getStatusStyle(concern.status).border,
                      userSelect: "none",
                    }}
                  >
                    {concern.status === "solved" ? "Solved" : "Pending"}
                  </Box>
                </Box>
              </Box>
              <IconButton
                size="small"
                onClick={(e) => handleMenuOpen(e, concern)}
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
            
            {/* Options Menu */}
            <Menu
              anchorEl={anchorEl}
              open={open && selectedConcern?.message_id === concern.message_id}
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
              {concern.status === "pending" && (
                <MenuItem
                  onClick={() => {
                    onEdit(selectedConcern);
                    handleMenuClose();
                  }}
                  sx={{
                    color: "success.main",
                  }}
                >
                  <CheckIcon sx={{ mr: 1, fontSize: "20px" }} />
                  Solved
                </MenuItem>
              )}
              
              <MenuItem
                onClick={() => {
                  onDelete(selectedConcern.message_id); 
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
    </Box>
  );
}
