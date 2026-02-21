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
import ResidentsForm from "../components/Residents/ResidentsForm";
import ResidentsDelete from "../components/Residents/ResidentsDelete";

export default function Resident() {
  const [residents, setResidents] = useState([]);
  const [openResidentForm, setOpenResidentForm] = useState(false);
  const [openResidentDelete, setOpenResidentDelete] = useState(false);
  const [selectedResident, setSelectedResident] = useState(null);
  const [residentErrorMessage, setResidentErrorMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

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
          Resident
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={handleOpenResidentAdd}
          sx={{
            width: { xs: 150, sm: 150 },
            height: { xs: 45, sm: 45 },
            minWidth: { xs: 45, sm: 50 },
            fontSize: { xs: 12, sm: 16 },
            padding: 0,
          }}
        >
          Add Resident
        </Button>
      </Box>

      <Paper sx={{ p: 3, mt: 3, borderRadius: 2 }} variant="outlined">
        <Typography variant="h6" sx={{ mb: 2 }}>
          Resident List
        </Typography>
      </Paper>
      {/* ========== RESIDENT MODALS ========== */}
      <ResidentsForm
        open={openResidentForm}
        handleClose={() => setOpenResidentForm(false)}
        //onSubmit={handleSubmitResident} ON HOLD FOR NOW
        selectedResident={selectedResident}
        resident={residents}
      />
      <ResidentsDelete
        open={openResidentDelete}
        handleClose={() => setOpenResidentDelete(false)}
        //onSubmit={handleDeleteResident} ON HOLD FOR NOW
        selectedResident={selectedResident}
        mode="delete"
      />
    </Box>
  );
}
