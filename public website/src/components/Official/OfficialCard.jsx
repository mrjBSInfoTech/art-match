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

export default function OfficialCard({ officials, columns}) {
  const [anchorEl, setAnchorEl] = useState(null);
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

  const gridConfig = columns || {
    xs: "1fr",
    sm: "repeat(2, 1fr)",
    md: "repeat(3, 1fr)",
    lg: "repeat(4, 1fr)",
  };

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: gridConfig,
        gap: 2,
        justifyContent: "center",
      }}
    >
      {officials.map((official) => (
        <Card key={official.official_id}>
          <Box
            sx={{
              width: "100%",
              height: 400,
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
                  "https://via.placeholder.com/250x150?text=No+Image";
              }}
              alt={official.first_name}
            />
          </Box>
          {/* 🧾 Official Details */}
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
                <Typography variant="h5" sx={{ fontWeight: "bold", textAlign: "center" }}>
                  {official.first_name}{" "}
                  {official.middle_name
                    ? official.middle_name.charAt(0) + ". "
                    : ""}
                  {official.last_name}
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ textAlign: "center" }}>
                  {official.position || "N/A"}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}
