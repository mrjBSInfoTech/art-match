import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Slide,
  Alert,
  Box,
  Typography,
  IconButton,
  InputAdornment,
  Divider,
} from "@mui/material";
// Icons
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import LockResetIcon from "@mui/icons-material/LockReset";

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

function ChangePassword({
  open,
  handleClose,
  onSubmit,
  selectedPassword,
  userId,
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Visibility Toggles
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Requirements state tracking
  const requirements = [
    { label: "At least 8 characters long", test: (pw) => pw.length >= 8 },
    {
      label: "Contains at least one uppercase letter",
      test: (pw) => /[A-Z]/.test(pw),
    },
    { label: "Contains at least one number", test: (pw) => /[0-9]/.test(pw) },
    {
      label: "Contains at least one special character (!@#$%^&*)",
      test: (pw) => /[!@#$%^&*]/.test(pw),
    },
    {
      label: "Must be unique (different from current password)",
      test: (pw) =>
        pw.length > 0 && currentPassword.length > 0 && pw !== currentPassword,
    },
  ];

  // Prefill data & Reset when dialog opens/closes
  useEffect(() => {
    setError("");
    setSuccess("");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
  }, [open, selectedPassword]);

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
  }, [open, currentPassword, newPassword, confirmPassword]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && open) {
        event.preventDefault();
        handleClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, handleClose]);

  const allRequirementsMet = requirements.every((req) => req.test(newPassword));
  const passwordsMatch =
    newPassword.length > 0 && newPassword === confirmPassword;

  const validateForm = () => {
    if (!currentPassword.trim()) {
      setError("Current password is required.");
      return false;
    }
    if (!newPassword.trim()) {
      setError("New password is required.");
      return false;
    }
    if (newPassword === currentPassword) {
      setError("New password must be different from your current password.");
      return false;
    }
    if (!allRequirementsMet) {
      setError("Please satisfy all new password requirements.");
      return false;
    }
    if (newPassword !== confirmPassword) {
      setError("Confirm password does not match.");
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    const submitData = {
      currentPassword: currentPassword,
      newPassword: newPassword,
    };

    try {
      await onSubmit(submitData);
      handleClose();
    } catch (error) {
      setError(error.message || "Unable to update password.");
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      disableRestoreFocus
      TransitionComponent={Transition}
      keepMounted
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          borderRadius: 3,
          p: 1,
        },
      }}
    >
      <DialogTitle sx={{ fontWeight: "bold" }}>Change Password</DialogTitle>

      <DialogContent dividers sx={{ pt: 2, pb: 2 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
          {/* Current Password Field */}
          <TextField
            label="Current Password"
            type={showCurrent ? "text" : "password"}
            value={currentPassword}
            onChange={(e) => {
              setCurrentPassword(e.target.value);
              setError("");
            }}
            fullWidth
            required
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowCurrent(!showCurrent)}
                    edge="end"
                  >
                    {showCurrent ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <Divider sx={{ my: 0.5 }} />

          {/* New Password Field */}
          <TextField
            label="New Password"
            type={showNew ? "text" : "password"}
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              setError("");
            }}
            fullWidth
            required
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowNew(!showNew)} edge="end">
                    {showNew ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          {/* Dynamic Requirements Checklist */}
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: "action.hover",
              display: "flex",
              flexDirection: "column",
              gap: 1,
            }}
          >
            <Typography
              variant="subtitle2"
              sx={{ fontWeight: "bold", mb: 0.5 }}
            >
              Password Requirements:
            </Typography>
            {requirements.map((req, index) => {
              const isMet = req.test(newPassword);
              return (
                <Box
                  key={index}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    color: isMet ? "success.main" : "text.secondary",
                  }}
                >
                  {isMet ? (
                    <CheckCircleIcon sx={{ fontSize: 18 }} />
                  ) : (
                    <CancelIcon sx={{ fontSize: 18, color: "text.disabled" }} />
                  )}
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: isMet ? "bold" : "normal",
                      textDecoration: isMet ? "none" : "none",
                    }}
                  >
                    {req.label}
                  </Typography>
                </Box>
              );
            })}
          </Box>

          {/* Confirm Password Field */}
          <TextField
            label="Confirm New Password"
            type={showConfirm ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              setError("");
            }}
            fullWidth
            required
            error={confirmPassword.length > 0 && !passwordsMatch}
            helperText={
              confirmPassword.length > 0 && !passwordsMatch
                ? "Passwords do not match."
                : ""
            }
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowConfirm(!showConfirm)}
                    edge="end"
                  >
                    {showConfirm ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} color="inherit">
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="primary"
          disabled={!allRequirementsMet || !passwordsMatch || !currentPassword}
        >
          Update Password
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ChangePassword;
