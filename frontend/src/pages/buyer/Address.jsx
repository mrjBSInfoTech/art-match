import { useState, useEffect } from "react";
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
  Slide,
} from "@mui/material";
import {
  fetchAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
} from "../../api/buyer/addressAPI";
import AddressCard from "../../components/buyer/Address/AddressCard";
import AddressForm from "../../components/buyer/Address/AddressForm";
import AddressDelete from "../../components/buyer/Address/AddressDelete";
import ConnectionErrorPanel from "../../components/buyer/ConnectionErrorPanel";
// Icons
import HomeIcon from "@mui/icons-material/Home";
import PersonIcon from "@mui/icons-material/Person";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";

// Slide Transition for Snackbar
function SlideTransition(props) {
  return <Slide {...props} direction="up" />;
}

export default function Address() {
  const [addresses, setAddresses] = useState([]);
  const [openAddressForm, setOpenAddressForm] = useState(false);
  const [openAddressDelete, setOpenAddressDelete] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [addressErrorMessage, setAddressErrorMessage] = useState("");
  const [addressLoadError, setAddressLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");

  // Fetch all addresses from API
  const loadAddresses = async () => {
    try {
      setLoading(true);
      setAddressLoadError("");
      const data = await fetchAddresses();

      setAddresses(data || []);
    } catch (err) {
      console.error("Error loading addresses:", err);
      setAddressLoadError(err.message || "Failed to load addresses.");
    } finally {
      setLoading(false);
    }
  };

  // Load addresses
  useEffect(() => {
    loadAddresses();
  }, []);

  if (addressLoadError && !loading) {
    return (
      <ConnectionErrorPanel
        title="Addresses Unavailable"
        onRetry={loadAddresses}
      />
    );
  }

  // ========== ADDRESS HANDLERS ==========
  // ➕ Open Add Address Modal
  const handleOpenAddressAdd = () => {
    setSelectedAddress(null);
    setOpenAddressForm(true);
  };

  // ✏️ Open Edit Address Modal
  const handleOpenAddressEdit = (address) => {
    setSelectedAddress(address);
    setOpenAddressForm(true);
  };

  // 🗑️ Open Delete Address Modal
  const handleOpenAddressDelete = (address) => {
    setSelectedAddress(address);
    setOpenAddressDelete(true);
  };

  // Submit (Add or Edit) Address
  const handleSubmitAddress = async (formData) => {
    try {
      if (selectedAddress) {
        await updateAddress(selectedAddress.address_id, formData);
        showSnackbar("Address updated successfully", "success");
      } else {
        await addAddress(formData);
        showSnackbar("Address added successfully", "success");
      }
      await loadAddresses();
      setOpenAddressForm(false);
    } catch (err) {
      console.error("Error saving address:", err);
      setAddressErrorMessage(err.message || "Error saving address", "error");
    }
  };

  // Delete Address
  const handleDeleteAddress = async (id) => {
    try {
      await deleteAddress(id);
      await loadAddresses();
      setOpenAddressDelete(false);
      showSnackbar("Address deleted successfully", "success");
    } catch (err) {
      console.error("Error deleting address:", err, "error");
      setAddressErrorMessage(err.message || "Error deleting address", "error");
    }
  };

  // Snackbar handlers
  const showSnackbar = (message, severity = "success") => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const closeSnackbar = (event, reason) => {
    if (reason === "clickaway") return;
    setSnackbarOpen(false);
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case "success":
        return "success.light";
      case "error":
        return "error.light";
      default:
        return "primary.light";
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Helmet titleTemplate="%s - ArtMatch">
        <title>Address</title>
      </Helmet>
      <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            justifyContent: "space-between",
            alignItems: { xs: "flex-start", md: "center" },
            gap: 2,
            mb: 3,
          }}
        >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            My Addresses
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Follow each seller's progress from confirmation to delivery.
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="error"
          onClick={handleOpenAddressAdd}
          sx={{
            width: { xs: "100%", sm: 150 },
            height: { xs: 25, sm: 35 },
            minWidth: { xs: 45, sm: 50 },
            fontSize: { xs: 10, sm: 14 },
            padding: 0,
          }}
        >
          Add Address
        </Button>
      </Box>
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : addressErrorMessage ? (
        <Typography align="center" color="error" sx={{ py: 3 }}>
          {addressErrorMessage}
        </Typography>
      ) : addresses.length > 0 ? (
        <AddressCard
          addresses={addresses}
          onEdit={handleOpenAddressEdit}
          onDelete={handleOpenAddressDelete}
        />
      ) : (
        <Typography color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
          No addresses found. Add your first address!
        </Typography>
      )}

      <AddressForm
        open={openAddressForm}
        handleClose={() => setOpenAddressForm(false)}
        onSubmit={handleSubmitAddress}
        selectedAddress={selectedAddress}
      />
      <AddressDelete
        open={openAddressDelete}
        handleClose={() => setOpenAddressDelete(false)}
        onSubmit={handleDeleteAddress}
        selectedAddress={selectedAddress}
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
          severity={snackbarSeverity}
          variant="filled"
          sx={{
            width: { xs: 280, sm: 360 },
            minHeight: 48,
            borderRadius: 2,
            boxShadow: "0 10px 28px rgba(15, 23, 42, 0.18)",
            backgroundColor: getSeverityColor(snackbarSeverity),
            color: "#fff",
            alignItems: "center",
            "& .MuiAlert-icon": {
              color: "#fff",
              mr: 1,
            },
            "& .MuiAlert-message": {
              fontWeight: 600,
              fontSize: 14,
              display: "flex",
              alignItems: "center",
            },
            "& .MuiAlert-action": {
              alignItems: "center",
              paddingLeft: 1,
              color: "#fff",
            },
          }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
