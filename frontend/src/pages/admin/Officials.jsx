import React, { useState, useEffect, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  TextField,
  Typography,
  Snackbar,
  InputAdornment,
  Alert,
  CircularProgress,
  LinearProgress,
} from "@mui/material";
import { Slide } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AccessForm from "../components/Official/AccessForm";
import AccessCard from "../components/Official/AccessCard";
import OfficialCard from "../components/Official/OfficialCard";
import OfficialForm from "../components/Official/OfficialForm";
import OfficialDelete from "../components/Official/OfficialDelete";
import {
  fetchOfficials,
  addOfficial,
  updateOfficial,
  deleteOfficial,
} from "../api/officialAPI";
import {
  createOfficialAccount,
  fetchOfficialsWithAccounts,
  updateOfficialAccountPermissions,
} from "../api/accessAPI";

// Slide Transition for Snackbar
function SlideTransition(props) {
  return <Slide {...props} direction="up" />;
}

export default function Officials() {
  const [officials, setOfficials] = useState([]);
  const [openAccessForm, setOpenAccessForm] = useState(false);
  const [accessFormMode, setAccessFormMode] = useState("create"); // "create" or "edit"
  const [openOfficialForm, setOpenOfficialForm] = useState(false);
  const [openOfficialDelete, setOpenOfficialDelete] = useState(false);
  const [selectedOfficial, setSelectedOfficial] = useState(null);
  const [officialErrorMessage, setOfficialErrorMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [sortOption, setSortOption] = useState("verified");
  const [loading, setLoading] = useState(false);
  const [part, setPart] = useState(1);

  // ========== ACCESS HANDLERS ==========
  // ➕ Open Create Account Modal
  const handleOpenAccessCreate = (official) => {
    setSelectedOfficial(official);
    setAccessFormMode("create");
    setOpenAccessForm(true);
  };

  // ✏️ Open Edit Account Modal
  const handleOpenAccessEdit = (official) => {
    setSelectedOfficial(official);
    setAccessFormMode("edit");
    setOpenAccessForm(true);
  };

  // ========== OFFICIAL HANDLERS ==========
  // ➕ Open Add Official Modal
  const handleOpenOfficialAdd = () => {
    setSelectedOfficial(null);
    setOpenOfficialForm(true);
  };

  // ✏️ Open Edit Official Modal
  const handleOpenOfficialEdit = (official) => {
    setSelectedOfficial(official);
    setOpenOfficialForm(true);
  };

  // 🗑️ Open Delete Official Modal
  const handleOpenOfficialDelete = (official) => {
    setSelectedOfficial(official);
    setOpenOfficialDelete(true);
  };

  // Load officials on component mount and when part changes
  useEffect(() => {
    loadOfficials();
  }, [part]);

  // Fetch all officials from API
  const loadOfficials = async () => {
    try {
      setLoading(true);
      let data;
      if (part === 2) {
        // Load officials with account information for Access Control
        data = await fetchOfficialsWithAccounts();
      } else {
        // Load basic officials for Part 1
        data = await fetchOfficials();
      }
      console.log("Officials loaded:", data);
      setOfficials(data || []);
    } catch (err) {
      console.error("Error loading officials:", err);
      setOfficialErrorMessage("Failed to load officials: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Submit (Add or Edit) Official
  const handleSubmitOfficial = async (formData) => {
    try {
      setOfficialErrorMessage(""); // Clear previous errors
      if (selectedOfficial) {
        // Preserve the account ID when updating
        const updateData = {
          ...formData,
          official_account_id: selectedOfficial.official_account_id,
        };
        await updateOfficial(selectedOfficial.official_id, updateData);
        showSnackbar("Official updated successfully");
      } else {
        await addOfficial(formData);
        showSnackbar("Official added successfully");
      }
      // Single fetch only - loadOfficials handles which API to call based on part
      await loadOfficials();
      setOpenOfficialForm(false);
    } catch (err) {
      console.error("Error saving official:", err);
      setOfficialErrorMessage(err.message || "Error saving official");
    }
  };

  // Delete Official
  const handleDeleteOfficial = async (id) => {
    try {
      setOfficialErrorMessage(""); // Clear previous errors
      await deleteOfficial(id);
      await loadOfficials();
      setOpenOfficialDelete(false);
      showSnackbar("Official deleted successfully");
    } catch (err) {
      console.error("Error deleting official:", err);
      setOfficialErrorMessage(err.message || "Error deleting official");
    }
  };

  // Submit Account Creation or Update
  const handleSubmitAccess = async (formData) => {
    try {
      setOfficialErrorMessage(""); // Clear previous errors
      if (accessFormMode === "edit" && selectedOfficial?.official_account_id) {
        // Edit existing account - update permissions and optionally password
        console.log("Updating account with data:", formData);
        const updatePayload = {
          account_type: formData.account_type,
          can_add: formData.can_add ? 1 : 0,
          can_edit: formData.can_edit ? 1 : 0,
          can_delete: formData.can_delete ? 1 : 0,
        };

        // Only include password if provided
        if (formData.password) {
          updatePayload.password = formData.password;
        }

        await updateOfficialAccountPermissions(
          selectedOfficial.official_account_id,
          updatePayload,
        );
        showSnackbar("✅ Account updated successfully!");
      } else {
        // Create new account
        console.log("Creating account with data:", formData);

        // Find the official to get position
        const officialData = officials.find(
          (o) => o.official_id === parseInt(formData.official_id),
        );
        const position = officialData?.position || "Staff";

        await createOfficialAccount(
          formData.official_id,
          formData.password,
          formData.account_type,
          formData.can_add ? 1 : 0,
          formData.can_edit ? 1 : 0,
          formData.can_delete ? 1 : 0,
          position, // Include position
        );
        showSnackbar("✅ Account created successfully!");
      }

      await loadOfficials();
      setOpenAccessForm(false);
      setSelectedOfficial(null); // Clear selection after closing
    } catch (err) {
      console.error("Error processing account:", err);
      setOfficialErrorMessage(err.message || "Error processing account");
      throw err;
    }
  };

  // Filter officials based on search query
  const filteredOfficials = useMemo(() => {
    return officials.filter((official) => {
      const fullName =
        `${official.first_name || ""} ${official.last_name || ""}`.toLowerCase();
      const position = (official.position || "").toLowerCase();
      const matchesSearch =
        fullName.includes(searchQuery.toLowerCase()) ||
        position.includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [officials, searchQuery]);

  // Snackbar handlers
  const showSnackbar = (message) => {
    setSnackbarMessage(message);
    setSnackbarOpen(true);
  };

  const closeSnackbar = (event, reason) => {
    if (reason === "clickaway") return;
    setSnackbarOpen(false);
  };

  // Toggle handlers
  const goToPartTwo = () => setPart(2);
  const goToPartOne = () => setPart(1);

  useEffect(() => {
    if (sortOption === "officials") {
      setPart(1);
    } else if (sortOption === "access") {
      setPart(2);
    }
  }, [sortOption]);

  return (
    <Box p={3}>
      <Helmet titleTemplate="%s - Barangay Management System">
        <title>Officials</title>
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
          {part === 1 ? "Officials" : "Officials - Access Control"}
        </Typography>
        {part === 1 && (
          <Button
            variant="contained"
            color="primary"
            onClick={handleOpenOfficialAdd}
            sx={{
              width: { xs: 150, sm: 150 },
              height: { xs: 45, sm: 45 },
              minWidth: { xs: 45, sm: 50 },
              fontSize: { xs: 12, sm: 16 },
              padding: 0,
            }}
          >
            Add Official
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
            placeholder="Search officials by name or position..."
            size="small"
            sx={{
              width: { xs: "100%", sm: 330 },
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
            <FormControl
              size="small"
              sx={{
                width: { xs: "100%", sm: 180 },
              }}
            >
              <InputLabel>Page</InputLabel>
              <Select
                value={sortOption}
                label="Sort"
                onChange={(e) => setSortOption(e.target.value)}
              >
                <MenuItem value="officials">Officials</MenuItem>
                <MenuItem value="access">Access Control</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>
      </Paper>

      {/* Officials Grid Display */}
      {part === 1 && (
        <Paper sx={{ p: 3, mt: 3, borderRadius: 2 }} variant="outlined">
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
            }}
          >
            <Typography variant="h6" sx={{ mb: 2 }}>
              Official List
            </Typography>
            {/*
            <Button
              variant="contained"
              color="primary"
              onClick={goToPartTwo}
              sx={{
                width: { xs: 150, sm: 150 },
                height: { xs: 45, sm: 45 },
                minWidth: { xs: 45, sm: 50 },
                fontSize: { xs: 12, sm: 16 },
                padding: 0,
              }}
            >
              Access Control
            </Button>
            */}
          </Box>
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
          ) : officialErrorMessage ? (
            <Typography color="error" sx={{ py: 3, textAlign: "center" }}>
              {officialErrorMessage}
            </Typography>
          ) : filteredOfficials.length > 0 ? (
            <OfficialCard
              officials={filteredOfficials}
              onEdit={handleOpenOfficialEdit}
              onDelete={handleOpenOfficialDelete}
            />
          ) : (
            <Typography
              color="text.secondary"
              sx={{ textAlign: "center", py: 4 }}
            >
              {searchQuery
                ? "No officials match your search."
                : "No officials found. Add your first official!"}
            </Typography>
          )}
        </Paper>
      )}

      {/* Access Control Grid Display */}
      {part === 2 && (
        <Paper sx={{ p: 3, mt: 3, borderRadius: 2 }} variant="outlined">
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
            }}
          >
            <Typography variant="h6" sx={{ mb: 2 }}>
              Official Access Control
            </Typography>
            {/* // For future use 
            <Button
              variant="contained"
              color="primary"
              onClick={goToPartOne}
              sx={{
                width: { xs: 150, sm: 150 },
                height: { xs: 45, sm: 45 },
                minWidth: { xs: 45, sm: 50 },
                fontSize: { xs: 12, sm: 16 },
                padding: 0,
              }}
            >
              Back
            </Button>
            */}
          </Box>
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
          ) : officialErrorMessage ? (
            <Typography color="error" sx={{ py: 3, textAlign: "center" }}>
              {officialErrorMessage}
            </Typography>
          ) : filteredOfficials.length > 0 ? (
            <AccessCard
              officials={filteredOfficials}
              onCreateAccount={handleOpenAccessCreate}
              onEditAccount={handleOpenAccessEdit}
            />
          ) : (
            <Typography
              color="text.secondary"
              sx={{ textAlign: "center", py: 4 }}
            >
              {searchQuery
                ? "No officials match your search."
                : "No officials found. Add your first official!"}
            </Typography>
          )}
        </Paper>
      )}

      {/* ========== ACCESS MODALS ========== */}
      <AccessForm
        open={openAccessForm}
        handleClose={() => setOpenAccessForm(false)}
        onSubmit={handleSubmitAccess}
        selectedOfficial={selectedOfficial}
        officials={officials}
        mode={accessFormMode}
      />
      {/* ========== OFFICIAL MODALS ========== */}
      <OfficialForm
        open={openOfficialForm}
        handleClose={() => {
          setOpenOfficialForm(false);
          setSelectedOfficial(null); // Always clear selection to prevent stale data
        }}
        onSubmit={handleSubmitOfficial}
        selectedOfficial={selectedOfficial}
        official={officials}
      />
      <OfficialDelete
        open={openOfficialDelete}
        handleClose={() => setOpenOfficialDelete(false)}
        onSubmit={handleDeleteOfficial}
        selectedOfficial={selectedOfficial}
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
