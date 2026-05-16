import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import {
  Box,
  Button,
  FormControl,
  Grid,
  InputLabel,
  InputAdornment,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Slide,
  Alert,
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
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { addConcern } from "../api/concernsAPI";
import Footer from "../components/Footer";

// Slide Transition for Snackbar
function SlideTransition(props) {
  return <Slide {...props} direction="up" />;
}

//Logo
import PlaceIcon from "@mui/icons-material/Place";
import CallIcon from "@mui/icons-material/Call";
import EmailIcon from "@mui/icons-material/Email";
import WatchLaterIcon from "@mui/icons-material/WatchLater";
import FacebookIcon from "@mui/icons-material/Facebook";
import InstagramIcon from "@mui/icons-material/Instagram";
import XIcon from "@mui/icons-material/X";

export default function Concerns() {
  const [date, setDate] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState("");
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success"); 
  const [concernErrorMessage, setConcernErrorMessage] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [formData, setFormData] = useState({
    message_type: "",
    message: "",
  });

  useEffect(() => {
    const storedLoggedIn = localStorage.getItem("token");

    setLoggedIn(!!storedLoggedIn);
  }, []);

  // Submit (Add) Concern
  const handleSubmitConcern = async (name) => {
    // Validate all required fields
    if (!formData.message_type) {
      showSnackbar("Please select a message type", "error");
      return;
    }
    if (!formData.message.trim()) {
      showSnackbar("Please enter your message", "error");
      return;
    }

    try {
      await addConcern(formData);
      showSnackbar("Concern successfully submitted", "success");
      setFormData({
        message_type: "",
        message: "",
      });
      setConcernErrorMessage("");
    } catch (err) {
      console.error("Error saving concern:", err);
      showSnackbar(`${err.message || "Error saving concern"}`, "error");
      setConcernErrorMessage(err.message || "Error saving concern", "error");
    }
  };

  // Handle Enter key for submit
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Enter" && open) {
        event.preventDefault();
        handleSubmitConcern();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, formData]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        handleClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  // Snackbar handlers
  const showSnackbar = (message, severity = "success") => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity); // Set it to "success" or "error"
    setSnackbarOpen(true);
  };

  const closeSnackbar = (event, reason) => {
    if (reason === "clickaway") return;
    setSnackbarOpen(false);
  };

  const getSeverityColor = (severity) => {
    switch(severity) {
      case "success": return "success.main"; // Green
      case "error": return "error.main";   // Red
      default: return "success.main"; // Green
    }
  };

  return (
    <Box>
      <Helmet titleTemplate="%s - Barangay 415 Zone 42">
        <title>Concerns</title>
      </Helmet>
      {/* CONCERNS */}
      <Box
        sx={{ py: 10, px: 3, mb: -10, backgroundColor: "#f5f5f5" }}
        id="concerns"
      >
        <Typography variant="h4" textAlign="center" fontWeight="bold" mb={6}>
          Contact Us
        </Typography>

        <Grid container spacing={4} justifyContent="center">
          <Grid sx={{ width: 600 }}>
            <Card sx={{ mb: 4, p: 2 }}>
              <CardContent>
                <Typography
                  variant="h4"
                  gutterBottom
                  sx={{ fontWeight: "bold" }}
                  color="primary"
                >
                  Get In Touch
                </Typography>

                {/* Location */}
                <Box sx={{ mb: 3, display: "flex", gap: 2 }}>
                  <PlaceIcon sx={{ color: "primary.main", mt: 0.5 }} />
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                      Location
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ color: "text.secondary" }}
                    >
                      Barangay 415, Zone 42, Sampaloc, Manila, Philippines
                    </Typography>
                  </Box>
                </Box>

                {/* Contact Numbers */}
                <Box id="contact-info" sx={{ mb: 3, display: "flex", gap: 2 }}>
                  <CallIcon sx={{ color: "primary.main", mt: 0.5 }} />
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                      Contact Numbers
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ color: "text.secondary" }}
                    >
                      Main: (02) 1234-5678
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ color: "text.secondary" }}
                    >
                      Mobile: 0917-123-4567
                    </Typography>
                  </Box>
                </Box>

                {/* Email */}
                <Box sx={{ mb: 3, display: "flex", gap: 2 }}>
                  <EmailIcon sx={{ color: "primary.main", mt: 0.5 }} />
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                      Email
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ color: "text.secondary" }}
                    >
                      info@barangay415.gov.ph
                    </Typography>
                  </Box>
                </Box>

                {/* Office Hours */}
                <Box sx={{ mb: 3, display: "flex", gap: 2 }}>
                  <WatchLaterIcon sx={{ color: "primary.main", mt: 0.5 }} />
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                      Office Hours
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ color: "text.secondary" }}
                    >
                      Monday to Sunday: 8:00 AM - 12:00 AM
                    </Typography>
                  </Box>
                </Box>

                <Divider sx={{ my: 2 }} />

                {/* Follow Us */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                    Follow Us
                  </Typography>
                  <Box sx={{ display: "flex", gap: 2 }}>
                    <a
                      href="https://www.facebook.com"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <FacebookIcon
                        sx={{
                          color: "primary.main",
                          cursor: "pointer",
                          fontSize: 24,
                        }}
                      />
                    </a>
                    <a
                      href="https://www.instagram.com"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <InstagramIcon
                        sx={{
                          color: "primary.main",
                          cursor: "pointer",
                          fontSize: 24,
                        }}
                      />
                    </a>
                    <a
                      href="https://www.x.com"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <XIcon
                        sx={{
                          color: "primary.main",
                          cursor: "pointer",
                          fontSize: 24,
                        }}
                      />
                    </a>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }} sx={{ width: 600 }}>
            <Paper sx={{ p: 4 }}>
              <Typography variant="h4" sx={{ fontWeight: "bold" }} gutterBottom>
                Send a Message
              </Typography>
              <FormControl
                fullWidth
                label="Message Type"
                sx={{
                  width: { xs: "100%", sm: "100%" },
                  mb: 3,
                }}
              >
                <InputLabel>Message Type</InputLabel>
                <Select
                  value={formData.message_type}
                  label="Message Type"
                  onChange={(e) =>
                    setFormData({ ...formData, message_type: e.target.value })
                  }
                  name="message_type"
                >
                  <MenuItem value="complaint">Complaint</MenuItem>
                  <MenuItem value="concerns">Concerns</MenuItem>
                  <MenuItem value="feedback">Feedback</MenuItem>
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label="Message"
                name="message"
                value={formData.message}
                onChange={(e) =>
                  setFormData({ ...formData, message: e.target.value })
                }
                multiline
                rows={7}
              />

              <Button
                variant="contained"
                sx={{ mt: 2, fontWeight: "bold" }}
                fullWidth
                onClick={() => {
                  if (loggedIn) {
                    handleSubmitConcern();
                  } else {
                    showSnackbar("Please log in to send a message");
                  }
                }}
              >
                Send Message
              </Button>
            </Paper>
          </Grid>
        </Grid>
      </Box>
      <Footer />
      {/* Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={closeSnackbar}
        TransitionComponent={SlideTransition}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={closeSnackbar}
          severity={snackbarSeverity}
          sx={{
            width: "100%",
            backgroundColor: getSeverityColor(snackbarSeverity),
            color: "#fff",
            "& .MuiAlert-icon": {
              color: "#fff",
            }
          }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
