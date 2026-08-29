import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Slide,
  Snackbar,
  TextField,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AdminCard from "../../components/admin/Admin/AdminCard";
import AdminForm from "../../components/admin/Admin/AdminForm";
import AdminDelete from "../../components/admin/Admin/AdminDelete";
import {
  addAdmin,
  deleteAdmin,
  fetchAdmins,
  updateAdmin,
  changeAdminRole,
} from "../../api/admin/adminAPI";

// Slide Transition for Snackbar
function SlideTransition(props) {
  return <Slide {...props} direction="up" />;
}

export default function Admin() {
  const [admins, setAdmins] = useState([]);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [openAdminForm, setOpenAdminForm] = useState(false);
  const [openAdminDelete, setOpenAdminDelete] = useState(false);
  const [adminErrorMessage, setAdminErrorMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");

  const loadAdmins = async () => {
    try {
      setLoading(true);
      setAdminErrorMessage("");
      const response = await fetchAdmins();
      setAdmins(Array.isArray(response) ? response : []);
    } catch (error) {
      setAdmins([]);
      setAdminErrorMessage(error.message || "Failed to load admin accounts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdmins();
  }, []);

  const filteredAdmins = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const currentAdminId = String(localStorage.getItem("admin_id") || "");
    return admins.filter((admin) => {
      if (String(admin.admin_id) === currentAdminId) return false;
      const normalizedRole = String(admin.role || "").toLowerCase();
      const matchesRole = roleFilter === "all" || normalizedRole === roleFilter;
      const matchesSearch = [
        admin.username,
        admin.first_name,
        admin.last_name,
        admin.email,
        admin.role,
      ].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(query),
      );
      return matchesRole && (query === "" || matchesSearch);
    });
  }, [admins, searchQuery, roleFilter]);

  const handleOpenAdd = () => {
    setSelectedAdmin(null);
    setOpenAdminForm(true);
  };

  const handleOpenEdit = (admin) => {
    setSelectedAdmin(admin);
    setOpenAdminForm(true);
  };

  const handleSubmitAdmin = async (formData) => {
    if (selectedAdmin) {
      await updateAdmin(selectedAdmin.admin_id, formData);
      setSnackbarMessage("Admin access updated successfully.", "success");
    } else {
      await addAdmin(formData);
      setSnackbarMessage("Admin account created successfully.", "success");
    }

    await loadAdmins();
    setOpenAdminForm(false);
    setSelectedAdmin(null);
    setSnackbarOpen(true);
  };

  const handleOpenDelete = (admin) => {
    setSelectedAdmin(admin);
    setOpenAdminDelete(true);
  };

  const handleDeleteAdmin = async (id) => {
    try {
      await deleteAdmin(id);
      await loadAdmins();
      setSnackbarMessage("Admin account deleted successfully.", "success");
      setSnackbarOpen(true);
      setSelectedAdmin(null);
    } catch (error) {
      setAdminErrorMessage(
        error.message || "Unable to delete admin account.",
        "error",
      );
    }
  };

  const handleRoleChange = async (id, action) => {
    try {
      const response = await changeAdminRole(id, action);
      await loadAdmins();
      setSnackbarMessage(response.message || `Admin ${action}d successfully.`);
      setSnackbarSeverity("success");
      setSnackbarOpen(true);
    } catch (error) {
      setAdminErrorMessage(
        error.message || `Unable to ${action} admin account.`,
      );
    }
  };

  const handleCloseForm = () => {
    setOpenAdminForm(false);
    setSelectedAdmin(null);
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

  // Check if current user has permission to add admins
  const canAddAdmin =
    localStorage.getItem("admin_can_add") === "1" ||
    localStorage.getItem("admin_role") === "super admin";

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Helmet titleTemplate="%s - ArtMatch">
        <title>Admin Accounts</title>
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
        <Typography variant="h4" sx={{ fontWeight: "bold" }}>
          Admin Accounts
        </Typography>
        {canAddAdmin && (
          <Button variant="contained" color="error" onClick={handleOpenAdd}>
            Add Admin Account
          </Button>
        )}
      </Box>

      {/* Filter Section */}
      <Paper sx={{ p: 3, mt: 3, borderRadius: 2 }} variant="outlined">
        <Typography variant="h6" sx={{ fontWeight: "bold" }}>
          Filter
        </Typography>
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
            size="small"
            sx={{
              width: { xs: "100%", md: 250 },
              minWidth: { xs: "100%", md: 250 },
            }}
            placeholder="Search username, name, email, or role..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          <FormControl size="small" sx={{ width: { xs: "100%", lg: 180 } }}>
            <InputLabel>Roles</InputLabel>
            <Select
              value={roleFilter}
              label="Type"
              onChange={(event) => setRoleFilter(event.target.value)}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
              <MenuItem value="super admin">Super Admin</MenuItem>
              <MenuItem value="moderator">Moderator</MenuItem>
              <MenuItem value="customize">Customize</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>

      <Paper sx={{ p: 3, mt: 3, borderRadius: 2 }} variant="outlined">
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        ) : adminErrorMessage ? (
          <Typography align="center" color="error" sx={{ py: 3 }}>
            {adminErrorMessage}
          </Typography>
        ) : filteredAdmins.length > 0 ? (
          <AdminCard
            admins={filteredAdmins}
            onEdit={handleOpenEdit}
            onDelete={handleOpenDelete}
            onPromote={(id) => handleRoleChange(id, "promote")}
            onDemote={(id) => handleRoleChange(id, "demote")}
          />
        ) : (
          <Typography
            color="text.secondary"
            sx={{ textAlign: "center", py: 5 }}
          >
            {searchQuery
              ? "No admin accounts match your search."
              : "No admin accounts found."}
          </Typography>
        )}
      </Paper>

      <AdminForm
        open={openAdminForm}
        handleClose={handleCloseForm}
        onSubmit={handleSubmitAdmin}
        selectedAdmin={selectedAdmin}
        admins={admins}
      />

      <AdminDelete
        open={openAdminDelete}
        handleClose={() => {
          setOpenAdminDelete(false);
          setSelectedAdmin(null);
        }}
        onSubmit={handleDeleteAdmin}
        selectedAdmin={selectedAdmin}
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
