import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import SecurityOutlinedIcon from "@mui/icons-material/SecurityOutlined";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import DeleteForeverOutlinedIcon from "@mui/icons-material/DeleteForeverOutlined";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import {
  changeBuyerPassword,
  deleteBuyerAccount,
  exportBuyerData,
  getBuyerSecuritySettings,
  updateBuyerPrivacy,
  updateBuyerRecommendationPreference,
} from "../../api/buyer/buyerAuthenticationAPI";
import ThemeModeSetting from "../../components/buyer/Settings/ThemeModeSetting";
import ChangePassword from "../../components/buyer/Settings/ChangePassword";
import DeleteAccount from "../../components/buyer/Settings/DeleteAccount";

export default function Settings() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [allowRecommendations, setAllowRecommendations] = useState(true);
  const [privacyLoading, setPrivacyLoading] = useState(true);
  const [privacySaving, setPrivacySaving] = useState(false);
  const [privacyError, setPrivacyError] = useState("");
  const [recommendationSaving, setRecommendationSaving] = useState(false);
  const [recommendationFeedback, setRecommendationFeedback] = useState(null);

  // Password fields and visibility toggles
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState(null);
  const [confirmPasswordDialogOpen, setConfirmPasswordDialogOpen] =
    useState(false);

  // Data privacy and account deletion
  const [exportingData, setExportingData] = useState(false);
  const [dataRightsFeedback, setDataRightsFeedback] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Strong password requirements matching ChangePassword.jsx
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
    {
      label: "Must be unique (different from current password)",
      test: (pw) =>
        pw.length > 0 && currentPassword.length > 0 && pw !== currentPassword,
    },
  ];

  const allRequirementsMet = requirements.every((req) => req.test(newPassword));
  const passwordsMatch =
    newPassword.length > 0 && newPassword === confirmPassword;

  useEffect(() => {
    let active = true;
    getBuyerSecuritySettings()
      .then((profile) => {
        if (!active) return;
        setUsername(profile.username || "buyer");
        setIsPrivate(Boolean(Number(profile.is_private)));
        setAllowRecommendations(
          Boolean(Number(profile.allow_personalized_recommendations ?? 1)),
        );
      })
      .catch((error) => {
        if (active)
          setPrivacyError(error.message || "Unable to load privacy setting.");
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

  const handleRecommendationToggle = async (event) => {
    const nextValue = event.target.checked;
    try {
      setRecommendationSaving(true);
      setRecommendationFeedback(null);
      await updateBuyerRecommendationPreference(nextValue);
      setAllowRecommendations(nextValue);
      setRecommendationFeedback({
        severity: "success",
        message: nextValue
          ? "Personalized SASRec artwork recommendations are now enabled."
          : "You have opted out of personalized recommendation profiling. Your stored interaction history has been cleared.",
      });
    } catch (error) {
      setRecommendationFeedback({
        severity: "error",
        message:
          error.message || "Unable to update recommendation preference.",
      });
    } finally {
      setRecommendationSaving(false);
    }
  };

  const handleExportData = async () => {
    try {
      setExportingData(true);
      setDataRightsFeedback(null);
      const dataPackage = await exportBuyerData();
      const blob = new Blob([JSON.stringify(dataPackage, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `artmatch-buyer-data-${username || "account"}-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setDataRightsFeedback({
        severity: "success",
        message:
          "Your personal data package has been exported and downloaded as JSON.",
      });
    } catch (error) {
      setDataRightsFeedback({
        severity: "error",
        message: error.message || "Unable to export personal data.",
      });
    } finally {
      setExportingData(false);
    }
  };

  const handleDeleteAccount = async (event) => {
    event.preventDefault();
    if (!deletePassword) {
      setDeleteError("Please enter your current password to confirm.");
      return;
    }
    try {
      setDeletingAccount(true);
      setDeleteError("");
      await deleteBuyerAccount(deletePassword);
      setDeleteDialogOpen(false);
      navigate("/buyer/login", { replace: true });
    } catch (error) {
      setDeleteError(
        error.message || "Unable to complete account deletion.",
      );
    } finally {
      setDeletingAccount(false);
    }
  };

  const handleOpenPasswordConfirmation = (event) => {
    event.preventDefault();
    setPasswordFeedback(null);

    if (!currentPassword.trim()) {
      setPasswordFeedback({
        severity: "error",
        message: "Current password is required.",
      });
      return;
    }
    if (!newPassword.trim()) {
      setPasswordFeedback({
        severity: "error",
        message: "New password is required.",
      });
      return;
    }
    if (newPassword === currentPassword) {
      setPasswordFeedback({
        severity: "error",
        message: "New password must be different from your current password.",
      });
      return;
    }
    if (!allRequirementsMet) {
      setPasswordFeedback({
        severity: "error",
        message: "Please satisfy all new password requirements.",
      });
      return;
    }
    if (!passwordsMatch) {
      setPasswordFeedback({
        severity: "error",
        message: "Confirm new password does not match.",
      });
      return;
    }

    setConfirmPasswordDialogOpen(true);
  };

  const handleExecutePasswordChange = async () => {
    try {
      setPasswordSaving(true);
      await changeBuyerPassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setConfirmPasswordDialogOpen(false);
      setPasswordFeedback({
        severity: "success",
        message: "Password changed successfully.",
      });
    } catch (error) {
      setPasswordFeedback({
        severity: "error",
        message: error.message || "Unable to change password.",
      });
      throw error;
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
        <Alert severity="info">
          Marketplace artwork images include a visible diagonal tiled
          watermark. When you are signed in they contain a short ID linked to
          your account, including an invisible frequency-domain mark. We record
          that ID, the artwork, and the time it was viewed to help investigate
          unauthorized redistribution. Signed-out visitors see an "ArtMatch:
          Red Nexus" watermark.
        </Alert>
        <ThemeModeSetting />
        <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2 }}>
          <Stack direction="row" spacing={1.5} alignItems="flex-start">
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                display: "grid",
                placeItems: "center",
                bgcolor: "rgba(239, 51, 64, 0.1)",
                color: "#ef3340",
              }}
            >
              <SecurityOutlinedIcon color="error" />
            </Box>

            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" fontWeight={700}>
                Private account
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.5 }}
              >
                Hide your name and profile photo from sellers in chat. Sellers
                will still see the details needed to fulfill your orders.
              </Typography>
              {privacyError && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {privacyError}
                </Alert>
              )}
              <FormControlLabel
                sx={{
                  mt: 1,
                  ml: 0,
                  mr: 0,
                  justifyContent: "space-between",
                  width: "100%",
                }}
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
          <Stack direction="row" spacing={1.5} alignItems="flex-start">
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                display: "grid",
                placeItems: "center",
                bgcolor: "rgba(239, 51, 64, 0.1)",
                color: "#ef3340",
              }}
            >
              <AutoAwesomeOutlinedIcon color="error" />
            </Box>            
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" fontWeight={700}>
                Personalized recommendations
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.5 }}
              >
                Allow Red nexus to record your artwork views, searches, filters,
                and favorites to power personalized recommendations.
                Turning this off stops behavioral profiling, clears your stored
                interaction history, and shows non-personalized catalog
                highlights instead.
              </Typography>
              {recommendationFeedback && (
                <Alert severity={recommendationFeedback.severity} sx={{ mt: 2 }}>
                  {recommendationFeedback.message}
                </Alert>
              )}
              <FormControlLabel
                sx={{
                  mt: 1,
                  ml: 0,
                  mr: 0,
                  justifyContent: "space-between",
                  width: "100%",
                }}
                label="Enable personalized artwork recommendations"
                labelPlacement="start"
                control={
                  <Switch
                    checked={allowRecommendations}
                    onChange={handleRecommendationToggle}
                    disabled={privacyLoading || recommendationSaving}
                    inputProps={{
                      "aria-label":
                        "Enable personalized artwork recommendations",
                    }}
                  />
                }
              />
            </Box>
          </Stack>
        </Paper>

        {/* Change Password Card with Strong Requirements */}
        <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2 }}>
          <Stack
            direction="row"
            spacing={1.5}
            alignItems="center"
            sx={{ mb: 2.5 }}
          >
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                display: "grid",
                placeItems: "center",
                bgcolor: "rgba(239, 51, 64, 0.1)",
                color: "#ef3340",
              }}
            >
              <LockOutlinedIcon color="error" />
            </Box>

            <Box>
              <Typography variant="h6" fontWeight={700}>
                Change password
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.5 }}
              >
                Confirm your current password to choose a new strong password.
              </Typography>
            </Box>
          </Stack>

          <Box component="form" onSubmit={handleOpenPasswordConfirmation}>
            <Stack spacing={2}>
              {passwordFeedback && (
                <Alert severity={passwordFeedback.severity}>
                  {passwordFeedback.message}
                </Alert>
              )}
              <TextField
                fullWidth
                required
                size="small"
                type={showCurrentPassword ? "text" : "password"}
                label="Current password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                disabled={passwordSaving}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle current password visibility"
                        onClick={() =>
                          setShowCurrentPassword(!showCurrentPassword)
                        }
                        edge="end"
                        size="small"
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
              <TextField
                fullWidth
                required
                size="small"
                type={showNewPassword ? "text" : "password"}
                label="New password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                disabled={passwordSaving}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle new password visibility"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        edge="end"
                        size="small"
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

              {/* Dynamic Password Requirements Checklist */}
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

              <TextField
                fullWidth
                required
                size="small"
                type={showConfirmPassword ? "text" : "password"}
                label="Confirm new password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                disabled={passwordSaving}
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
                        aria-label="toggle confirm password visibility"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        edge="end"
                        size="small"
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
              <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                <Button
                  type="submit"
                  variant="contained"
                  color="error"
                  disabled={
                    passwordSaving ||
                    !allRequirementsMet ||
                    !passwordsMatch ||
                    !currentPassword.trim()
                  }
                  sx={{
                    borderRadius: 1.5,
                    px: 2.5,
                    textTransform: "none",
                    fontWeight: 700,
                  }}
                >
                  {passwordSaving ? "Updating..." : "Change password"}
                </Button>
              </Box>
            </Stack>
          </Box>
        </Paper>

        <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2 }}>
          <Stack direction="row" spacing={1.5} alignItems="flex-start">
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                display: "grid",
                placeItems: "center",
                bgcolor: "rgba(239, 51, 64, 0.1)",
                color: "#ef3340",
              }}
            >
              <ShieldOutlinedIcon color="error" />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" fontWeight={700}>
                Data Privacy Rights (RA 10173)
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.5, mb: 2 }}
              >
                Under the Data Privacy Act of 2012, you have the right to
                export a machine-readable copy of your personal data (Right to
                Data Portability) or permanently delete and anonymize your
                account (Right to Erasure / Blocking).
              </Typography>

              {dataRightsFeedback && (
                <Alert severity={dataRightsFeedback.severity} sx={{ mb: 2 }}>
                  {dataRightsFeedback.message}
                </Alert>
              )}

              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1.5}
                alignItems={{ xs: "stretch", sm: "center" }}
              >
                <Button
                  variant="outlined"
                  startIcon={<DownloadOutlinedIcon />}
                  onClick={handleExportData}
                  disabled={exportingData}
                  sx={{ textTransform: "none", fontWeight: 600 }}
                >
                  {exportingData
                    ? "Preparing Data Export..."
                    : "Download My Personal Data (JSON)"}
                </Button>

                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteForeverOutlinedIcon />}
                  onClick={() => {
                    setDeletePassword("");
                    setDeleteError("");
                    setDeleteDialogOpen(true);
                  }}
                  sx={{ textTransform: "none", fontWeight: 600 }}
                >
                  Delete My Account
                </Button>
              </Stack>
            </Box>
          </Stack>
        </Paper>
      </Stack>

      {/* Confirmation Dialog for Password Change */}
      <ChangePassword
        open={confirmPasswordDialogOpen}
        handleClose={() => setConfirmPasswordDialogOpen(false)}
        onConfirm={handleExecutePasswordChange}
        loading={passwordSaving}
      />

      {/* Extracted Delete Account Dialog */}
      <DeleteAccount
        open={deleteDialogOpen}
        onClose={() => !deletingAccount && setDeleteDialogOpen(false)}
        onSubmit={handleDeleteAccount}
        password={deletePassword}
        onPasswordChange={(e) => setDeletePassword(e.target.value)}
        error={deleteError}
        loading={deletingAccount}
      />
    </Box>
  );
}
