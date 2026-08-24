import { useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";

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

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return users;
    return users.filter((user) =>
      fields.some(({ key }) =>
        String(user[key] || "")
          .toLowerCase()
          .includes(query),
      ),
    );
  }, [fields, search, users]);

  const getName = (user) =>
    `${user.first_name || ""} ${user.last_name || ""}`.trim() || "Unnamed user";
  const getId = (user) =>
    user[type === "student" ? "student_id" : "customer_id"];

  const openDialog = (user, mode) => {
    setSelectedUser(user);
    setFormData(
      Object.fromEntries(fields.map(({ key }) => [key, user[key] || ""])),
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

      <Grid container spacing={2}>
        {filteredUsers.map((user) => {
          const userId = getId(user);
          const status = user.register_status;
          return (
            <Grid item xs={12} sm={6} lg={4} key={userId}>
              <Card variant="outlined" sx={{ height: "100%", borderRadius: 2 }}>
                <CardContent
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 1.5,
                    height: "100%",
                  }}
                >
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="flex-start"
                    spacing={1}
                  >
                    <Box>
                      <Typography
                        variant="h6"
                        sx={{ fontWeight: 700, wordBreak: "break-word" }}
                      >
                        {getName(user)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {user.email || emptyValue}
                      </Typography>
                    </Box>
                    <Chip
                      size="small"
                      label={
                        type === "student" ? status || "Pending" : "Customer"
                      }
                      color={
                        type === "student" && status === "verified"
                          ? "success"
                          : "default"
                      }
                    />
                  </Stack>
                  <Typography variant="body2">
                    <strong>
                      {type === "student" ? "Student no." : "Username"}:
                    </strong>{" "}
                    {user[type === "student" ? "student_number" : "username"] ||
                      emptyValue}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Phone:</strong> {user.phone_number || emptyValue}
                  </Typography>
                  <Box sx={{ flexGrow: 1 }} />
                  <Stack direction="row" spacing={1} sx={{ pt: 1 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<VisibilityOutlinedIcon />}
                      onClick={() => openDialog(user, "view")}
                    >
                      View
                    </Button>
                    <IconButton
                      size="small"
                      aria-label={`Edit ${getName(user)}`}
                      onClick={() => openDialog(user, "edit")}
                    >
                      <EditOutlinedIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      aria-label={`Delete ${getName(user)}`}
                      onClick={() => setDeleteTarget(user)}
                    >
                      <DeleteOutlineIcon />
                    </IconButton>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

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
              ),
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
