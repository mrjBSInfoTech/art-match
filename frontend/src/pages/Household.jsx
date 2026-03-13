import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import {
  Alert,
  Box,
  Button,
  Paper,
  Snackbar,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  TextField,
  InputAdornment,
  CircularProgress,
  IconButton,
  Tooltip,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import {
  fetchHouseholds,
  createHousehold,
  updateHousehold,
  deleteHousehold,
} from "../api/householdAPI";
import HouseholdForm from "../components/Household/HouseholdForm";
import HouseholdDelete from "../components/Household/HouseholdDelete";
import Slide from "@mui/material/Slide";

function SlideTransition(props) {
  return <Slide {...props} direction="up" />;
}

export default function Household() {
  const [households, setHouseholds] = useState([]);
  const [openHouseholdForm, setOpenHouseholdForm] = useState(false);
  const [openHouseholdDelete, setOpenHouseholdDelete] = useState(false);
  const [selectedHousehold, setSelectedHousehold] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch households on component mount
  useEffect(() => {
    loadHouseholds();
  }, []);

  const loadHouseholds = async () => {
    setLoading(true);
    try {
      const data = await fetchHouseholds();
      setHouseholds(data);
    } catch (error) {
      showSnackbar("❌ Failed to load households: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Add household
  const handleOpenHouseholdAdd = () => {
    setSelectedHousehold(null);
    setOpenHouseholdForm(true);
  };

  // Edit household
  const handleOpenHouseholdEdit = (household) => {
    setSelectedHousehold(household);
    setOpenHouseholdForm(true);
  };

  // Delete household
  const handleOpenHouseholdDelete = (household) => {
    setSelectedHousehold(household);
    setOpenHouseholdDelete(true);
  };

  // Submit form (create or update)
  const handleSubmitHousehold = async (formData) => {
    try {
      if (selectedHousehold) {
        await updateHousehold(selectedHousehold.household_id, formData);
        showSnackbar("✅ Household updated successfully");
      } else {
        await createHousehold(formData);
        showSnackbar("✅ Household added successfully");
      }
      loadHouseholds();
    } catch (error) {
      showSnackbar("❌ Error: " + error.message);
    }
  };

  // Delete household
  const handleDeleteHousehold = async () => {
    try {
      await deleteHousehold(selectedHousehold.household_id);
      showSnackbar("✅ Household deleted successfully");
      loadHouseholds();
    } catch (error) {
      showSnackbar("❌ Error: " + error.message);
    }
  };

  // Snackbar
  const showSnackbar = (message) => {
    setSnackbarMessage(message);
    setSnackbarOpen(true);
  };

  const closeSnackbar = (event, reason) => {
    if (reason === "clickaway") return;
    setSnackbarOpen(false);
  };

  // Filter households by search query
  const filteredHouseholds = households.filter(
    (h) =>
      h.house_number.toString().includes(searchQuery) ||
      h.street_number.toString().includes(searchQuery) ||
      h.barangay.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.head_family.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <Box p={3}>
      <Helmet titleTemplate="%s - Barangay Management System">
        <title>Household</title>
      </Helmet>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: "bold" }}>
          Household
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={handleOpenHouseholdAdd}
          sx={{ height: 45, px: 3 }}
        >
          Add Household
        </Button>
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
            placeholder="Search households..."
            size="small"
            sx={{
              width: { xs: "100%", md: 250 },
              minWidth: { xs: "100%", md: 250 },
            }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Box>
      </Paper>

      <Paper sx={{ p: 3, mt: 3, borderRadius: 2 }} variant="outlined">
        <Typography variant="h6" sx={{ mb: 2 }}>
          Household List
        </Typography>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 5 }}>
            <CircularProgress />
          </Box>
        ) : filteredHouseholds.length === 0 ? (
          <Typography color="textSecondary" sx={{ py: 3, textAlign: "center" }}>
            No households found.{" "}
            {households.length === 0
              ? "Add one to get started!"
              : "Try adjusting your search."}
          </Typography>
        ) : (
          <TableContainer>
            <Table>
              <TableHead sx={{ backgroundColor: "#f5f5f5" }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: "bold" }}>House #</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>Street #</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>Barangay</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>
                    Head of Family
                  </TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>Members</TableCell>
                  <TableCell sx={{ fontWeight: "bold", textAlign: "center" }}>
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredHouseholds.map((household) => (
                  <TableRow
                    key={household.household_id}
                    sx={{ "&:hover": { backgroundColor: "#f9f9f9" } }}
                  >
                    <TableCell>{household.house_number}</TableCell>
                    <TableCell>{household.street_number}</TableCell>
                    <TableCell>{household.barangay}</TableCell>
                    <TableCell>{household.head_family}</TableCell>
                    <TableCell>{household.household_members}</TableCell>
                    <TableCell sx={{ textAlign: "center" }}>
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleOpenHouseholdEdit(household)}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleOpenHouseholdDelete(household)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Modals */}
      <HouseholdForm
        open={openHouseholdForm}
        handleClose={() => setOpenHouseholdForm(false)}
        onSubmit={handleSubmitHousehold}
        selectedHousehold={selectedHousehold}
      />
      <HouseholdDelete
        open={openHouseholdDelete}
        handleClose={() => setOpenHouseholdDelete(false)}
        onSubmit={handleDeleteHousehold}
        selectedHousehold={selectedHousehold}
      />

      {/* Snackbar */}
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
