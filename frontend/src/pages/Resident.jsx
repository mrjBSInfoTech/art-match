import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  InputAdornment,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
  Snackbar,
} from "@mui/material";
import { Slide } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ResidentCard from "../components/Residents/ResidentCard";
import ResidentsForm from "../components/Residents/ResidentsForm";
import ResidentsDelete from "../components/Residents/ResidentsDelete";
import {
  fetchResidents,
  addResident,
  updateResident,
  deleteResident,
} from "../api/residentAPI";
import { fetchHouseholds } from "../api/householdAPI";

// Slide Transition for Snackbar
function SlideTransition(props) {
  return <Slide {...props} direction="up" />;
}

export default function Resident() {
  const [residents, setResidents] = useState([]);
  const [households, setHouseholds] = useState([]);
  const [openResidentForm, setOpenResidentForm] = useState(false);
  const [openResidentDelete, setOpenResidentDelete] = useState(false);
  const [selectedResident, setSelectedResident] = useState(null);
  const [residentErrorMessage, setResidentErrorMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Load residents and households on component mount
  useEffect(() => {
    loadResidents();
    loadHouseholds();
  }, []);

  // Fetch all households from API
  const loadHouseholds = async () => {
    try {
      const data = await fetchHouseholds();
      console.log("Households loaded:", data);
      setHouseholds(data || []);
    } catch (err) {
      console.error("Error loading households:", err);
      setHouseholds([]);
    }
  };

  // Fetch all residents from API
  const loadResidents = async () => {
    try {
      setLoading(true);
      const data = await fetchResidents();
      console.log("Residents loaded:", data);
      setResidents(data || []);
    } catch (err) {
      console.error("Error loading residents:", err);
      const message = setResidentErrorMessage(
        "Failed to load residents: " + err.message,
      );
    } finally {
      setLoading(false);
    }
  };

  // ========== RESIDENT HANDLERS ==========
  // ➕ Open Add Resident Modal
  const handleOpenResidentAdd = () => {
    setSelectedResident(null);
    setOpenResidentForm(true);
  };

  // ✏️ Open Edit Resident Modal
  const handleOpenResidentEdit = (resident) => {
    setSelectedResident(resident);
    setOpenResidentForm(true);
  };

  // 🗑️ Open Delete Resident Modal
  const handleOpenResidentDelete = (resident) => {
    setSelectedResident(resident);
    setOpenResidentDelete(true);
  };

  // Submit (Add or Edit) Resident
  const handleSubmitResident = async (formData) => {
    try {
      if (selectedResident) {
        await updateResident(selectedResident.resident_id, formData);
        showSnackbar("Resident updated successfully");
      } else {
        await addResident(formData);
        showSnackbar("Resident added successfully");
      }
      await loadResidents();
      setOpenResidentForm(false);
    } catch (err) {
      console.error("Error saving resident:", err);
      setResidentErrorMessage(err.message || "Error saving resident");
    }
  };

  // Delete Resident
  const handleDeleteResident = async (id) => {
    try {
      await deleteResident(id);
      await loadResidents();
      setOpenResidentDelete(false);
      showSnackbar("Resident deleted successfully");
    } catch (err) {
      console.error("Error deleting resident:", err);
      setResidentErrorMessage(err.message || "Error deleting resident");
    }
  };

  // Filter residents based on search query and gender filter
  const filteredResidents = residents.filter((resident) => {
    const fullName =
      `${resident.first_name || ""} ${resident.last_name || ""}`.toLowerCase();
    const matchesSearch = fullName.includes(searchQuery.toLowerCase());

    const matchesGender =
      genderFilter === "" || resident.gender === genderFilter;

    return matchesSearch && matchesGender;
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
        <title>Resident</title>
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
          Residents
        </Typography>
        {canAdd && (
          <Button
            variant="contained"
            color="primary"
            onClick={handleOpenResidentAdd}
            sx={{
              width: { xs: 130, sm: 150 },
              height: { xs: 35, sm: 45 },
              minWidth: { xs: 45, sm: 50 },
              fontSize: { xs: 12, sm: 16 },
              padding: 0,
            }}
          >
            Add Resident
          </Button>
        )}
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
            placeholder="Search residents..."
            size="small"
            sx={{
              width: { xs: "100%", sm: 300 },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            value={searchQuery}
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
            <FormControl size="small" sx={{ width: { xs: "100%", sm: 180 } }}>
              <InputLabel>Gender</InputLabel>
              <Select
                name="gender"
                label="Gender"
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="Male">Male</MenuItem>
                <MenuItem value="Female">Female</MenuItem>
                <MenuItem value="Others">Others</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>
      </Paper>

      {/* Residents Grid Display */}
      <Paper sx={{ p: 3, mt: 3, borderRadius: 2 }} variant="outlined">
        <Typography variant="h6" sx={{ mb: 2 }}>
          Resident List
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
        ) : residentErrorMessage ? (
          <Typography align="center" color="error" sx={{ py: 3 }}>
            {residentErrorMessage}
          </Typography>
        ) : filteredResidents.length > 0 ? (
          <ResidentCard
            residents={filteredResidents}
            onEdit={handleOpenResidentEdit}
            onDelete={handleOpenResidentDelete}
            households={households}
          />
        ) : (
          <Typography
            color="text.secondary"
            sx={{ textAlign: "center", py: 4 }}
          >
            {searchQuery || genderFilter
              ? "No residents match your search."
              : "No residents found. Add your first resident!"}
          </Typography>
        )}
      </Paper>

      {/* ========== RESIDENT MODALS ========== */}
      <ResidentsForm
        open={openResidentForm}
        handleClose={() => setOpenResidentForm(false)}
        onSubmit={handleSubmitResident}
        selectedResident={selectedResident}
        households={households}
      />
      <ResidentsDelete
        open={openResidentDelete}
        handleClose={() => setOpenResidentDelete(false)}
        onSubmit={handleDeleteResident}
        selectedResident={selectedResident}
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
