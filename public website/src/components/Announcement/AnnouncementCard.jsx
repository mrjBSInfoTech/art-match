import { useState } from "react";
import {
  Box,
  Card,
  CardMedia,
  CardContent,
  Typography,
  IconButton,
  Menu,
  MenuItem,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

export default function AnnouncementCard({ announcements,}) {
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);

  const formatDate = (dateString) => {
    const options = { year: "numeric", month: "long", day: "numeric" };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column", // Stack cards vertically like a feed
        alignItems: "center",     // Center the cards horizontally
        gap: 4,                  // Spacing between posts
        p: 2,
      }}
    >
      {announcements.map((announcement) => (
        <Card
          key={announcement.announcement_id}
          sx={{
            width: "100%",
            maxWidth: 800,      
            display: "flex",
            flexDirection: "column",
            borderRadius: 2,     // Slightly rounded corners
            boxShadow: "0 2px 4px rgba(0,0,0,0.1), 0 8px 16px rgba(0,0,0,0.1)",
          }}
        >
          {/* Announcement Details (Top) */}
          <CardContent sx={{ p: 3 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                mb: 2,
              }}
            >
              <Box>
                <Typography variant="h6" sx={{ fontWeight: "bold", lineHeight: 1.2 }}>
                  {announcement.title}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatDate(announcement.date_posted)}
                </Typography>
              </Box>
              <IconButton
                size="small"
                onClick={(e) => handleMenuOpen(e, announcement)}
              >
                
              </IconButton>
            </Box>

            <Typography
              variant="body1"
              sx={{
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                color: "text.primary",
              }}
            >
              {announcement.description}
            </Typography>
          </CardContent>

          {/* Image (Bottom) */}
          <Box
            sx={{
              width: "100%",
              maxHeight: 500,
              backgroundColor: "#f0f2f5",
              overflow: "hidden",
              borderTop: "1px solid #e0e0e0",
            }}
          >
            <CardMedia
              component="img"
              sx={{
                width: "100%",
                height: "auto",
                objectFit: "contain", // Shows the full image without cropping
              }}
              image={
                announcement.image
                  ? `http://localhost:5000/uploads/uploadAnnouncement/${encodeURIComponent(announcement.image)}`
                  : "https://via.placeholder.com/600x400?text=No+Image"
              }
              alt={announcement.title}
            />
          </Box>
        </Card>
      ))}
    </Box>
  );
}