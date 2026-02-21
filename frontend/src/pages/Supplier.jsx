import React, { useState, useEffect } from "react";
import {
  Alert,
  Box,
  Button,
  Grid,
  InputAdornment,
  IconButton,
  LinearProgress,
  Paper,
  Slide,
  Snackbar,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  TextField,
  Typography,
  Tooltip,
} from "@mui/material";
import { Edit, Delete } from "@mui/icons-material";
import {
  fetchSuppliers,
  addSupplier,
  updateSupplier,
  deleteSupplier,
} from "../api/supplierAPI";
import SearchIcon from "@mui/icons-material/Search";
import SupplierForm from "../components/Supplier/SupplierForm";

// Slide Transition for Snackbar
function SlideTransition(props) {
  return <Slide {...props} direction="up" />;
}

export default function Supplier() {
  const [suppliers, setSuppliers] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  // 🟢 Load all suppliers
  const loadSuppliers = async () => {
    try {
      setLoading(true);
      setErrorMessage("");
      const response = await fetchSuppliers();
      if (response && response.data) {
        setSuppliers(Array.isArray(response.data) ? response.data : []);
      } else {
        setSuppliers([]);
        setErrorMessage("⚠️ No data received from server.");
      }
    } catch (err) {
      console.error("Failed to fetch suppliers:", err);
      setSuppliers([]);
      setErrorMessage("⚠️ Failed to fetch suppliers. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  // ➕ Open Add Modal
  const handleOpenAdd = () => {
    setSelectedSupplier(null);
    setOpenModal(true);
  };

  // ✏️ Open Edit Modal
  const handleOpenEdit = (supplier) => {
    setSelectedSupplier(supplier);
    setOpenModal(true);
  };

  // 🗑️ Open Delete Modal
  const handleOpenDelete = (supplier) => {
    setSelectedSupplier(supplier);
    setOpenDeleteModal(true);
  };

  const handleClose = () => setOpenModal(false);

  // 💾 Submit (Add or Edit)
  const handleSubmit = async (data) => {
    try {
      // data is already FormData from SupplierForm, don't wrap it again
      if (selectedSupplier) {
        await updateSupplier(selectedSupplier.supplier_id, data);
        showSnackbar("✓ Editing Complete");
      } else {
        await addSupplier(data);
        showSnackbar("✓ Adding Complete");
      }

      await loadSuppliers();
      setOpenModal(false);
    } catch (err) {
      console.error("Error saving supplier:", err);
      showSnackbar("❌ Error: " + err.message);
    }
  };

  // 🗑️ Confirm Delete
  const handleDelete = async (id) => {
    try {
      await deleteSupplier(id);
      await loadSuppliers();
      setOpenDeleteModal(false);
      showSnackbar("✓ Deletion Complete");
    } catch (err) {
      console.error("Error deleting supplier:", err);
    }
  };

  // Filtered suppliers based on search query
  const filteredSuppliers = suppliers.filter((supplier) =>
    supplier.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Box>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: "bold" }}>
            Supplier
          </Typography>
          <Typography variant="body1" sx={{ mt: -1 }}>
            Welcome to the Supplier management page.
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          onClick={handleOpenAdd}
          sx={{
            width: { xs: 150, sm: 150 },
            height: { xs: 45, sm: 45 },
            minWidth: { xs: 45, sm: 50 },
            fontSize: { xs: 12, sm: 16 },
            padding: 0,
          }}
        >
          Add Supplier
        </Button>
      </Box>
      <Paper sx={{ p: 3, mt: 3, borderRadius: 2 }} variant="outlined">
        <Typography variant="h6">Filter</Typography>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
            mt: 2,
          }}
        >
          <TextField
            variant="outlined"
            placeholder="Search supplier..."
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
        </Box>
      </Paper>
      {/* Supplier Table */}
      <Paper sx={{ p: 3, mt: 3, borderRadius: 2 }} variant="outlined">
        <Typography variant="h6" sx={{ mb: 2 }}>
          Supplier List
        </Typography>
        <TableContainer
          component={Paper}
          sx={{
            width: "95%",
            maxHeight: "500px",
            margin: "0 auto",
            overflow: "auto",
            "&::-webkit-scrollbar": { width: "10px" },
            "&::-webkit-scrollbar-track": { background: "#f1f1f1" },
            "&::-webkit-scrollbar-thumb": {
              background: "#888",
              borderRadius: "5px",
            },
            "&::-webkit-scrollbar-thumb:hover": { background: "#555" },
          }}
        >
          <Table stickyHeader sx={{ minWidth: 650 }}>
            <TableHead>
              <TableRow>
                <TableCell
                  sx={{
                    width: "5%",
                    backgroundColor: "#1565c0",
                    color: "white",
                    fontWeight: "bold",
                    position: "sticky",
                    top: 0,
                  }}
                >
                  No.
                </TableCell>
                <TableCell
                  sx={{
                    backgroundColor: "#1565c0",
                    color: "white",
                    fontWeight: "bold",
                  }}
                >
                  Name
                </TableCell>
                <TableCell
                  sx={{
                    backgroundColor: "#1565c0",
                    color: "white",
                    fontWeight: "bold",
                  }}
                >
                  Contact Number
                </TableCell>
                <TableCell
                  sx={{
                    backgroundColor: "#1565c0",
                    color: "white",
                    fontWeight: "bold",
                  }}
                >
                  Facebook Link
                </TableCell>
                <TableCell
                  sx={{
                    backgroundColor: "#1565c0",
                    color: "white",
                    fontWeight: "bold",
                  }}
                >
                  Email
                </TableCell>
                <TableCell
                  sx={{
                    width: "15%",
                    backgroundColor: "#1565c0",
                    color: "white",
                    fontWeight: "bold",
                  }}
                >
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Box sx={{ width: "80%", margin: "0 auto" }}>
                      <LinearProgress color="primary" />
                    </Box>
                  </TableCell>
                </TableRow>
              ) : errorMessage ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ color: "red" }}>
                    {errorMessage}
                  </TableCell>
                </TableRow>
              ) : suppliers.length > 0 ? (
                filteredSuppliers.map((supplier, index) => (
                  <TableRow key={supplier.supplier_id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{supplier.name}</TableCell>
                    <TableCell>{supplier.number}</TableCell>
                    <TableCell>
                      <a
                        href={supplier.facebook_link}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {supplier.facebook_link}
                      </a>
                    </TableCell>
                    <TableCell>{supplier.email}</TableCell>
                    <TableCell>
                      <Tooltip title="Edit">
                        <IconButton
                          color="success"
                          onClick={() => handleOpenEdit(supplier)}
                        >
                          <Edit />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          color="error"
                          onClick={() => handleOpenDelete(supplier.supplier_id)}
                        >
                          <Delete />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    No suppliers found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        
      </Paper>

      {/* Add/Edit Supplier Form */}
      <SupplierForm
        open={openModal}
        handleClose={handleClose}
        onSubmit={handleSubmit}
        selectedSupplier={selectedSupplier}
      />

      {/* Delete Confirmation Modal */}
      <SupplierForm
        open={openDeleteModal}
        handleClose={() => setOpenDeleteModal(false)}
        onSubmit={handleDelete}
        selectedSupplier={selectedSupplier}
        mode="delete"
      />
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
