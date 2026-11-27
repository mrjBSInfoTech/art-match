import React, { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Link,
  Paper,
  Slide,
  Stack,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import { completeFirstLoginSetup } from "../../api/seller/sellerAPI";
//Icons
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import CloseIcon from "@mui/icons-material/Close";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

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

export default function FirstLoginConsentModal({
  open,
  mustChangePassword = false,
  onCompleted,
  onLogout,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

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

  const passwordsMatch =
    newPassword.length > 0 && newPassword === confirmPassword;

  const validateForm = () => {
    if (!currentPassword.trim()) {
      setErrorMessage("Current password is required.");
      return false;
    }
    if (!newPassword.trim()) {
      setErrorMessage("New password is required.");
      return false;
    }
    if (newPassword === currentPassword) {
      setErrorMessage(
        "New password must be different from your current password.",
      );
      return false;
    }
    if (!allRequirementsMet) {
      setErrorMessage("Please satisfy all new password requirements.");
      return false;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage("Confirm password does not match.");
      return false;
    }

    return true;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");

    if (!consentAccepted) {
      setErrorMessage(
        "Please read and accept the Data Privacy Notice and Terms of Service to continue.",
      );
      return;
    }

    if (mustChangePassword && !validateForm()) {
      return;
    }

    try {
      setSubmitting(true);
      await completeFirstLoginSetup({
        consent_accepted: true,
        consent_version: "1.0",
        ...(mustChangePassword
          ? {
            current_password: currentPassword,
            new_password: newPassword,
          }
          : {}),
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      if (onCompleted) {
        await onCompleted();
      }
    } catch (error) {
      setErrorMessage(
        error.message || "Unable to complete first-login setup.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={Boolean(open)}
      onClose={onLogout}
      scroll="paper"
      TransitionComponent={Transition}
      keepMounted
      disableEscapeKeyDown
      PaperProps={{
        sx: {
          width: "min(100% - 24px, 560px)",
          maxWidth: "560px",
          maxHeight: "calc(100dvh - 32px)",
          display: "flex",
          flexDirection: "column",
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
          flexShrink: 0,
          px: 2.5,
          py: 1.75,
          color: theme.palette.text.primary,
          fontSize: 16,
          fontWeight: 700,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <ShieldOutlinedIcon sx={{ color: "#ef3340", fontSize: 20 }} />
        Account Privacy Consent & Security Setup
        <Button
          aria-label="Decline and Log Out"
          onClick={onLogout}
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

      <Box
        component="form"
        onSubmit={handleSubmit}
        noValidate
        sx={{
          display: "flex",
          flexDirection: "column",
          flex: "1 1 auto",
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        <DialogContent
          dividers
          sx={{
            px: 3,
            py: 2.5,
            flex: "1 1 auto",
            minHeight: 0,
            overflowY: "auto",
          }}
        >
          <Stack spacing={2.5}>
            {errorMessage && (
              <Alert severity="error" sx={{ borderRadius: 2 }}>
                {errorMessage}
              </Alert>
            )}

            <Paper
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: 2.5,
                bgcolor: isDark
                  ? "rgba(255, 255, 255, 0.02)"
                  : "rgba(239, 51, 64, 0.03)",
                borderColor: isDark
                  ? "rgba(255, 255, 255, 0.1)"
                  : "rgba(239, 51, 64, 0.2)",
              }}
            >
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 700, mb: 0.75, color: "text.primary" }}
              >
                Data Privacy Notice for Student Artists
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ lineHeight: 1.65, mb: 1 }}
              >
                Your student artist account was provisioned by the College of Architecture and Fine Arts (CAFA) at the{" "}
                Administration of EARIST using official academic enrollment records. We
                process your personal and academic information solely to verify
                your student status, showcase your artworks, process marketplace
                orders and payouts, and maintain platform security.
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ lineHeight: 1.65 }}
              >
                Under <strong>Republic Act No. 10173</strong>, you have the
                right to access, correct, export, or request the deletion of
                your personal data at any time. Read our full{" "}
                <Link
                  component={RouterLink}
                  to="/buyer/privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  underline="hover"
                  sx={{ fontWeight: 700, color: "#ef3340" }}
                >
                  Data Privacy Policy
                </Link>{" "}
                and{" "}
                <Link
                  component={RouterLink}
                  to="/buyer/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  underline="hover"
                  sx={{ fontWeight: 700, color: "#ef3340" }}
                >
                  Terms of Service
                </Link>
                .
              </Typography>
            </Paper>

            {mustChangePassword && (
              <Stack spacing={2}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <LockOutlinedIcon sx={{ color: "#ef3340", fontSize: 20 }} />
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      Replace Your Default Password
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      For your security, you must replace the temporary password
                      assigned during enrollment (your uppercase last name).
                    </Typography>
                  </Box>
                </Stack>

                <TextField
                  label="Current Temporary Password"
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value);
                    setErrorMessage("");
                  }}
                  fullWidth
                  size="small"
                  required
                />

                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <TextField
                    label="New Password"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      setErrorMessage("");
                    }}
                    fullWidth
                    size="small"
                    required
                    helperText="Must be different from your last name"
                  />

                  <TextField
                    label="Confirm New Password"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setErrorMessage("");
                    }}
                    fullWidth
                    size="small"
                    required
                    error={confirmPassword.length > 0 && !passwordsMatch}
                    helperText={
                      confirmPassword.length > 0 && !passwordsMatch
                        ? "Passwords do not match."
                        : ""
                    }
                  />
                </Stack>

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
                          <CancelIcon
                            sx={{ fontSize: 18, color: "text.disabled" }}
                          />
                        )}
                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: isMet ? "bold" : "normal",
                          }}
                        >
                          {req.label}
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
              </Stack>
            )}

            <FormControlLabel
              control={
                <Checkbox
                  checked={consentAccepted}
                  onChange={(e) => {
                    setConsentAccepted(e.target.checked);
                    setErrorMessage("");
                  }}
                  sx={{
                    color: "#ef3340",
                    "&.Mui-checked": { color: "#ef3340" },
                  }}
                />
              }
              label={
                <Typography
                  variant="body2"
                  sx={{ color: "text.primary", fontSize: "0.875rem" }}
                >
                  I have read and understood the{" "}
                  <Link
                    component={RouterLink}
                    to="/buyer/privacy-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                    underline="hover"
                    sx={{ fontWeight: 700, color: "#ef3340" }}
                  >
                    Data Privacy Policy (RA 10173)
                  </Link>{" "}
                  and{" "}
                  <Link
                    component={RouterLink}
                    to="/buyer/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    underline="hover"
                    sx={{ fontWeight: 700, color: "#ef3340" }}
                  >
                    Terms of Service
                  </Link>
                  , and I explicitly consent to the collection and processing of
                  my personal and academic data on ArtMatch.
                </Typography>
              }
              sx={{ alignItems: "flex-start", ml: 0 }}
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            type="button"
            onClick={onLogout}
            color="inherit"
            disabled={submitting}
            sx={{ textTransform: "none", color: "text.secondary" }}
          >
            Decline & Log Out
          </Button>

          <Button
            type="submit"
            variant="contained"
            disabled={
              submitting ||
              !consentAccepted ||
              (mustChangePassword &&
                (!currentPassword.trim() || !allRequirementsMet || !passwordsMatch))
            }
            sx={{
              borderRadius: 1.5,
              px: 2.5,
              textTransform: "none",
              fontWeight: 700,
              color: "#fff",
            }}
          >
            {submitting ? "Saving..." : "Accept & Complete Setup"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

