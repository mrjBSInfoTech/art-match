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
import HouseholdForm from "../components/Household/HouseholdForm";
import HouseholdDelete from "../components/Household/HouseholdDelete";

export default function Household() {
  const [household, setHousehold] = useState([]);
  const [openHouseholdForm, setOpenHouseholdForm] = useState(false);
  const [openHouseholdDelete, setOpenHouseholdDelete] = useState(false);
  const [selectedHousehold, setSelectedHousehold] = useState(null);
  const [householdErrorMessage, setHouseholdErrorMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // ========== HOUSEHOLD HANDLERS ==========
  // ➕ Open Add Household Modal
  const handleOpenHouseholdAdd = () => {
    setSelectedHousehold(null);
    setOpenHouseholdForm(true);
  };

  // ✏️ Open Edit Household Modal
  const handleOpenHouseholdEdit = (household) => {
    setSelectedHousehold(household);
    setOpenHouseholdForm(true);
  };

  // 🗑️ Open Delete Household Modal
  const handleOpenHouseholdDelete = (household) => {
    setSelectedHousehold(household);
    setOpenHouseholdDelete(true);
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
          Household
        </Typography>
        <Button
          variant="contained"
          color="primary"
          sx={{
            width: { xs: 150, sm: 150 },
            height: { xs: 45, sm: 45 },
            minWidth: { xs: 45, sm: 50 },
            fontSize: { xs: 12, sm: 16 },
            padding: 0,
          }}
        >
          Add Household
        </Button>
      </Box>

      <Paper sx={{ p: 3, mt: 3, borderRadius: 2 }} variant="outlined">
        <Typography variant="h6" sx={{ mb: 2 }}>
          Household List
        </Typography>
      </Paper>
      {/* ========== HOUSEHOLD MODALS ========== */}
      <HouseholdForm
        open={openHouseholdForm}
        handleClose={() => setOpenHouseholdForm(false)}
        //onSubmit={handleSubmitHousehold} ON HOLD FOR NOW
        selectedHousehold={selectedHousehold}
        household={household}
      />
      <HouseholdDelete
        open={openHouseholdDelete}
        handleClose={() => setOpenHouseholdDelete(false)}
        //onSubmit={handleDeleteHousehold} ON HOLD FOR NOW
        selectedHousehold={selectedHousehold}
        mode="delete"
      />
    </Box>
  );
}
