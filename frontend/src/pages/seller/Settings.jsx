import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  InputAdornment,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
  Snackbar,
  Slide,
} from "@mui/material";
import ChangePassword from "../../components/seller/Settings/ChangePassword";
import ChangeInfoProfile from "../../components/seller/Settings/ChangeInfoProfile";
import ChangeProfileImage from "../../components/seller/Settings/ChangeProfileImage";
import { updateSeller, verifyPassword } from "../../api/seller/sellerAPI";
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

const defaultSettings = {
  shopName: "Nexus Studio",
  shopStatus: true,
  autoAcceptOrders: true,
  orderAlertEmail: true,
  orderAlertSms: false,
  payoutMethod: "GCash",
  shippingDefault: "Standard",
  pickupEnabled: true,
  password: "",
};

export default function Settings() {
  const [loading, setLoading] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");
  const [openPasswordForm, setOpenPasswordForm] = useState(false);
  const [settings, setSettings] = useState(defaultSettings);
  const [accountInformation, setAccountInformation] = useState({
    first_name: "",
    middle_name: "",
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
    // Load account information from localStorage
    setAccountInformation({
      first_name: localStorage.getItem("seller_first_name") || "",
      middle_name: localStorage.getItem("seller_middle_name") || "",
      last_name: localStorage.getItem("seller_last_name") || "",
      email: localStorage.getItem("seller_email") || "",
    });

    // Load shop settings
    const savedSettings = localStorage.getItem("seller_settings");
    if (savedSettings) {
      try {
        setSettings({ ...defaultSettings, ...JSON.parse(savedSettings) });
      } catch {
        setSettings(defaultSettings);
      }
    } else {
      const storedName = localStorage.getItem("seller_shop_name");
      const parsedName = storedName || defaultSettings.shopName;
      setSettings((current) => ({ ...current, shopName: parsedName }));
    }
  }, []);

  const handleOpenPasswordEdit = () => {
    setOpenPasswordForm(true);
  };

  const handleProfileImageSubmit = async (file) => {
    const sellerId = localStorage.getItem("seller_student_id");
    if (!sellerId) throw new Error("Seller account not found.");

    const formData = new FormData();
    formData.append("profile_image", file);

    const response = await updateSeller(sellerId, formData);
    const image = response.profile_image || file.name;
    localStorage.setItem("seller_profile_image", image);
    window.dispatchEvent(new Event("seller-profile-updated"));
    showSnackbar("Profile image updated successfully.");
  };

  const handleSubmitPassword = async (formData) => {
    try {
      const { currentPassword, newPassword } = formData;
      if (currentPassword && newPassword) {
        await updateSeller(localStorage.getItem("seller_student_id"), {
          password: newPassword,
        });
        localStorage.setItem("seller_password_changed", "1");
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
    const sellerId = localStorage.getItem("seller_student_id");
    if (
      !sellerId ||
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
      await updateSeller(localStorage.getItem("seller_student_id"), {
        ...accountInformation,
      });
      Object.entries(accountInformation).forEach(([key, value]) => {
        localStorage.setItem(`seller_${key}`, value.trim());
      });
      setPasswordDialogOpen(false);
      setConfirmationPassword("");
      window.dispatchEvent(new Event("seller-profile-updated"));
      showSnackbar("Account information updated successfully", "success");
    } catch (error) {
      setPasswordVerificationError(
        error.message || "Failed to update account information.",
      );
    } finally {
      setSavingAccountInformation(false);
    }
  };

  const saveSettings = () => {
    localStorage.setItem("seller_settings", JSON.stringify(settings));
    localStorage.setItem("seller_shop_name", settings.shopName);
    showSnackbar("Seller settings saved successfully.");
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
    localStorage.removeItem("seller_settings");
    localStorage.setItem("seller_shop_name", defaultSettings.shopName);
    showSnackbar("Settings reset to default values.", "info");
  };

  const handleToggle = (field) => {
    setSettings((current) => ({ ...current, [field]: !current[field] }));
  };

  const showSnackbar = (message, severity = "success") => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const closeSnackbar = (event, reason) => {
    if (reason === "clickaway") return;
    setSnackbarOpen(false);
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

      {/* Profile Picture Section */}
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
              Manage the picture displayed on your seller profile.
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
              localStorage.getItem("seller_profile_image")
                ? `http://localhost:5000/uploads/seller/profile/${encodeURIComponent(localStorage.getItem("seller_profile_image"))}`
                : "http://localhost:5000/uploads/profile.jpg"
            }
            alt="Seller profile"
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

      {/* Account Information Section */}
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
              Update the information associated with your seller account.
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
            label="Middle Name"
            name="middle_name"
            value={accountInformation.middle_name}
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

      {/* Account Password Section */}
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
            sx={{
              bgcolor: "#1e1f87",
              textTransform: "none",
              fontWeight: "bold",
              boxShadow: "none",
              "&:hover": { bgcolor: "#151663" },
            }}
            onClick={handleOpenPasswordEdit}
          >
            Update
          </Button>
        </Box>
      </Paper>

      {/* Shop Profile Section */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, md: 3 },
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 3,
          mt: 3,
        }}
      >
        <Stack spacing={3}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
              Shop profile
            </Typography>
            <TextField
              fullWidth
              label="Shop name"
              value={settings.shopName}
              onChange={(e) =>
                setSettings((current) => ({
                  ...current,
                  shopName: e.target.value,
                }))
              }
              sx={{ maxWidth: 420 }}
            />
          </Box>

          <Divider />

          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
              Business availability
            </Typography>

            <Stack spacing={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.shopStatus}
                    onChange={() => handleToggle("shopStatus")}
                  />
                }
                label="Open shop for new orders"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={settings.autoAcceptOrders}
                    onChange={() => handleToggle("autoAcceptOrders")}
                  />
                }
                label="Automatically accept incoming orders"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={settings.pickupEnabled}
                    onChange={() => handleToggle("pickupEnabled")}
                  />
                }
                label="Enable pickup / meet-up option"
              />
            </Stack>
          </Box>

          <Divider />

          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
              Fulfillment settings
            </Typography>

            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <FormControl sx={{ minWidth: 220 }}>
                <InputLabel>Default payout method</InputLabel>
                <Select
                  label="Default payout method"
                  value={settings.payoutMethod}
                  onChange={(e) =>
                    setSettings((current) => ({
                      ...current,
                      payoutMethod: e.target.value,
                    }))
                  }
                >
                  <MenuItem value="GCash">GCash</MenuItem>
                  <MenuItem value="Bank Transfer">Bank Transfer</MenuItem>
                  <MenuItem value="PayMaya">PayMaya</MenuItem>
                  <MenuItem value="Cash on Pickup">Cash on Pickup</MenuItem>
                </Select>
              </FormControl>

              <FormControl sx={{ minWidth: 220 }}>
                <InputLabel>Default shipping</InputLabel>
                <Select
                  label="Default shipping"
                  value={settings.shippingDefault}
                  onChange={(e) =>
                    setSettings((current) => ({
                      ...current,
                      shippingDefault: e.target.value,
                    }))
                  }
                >
                  <MenuItem value="Standard">Standard</MenuItem>
                  <MenuItem value="Express">Express</MenuItem>
                  <MenuItem value="Pickup">Pickup</MenuItem>
                  <MenuItem value="Same Day">Same Day</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </Box>

          <Divider />

          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
              Alerts & notifications
            </Typography>

            <Stack spacing={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.orderAlertEmail}
                    onChange={() => handleToggle("orderAlertEmail")}
                  />
                }
                label="Send order alerts via email"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={settings.orderAlertSms}
                    onChange={() => handleToggle("orderAlertSms")}
                  />
                }
                label="Send order alerts via SMS"
              />
            </Stack>
          </Box>

          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            <Button
              variant="contained"
              sx={{ borderRadius: 999, px: 3, textTransform: "none" }}
              onClick={saveSettings}
            >
              Save changes
            </Button>

            <Button
              variant="outlined"
              color="secondary"
              sx={{ borderRadius: 999, px: 3, textTransform: "none" }}
              onClick={resetSettings}
            >
              Reset
            </Button>
          </Box>
        </Stack>
      </Paper>

      {/* Profile Image Dialog */}
      <ChangeProfileImage
        open={profileImageDialogOpen}
        handleClose={() => setProfileImageDialogOpen(false)}
        onSubmit={handleProfileImageSubmit}
      />

      {/* Change Password Dialog */}
      <ChangePassword
        open={openPasswordForm}
        handleClose={() => setOpenPasswordForm(false)}
        onSubmit={handleSubmitPassword}
      />

      {/* Confirm Password Dialog for Account Info */}
      <ChangeInfoProfile
        open={passwordDialogOpen}
        handleClose={() => setPasswordDialogOpen(false)}
        password={confirmationPassword}
        onPasswordChange={(e) => {
          setConfirmationPassword(e.target.value);
          setPasswordVerificationError("");
        }}
        error={passwordVerificationError}
        loading={savingAccountInformation}
        onConfirm={handleConfirmAccountInformation}
      />

      <Snackbar
        open={snackbarOpen}
        severity={snackbarSeverity}
        variant="filled"
        autoHideDuration={2500}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        TransitionComponent={SlideTransition}
      >
        <Alert
          onClose={closeSnackbar}
          severity={snackbarSeverity}
          sx={{
            width: "100%",
            color: "#fff",
            backgroundColor:
              snackbarSeverity === "error"
                ? "error.light"
                : snackbarSeverity === "info"
                  ? "info.light"
                  : "success.light",
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
