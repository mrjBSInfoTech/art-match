import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Box, Paper, Typography } from "@mui/material";
import UserManagementPanel from "../../components/admin/UserManagementPanel";
import {
  deleteCustomer,
  fetchCustomers,
  updateCustomer,
} from "../../api/admin/customerAPI";

const fields = [
  { key: "username", label: "Username" },
  { key: "first_name", label: "First name" },
  { key: "last_name", label: "Last name" },
  { key: "email", label: "Email" },
  { key: "phone_number", label: "Phone number" },
];

export default function Customer() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadCustomers = async () => {
    try {
      setLoading(true);
      setCustomers(await fetchCustomers());
      setError("");
    } catch (err) {
      setError(err.message || "Failed to load customers.");
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

  return (
    <Box sx={{ p: 3 }}>
      <Helmet titleTemplate="%s - ArtMatch">
        <title>Customers</title>
      </Helmet>
      <Typography variant="h4" sx={{ fontWeight: "bold", mb: 3 }}>
        Manage Customers
      </Typography>
      <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 2 }} variant="outlined">
        <UserManagementPanel
          users={customers}
          type="customer"
          fields={fields}
          loading={loading}
          error={error}
          onSave={saveCustomer}
          onDelete={removeCustomer}
        />
      </Paper>
    </Box>
  );
}
