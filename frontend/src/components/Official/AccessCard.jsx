import { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardMedia,
  CardContent,
  Typography,
  Chip,
  Divider,
  Tooltip,
} from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import EditIcon from "@mui/icons-material/Edit";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ShieldIcon from "@mui/icons-material/Shield";
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import OfficialInfo from "./OfficialInfo";

export default function AccessCard({
  officials,
  onCreateAccount,
  onEditAccount,
}) {
  const [selectedOfficial, setSelectedOfficial] = useState(null);
  const [openInfoDialog, setOpenInfoDialog] = useState(false);

  // Open Official Info dialog
  const handleInfoOpen = (official) => {
    setSelectedOfficial(official);
    setOpenInfoDialog(true);
  };

  const handleInfoClose = () => {
    setOpenInfoDialog(false);
  };

  const handleCreateAccount = (official) => {
    if (onCreateAccount) {
      onCreateAccount(official);
    }
  };

  const handleEditAccount = (official) => {
    if (onEditAccount) {
      onEditAccount(official);
    }
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
        <Card
          key={official.official_id}
          sx={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            position: "relative",
            border: official.official_account_id
              ? "2px solid #4caf50"
              : "1px solid #e0e0e0",
            boxShadow: official.official_account_id
              ? "0 4px 12px rgba(76, 175, 80, 0.2)"
              : "none",
          }}
        >
          {/* Account Status Badge */}
          {official.official_account_id && (
            <Box
              sx={{
                position: "absolute",
                top: 10,
                right: 10,
                zIndex: 10,
                backgroundColor: "rgba(76, 175, 80, 0.9)",
                borderRadius: "50%",
                padding: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Tooltip title="Account Created">
                <CheckCircleIcon sx={{ color: "white", fontSize: "24px" }} />
              </Tooltip>
            </Box>
          )}

          {/* Official Image */}
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
              onError={(e) => {
                console.error("Image failed to load:", official.image);
                e.target.onerror = null;
                e.target.src =
                  "https://via.placeholder.com/250x200?text=No+Image";
              }}
              alt={official.first_name}
            />
          </Box>

          {/* Official Details */}
          <CardContent sx={{ flex: 1, overflow: "auto", pb: 1 }}>
            <Box sx={{ mb: 1.5 }}>
              <Typography variant="h6" sx={{ fontWeight: "bold", mb: 0.5 }}>
                {official.first_name}{" "}
                {official.middle_name ? official.middle_name.charAt(0) + ". " : ""}
                {official.last_name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {official.position || "N/A"}
              </Typography>
            </Box>

            <Divider sx={{ my: 1 }} />

            {/* Account Information */}
            {official.official_account_id ? (
              <Box sx={{ my: 1.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: "bold", mb: 1 }}>
                  Account Details:
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.8 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Username:
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                      {official.username}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                    <Chip
                      icon={<ShieldIcon />}
                      label={official.account_type}
                      size="small"
                      color={
                        official.account_type === "Admin"
                          ? "success"
                          : "warning"
                      }
                      sx={{color:"white"}}
                    />
                  </Box>
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                    <Chip
                      label={`Add: ${official.can_add ? "✓" : "✗"}`}
                      size="small"
                      variant="outlined"
                      color={official.can_add ? "success" : "default"}
                    />
                    <Chip
                      label={`Edit: ${official.can_edit ? "✓" : "✗"}`}
                      size="small"
                      variant="outlined"
                      color={official.can_edit ? "success" : "default"}
                    />
                    <Chip
                      label={`Delete: ${official.can_delete ? "✓" : "✗"}`}
                      size="small"
                      variant="outlined"
                      color={official.can_delete ? "success" : "error"}
                    />
                  </Box>
                </Box>
                <Button
                  variant="contained"
                  color="primary"
                  size="small"
                  fullWidth
                  startIcon={<EditIcon />}
                  onClick={() => handleEditAccount(official)}
                  sx={{ mt: 1 }}
                >
                  Edit Account
                </Button>
              </Box>
            ) : (
              <Box
                sx={{
                  my: 1.5,
                  p: 1.5,
                  backgroundColor: "#fff3cd",
                  borderRadius: 1,
                  border: "1px solid #ffc107",
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: "bold", mb: 1 }}>
                  <WarningAmberIcon /> No Account Created
                </Typography>
                <Button
                  variant="contained"
                  size="small"
                  fullWidth
                  startIcon={<AccountCircleIcon />}
                  onClick={() => handleCreateAccount(official)}
                  sx={{ mt: 1 }}
                >
                  Create Account
                </Button>
              </Box>
            )}

            {/* View Info Button */}
            <Button
              variant="outlined"
              size="small"
              fullWidth
              startIcon={<InfoIcon />}
              onClick={() => handleInfoOpen(official)}
              sx={{ mt: 1 }}
            >
              View Info
            </Button>
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
