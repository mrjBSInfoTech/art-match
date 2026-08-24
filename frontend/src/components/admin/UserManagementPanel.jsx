import { useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardMedia,
  CardContent,
  Chip,
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import InfoIcon from "@mui/icons-material/Info";

const emptyValue = "Not provided";

export default function UserManagementPanel({
  users = [],
  type,
  fields,
  loading,
  error,
  onSave,
  onDelete,
}) {
  const [selectedUser, setSelectedUser] = useState(null);
  const [dialogMode, setDialogMode] = useState(null);
  const [formData, setFormData] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [search, setSearch] = useState("");
  const [operationError, setOperationError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Menu anchor state for MoreVertIcon
  const [anchorEl, setAnchorEl] = useState(null);
  const openMenu = Boolean(anchorEl);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return users;
    return users.filter((user) =>
      fields.some(({ key }) =>
        String(user[key] || "")
          .toLowerCase()
          .includes(query)
      )
    );
  }, [fields, search, users]);

  const getName = (user) =>
    `${user.first_name || ""} ${user.last_name || ""}`.trim() || "Unnamed user";

  const getId = (user) =>
    user[type === "student" ? "student_id" : "customer_id"];

  // Menu Handlers
  const handleMenuOpen = (event, user) => {
    setAnchorEl(event.currentTarget);
    setSelectedUser(user);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  // Dialog Handlers
  const openDialog = (user, mode) => {
    setSelectedUser(user);
    setFormData(
      Object.fromEntries(fields.map(({ key }) => [key, user[key] || ""]))
    );
    setDialogMode(mode);
  };

  const closeDialog = () => {
    setDialogMode(null);
    setSelectedUser(null);
  };

  const save = async () => {
    try {
      setSaving(true);
      setOperationError("");
      await onSave(getId(selectedUser), formData);
      closeDialog();
    } catch (err) {
      setOperationError(err.message || `Unable to update ${type}.`);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    try {
      setDeleting(true);
      setOperationError("");
      await onDelete(getId(deleteTarget));
      setDeleteTarget(null);
    } catch (err) {
      setOperationError(err.message || `Unable to delete ${type}.`);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Box>
      {operationError && (
        <Alert
          severity="error"
          onClose={() => setOperationError("")}
          sx={{ mb: 2 }}
        >
          {operationError}
        </Alert>
      )}

      {/* Search Input */}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 3 }}>
        <TextField
          fullWidth
          size="small"
          label={`Search ${type}s`}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </Stack>

      {loading && (
        <Typography color="text.secondary">Loading {type}s...</Typography>
      )}
      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}
      {!loading && !error && filteredUsers.length === 0 && (
        <Typography color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
          No {type}s found.
        </Typography>
      )}

      {/* Grid Layout matching ResidentCard */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            md: "repeat(3, 1fr)",
            lg: "repeat(4, 1fr)",
          },
          gap: 2,
        }}
      >
        {filteredUsers.map((user) => {
          const userId = getId(user);
          const status = user.register_status;
          return (
            <Card key={userId}>
              {/* Media Container */}
              <Box
                sx={{
                  width: "100%",
                  height: 300,
                  position: "relative",
                  backgroundColor: "#f5f5f5",
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CardMedia
                  component="img"
                  sx={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    objectPosition: "center",
                  }}
                  image={
                    user.image
                      ? `http://localhost:5000/uploads/uploadUser/${encodeURIComponent(user.image)}`
                      : `http://localhost:5000/uploads/profile.jpg`
                  }
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src =
                      "https://via.placeholder.com/250x150?text=No+Image";
                  }}
                  alt={getName(user)}
                />
              </Box>

              {/* Card Content */}
              <CardContent sx={{ flex: 1, overflow: "auto" }}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    mb: 1.5,
                  }}
                >
                  <Box sx={{ flex: 1, pr: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                      {getName(user)}
                    </Typography>
                    <Chip
                      size="small"x
                      label={
                        type === "student" ? status || "Pending" : "Customer"
                      }
                      color={
                        type === "student" && status === "verified"
                          ? "success"
                          : "default"
                      }
                      sx={{ mt: 0.5 }}
                    />
                  </Box>

                  <IconButton
                    size="small"
                    onClick={(e) => handleMenuOpen(e, user)}
                    sx={{
                      ml: "auto",
                      "&:hover": {
                        backgroundColor: "action.hover",
                      },
                    }}
                  >
                    <MoreVertIcon fontSize="small" />
                  </IconButton>
                </Box>

                {/* View Info Button */}
                <Button
                  variant="outlined"
                  size="small"
                  fullWidth
                  startIcon={<InfoIcon />}
                  onClick={() => openDialog(user, "view")}
                  sx={{ mb: 1 }}
                >
                  View Info
                </Button>

                {/* Options Menu */}
                <Menu
                  anchorEl={anchorEl}
                  open={openMenu && getId(selectedUser) === userId}
                  onClose={handleMenuClose}
                  anchorOrigin={{
                    vertical: "bottom",
                    horizontal: "right",
                  }}
                  transformOrigin={{
                    vertical: "top",
                    horizontal: "right",
                  }}
                >
                  <MenuItem
                    onClick={() => {
                      openDialog(selectedUser, "edit");
                      handleMenuClose();
                    }}
                    sx={{ color: "success.main" }}
                  >
                    <EditIcon sx={{ mr: 1, fontSize: "20px" }} />
                    Edit
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      setDeleteTarget(selectedUser);
                      handleMenuClose();
                    }}
                    sx={{ color: "error.main" }}
                  >
                    <DeleteIcon sx={{ mr: 1, fontSize: "20px" }} />
                    Delete
                  </MenuItem>
                </Menu>
              </CardContent>
            </Card>
          );
        })}
      </Box>

      {/* View/Edit Dialog */}
      <Dialog
        open={Boolean(dialogMode)}
        onClose={closeDialog}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {dialogMode === "edit"
            ? `Edit ${type}`
            : `${type[0].toUpperCase()}${type.slice(1)} information`}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {fields.map(({ key, label }) =>
              dialogMode === "edit" ? (
                <TextField
                  key={key}
                  label={label}
                  value={formData[key] || ""}
                  onChange={(event) =>
                    setFormData({ ...formData, [key]: event.target.value })
                  }
                  fullWidth
                  size="small"
                />
              ) : (
                <Typography key={key} variant="body2">
                  <strong>{label}:</strong> {selectedUser?.[key] || emptyValue}
                </Typography>
              )
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Close</Button>
          {dialogMode === "edit" && (
            <Button variant="contained" onClick={save} disabled={saving}>
              {saving ? "Saving..." : "Save changes"}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
      >
        <DialogTitle>Delete {type}?</DialogTitle>
        <DialogContent>
          <Typography>
            This will permanently remove {getName(deleteTarget || {})}.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={remove}
            disabled={deleting}
          >
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}