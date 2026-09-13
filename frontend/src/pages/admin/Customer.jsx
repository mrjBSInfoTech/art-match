import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  Box,
  CircularProgress,
  InputAdornment,
  Paper,
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

export default function Customer() {
  const theme = useTheme();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [customerErrorMessage, setCustomerErrorMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

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

  useEffect(() => {
    loadCustomers();
  }, []);

  const saveCustomer = async (id, data) => {
    await updateCustomer(id, data);
    await loadCustomers();
  };

  const removeCustomer = async (id) => {
    await deleteCustomer(id);
    await loadCustomers();
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
          }}
        >
          <TextField
            variant="outlined"
            placeholder="Search customers..."
            size="small"
            sx={{
              width: { xs: "100%", sm: 275 },
              "& .MuiOutlinedInput-root": {
                color: theme.palette.text.primary,
                backgroundColor: theme.palette.background.default,
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
            onDelete={removeCustomer}
            onAccessChange={loadCustomers}
          />
        )}
      </Paper>
    </Box>
  );
}
