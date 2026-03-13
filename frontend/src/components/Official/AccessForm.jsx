import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Slide,
  Alert,
  Box,
  Typography,
  CircularProgress,
  Paper,
  Chip,
} from "@mui/material";
import { styled } from "@mui/material/styles";

// Animation transition
const Transition = React.forwardRef(function Transition(props, ref) {
  return (
    <Slide
      direction="up"
      ref={ref}
      {...props}
      timeout={500}
      easing={{
        enter: "cubic-bezier(0.4, 0, 0.2, 1)",
        exit: "ease-out",
      }}
    />
  );
});

const InfoBox = styled(Paper)(({ theme }) => ({
  backgroundColor: theme.palette.mode === "dark" ? "#1e1e1e" : "#f5f5f5",
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(2),
  marginTop: theme.spacing(2),
}));

function AccessForm({
  open,
  handleClose,
  onSubmit,
  selectedOfficial,
  officials = [],
  mode = "create",
}) {
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
    official_id: "",
    account_type: "Staff",
    can_add: false,
    can_edit: false,
    can_delete: false,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedOfficialData = officials.find(
    (o) => o.official_id === parseInt(formData.official_id),
  );

  const isEditMode = mode === "edit" && selectedOfficial?.official_account_id;

  // Reset form when dialog closes or mode changes
  useEffect(() => {
    if (!open) {
      setFormData({
        password: "",
        confirmPassword: "",
        official_id: selectedOfficial?.official_id || "",
        account_type: "Staff",
        can_add: false,
        can_edit: false,
        can_delete: false,
      });
      setError("");
    } else if (mode === "edit" && selectedOfficial) {
      // Edit mode - prefill with existing account data
      if (!selectedOfficial.official_account_id) {
        console.warn("Edit mode requested but account_id not found in selectedOfficial:", selectedOfficial);
      }
      setFormData({
        password: "",
        confirmPassword: "",
        official_id: selectedOfficial.official_id || "",
        account_type: selectedOfficial.account_type || "Staff",
        can_add: Boolean(selectedOfficial.can_add),
        can_edit: Boolean(selectedOfficial.can_edit),
        can_delete: Boolean(selectedOfficial.can_delete),
      });
    }
  }, [open, selectedOfficial, mode]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        handleClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, handleClose]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
    setError(""); // Clear error when user types
  };

  const handleSubmit = async () => {
    // For edit mode - validate official_account_id
    if (isEditMode && !selectedOfficial?.official_account_id) {
      setError("❌ Account not found");
      return;
    }

    // For create mode - validate official selection
    if (!isEditMode && !formData.official_id) {
      setError("❌ Please select an official");
      return;
    }

    // Validate password requirement
    if (!isEditMode) {
      // Create mode requires password
      if (!formData.password || !formData.password.trim()) {
        setError("❌ Password is required");
        return;
      }
      if (formData.password.length < 6) {
        setError("❌ Password must be at least 6 characters long");
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setError("❌ Passwords do not match");
        return;
      }
    } else {
      // Edit mode - password is optional but if provided must be validated
      if (formData.password || formData.confirmPassword) {
        if (!formData.password || !formData.confirmPassword) {
          setError(
            "❌ Please provide both password fields or leave both empty",
          );
          return;
        }
        if (formData.password.length < 6) {
          setError("❌ Password must be at least 6 characters long");
          return;
        }
        if (formData.password !== formData.confirmPassword) {
          setError("❌ Passwords do not match");
          return;
        }
      }
    }

    setLoading(true);
    try {
      const submitData = {
        official_id: parseInt(formData.official_id),
        account_type: formData.account_type,
        can_add: formData.can_add,
        can_edit: formData.can_edit,
        can_delete: formData.can_delete,
      };

      if (!isEditMode) {
        submitData.password = formData.password.trim();
      } else if (formData.password) {
        submitData.password = formData.password.trim();
      }

      await onSubmit(submitData);
      handleClose();
    } catch (err) {
      setError(err.message || "❌ Error processing account");
    } finally {
      setLoading(false);
    }
  };
  // Handle Enter key for submit
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Enter" && open) {
        event.preventDefault();
        handleSubmit();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, formData]);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      TransitionComponent={Transition}
      keepMounted
      maxWidth="sm"
      fullWidth
    >
      <>
        <DialogTitle sx={{ fontWeight: "bold" }}>
          {isEditMode ? "Edit Official Account" : "Create Official Account"}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
            {/* Official Selection - Only in Create Mode */}
            {!isEditMode && (
              <FormControl fullWidth margin="dense">
                <InputLabel>Select Official</InputLabel>
                <Select
                  label="Select Official"
                  name="official_id"
                  value={formData.official_id || ""}
                  onChange={handleChange}
                  disabled={loading}
                >
                  <MenuItem value="">
                    <em>No Official Selected</em>
                  </MenuItem>
                  {officials
                    .filter((official) => !official.official_account_id) // Only show officials without accounts
                    .map((official) => (
                      <MenuItem
                        key={official.official_id}
                        value={official.official_id}
                      >
                        {official.first_name} {official.last_name} -{" "}
                        {official.position}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            )}

            {/* Official Details Display - In Edit Mode */}
            {isEditMode && selectedOfficial && (
              <InfoBox elevation={0}>
                <Typography
                  variant="subtitle2"
                  sx={{ fontWeight: "bold", mb: 1 }}
                >
                  Official Information:
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <Box
                    sx={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <Typography variant="body2">Name:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                      {selectedOfficial.first_name} {selectedOfficial.last_name}
                    </Typography>
                  </Box>
                  <Box
                    sx={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <Typography variant="body2">Position:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                      {selectedOfficial.position}
                    </Typography>
                  </Box>
                  <Box
                    sx={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <Typography variant="body2">Username:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                      {selectedOfficial.username}
                    </Typography>
                  </Box>
                </Box>
              </InfoBox>
            )}

            {/* Account Type Selection */}
            <FormControl fullWidth margin="dense">
              <InputLabel>Account Type</InputLabel>
              <Select
                label="Account Type"
                name="account_type"
                value={formData.account_type}
                onChange={handleChange}
                disabled={loading}
              >
                <MenuItem value="Staff">Staff</MenuItem>
                <MenuItem value="Admin">Admin</MenuItem>
              </Select>
            </FormControl>

            {/* Permissions Checkboxes */}
            <InfoBox elevation={0}>
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: "bold", mb: 1.5 }}
              >
                Account Permissions:
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    name="can_add"
                    checked={formData.can_add}
                    onChange={handleChange}
                    disabled={loading}
                    style={{ marginRight: "8px" }}
                  />
                  <Typography variant="body2">Can Add</Typography>
                </label>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    name="can_edit"
                    checked={formData.can_edit}
                    onChange={handleChange}
                    disabled={loading}
                    style={{ marginRight: "8px" }}
                  />
                  <Typography variant="body2">Can Edit</Typography>
                </label>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    name="can_delete"
                    checked={formData.can_delete}
                    onChange={handleChange}
                    disabled={loading}
                    style={{ marginRight: "8px" }}
                  />
                  <Typography variant="body2">Can Delete</Typography>
                </label>
              </Box>
            </InfoBox>

            {/* Password Fields */}
            <TextField
              type="password"
              label="Password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              fullWidth
              margin="dense"
              placeholder={
                isEditMode
                  ? "Leave empty to keep current password"
                  : "Enter account password"
              }
              disabled={loading}
              helperText={
                isEditMode
                  ? "Optional - leave empty to keep current"
                  : "Minimum 6 characters"
              }
            />

            {/* Confirm Password */}
            <TextField
              type="password"
              label="Confirm Password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              fullWidth
              margin="dense"
              placeholder={
                isEditMode
                  ? "Leave empty to keep current password"
                  : "Confirm password"
              }
              disabled={loading}
            />

            <Alert severity="info" sx={{ mt: 1 }}>
              {isEditMode
                ? "Update the account type and permissions as needed. Password is optional."
                : "Set the account type to Admin or Staff, then configure specific permissions below."}
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="secondary" disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            color="primary"
            disabled={loading || (!isEditMode && !formData.official_id)}
          >
            {isEditMode ? "Update Account" : "Create Account"}
          </Button>
        </DialogActions>
      </>
    </Dialog>
  );
}

export default AccessForm;
