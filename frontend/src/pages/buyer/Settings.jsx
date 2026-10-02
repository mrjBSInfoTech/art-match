import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControlLabel,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import SecurityOutlinedIcon from "@mui/icons-material/SecurityOutlined";
import {
  changeBuyerPassword,
  getBuyerSecuritySettings,
  updateBuyerPrivacy,
} from "../../api/buyer/buyerAuthenticationAPI";

export default function Settings() {
  const [isPrivate, setIsPrivate] = useState(false);
  const [privacyLoading, setPrivacyLoading] = useState(true);
  const [privacySaving, setPrivacySaving] = useState(false);
  const [privacyError, setPrivacyError] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState(null);

  useEffect(() => {
    let active = true;
    getBuyerSecuritySettings()
      .then((profile) => {
        if (active) setIsPrivate(Boolean(Number(profile.is_private)));
      })
      .catch((error) => {
        if (active) setPrivacyError(error.message || "Unable to load privacy setting.");
      })
      .finally(() => {
        if (active) setPrivacyLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handlePrivacyChange = async (event) => {
    const nextValue = event.target.checked;
    try {
      setPrivacySaving(true);
      setPrivacyError("");
      await updateBuyerPrivacy(nextValue);
      setIsPrivate(nextValue);
    } catch (error) {
      setPrivacyError(error.message || "Unable to update privacy setting.");
    } finally {
      setPrivacySaving(false);
    }
  };

  const handlePasswordChange = async (event) => {
    event.preventDefault();
    setPasswordFeedback(null);

    if (newPassword !== confirmPassword) {
      setPasswordFeedback({ severity: "error", message: "New passwords do not match." });
      return;
    }
    if (newPassword.length < 8 || newPassword.length > 128) {
      setPasswordFeedback({
        severity: "error",
        message: "Your new password must be between 8 and 128 characters.",
      });
      return;
    }

    try {
      setPasswordSaving(true);
      await changeBuyerPassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordFeedback({ severity: "success", message: "Password changed successfully." });
    } catch (error) {
      setPasswordFeedback({
        severity: "error",
        message: error.message || "Unable to change password.",
      });
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      <Helmet titleTemplate="%s - ArtMatch">
        <title>Security &amp; Privacy</title>
      </Helmet>
      <Stack spacing={2.5}>
        <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2 }}>
          <Stack direction="row" spacing={1.5} alignItems="flex-start">
            <SecurityOutlinedIcon color="error" />
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" fontWeight={700}>
                Private account
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Hide your name and profile photo from sellers in chat. Sellers will still see the details needed to fulfill your orders.
              </Typography>
              {privacyError && <Alert severity="error" sx={{ mt: 2 }}>{privacyError}</Alert>}
              <FormControlLabel
                sx={{ mt: 1, ml: 0, mr: 0, justifyContent: "space-between", width: "100%" }}
                label="Private account"
                labelPlacement="start"
                control={
                  <Switch
                    checked={isPrivate}
                    onChange={handlePrivacyChange}
                    disabled={privacyLoading || privacySaving}
                    inputProps={{ "aria-label": "Make account private" }}
                  />
                }
              />
              {privacyLoading && <CircularProgress size={18} sx={{ ml: 1 }} />}
            </Box>
          </Stack>
        </Paper>

        <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2 }}>
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2.5 }}>
            <LockOutlinedIcon color="error" />
            <Box>
              <Typography variant="h6" fontWeight={700}>
                Change password
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Confirm your current password to choose a new one.
              </Typography>
            </Box>
          </Stack>

          <Box component="form" onSubmit={handlePasswordChange}>
            <Stack spacing={2}>
              {passwordFeedback && (
                <Alert severity={passwordFeedback.severity}>
                  {passwordFeedback.message}
                </Alert>
              )}
              <TextField
                fullWidth
                required
                type="password"
                label="Current password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                disabled={passwordSaving}
              />
              <TextField
                fullWidth
                required
                type="password"
                label="New password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                inputProps={{ minLength: 8, maxLength: 128 }}
                disabled={passwordSaving}
              />
              <TextField
                fullWidth
                required
                type="password"
                label="Confirm new password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                inputProps={{ minLength: 8, maxLength: 128 }}
                disabled={passwordSaving}
              />
              <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                <Button type="submit" variant="contained" color="error" disabled={passwordSaving}>
                  {passwordSaving ? "Updating..." : "Change password"}
                </Button>
              </Box>
            </Stack>
          </Box>
        </Paper>
      </Stack>
    </Box>
  );
}
