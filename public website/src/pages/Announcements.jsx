import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import {
  Alert,
  Box,
  Button,
  FormControl,
  InputLabel,
  InputAdornment,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  TextField,
  Typography,
  Slide,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AnnouncementCard from "../components/Announcement/AnnouncementCard";
import { fetchAnnouncements } from "../api/announcementAPI";
import BarangayIcon from "../assets/BarangayIcon.png";

export default function Announcements() {
  const [announcements, setAnnouncements] = useState([]);
  const [announcementErrorMessage, setAnnouncementErrorMessage] = useState("");

  // Load all announcements
  const loadAnnouncements = async () => {
    try {
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
        `${err.message || "Failed to fetch announcements. Please try again later."}`,
      );
    }
  };

  useEffect(() => {
    loadAnnouncements();
  }, []);

  return (
    <Box sx={{ backgroundColor: "#f5f5f5", minHeight: "100vh", py: 5 }}>
      <Helmet titleTemplate="%s - Barangay 415 Zone 42">
        <title>Announcements</title>
      </Helmet>
      {/* Announcements List */}
      <Box sx={{ p: 3, mt: 3, borderRadius: 2 }} key="announcement.announcement_id">
        {announcementErrorMessage ? (
          <Typography align="center" color="textSecondary" sx={{ py: 3 }}>
            {announcementErrorMessage}
          </Typography>
        ):
        announcements.length === 0 ? (
          <Typography align="center" color="textSecondary" sx={{ py: 3 }}>
            No announcements found.
          </Typography>
        ) : (
          <AnnouncementCard
            announcements={announcements}
          />
        )}
      </Box>
    </Box>
  );
}
