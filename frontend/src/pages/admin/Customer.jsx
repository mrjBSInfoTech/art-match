import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  Alert,
  Box,
  CircularProgress,
  InputAdornment,
  Paper,
  Slide,
  Snackbar,
  TextField,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import CustomerCard from "../../components/admin/Customer/CustomerCard";
import {
  deleteCustomer,
  fetchCustomers,
  updateCustomer,
} from "../../api/admin/customerAPI";
import SearchIcon from "@mui/icons-material/Search";
import CustomerDelete from "../../components/admin/Customer/CustomerDelete";

function SlideTransition(props) {
  return <Slide {...props} direction="up" />;
}

export default function Customer() {
  const theme = useTheme();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [customerErrorMessage, setCustomerErrorMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [openCustomerDelete, setOpenCustomerDelete] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");

  const loadCustomers = async () => {
    try {
      setLoading(true);
      setCustomers(await fetchCustomers());
      setCustomerErrorMessage("");
    } catch (err) {
      setCustomerErrorMessage(err.message || "Failed to load customers.");
    } finally {
      setLoading(false);
    }
  };

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

  useEffect(() => {
    loadCustomers();
  }, []);

  const saveCustomer = async (id, data) => {
    try {
      await updateCustomer(id, data);
      await loadCustomers();
      showSnackbar("Customer updated successfully.", "success");
    } catch (err) {
      showSnackbar(err.message || "Failed to update customer.", "error");
      throw err;
    }
  };

  const handleOpenDelete = (customer) => {
    setSelectedCustomer(customer);
    setOpenCustomerDelete(true);
  };

  const handleDeleteCustomer = async (id) => {
    try {
      await deleteCustomer(id);
      await loadCustomers();
      setOpenCustomerDelete(false);
      setSelectedCustomer(null);
      showSnackbar("Customer deleted successfully.", "success");
    } catch (err) {
      showSnackbar(err.message || "Failed to delete customer.", "error");
    }
  };

  const filteredCustomers = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();
    if (!search) return customers;
    return customers.filter((customer) =>
      [
        customer.username,
        customer.first_name,
        customer.last_name,
        customer.email,
        customer.phone_number,
      ].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(search),
      ),
    );
  }, [customers, searchQuery]);

  return (
    <Box
      sx={{
        p: { xs: 1.5, sm: 2.5 },
        minHeight: "100vh",
        backgroundColor: theme.palette.background.default,
        color: theme.palette.text.primary,
      }}
    >
      <Helmet titleTemplate="%s - ArtMatch">
        <title>Customers</title>
      </Helmet>
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "stretch", sm: "center" },
          gap: 2,
          mb: 2,
        }}
      >
        <Box>
          <Typography
            sx={{
              fontSize: { xs: 28, sm: 34 },
              fontWeight: 800,
              lineHeight: 1.1,
              color: theme.palette.text.primary,
            }}
          >
            Manage Customers
          </Typography>
          <Typography
            sx={{
              mt: 0.75,
              color: theme.palette.text.secondary,
              fontSize: 13,
            }}
          >
            Monitor and manage the customer accounts of the platform
          </Typography>
        </Box>
      </Box>

      <Paper
        sx={{
          p: { xs: 1.25, sm: 1.5 },
          mt: 2,
          borderRadius: 2,
          backgroundColor: theme.palette.background.paper,
          borderColor: theme.palette.divider,
        }}
        variant="outlined"
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", lg: "row" },
            justifyContent: "space-between",
            alignItems: { xs: "stretch", lg: "center" },
            gap: 1.25,
            width: "100%",
          }}
        >
          <TextField
            variant="outlined"
            placeholder="Search customers..."
            size="small"
            sx={{
              width: { xs: "100%", lg: 320 },
              maxWidth: { lg: 360 },
              flex: { lg: 1 },
              "& .MuiOutlinedInput-root": {
                color: theme.palette.text.primary,
                backgroundColor: theme.palette.background.default,
                borderRadius: 1.5,
                "& fieldset": { borderColor: theme.palette.divider },
                "&:hover fieldset": {
                  borderColor: theme.palette.text.secondary,
                },
              },
              "& .MuiInputBase-input::placeholder": {
                color: theme.palette.text.secondary,
                opacity: 1,
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </Box>
      </Paper>

      <Paper
        sx={{ p: { xs: 1.5, sm: 2 }, mt: 2, borderRadius: 2 }}
        variant="outlined"
      >
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        ) : customerErrorMessage ? (
          <Typography align="center" color="error" sx={{ py: 3 }}>
            {customerErrorMessage}
          </Typography>
        ) : filteredCustomers.length === 0 ? (
          <Typography align="center" color="text.secondary" sx={{ py: 3 }}>
            No customer records found.
          </Typography>
        ) : (
          <CustomerCard
            customers={filteredCustomers}
            onSave={saveCustomer}
            onDelete={handleOpenDelete}
            onAccessChange={loadCustomers}
          />
        )}
      </Paper>

      <CustomerDelete
        open={openCustomerDelete}
        handleClose={() => {
          setOpenCustomerDelete(false);
          setSelectedCustomer(null);
        }}
        onSubmit={handleDeleteCustomer}
        selectedCustomer={selectedCustomer}
      />

      {/* Snackbar Notification */}
      <Snackbar
        open={snackbarOpen}
        severity={snackbarSeverity}
        variant="filled"
        autoHideDuration={3000}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        TransitionComponent={SlideTransition}
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
            },
          }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
