import { useState } from "react";
import {
  Avatar,
  Box,
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
import BarangayIcon from "../../assets/BarangayIcon.png";

export default function AnnouncementCard({ announcements, onEdit, onDelete }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const open = Boolean(anchorEl);

  const handleMenuOpen = (event, announcement) => {
    setAnchorEl(event.currentTarget);
    setSelectedAnnouncement(announcement);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const formatDate = (dateString) => {
    const options = { year: "numeric", month: "long", day: "numeric" };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const accountType = localStorage.getItem("account_type");
  const isAdmin = accountType === "Admin";
  const isStaff = accountType === "Staff";
  const canEdit =
    (isAdmin || isStaff) && localStorage.getItem("can_edit") === "1";
  const canDelete =
    (isAdmin || isStaff) && localStorage.getItem("can_delete") === "1";

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column", // Stack cards vertically like a feed
        alignItems: "center", // Center the cards horizontally
        gap: 4, // Spacing between posts
        p: 2,
      }}
    >
      {announcements.map((announcement) => (
        <Card
          key={announcement.announcement_id}
          sx={{
            width: "100%",
            maxWidth: 600, // Standard Facebook post width
            display: "flex",
            flexDirection: "column",
            borderRadius: 2, // Slightly rounded corners
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
              <Box
                sx={{
                  display: "flex",
                  alignItems: "flex-start",
                }}
              >
              <Avatar
                src={BarangayIcon}
                alt="Barangay Logo"
                sx={{
                  width: 50,
                  height: 50,
                  mr: 2,
                  border: "1px solid #eee",
                  position: "relative",
                  bottom: 2,
                }}
              />
              <Box>
                <Typography
                  variant="h6"
                  sx={{ fontWeight: "bold", lineHeight: 1.2 }}
                >
                  {announcement.title}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatDate(announcement.date_posted)}
                </Typography>
              </Box>  
              </Box>

              {(canEdit || canDelete) && (
                <IconButton
                  size="small"
                  onClick={(e) => handleMenuOpen(e, announcement)}
                >
                  <MoreVertIcon fontSize="small" />
                </IconButton>
              )}
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

      {/* Actual Menu component so your buttons work */}
      <Menu anchorEl={anchorEl} open={open} onClose={handleMenuClose}>
        {canEdit && (
          <MenuItem
            onClick={() => {
              onEdit(selectedAnnouncement);
              handleMenuClose();
            }}
            sx={{ color: "success.main" }}
          >
            <EditIcon sx={{ mr: 1 }} fontSize="small" /> Edit
          </MenuItem>
        )}
        {canDelete && (
          <MenuItem
            onClick={() => {
              onDelete(selectedAnnouncement.announcement_id);
              handleMenuClose();
            }}
            sx={{ color: "error.main" }}
          >
            <DeleteIcon sx={{ mr: 1 }} fontSize="small" /> Delete
          </MenuItem>
        )}
      </Menu>
    </Box>
  );
}
