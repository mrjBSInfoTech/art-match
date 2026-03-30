import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  TextField,
  Typography,
  InputAdornment,
  Slide,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AnnouncementForm from "../components/Announcement/AnnouncementForm";
import AnnouncementDelete from "../components/Announcement/AnnouncementDelete";
import AnnouncementCard from "../components/Announcement/AnnouncementCard";
import {
  fetchAnnouncements,
  addAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from "../api/announcementAPI";

// Slide Transition for Snackbar
function SlideTransition(props) {
  return <Slide {...props} direction="up" />;
}

export default function Announcements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openAnnouncementForm, setOpenAnnouncementForm] = useState(false);
  const [openAnnouncementDelete, setOpenAnnouncementDelete] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [announcementErrorMessage, setAnnouncementErrorMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [sortOption, setSortOption] = useState("newest");

  // Load all announcements
  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      setAnnouncementErrorMessage("");
      console.log("Loading all announcements...");
      const response = await fetchAnnouncements();
      console.log("Announcements response:", response);
      if (response && Array.isArray(response)) {
        setAnnouncements(response);
      } else if (response && response.data && Array.isArray(response.data)) {
        setAnnouncements(response.data);
      } else {
        setAnnouncements([]);
        setAnnouncementErrorMessage("No data received from server.");
      }
    } catch (err) {
      console.error("Failed to fetch announcements:", err);
      setAnnouncements([]);
      setAnnouncementErrorMessage(
        "Failed to load announcements: " + err.message,
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnnouncements();
  }, []);

  // Open Add Announcement Modal
  const handleOpenAnnouncementAdd = () => {
    setSelectedAnnouncement(null);
    setOpenAnnouncementForm(true);
  };

  // Open Edit Announcement Modal
  const handleOpenAnnouncementEdit = (announcement) => {
    setSelectedAnnouncement(announcement);
    setOpenAnnouncementForm(true);
  };

  // Open Delete Announcement Modal
  const handleOpenAnnouncementDelete = (announcement) => {
    setSelectedAnnouncement(announcement);
    setOpenAnnouncementDelete(true);
  };

  // Submit (Add or Edit) Announcement
  const handleSubmitAnnouncement = async (formData) => {
    try {
      if (selectedAnnouncement) {
        await updateAnnouncement(
          selectedAnnouncement.announcement_id,
          formData,
        );
        showSnackbar("Announcement updated successfully");
      } else {
        await addAnnouncement(formData);
        showSnackbar("Announcement added successfully");
      }
      await loadAnnouncements();
      setOpenAnnouncementForm(false);
    } catch (err) {
      console.error("Error saving announcement:", err);
      setAnnouncementErrorMessage(err.message || "Error saving announcement");
    }
  };

  // Delete Announcement
  const handleDeleteAnnouncement = async (id) => {
    try {
      await deleteAnnouncement(id);
      await loadAnnouncements();
      setOpenAnnouncementDelete(false);
      showSnackbar("Announcement deleted successfully");
    } catch (err) {
      console.error("Error deleting announcement:", err);
      setAnnouncementErrorMessage(err.message || "Error deleting announcement");
    }
  };

  // Filter and sort announcements
  const filteredAnnouncements = announcements
    .filter((announcement) =>
      announcement.title.toLowerCase().includes(searchQuery.toLowerCase()),
    )
    .sort((a, b) => {
      const dateA = new Date(a.date_posted);
      const dateB = new Date(b.date_posted);

      if (sortOption === "newest") {
        return dateB - dateA; // Most recent first
      } else if (sortOption === "oldest") {
        return dateA - dateB; // Oldest first
      }
      return 0;
    });

  const accountType = localStorage.getItem("account_type");
  const isAdmin = accountType === "Admin";
  const isStaff = accountType === "Staff";
  const canAdd =
    (isAdmin || isStaff) && localStorage.getItem("can_add") === "1";

  // Snackbar handlers
  const showSnackbar = (message) => {
    setSnackbarMessage(message);
    setSnackbarOpen(true);
  };

  const closeSnackbar = (event, reason) => {
    if (reason === "clickaway") return;
    setSnackbarOpen(false);
  };
  return (
    <Box p={3}>
      <Helmet titleTemplate="%s - Barangay Management System">
        <title>Announcements</title>
      </Helmet>

      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h4" gutterBottom sx={{ fontWeight: "bold" }}>
          Announcements
        </Typography>
        {canAdd && (
          <Button
            variant="contained"
            color="primary"
            onClick={handleOpenAnnouncementAdd}
            sx={{
              width: { xs: 150, sm: 150 },
              height: { xs: 45, sm: 45 },
              minWidth: { xs: 45, sm: 50 },
              fontSize: { xs: 12, sm: 14 },
              padding: 0,
            }}
          >
            Add Announcement
          </Button>
        )}
      </Box>

      {/* Filter Section */}
      <Paper sx={{ p: 3, mt: 3, borderRadius: 2 }} variant="outlined">
        <Typography variant="h6">Search</Typography>
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            justifyContent: "space-between",
            alignItems: { xs: "stretch", md: "center" },
            gap: 2,
            mb: 2,
            mt: 2,
          }}
        >
          <TextField
            variant="outlined"
            placeholder="Search announcements..."
            size="small"
            sx={{
              width: { xs: "100%", sm: 250 },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              gap: 2,
              width: { xs: "100%", md: "auto" },
              mt: 2,
            }}
          >
            <FormControl size="small" sx={{ width: { xs: "100%", sm: 200 } }}>
              <InputLabel>Sort By</InputLabel>
              <Select
                name="sortOption"
                label="Sort By"
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
              >
                <MenuItem value="newest">Newest First</MenuItem>
                <MenuItem value="oldest">Oldest First</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>
      </Paper>

      {/* Announcements List */}
      <Paper sx={{ p: 3, mt: 3, borderRadius: 2 }} variant="outlined">
        <Typography variant="h6" sx={{ mb: 2 }}>
          Announcements
        </Typography>
        {loading && (
          <LinearProgress
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
            }}
          />
        )}
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        ) : announcementErrorMessage ? (
          <Typography align="center" color="error" sx={{ py: 3 }}>
            {announcementErrorMessage}
          </Typography>
        ) : filteredAnnouncements.length === 0 ? (
          <Typography align="center" color="textSecondary" sx={{ py: 3 }}>
            No announcements found.
          </Typography>
        ) : (
          <AnnouncementCard
            announcements={filteredAnnouncements}
            onEdit={handleOpenAnnouncementEdit}
            onDelete={handleOpenAnnouncementDelete}
          />
        )}
      </Paper>

      {/* Announcements Modals */}
      <AnnouncementForm
        open={openAnnouncementForm}
        handleClose={() => setOpenAnnouncementForm(false)}
        onSubmit={handleSubmitAnnouncement}
        selectedAnnouncement={selectedAnnouncement}
      />
      <AnnouncementDelete
        open={openAnnouncementDelete}
        handleClose={() => setOpenAnnouncementDelete(false)}
        onSubmit={handleDeleteAnnouncement}
        selectedAnnouncement={selectedAnnouncement}
        mode="delete"
      />

      {/* Snackbar Notification */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        TransitionComponent={SlideTransition}
      >
        <Alert
          onClose={closeSnackbar}
          severity="success"
          sx={{ width: "100%" }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
