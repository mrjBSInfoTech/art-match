import { useState, useEffect, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Slide,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import ChangePassword from "../../components/admin/Settings/ChangePassword";
import ChangeInfoProfile from "../../components/admin/Settings/ChangeInfoProfile";
import ChangeProfileImage from "../../components/admin/Settings/ChangeProfileImage";
import DispatchAlert from "../../components/admin/Settings/DispatchAlert";
import {
  changePassword,
  getAdminProfile,
  verifyPassword,
} from "../../api/admin/adminAuthenticationAPI";
import { updateAdmin } from "../../api/admin/adminAPI";
import { runManualDataRetention } from "../../api/admin/systemSettingsAPI";
// Icons
import HomeIcon from "@mui/icons-material/Home";
import PersonIcon from "@mui/icons-material/Person";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import LockResetIcon from "@mui/icons-material/LockReset";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import AutoDeleteOutlinedIcon from "@mui/icons-material/AutoDeleteOutlined";
import CampaignOutlinedIcon from "@mui/icons-material/CampaignOutlined";
import ConnectionErrorPanel from "../../components/admin/ConnectionErrorPanel";
import AdminLoadingPanel from "../../components/admin/AdminLoadingPanel";
import { fetchDashboard } from "../../api/admin/dashboardAPI";

// Slide Transition for Snackbar
function SlideTransition(props) {
  return <Slide {...props} direction="up" />;
}

export default function Settings() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");
  const [openPasswordForm, setOpenPasswordForm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const checkConnection = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      await fetchDashboard();
    } catch (err) {
      setError(err.message || "Failed to load settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  const [accountInformation, setAccountInformation] = useState({
    username: "",
    first_name: "",
    last_name: "",
    email: "",
  });
  const [savingAccountInformation, setSavingAccountInformation] =
    useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [confirmationPassword, setConfirmationPassword] = useState("");
  const [passwordVerificationError, setPasswordVerificationError] =
    useState("");
  const [profileImageDialogOpen, setProfileImageDialogOpen] = useState(false);
  const [adminImage, setAdminImage] = useState(
    () => localStorage.getItem("admin_image") || "",
  );
  const [runningRetention, setRunningRetention] = useState(false);
  const [breachDialogOpen, setBreachDialogOpen] = useState(false);

  useEffect(() => {
    getAdminProfile()
      .then((profile) => {
        setAccountInformation({
          username: profile.username || "",
          first_name: profile.first_name || "",
          last_name: profile.last_name || "",
          email: profile.email || "",
        });
        if (profile.image) {
          setAdminImage(profile.image);
          localStorage.setItem("admin_image", profile.image);
        }
      })
      .catch(() =>
        setAccountInformation({
          username: "",
          first_name: "",
          last_name: "",
          email: "",
        }),
      );
  }, []);

  useEffect(() => {
    const handleProfileUpdated = () => {
      setAdminImage(localStorage.getItem("admin_image") || "");
    };
    window.addEventListener("admin-profile-updated", handleProfileUpdated);
    return () =>
      window.removeEventListener("admin-profile-updated", handleProfileUpdated);
  }, []);

  const handleOpenPasswordEdit = () => {
    setOpenPasswordForm(true);
  };

  const handleProfileImageSubmit = async (file) => {
    const adminId = localStorage.getItem("admin_id");
    if (!adminId) throw new Error("Admin account not found.");

    const response = await updateAdmin(adminId, { file });
    const image = response.image || file.name;
    setAdminImage(image);
    localStorage.setItem("admin_image", image);
    window.dispatchEvent(new Event("admin-profile-updated"));
    showSnackbar("Profile image updated successfully.");
  };

  const handleSubmitPassword = async (formData) => {
    try {
      const { currentPassword, newPassword } = formData;
      if (currentPassword && newPassword) {
        await changePassword(currentPassword, newPassword);
        localStorage.setItem("admin_password_changed", "1");
        window.dispatchEvent(new Event("admin-password-changed"));
      }
      showSnackbar("Password updated successfully", "success");
      setOpenPasswordForm(false);
    } catch (err) {
      console.error("Error updating password:", err);
      showSnackbar("Failed to update password: " + err.message, "error");
    }
  };

  const handleAccountInformationChange = (event) => {
    const { name, value } = event.target;
    setAccountInformation((current) => ({ ...current, [name]: value }));
  };

  const handleSaveAccountInformation = () => {
    const adminId = localStorage.getItem("admin_id");
    if (
      !adminId ||
      Object.values(accountInformation).some((value) => !value.trim())
    ) {
      showSnackbar("Please fill in all account information fields.", "error");
      return;
    }

    setConfirmationPassword("");
    setPasswordVerificationError("");
    setPasswordDialogOpen(true);
  };

  const handleConfirmAccountInformation = async () => {
    if (!confirmationPassword) {
      setPasswordVerificationError("Enter your password to continue.");
      return;
    }

    try {
      setSavingAccountInformation(true);
      await verifyPassword(confirmationPassword);
      await updateAdmin(localStorage.getItem("admin_id"), accountInformation);
      localStorage.setItem("admin_username", accountInformation.username.trim());
      localStorage.setItem("admin_first_name", accountInformation.first_name.trim());
      localStorage.setItem("admin_last_name", accountInformation.last_name.trim());
      window.dispatchEvent(new Event("admin-profile-updated"));
      setPasswordDialogOpen(false);
      setConfirmationPassword("");
      showSnackbar("Account information updated successfully", "success");
    } catch (error) {
      setPasswordVerificationError(
        error.message || "Password verification failed.",
      );
    } finally {
      setSavingAccountInformation(false);
    }
  };

  // Snackbar handlers
  const showSnackbar = (message, severity = "success") => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const closeSnackbar = (event, reason) => {
    if (reason === "clickaway") return;
    setSnackbarOpen(false);
  };

  const handleRunRetentionNow = async () => {
    try {
      setRunningRetention(true);
      const result = await runManualDataRetention();
      showSnackbar(
        result?.message || "Data retention cycle executed successfully.",
        "success",
      );
    } catch (err) {
      showSnackbar(
        err.message || "Unable to run data retention cycle.",
        "error",
      );
    } finally {
      setRunningRetention(false);
    }
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

  const cardSx = {
    width: "100%",
    p: { xs: 2, sm: 2.5, md: 3 },
    borderRadius: 3,
    bgcolor: isDark ? "rgba(30, 41, 59, 0.4)" : "#ffffff",
    border: "1px solid",
    borderColor: isDark
      ? "rgba(255, 255, 255, 0.08)"
      : "rgba(15, 23, 42, 0.08)",
    boxShadow: isDark
      ? "0 4px 20px rgba(0, 0, 0, 0.25)"
      : "0 4px 20px rgba(15, 23, 42, 0.04)",
  };

  if (loading) {
    return (
      <AdminLoadingPanel
        title="Settings"
        subtitle="Manage administrator credentials, personal account security, and data privacy operations."
        showMetrics={false}
        showFilters={false}
      />
    );
  }

  if (error) {
    return (
      <Box sx={{ minWidth: 0 }}>
        <Helmet titleTemplate="%s - ArtMatch">
          <title>Settings</title>
        </Helmet>
        <ConnectionErrorPanel
          title="Settings Unavailable"
          message={error}
          onRetry={checkConnection}
        />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        p: { xs: 1.5, sm: 2.5 },
        minHeight: "100vh",
        width: "100%",
        boxSizing: "border-box",
        backgroundColor: theme.palette.background.default,
        color: theme.palette.text.primary,
      }}
    >
      <Helmet titleTemplate="%s - ArtMatch">
        <title>Settings</title>
      </Helmet>

      {/* Standard Admin Header Banner */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", sm: "flex-start" }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography
            sx={{
              fontSize: { xs: 28, sm: 38 },
              fontWeight: 800,
              lineHeight: 1.1,
              color: "text.primary",
            }}
          >
            Settings
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.75, fontSize: 13 }}>
            Manage administrator credentials, personal account security, and
            data privacy operations.
          </Typography>
        </Box>
      </Stack>

      <Stack spacing={2.5}>
        {/* Profile Picture Card */}
        <Paper elevation={0} sx={cardSx}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              mb: 2.5,
            }}
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
                flexShrink: 0,
              }}
            >
              <AccountCircleIcon sx={{ fontSize: 22 }} />
            </Box>
            <Box>
              <Typography variant="subtitle1" fontWeight={700}>
                Profile Picture
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Manage the profile picture displayed across the administrator
                portal.
              </Typography>
            </Box>
          </Box>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            alignItems={{ xs: "flex-start", sm: "center" }}
            spacing={2.5}
          >
            <Box
              component="img"
              src={
                adminImage
                  ? `http://localhost:5000/uploads/admin/uploadAdmin/${encodeURIComponent(adminImage)}`
                  : "http://localhost:5000/uploads/profile.jpg"
              }
              alt="Admin profile"
              sx={{
                width: 76,
                height: 76,
                borderRadius: "50%",
                objectFit: "cover",
                border: "2px solid",
                borderColor: isDark
                  ? "rgba(255, 255, 255, 0.15)"
                  : "rgba(15, 23, 42, 0.1)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              }}
            />
            <Box>
              <Button
                variant="outlined"
                startIcon={<CloudUploadIcon />}
                onClick={() => setProfileImageDialogOpen(true)}
                sx={{
                  borderRadius: 2,
                  textTransform: "none",
                  fontWeight: 700,
                  borderColor: isDark
                    ? "rgba(255,255,255,0.2)"
                    : "rgba(15,23,42,0.2)",
                  color: "text.primary",
                  "&:hover": {
                    borderColor: "#ef3340",
                    color: "#ef3340",
                  },
                }}
              >
                Upload New Picture
              </Button>
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
                sx={{ mt: 1 }}
              >
                Supported formats: JPG, PNG, WEBP. Max file size: 2MB.
              </Typography>
            </Box>
          </Stack>
        </Paper>

        {/* Account Information Card */}
        <Paper elevation={0} sx={cardSx}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              mb: 2.5,
            }}
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
                flexShrink: 0,
              }}
            >
              <PersonIcon sx={{ fontSize: 22 }} />
            </Box>
            <Box>
              <Typography variant="subtitle1" fontWeight={700}>
                Account Information
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Update the personal credentials and contact details associated
                with your administrator account.
              </Typography>
            </Box>
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              gap: 2,
            }}
          >
            <TextField
              label="First Name"
              name="first_name"
              size="small"
              value={accountInformation.first_name}
              onChange={handleAccountInformationChange}
              disabled={savingAccountInformation}
            />
            <TextField
              label="Last Name"
              name="last_name"
              size="small"
              value={accountInformation.last_name}
              onChange={handleAccountInformationChange}
              disabled={savingAccountInformation}
            />
            <TextField
              label="Username"
              name="username"
              size="small"
              value={accountInformation.username}
              onChange={handleAccountInformationChange}
              disabled={savingAccountInformation}
            />
            <TextField
              label="Email"
              name="email"
              type="email"
              size="small"
              value={accountInformation.email}
              onChange={handleAccountInformationChange}
              disabled={savingAccountInformation}
            />
          </Box>

          <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 3 }}>
            <Button
              variant="contained"
              onClick={handleSaveAccountInformation}
              disabled={savingAccountInformation}
              sx={{
                borderRadius: 2,
                px: 3,
                py: 1,
                bgcolor: "#ef3340",
                color: "#fff",
                textTransform: "none",
                fontWeight: 700,
              }}
            >
              {savingAccountInformation ? "Saving..." : "Save Information"}
            </Button>
          </Box>
        </Paper>

        {/* Account Password Card */}
        <Paper elevation={0} sx={cardSx}>
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              alignItems: { xs: "flex-start", sm: "center" },
              justifyContent: "space-between",
              gap: 2,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  display: "grid",
                  placeItems: "center",
                  bgcolor: "rgba(239, 51, 64, 0.1)",
                  color: "#ef3340",
                  flexShrink: 0,
                }}
              >
                <LockResetIcon sx={{ fontSize: 22 }} />
              </Box>
              <Box>
                <Typography variant="subtitle1" fontWeight={700}>
                  Account Password
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Change your password regularly to secure administrator
                  privileges and sensitive data.
                </Typography>
              </Box>
            </Box>

            <Button
              variant="contained"
              onClick={handleOpenPasswordEdit}
              sx={{
                borderRadius: 2,
                px: 2.5,
                py: 1,
                bgcolor: "#ef3340",
                color: "#fff",
                textTransform: "none",
                fontWeight: 700,
                alignSelf: { xs: "stretch", sm: "auto" },
              }}
            >
              Update Password
            </Button>
          </Box>
        </Paper>

        {/* Data Privacy, Retention & 72-Hour Breach Response Card */}
        <Paper elevation={0} sx={cardSx}>
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", lg: "row" },
              alignItems: { xs: "flex-start", lg: "center" },
              justifyContent: "space-between",
              gap: 2.5,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  display: "grid",
                  placeItems: "center",
                  bgcolor: "rgba(239, 51, 64, 0.1)",
                  color: "#ef3340",
                  flexShrink: 0,
                }}
              >
                <ShieldOutlinedIcon sx={{ fontSize: 22 }} />
              </Box>
              <Box>
                <Typography variant="subtitle1" fontWeight={700}>
                  Data Privacy, Retention &amp; 72-Hour Breach Response (RA
                  10173)
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 0.5 }}
                >
                  Execute on-demand data retention and PII disposal for expired
                  student accounts (Sec. 11(e)) or dispatch an official security
                  incident notification to affected users under NPC Circular
                  16-03.
                </Typography>
              </Box>
            </Box>

            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1.5}
              sx={{ width: { xs: "100%", lg: "auto" }, flexShrink: 0 }}
            >
              <Button
                variant="outlined"
                startIcon={<AutoDeleteOutlinedIcon />}
                onClick={handleRunRetentionNow}
                disabled={runningRetention}
                sx={{
                  borderRadius: 2,
                  textTransform: "none",
                  fontWeight: 700,
                  borderColor: isDark
                    ? "rgba(255,255,255,0.2)"
                    : "rgba(15,23,42,0.2)",
                  color: "text.primary",
                  "&:hover": {
                    borderColor: "#ef3340",
                    color: "#ef3340",
                  },
                }}
              >
                {runningRetention
                  ? "Running Retention..."
                  : "Run Retention & Disposal"}
              </Button>
              <Button
                variant="contained"
                startIcon={<CampaignOutlinedIcon />}
                onClick={() => setBreachDialogOpen(true)}
                sx={{
                  borderRadius: 2,
                  textTransform: "none",
                  fontWeight: 700,
                  color: "#fff",
                  bgcolor: "#ef3340",
                }}
              >
                Dispatch Security Alert
              </Button>
            </Stack>
          </Box>
        </Paper>
      </Stack>

      {/* Extracted Dispatch Alert Modal */}
      <DispatchAlert
        open={breachDialogOpen}
        handleClose={() => setBreachDialogOpen(false)}
        onSuccess={(msg) => showSnackbar(msg, "success")}
      />

      {/* Extracted Admin Dialogs */}
      <ChangePassword
        open={openPasswordForm}
        handleClose={() => setOpenPasswordForm(false)}
        onSubmit={handleSubmitPassword}
      />
      <ChangeProfileImage
        open={profileImageDialogOpen}
        handleClose={() => setProfileImageDialogOpen(false)}
        onSubmit={handleProfileImageSubmit}
      />
      <ChangeInfoProfile
        open={passwordDialogOpen}
        handleClose={() => setPasswordDialogOpen(false)}
        password={confirmationPassword}
        onPasswordChange={(event) => {
          setConfirmationPassword(event.target.value);
          setPasswordVerificationError("");
        }}
        error={passwordVerificationError}
        loading={savingAccountInformation}
        onConfirm={handleConfirmAccountInformation}
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
