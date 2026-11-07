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
import { useTheme } from "@mui/material/styles";
// Icons
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import LockResetIcon from "@mui/icons-material/LockReset";
import CloseIcon from "@mui/icons-material/Close";

// Animation transition matching ArtworkForm.jsx
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
  const theme = useTheme();

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
      label: "Contains at least one uppercase letter (A-Z)",
      test: (pw) => /[A-Z]/.test(pw),
    },
    {
      label: "Contains at least one lowercase letter (a-z)",
      test: (pw) => /[a-z]/.test(pw),
    },
    {
      label: "Contains at least one number (0-9)",
      test: (pw) => /\d/.test(pw),
    },
    {
      label: "Contains at least one special character (!@#$%^&*)",
      test: (pw) => /[!@#$%^&*(),.?":{}|<>]/.test(pw),
    },
  ];

  // Helper validation states
  const allRequirementsMet = requirements.every((req) =>
    req.test(newPassword),
  );

  useEffect(() => {
    if (!open) return;
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    setSuccess("");
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
  }, [open]);

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

  const handleSubmit = () => {
    if (!validateForm()) return;

    const submitData = {
      currentPassword: currentPassword,
      newPassword: newPassword,
    };

    onSubmit(submitData);
    handleClose();
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
          width: "min(100% - 24px, 470px)",
          maxWidth: "470px",
          borderRadius: 3,
          overflow: "hidden",
          backgroundColor: theme.palette.background.paper,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.75,
          px: 2.5,
          py: 1.75,
          color: theme.palette.text.primary,
          fontSize: 16,
          fontWeight: 700,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <LockResetIcon sx={{ color: "#ef3340", fontSize: 20 }} />
        Change Password
        <Button
          aria-label="Close"
          onClick={handleClose}
          sx={{
            minWidth: 28,
            width: 28,
            height: 28,
            ml: "auto",
            p: 0,
            color: theme.palette.text.secondary,
          }}
        >
          <CloseIcon sx={{ fontSize: 18 }} />
        </Button>
      </DialogTitle>

      <DialogContent dividers sx={{ pt: 2, pb: 2 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
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
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle current password visibility"
                    onClick={() => setShowCurrent(!showCurrent)}
                    edge="end"
                  >
                    {showCurrent ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            fullWidth
            required
            size="small"
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
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle new password visibility"
                    onClick={() => setShowNew(!showNew)}
                    edge="end"
                  >
                    {showNew ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            fullWidth
            required
            size="small"
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
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle confirm password visibility"
                    onClick={() => setShowConfirm(!showConfirm)}
                    edge="end"
                  >
                    {showConfirm ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            fullWidth
            required
            size="small"
            error={confirmPassword.length > 0 && !passwordsMatch}
            helperText={
              confirmPassword.length > 0 && !passwordsMatch
                ? "Passwords do not match."
                : ""
            }
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button
          onClick={handleClose}
          color="inherit"
          sx={{ textTransform: "none", color: "text.secondary" }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!allRequirementsMet || !passwordsMatch || !currentPassword}
          sx={{
            borderRadius: 1.5,
            px: 2.5,
            textTransform: "none",
            fontWeight: 700,
            color: "#fff",
            backgroundColor: "#ef3340",
            boxShadow: "0 2px 10px rgba(239, 51, 64, 0.3)",
            "&:hover": { backgroundColor: "#d62835" },
          }}
        >
          Update Password
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ChangePassword;
