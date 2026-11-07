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
import CloseIcon from "@mui/icons-material/Close";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import { completeFirstLoginSetup } from "../../api/seller/sellerAPI";

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

  const fieldSx = {
    "& .MuiOutlinedInput-root": {
      borderRadius: 2,
      backgroundColor: isDark
        ? "rgba(255, 255, 255, 0.03)"
        : "rgba(15, 23, 42, 0.02)",
      "& fieldset": {
        borderColor: isDark
          ? "rgba(255, 255, 255, 0.14)"
          : "rgba(15, 23, 42, 0.14)",
      },
      "&:hover fieldset": {
        borderColor: "#ef3340",
      },
      "&.Mui-focused fieldset": {
        borderColor: "#ef3340",
      },
    },
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

    if (mustChangePassword) {
      if (!currentPassword || !newPassword || !confirmPassword) {
        setErrorMessage("Please fill in all password fields.");
        return;
      }
      if (newPassword.length < 8) {
        setErrorMessage("New password must be at least 8 characters long.");
        return;
      }
      if (newPassword !== confirmPassword) {
        setErrorMessage("New password and confirmation do not match.");
        return;
      }
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
      TransitionComponent={Transition}
      keepMounted
      disableEscapeKeyDown
      PaperProps={{
        sx: {
          width: "min(100% - 24px, 560px)",
          maxWidth: "560px",
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

      <Box component="form" onSubmit={handleSubmit} noValidate>
        <DialogContent dividers sx={{ px: 3, py: 2.5 }}>
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
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  fullWidth
                  size="small"
                  required
                  sx={fieldSx}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={() =>
                            setShowCurrentPassword((prev) => !prev)
                          }
                          edge="end"
                        >
                          {showCurrentPassword ? (
                            <VisibilityOff fontSize="small" />
                          ) : (
                            <Visibility fontSize="small" />
                          )}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <TextField
                    label="New Password"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    fullWidth
                    size="small"
                    required
                    helperText="Minimum 8 characters, different from your last name"
                    sx={fieldSx}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            size="small"
                            onClick={() => setShowNewPassword((prev) => !prev)}
                            edge="end"
                          >
                            {showNewPassword ? (
                              <VisibilityOff fontSize="small" />
                            ) : (
                              <Visibility fontSize="small" />
                            )}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />

                  <TextField
                    label="Confirm New Password"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    fullWidth
                    size="small"
                    required
                    sx={fieldSx}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            size="small"
                            onClick={() =>
                              setShowConfirmPassword((prev) => !prev)
                            }
                            edge="end"
                          >
                            {showConfirmPassword ? (
                              <VisibilityOff fontSize="small" />
                            ) : (
                              <Visibility fontSize="small" />
                            )}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Stack>
              </Stack>
            )}

            <FormControlLabel
              control={
                <Checkbox
                  checked={consentAccepted}
                  onChange={(e) => setConsentAccepted(e.target.checked)}
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
            disabled={submitting}
            sx={{
              color: theme.palette.text.secondary,
              textTransform: "none",
              fontWeight: 600,
            }}
          >
            Decline & Log Out
          </Button>

          <Button
            type="submit"
            variant="contained"
            disabled={submitting}
            sx={{
              borderRadius: 1.5,
              px: 2.5,
              textTransform: "none",
              fontWeight: 700,
              color: "#fff",
              bgcolor: "#ef3340",
              "&:hover": { bgcolor: "#d62835" },
            }}
          >
            {submitting ? "Saving..." : "Accept & Complete Setup"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

