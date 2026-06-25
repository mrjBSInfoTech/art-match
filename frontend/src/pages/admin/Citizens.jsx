import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import {
  Box,
  CircularProgress,
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
  Slide,
  Snackbar,
  Alert,
  Button,
  Tooltip,
  IconButton,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { fetchCitizens, updateCitizen, deleteCitizen } from "../api/citizenAPI";
import { fetchResidents } from "../api/residentAPI";
import CitizenCard from "../components/Citizen/CitizenCard";

// Slide Transition for Snackbar
function SlideTransition(props) {
  return <Slide {...props} direction="up" />;
}

export default function Citizens() {
  const [citizens, setCitizens] = useState([]);
  const [residents, setResidents] = useState([]);
  const [selectedCitizen, setSelectedCitizen] = useState(null);
  const [date, setDate] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState("pending");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");
  const [loading, setLoading] = useState(false);
  const [citizensErrorMessage, setCitizensErrorMessage] = useState("");
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [part, setPart] = useState(2);

  // Fetch all residents from API
  const loadResidents = async () => {
    try {
      const data = await fetchResidents();
      console.log("Residents loaded:", data);
      setResidents(data || []);
    } catch (err) {
      console.error("Error loading residents:", err);
      setResidents([]);
    }
  };

  // Fetch all citizens from API
  const loadCitizens = async () => {
    try {
      setLoading(true);
      const data = await fetchCitizens();
      console.log("Citizens loaded:", data);
      setCitizens(data || []);
    } catch (err) {
      console.error("Error loading citizens:", err);
      const message = setCitizensErrorMessage(
        "Failed to load citizens: " + err.message,
      );
    } finally {
      setLoading(false);
    }
  };
  // Load residents and citizens
  useEffect(() => {
    loadCitizens();
    loadResidents();
  }, []);

  const [formData, setFormData] = useState({
    resident_id: "",
    type: "",
  });

  // ========== CITIZEN HANDLERS ==========
  // Submit Citizen - Verify user account
  const handleSubmitCitizen = async (citizen, formData = {}) => {
    try {
      if (!citizen) {
        showSnackbar("No citizen selected", "error");
        return;
      }
      // Include status as "verified" when updating
      const updateData = {
        ...formData,
        status: "verified",
      };
      await updateCitizen(citizen.user_id, updateData);
      showSnackbar("Citizen verified successfully");

      await loadCitizens();
    } catch (err) {
      console.error(`Error updating citizen: ${err.message}`, "error");
      showSnackbar(err.message || "Error updating citizen", "error");
    }
  };
  // Handle marking concern as verified
    const handleVerifyCitizen = async (citizen) => {
      try {
        await updateCitizen(citizen.user_id, { status: "verified" });
        showSnackbar("Citizen verified successfully");
        await loadCitizens();
      } catch (err) {
        console.error(`Error updating citizen: ${err.message}`, "error");
        setCitizensErrorMessage(err.message);
      }
    };
  

  // Delete Citizen - Delete user account
  const handleDeleteCitizen = async (citizen) => {
    try {
      await deleteCitizen(citizen.user_id);
      showSnackbar("User account deleted successfully");
      await loadCitizens();
    } catch (err) {
      console.error("Error deleting citizen:", err);
      setCitizensErrorMessage(err.message || "Error deleting citizen");
    }
  };

  // Filter citizens based on search query and status
  const filteredPendingCitizens = citizens.filter((citizen) => {
    const fullName = `${citizen.first_name || ""} ${citizen.last_name || ""}`.toLowerCase();
    const matchesSearch = fullName.includes(searchQuery.toLowerCase());
    
    const isPending = citizen.status === "pending" || !citizen.status;

    if (!date) {
      return matchesSearch && isPending;
    }

    const citizenDate = new Date(citizen.date_created).toDateString();
    const selectedDate = date.toDate().toDateString(); 

    return matchesSearch && isPending && citizenDate === selectedDate;
  });

  const filteredVerifiedCitizens = citizens.filter((citizen) => {
    const fullName = `${citizen.first_name || ""} ${citizen.last_name || ""}`.toLowerCase();
    const matchesSearch = fullName.includes(searchQuery.toLowerCase());
    
    const isVerified = citizen.status === "verified";

    if (!date) {
      return matchesSearch && isVerified;
    }

    const citizenDate = new Date(citizen.date_posted).toDateString();
    const selectedDate = date.toDate().toDateString();

    return matchesSearch && isVerified && citizenDate === selectedDate;
  });

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
    switch (severity) {
      case "success":
        return "success.main"; // Green
      case "error":
        return "error.main"; // Red
      default:
        return "success.main"; // Green
    }
  };

  // Toggle handlers
  const goToPartTwo = () => setPart(2);
  const goToPartOne = () => setPart(1);

  useEffect(() => {
    if (sortOption === "verified") {
      setPart(1);
    } else if (sortOption === "pending") {
      setPart(2);
    }
  }, [sortOption]);

  return (
    <Box p={3}>
      <Helmet titleTemplate="%s - Barangay Management System">
        <title>Citizens</title>
      </Helmet>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography
          variant="h4"
          gutterBottom
          sx={{ fontWeight: "bold", fontSize: { xs: 24, sm: 32 } }}
        >
          {part === 1 ? "Citizens - Verified" : "Citizens - Pending"}
        </Typography>
      </Box>

      {/* Filter Section */}
      <Paper sx={{ p: 3, mt: 3, borderRadius: 2 }} variant="outlined">
        <Typography variant="h6">Filter</Typography>
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
            placeholder="Search citizens..."
            size="small"
            sx={{
              width: { xs: "100%", md: 250 },
              minWidth: { xs: "100%", md: 250 },
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
            }}
          >
            <FormControl
              size="small"
              sx={{
                width: { xs: "100%", sm: 180 },
              }}
            >
              <InputLabel>Sort</InputLabel>
              <Select
                value={sortOption}
                label="Sort"
                onChange={(e) => setSortOption(e.target.value)}
              >
                <MenuItem value="verified">Verified</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>
      </Paper>

      {part === 1 && (
        <Paper sx={{ p: 3, mt: 3, borderRadius: 2 }} variant="outlined">
          <Typography variant="h6" sx={{ mb: 2 }}>
            Verified Accounts
          </Typography>

          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
              <CircularProgress />
            </Box>
          ) : citizensErrorMessage ? (
            <Typography align="center" color="error" sx={{ py: 3 }}>
              {citizensErrorMessage}
            </Typography>
          ) : filteredVerifiedCitizens.length === 0 ? (
            <Typography align="center" color="textSecondary" sx={{ py: 3 }}>
              No verified accounts yet.
            </Typography>
          ) : (
            <CitizenCard
              citizens={filteredVerifiedCitizens}              
              residents={residents}              
              onEdit={handleSubmitCitizen}
              onDelete={handleDeleteCitizen}
            />
          )}
        </Paper>
      )}
      {part === 2 && (
        <Paper sx={{ p: 3, mt: 3, borderRadius: 2 }} variant="outlined">
          <Typography variant="h6" sx={{ mb: 2 }}>
            Pending Verification
          </Typography>

          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
              <CircularProgress />
            </Box>
          ) : citizensErrorMessage ? (
            <Typography align="center" color="error" sx={{ py: 3 }}>
              {citizensErrorMessage}
            </Typography>
          ) : filteredPendingCitizens.length === 0 ? (
            <Typography align="center" color="textSecondary" sx={{ py: 3 }}>
              No pending accounts.
            </Typography>
          ) : (
            <CitizenCard
              citizens={filteredPendingCitizens}              
              residents={residents}              
              onEdit={handleSubmitCitizen}
              onDelete={handleDeleteCitizen}
            />
          )}
        </Paper>
      )}

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={closeSnackbar}
        TransitionComponent={SlideTransition}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
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
