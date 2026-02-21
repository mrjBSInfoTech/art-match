import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  InputAdornment,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Card,
  CardContent,
  Divider,
  LinearProgress,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AnnouncementForm from "../components/Announcement/AnnouncementForm";
import AnnouncementDelete from "../components/Announcement/AnnouncementDelete";

export default function Announcements() {
  const [announcements, setAnnouncements] = useState([]);
  const [openAnnouncementForm, setOpenAnnouncementForm] = useState(false);
  const [openAnnouncementDelete, setOpenAnnouncementDelete] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [announcementErrorMessage, setAnnouncementErrorMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // ========== ANNOUNCEMENT HANDLERS ==========
  // ➕ Open Add Announcement Modal
  const handleOpenAnnouncementAdd = () => {
    setSelectedAnnouncement(null);
    setOpenAnnouncementForm(true);
  };

  // ✏️ Open Edit Announcement Modal
  const handleOpenAnnouncementEdit = (announcement) => {
    setSelectedAnnouncement(announcement);
    setOpenAnnouncementForm(true);
  };

  // 🗑️ Open Delete Announcement Modal
  const handleOpenAnnouncementDelete = (announcement) => {
    setSelectedAnnouncement(announcement);
    setOpenAnnouncementDelete(true);
  };

  return (
    <Box p={3}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h4" gutterBottom sx={{ fontWeight: "bold" }}>
          Announcement
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={handleOpenAnnouncementAdd}
          sx={{
            width: { xs: 150, sm: 150 },
            height: { xs: 45, sm: 45 },
            minWidth: { xs: 45, sm: 50 },
            fontSize: { xs: 12, sm: 16 },
            padding: 0,
          }}
        >
          Add Post
        </Button>
      </Box>
      <Paper sx={{ p: 3, mt: 3, borderRadius: 2 }} variant="outlined">
        <Typography variant="h6" sx={{ mb: 2 }}>
          Announcement List
        </Typography>
      </Paper>
      {/* ========== ANNOUNCEMENT MODALS ========== */}
      <AnnouncementForm
        open={openAnnouncementForm}
        handleClose={() => setOpenAnnouncementForm(false)}
        //onSubmit={handleSubmitAnnouncement} ON HOLD FOR NOW
        selectedAnnouncement={selectedAnnouncement}
        announcements={announcements}
      />
      <AnnouncementDelete
        open={openAnnouncementDelete}
        handleClose={() => setOpenAnnouncementDelete(false)}
        //onSubmit={handleDeleteAnnouncement} ON HOLD FOR NOW
        selectedAnnouncement={selectedAnnouncement}
        mode="delete"
      />
    </Box>
  );
}
