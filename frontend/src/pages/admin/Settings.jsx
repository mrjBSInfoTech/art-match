import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  InputAdornment,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
  Snackbar,
  Slide,
} from "@mui/material";
import ChangePassword from "../../components/admin/Settings/ChangePassword";
import ChangeInfoProfile from "../../components/admin/Settings/ChangeInfoProfile";
import ChangeProfileImage from "../../components/admin/Settings/ChangeProfileImage";
import {
  changePassword,
  verifyPassword,
} from "../../api/admin/adminAuthenticationAPI";
import { updateAdmin } from "../../api/admin/adminAPI";
// Icons
import HomeIcon from "@mui/icons-material/Home";
import PersonIcon from "@mui/icons-material/Person";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import LockResetIcon from "@mui/icons-material/LockReset";
import BackupIcon from "@mui/icons-material/Backup";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";

// Slide Transition for Snackbar
function SlideTransition(props) {
  return <Slide {...props} direction="up" />;
}

export default function Settings() {
  const [loading, setLoading] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");
  const [openPasswordForm, setOpenPasswordForm] = useState(false);
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

  useEffect(() => {
    setAccountInformation({
      username: localStorage.getItem("admin_username") || "",
      first_name: localStorage.getItem("admin_first_name") || "",
      last_name: localStorage.getItem("admin_last_name") || "",
      email: localStorage.getItem("admin_email") || "",
    });
  }, []);

  const handleOpenPasswordEdit = () => {
    setOpenPasswordForm(true);
  };

  const handleProfileImageSubmit = async (file) => {
    const adminId = localStorage.getItem("admin_id");
    if (!adminId) throw new Error("Admin account not found.");

    const response = await updateAdmin(adminId, { file });
    const image = response.image || file.name;
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
      Object.entries(accountInformation).forEach(([key, value]) => {
        localStorage.setItem(`admin_${key}`, value.trim());
      });
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
    setSnackbarSeverity(severity); // Set it to "success" or "error"
    setSnackbarOpen(true);
  };

  const closeSnackbar = (event, reason) => {
    if (reason === "clickaway") return;
    setSnackbarOpen(false);
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case "success":
        return "success.light"; // Green
      case "error":
        return "error.light"; // Red
      default:
        return "primary.light"; //
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Helmet titleTemplate="%s - ArtMatch">
        <title>Settings</title>
      </Helmet>
      <Box>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: "bold" }}>
          Settings
        </Typography>
      </Box>

      <Paper sx={{ p: 3, mt: 3, borderRadius: 2 }} variant="outlined">
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2,
          }}
        >
          <Box
            sx={{
              p: 1.5,
              borderRadius: 2.5,
              bgcolor: "rgba(30, 31, 135, 0.08)",
              color: "#1e1f87",
              mb: 1.5,
            }}
          >
            <AccountCircleIcon />
          </Box>
          <Box>
            <Typography variant="body1" fontWeight="700">
              Profile Picture
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage the picture displayed on your admin profile.
            </Typography>
          </Box>
        </Box>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            flexWrap: "wrap",
          }}
        >
          <Box
            component="img"
            src={
              localStorage.getItem("admin_image")
                ? `http://localhost:5000/uploads/admin/uploadAdmin/${encodeURIComponent(localStorage.getItem("admin_image"))}`
                : "http://localhost:5000/uploads/profile.jpg"
            }
            alt="Admin profile"
            sx={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              objectFit: "cover",
              border: "1px solid",
              borderColor: "divider",
            }}
          />
          <Button
            variant="outlined"
            startIcon={<CloudUploadIcon />}
            sx={{ textTransform: "none" }}
            onClick={() => setProfileImageDialogOpen(true)}
          >
            Upload Picture
          </Button>
        </Box>
      </Paper>
      <Paper sx={{ p: 3, mt: 3, borderRadius: 2 }} variant="outlined">
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
          <Box
            sx={{
              p: 1.5,
              borderRadius: 2.5,
              bgcolor: "rgba(30, 31, 135, 0.08)",
              color: "#1e1f87",
            }}
          >
            <AccountCircleIcon />
          </Box>
          <Box>
            <Typography variant="body1" fontWeight="700">
              Account Information
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Update the information associated with your admin account.
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
            value={accountInformation.first_name}
            onChange={handleAccountInformationChange}
            disabled={savingAccountInformation}
          />
          <TextField
            label="Last Name"
            name="last_name"
            value={accountInformation.last_name}
            onChange={handleAccountInformationChange}
            disabled={savingAccountInformation}
          />
          <TextField
            label="Username"
            name="username"
            value={accountInformation.username}
            onChange={handleAccountInformationChange}
            disabled={savingAccountInformation}
          />
          <TextField
            label="Email"
            name="email"
            type="email"
            value={accountInformation.email}
            onChange={handleAccountInformationChange}
            disabled={savingAccountInformation}
          />
        </Box>
        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
          <Button
            variant="contained"
            onClick={handleSaveAccountInformation}
            disabled={savingAccountInformation}
            sx={{
              mt: 3,
              bgcolor: "#1e1f87",
              textTransform: "none",
              fontWeight: "bold",
              boxShadow: "none",
              "&:hover": { bgcolor: "#151663" },
            }}
          >
            {savingAccountInformation ? "Saving..." : "Save Information"}
          </Button>
        </Box>
      </Paper>
      <Paper sx={{ p: 3, mt: 3, borderRadius: 2 }} variant="outlined">
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            alignItems: { xs: "stretch", sm: "center" },
            gap: 2,
            justifyContent: "space-between",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Box
              sx={{
                p: 1.5,
                borderRadius: 2.5,
                bgcolor: "rgba(30, 31, 135, 0.08)",
                color: "#1e1f87",
              }}
            >
              <LockResetIcon />
            </Box>
            <Box>
              <Typography variant="body1" fontWeight="700">
                Account Password
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Change your password regularly to secure your account.
              </Typography>
            </Box>
          </Box>

          <Button
            variant="contained"
            onClick={handleOpenPasswordEdit}
            sx={{
              bgcolor: "#1e1f87",
              textTransform: "none",
              fontWeight: "bold",
              px: 2.5,
              alignSelf: { xs: "stretch", sm: "auto" },
              boxShadow: "none",
              "&:hover": { bgcolor: "#151663" },
            }}
          >
            Update
          </Button>
        </Box>
      </Paper>
      <Paper sx={{ p: 3, mt: 3, borderRadius: 2 }} variant="outlined">
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            alignItems: { xs: "stretch", sm: "center" },
            gap: 2,
            justifyContent: "space-between",
          }}
        >
          <Box
            sx={{
              p: 1.5,
              borderRadius: 2.5,
              bgcolor: "rgba(30, 31, 135, 0.08)",
              color: "#1e1f87",
            }}
          >
            <BackupIcon />
          </Box>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="body1" fontWeight="700">
              Backup
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Backup and restore options will be available here.
            </Typography>
          </Box>
          <Button variant="outlined" disabled sx={{ textTransform: "none" }}>
            Backup
          </Button>
        </Box>
      </Paper>
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
        severity={snackbarSeverity}
        variant="filled"
        autoHideDuration={3000}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        TransitionComponent={SlideTransition}
      >
        <Alert
          onClose={closeSnackbar}
          severity={snackbarSeverity}
          sx={{
            width: "100%",
            backgroundColor: getSeverityColor(snackbarSeverity),
            color: "#fff",
            "& .MuiAlert-icon": {
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
