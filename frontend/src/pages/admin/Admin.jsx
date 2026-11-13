import { useCallback, useEffect, useMemo, useState } from "react";
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
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import ViewListIcon from "@mui/icons-material/ViewList";
import AdminCard from "../../components/admin/Admin/AdminCard";
import AdminTable from "../../components/admin/Admin/AdminTable";
import AdminForm from "../../components/admin/Admin/AdminForm";
import AdminDelete from "../../components/admin/Admin/AdminDelete";
import ConnectionErrorPanel from "../../components/admin/ConnectionErrorPanel";
import AdminLoadingPanel from "../../components/admin/AdminLoadingPanel";
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
  const theme = useTheme();
  const [admins, setAdmins] = useState([]);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [openAdminForm, setOpenAdminForm] = useState(false);
  const [openAdminDelete, setOpenAdminDelete] = useState(false);
  const [adminErrorMessage, setAdminErrorMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [sortOption, setSortOption] = useState("az");
  const [viewMode, setViewMode] = useState("card");
  const [loading, setLoading] = useState(true);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");

  const loadAdmins = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    loadAdmins();
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") loadAdmins();
    };
    window.addEventListener("focus", refreshWhenVisible);
    window.addEventListener("storage", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.removeEventListener("focus", refreshWhenVisible);
      window.removeEventListener("storage", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [loadAdmins]);

  const filteredAdmins = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const currentAdminId = String(localStorage.getItem("admin_id") || "");
    const filtered = admins.filter((admin) => {
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
    return [...filtered].sort((first, second) => {
      const firstName = `${first.first_name || ""} ${first.last_name || ""}`
        .trim()
        .toLowerCase();
      const secondName = `${second.first_name || ""} ${second.last_name || ""}`
        .trim()
        .toLowerCase();
      return sortOption === "za"
        ? secondName.localeCompare(firstName)
        : firstName.localeCompare(secondName);
    });
  }, [admins, searchQuery, roleFilter, sortOption]);

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

  if (loading && admins.length === 0) {
    return (
      <AdminLoadingPanel
        title="Admin Accounts"
        subtitle="Monitor and manage the admin accounts of the platform"
        showMetrics={false}
      />
    );
  }

  if (adminErrorMessage) {
    return (
      <Box sx={{ minWidth: 0 }}>
        <Helmet titleTemplate="%s - ArtMatch">
          <title>Admin Accounts</title>
        </Helmet>
        <ConnectionErrorPanel
          title="Admin Accounts Unavailable"
          message={adminErrorMessage}
          onRetry={loadAdmins}
        />
      </Box>
    );
  }

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
        <Box>
          <Typography
            sx={{
              fontSize: { xs: 28, sm: 34 },
              fontWeight: 800,
              lineHeight: 1.1,
              color: theme.palette.text.primary,
            }}
          >
            Admin Accounts
          </Typography>
          <Typography
            sx={{
              mt: 0.75,
              color: theme.palette.text.secondary,
              fontSize: 13,
            }}
          >
            Monitor and manage the admin accounts of the platform
          </Typography>
        </Box>
        {canAddAdmin && (
          <Button
            variant="contained"
            color="error"
            startIcon={<AddIcon />}
            onClick={handleOpenAdd}
            sx={{
              width: { xs: "100%", sm: 150 },
              height: { xs: 38, sm: 44 },
              minWidth: { xs: 45, sm: 50 },
              fontSize: { xs: 12, sm: 16 },
              padding: 0,
              borderRadius: 1.5,
              textTransform: "none",
              fontWeight: 700,
            }}
          >
            Add Admin
          </Button>
        )}
      </Box>

      {/* Filter Section */}
      <Paper
        sx={{
          p: { xs: 1.5, sm: 2 },
          mt: 2,
          borderRadius: 2,
          backgroundColor: theme.palette.background.paper,
          borderColor: theme.palette.divider,
          minWidth: 0,
          overflow: "hidden",
        }}
        variant="outlined"
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "minmax(0, 1fr)",
              lg: "minmax(220px, 1fr) auto",
            },
            alignItems: "center",
            gap: { xs: 1.25, sm: 1.5 },
            width: "100%",
            minWidth: 0,
          }}
        >
          <TextField
            variant="outlined"
            name="admin-search"
            autoComplete="off"
            placeholder="Search username, name, email, or role..."
            size="small"
            fullWidth
            sx={{
              minWidth: 0,
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

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "minmax(0, 1fr)",
                sm: "repeat(2, minmax(0, 1fr))",
                lg: "minmax(125px, 145px) minmax(150px, 175px)",
              },
              gap: { xs: 1.25, sm: 1.25 },
              minWidth: 0,
            }}
          >
            <FormControl size="small" fullWidth sx={{ minWidth: 0 }}>
              <InputLabel
                sx={{ color: theme.palette.text.secondary, fontSize: 11 }}
              >
                Sort
              </InputLabel>
              <Select
                value={sortOption}
                label="Sort"
                onChange={(event) => setSortOption(event.target.value)}
                sx={{
                  fontSize: 11,
                  color: theme.palette.text.primary,
                  backgroundColor: theme.palette.background.default,
                  borderRadius: 1.5,
                  ".MuiOutlinedInput-notchedOutline": {
                    borderColor: theme.palette.divider,
                  },
                }}
              >
                <MenuItem value="az">A to Z</MenuItem>
                <MenuItem value="za">Z to A</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth sx={{ minWidth: 0 }}>
              <InputLabel
                sx={{ color: theme.palette.text.secondary, fontSize: 12 }}
              >
                Roles
              </InputLabel>
              <Select
                value={roleFilter}
                label="Roles"
                onChange={(event) => setRoleFilter(event.target.value)}
                sx={{
                  fontSize: 12,
                  color: theme.palette.text.primary,
                  backgroundColor: theme.palette.background.default,
                  borderRadius: 1.5,
                  ".MuiOutlinedInput-notchedOutline": {
                    borderColor: theme.palette.divider,
                  },
                }}
              >
                <MenuItem value="all">All Roles</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
                <MenuItem value="super admin">Super Admin</MenuItem>
                <MenuItem value="moderator">Moderator</MenuItem>
                <MenuItem value="customize">Customize</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>
      </Paper>

      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 1.5,
          mt: 2,
          mb: 1,
        }}
      >
        <Typography
          variant="caption"
          color="text.secondary"
          aria-live="polite"
          sx={{ fontWeight: 600 }}
        >
          Showing {filteredAdmins.length}{" "}
          {filteredAdmins.length === 1 ? "admin" : "admins"}
        </Typography>
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(_, next) => next && setViewMode(next)}
          size="small"
          aria-label="Admin presentation mode"
          sx={{
            backgroundColor: theme.palette.background.paper,
            borderRadius: 2.5,
            border: `1px solid ${theme.palette.divider}`,
            p: 0.3,
            "& .MuiToggleButton-root": {
              border: "none",
              borderRadius: 2,
              px: 1.5,
              py: 0.5,
              fontSize: 12,
              fontWeight: 700,
              textTransform: "none",
              color: theme.palette.text.secondary,
              gap: 0.75,
              transition: "all 150ms ease",
            },
            "& .MuiToggleButton-root.Mui-selected": {
              backgroundColor: theme.palette.error.main,
              color: "#fff",
              "&:hover": { backgroundColor: theme.palette.error.dark },
            },
          }}
        >
          <ToggleButton value="card" aria-label="Card view">
            <ViewModuleIcon sx={{ fontSize: 18 }} />
            Cards
          </ToggleButton>
          <ToggleButton value="table" aria-label="Table view">
            <ViewListIcon sx={{ fontSize: 18 }} />
            Table
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {viewMode === "table" && !loading && filteredAdmins.length > 0 ? (
        <Box>
          <AdminTable
            admins={filteredAdmins}
            onEdit={handleOpenEdit}
            onDelete={handleOpenDelete}
            onPromote={(id) => handleRoleChange(id, "promote")}
            onDemote={(id) => handleRoleChange(id, "demote")}
          />
        </Box>
      ) : (
        <Paper
          sx={{
            p: { xs: 1.5, sm: 2 },
            borderRadius: 2,
            backgroundColor: theme.palette.background.paper,
            borderColor: theme.palette.divider,
          }}
          variant="outlined"
        >
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
              <CircularProgress />
            </Box>
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
      )}

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
