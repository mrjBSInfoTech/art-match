import { useState, useEffect, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
  Snackbar,
  Slide,
  Chip,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import ChangePassword from "../../components/seller/Settings/ChangePassword";
import ChangeInfoProfile from "../../components/seller/Settings/ChangeInfoProfile";
import ChangeProfileImage from "../../components/seller/Settings/ChangeProfileImage";
import DeactivateAccount from "../../components/seller/Settings/DeactivateAccount.jsx";
import {
  updateSeller,
  getSellerProfile,
  verifyPassword,
  changePassword,
  exportSellerData,
  deleteSellerAccount,
} from "../../api/seller/sellerAPI";
import { clearAuthData } from "../../../utils/auth";
import { getProfileInitials } from "../../utils/profileInitials.js";
import {
  getMissingSellerProfileFields,
  requiredSellerProfileFields,
} from "../../utils/sellerProfile";
import ConnectionErrorPanel from "../../components/seller/ConnectionErrorPanel";
import SellerLoadingPanel from "../../components/seller/SellerLoadingPanel";
// Icons
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import LockResetIcon from "@mui/icons-material/LockReset";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import DeleteForeverOutlinedIcon from "@mui/icons-material/DeleteForeverOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import ContactMailOutlinedIcon from "@mui/icons-material/ContactMailOutlined";
import ManageAccountsOutlinedIcon from "@mui/icons-material/ManageAccountsOutlined";
import VerifiedUserOutlinedIcon from "@mui/icons-material/VerifiedUserOutlined";
import ThemeModeSetting from "../../components/seller/Settings/ThemeModeSetting";

// Slide Transition for Snackbar
function SlideTransition(props) {
  return <Slide {...props} direction="up" />;
}

const normalizeDateInput = (value) => {
  const stringValue = String(value || "");
  if (/^\d{4}-\d{2}-\d{2}/.test(stringValue)) {
    return stringValue.slice(0, 10);
  }
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? "" : date.toISOString().slice(0, 10);
};

const courseOptions = [
  "Bachelor of Science in Architecture",
  "Bachelor of Science in Fine Arts",
  "Bachelor of Science in Interior Design",
  "Bachelor of Fine Arts in Visual Communication",
  "Bachelor of Fine Arts in Painting",
];

export default function Settings() {
  const theme = useTheme();
  const navigate = useNavigate();
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");
  const [openPasswordForm, setOpenPasswordForm] = useState(false);
  const [exportingData, setExportingData] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [accountInformation, setAccountInformation] = useState({
    first_name: "",
    middle_name: "",
    last_name: "",
    birthdate: "",
    email: "",
    address: "",
    phone_number: "",
    year_level: "",
    student_number: "",
    course: "",
    cor: "",
  });
  const [corFile, setCorFile] = useState(null);
  const [loadingAccountInformation, setLoadingAccountInformation] =
    useState(true);
  const [accountInformationError, setAccountInformationError] = useState("");
  const [
    accountInformationValidationError,
    setAccountInformationValidationError,
  ] = useState("");
  const [savingAccountInformation, setSavingAccountInformation] =
    useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [confirmationPassword, setConfirmationPassword] = useState("");
  const [passwordVerificationError, setPasswordVerificationError] =
    useState("");
  const [profileImageDialogOpen, setProfileImageDialogOpen] = useState(false);
  const [profileImage, setProfileImage] = useState("");

  const loadAccountInformation = useCallback(async () => {
    setLoadingAccountInformation(true);
    setAccountInformationError("");
    try {
      const profile = await getSellerProfile();
      setProfileImage(profile.profile_image || "");
      const fields = [
        "first_name",
        "middle_name",
        "last_name",
        "birthdate",
        "email",
        "address",
        "phone_number",
        "year_level",
        "student_number",
        "course",
        "cor",
      ];
      const nextInformation = Object.fromEntries(
        fields.map((field) => [
          field,
          field === "birthdate"
            ? normalizeDateInput(profile[field])
            : String(
                field === "course"
                  ? profile.course || ""
                  : profile[field] || "",
              ),
        ]),
      );
      setAccountInformation(nextInformation);
      setAccountInformationError("");
    } catch (error) {
      setAccountInformationError(
        error.message || "Failed to load account information.",
      );
    } finally {
      setLoadingAccountInformation(false);
    }
  }, []);

  useEffect(() => {
    loadAccountInformation();
  }, [loadAccountInformation]);

  const handleOpenPasswordEdit = () => {
    setOpenPasswordForm(true);
  };

  const handleProfileImageSubmit = async (file) => {
    const sellerId = localStorage.getItem("seller_student_id");
    if (!sellerId) throw new Error("Seller account not found.");

    const formData = new FormData();
    formData.append("profile_image", file);

    const updatedProfile = await updateSeller(sellerId, formData);
    const nextProfileImage = updatedProfile.profile_image || "";
    setProfileImage(nextProfileImage);
    localStorage.setItem("seller_profile_image", nextProfileImage);
    window.dispatchEvent(new Event("seller-profile-updated"));
    showSnackbar("Profile image updated successfully.");
  };

  const handleSubmitPassword = async (formData) => {
    try {
      const { currentPassword, newPassword } = formData;
      if (currentPassword && newPassword) {
        await changePassword(currentPassword, newPassword);
        localStorage.setItem("seller_password_changed", "1");
      }
      showSnackbar("Password updated successfully", "success");
      setOpenPasswordForm(false);
    } catch (err) {
      console.error("Error updating password:", err);
      showSnackbar("Failed to update password: " + err.message, "error");
      throw err;
    }
  };

  const handleAccountInformationChange = (event) => {
    const { name, value } = event.target;
    setAccountInformation((current) => ({ ...current, [name]: value }));
    setAccountInformationValidationError("");
  };

  const handleCORChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setAccountInformationValidationError(
        "Upload an image file for your COR.",
      );
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setAccountInformationValidationError(
        "The COR image must be 2 MB or smaller.",
      );
      return;
    }
    setCorFile(file);
    setAccountInformationValidationError("");
  };

  const handleSaveAccountInformation = () => {
    const sellerId = localStorage.getItem("seller_student_id");
    if (!sellerId) {
      setAccountInformationValidationError(
        "Seller account not found. Please sign in again.",
      );
      return;
    }
    if (accountInformationValidationError) return;
    const missingFields = getMissingSellerProfileFields({
      ...accountInformation,
      cor: corFile?.name || accountInformation.cor,
    });
    if (missingFields.length) {
      setAccountInformationValidationError(
        `Complete these fields before saving: ${missingFields.join(", ")}.`,
      );
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
      const profileFields = requiredSellerProfileFields
        .map(({ key }) => key)
        .concat("middle_name");
      const updateData = corFile ? new FormData() : {};
      profileFields
        .filter((field) => field !== "cor")
        .forEach((field) => {
          if (updateData instanceof FormData) {
            updateData.append(field, accountInformation[field].trim());
          } else {
            updateData[field] = accountInformation[field].trim();
          }
        });
      if (corFile) updateData.append("cor", corFile);
      const saved = await updateSeller(
        localStorage.getItem("seller_student_id"),
        updateData,
      );
      const savedInformation = {
        ...accountInformation,
        cor: saved.cor || corFile?.name || accountInformation.cor,
      };
      setAccountInformation(savedInformation);
      setCorFile(null);
      profileFields.forEach((key) => {
        localStorage.setItem(
          `seller_${key}`,
          String(savedInformation[key] || "").trim(),
        );
      });
      setPasswordDialogOpen(false);
      setConfirmationPassword("");
      window.dispatchEvent(new Event("seller-profile-updated"));
      setAccountInformationError("");
      setAccountInformationValidationError("");
      showSnackbar("Account information updated successfully", "success");
    } catch (error) {
      setPasswordVerificationError(
        error.message || "Failed to update account information.",
      );
    } finally {
      setSavingAccountInformation(false);
    }
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

  const handleExportSellerData = async () => {
    try {
      setExportingData(true);
      const dataPackage = await exportSellerData();
      const blob = new Blob([JSON.stringify(dataPackage, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `artmatch-seller-data-${accountInformation.student_number || "account"}-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showSnackbar(
        "Your seller data package has been exported and downloaded as JSON.",
        "success",
      );
    } catch (error) {
      showSnackbar(error.message || "Unable to export seller data.", "error");
    } finally {
      setExportingData(false);
    }
  };

  const handleDeactivateSellerAccount = async (event) => {
    event.preventDefault();
    if (!deletePassword) {
      setDeleteError("Please enter your current password to confirm.");
      return;
    }
    try {
      setDeletingAccount(true);
      setDeleteError("");
      await deleteSellerAccount(deletePassword);
      clearAuthData("seller");
      setDeleteDialogOpen(false);
      navigate("/seller/login", { replace: true });
    } catch (error) {
      setDeleteError(error.message || "Unable to deactivate seller account.");
    } finally {
      setDeletingAccount(false);
    }
  };

  if (loadingAccountInformation && !accountInformation.student_number && !accountInformation.email) {
    return (
      <SellerLoadingPanel
        title="Settings"
        subtitle="Manage your student artist profile, credentials, appearance, and privacy"
        showMetrics={false}
        showFilters={false}
      />
    );
  }

  if (accountInformationError) {
    return (
      <Box sx={{ minWidth: 0 }}>
        <Helmet titleTemplate="%s - ArtMatch">
          <title>Settings</title>
        </Helmet>
        <ConnectionErrorPanel
          title="Settings Unavailable"
          message={accountInformationError}
          onRetry={loadAccountInformation}
        />
      </Box>
    );
  }

  const isDark = theme.palette.mode === "dark";
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

      {/* Standard Seller Page Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" },
          gap: 2,
          mb: 2.5,
          flexWrap: "wrap",
        }}
      >
        <Box>
          <Typography
            sx={{
              fontSize: { xs: 28, sm: 38 },
              fontWeight: 800,
              lineHeight: 1.1,
              color: theme.palette.text.primary,
            }}
          >
            Settings
          </Typography>
          <Typography
            sx={{
              mt: 0.75,
              color: theme.palette.text.secondary,
              fontSize: 13,
            }}
          >
            Manage your student artist profile, credentials, appearance, and
            privacy
          </Typography>
        </Box>
      </Box>

      <Stack spacing={2.5}>
        {/* Appearance & Theme Section */}
        <ThemeModeSetting />

        {/* Profile Picture Section */}
        <Paper elevation={0} sx={cardSx}>
          <Box
            sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2.5 }}
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
                The image displayed across your shop storefront and public
                listings
              </Typography>
            </Box>
          </Box>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={3}
            alignItems="center"
          >
            <Avatar
              src={
                profileImage
                  ? `http://localhost:5000/uploads/seller/uploadProfile/${encodeURIComponent(profileImage)}`
                  : undefined
              }
              alt="Seller profile"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
              sx={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                border: "2px solid",
                borderColor: isDark
                  ? "rgba(255,255,255,0.12)"
                  : "rgba(15,23,42,0.12)",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                fontSize: 24,
                fontWeight: 700,
              }}
            >
              {!profileImage &&
                getProfileInitials(
                  `${accountInformation.first_name} ${accountInformation.last_name}`,
                )}
            </Avatar>
            <Box>
              <Button
                variant="outlined"
                startIcon={<CloudUploadIcon />}
                onClick={() => setProfileImageDialogOpen(true)}
                sx={{
                  borderRadius: 2,
                  px: 2.5,
                  py: 1,
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
                Change Profile Image
              </Button>
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
                sx={{ mt: 1 }}
              >
                PNG, JPG, or WEBP up to 2MB recommended
              </Typography>
            </Box>
          </Stack>
        </Paper>

        {/* Account Information Section */}
        <Paper elevation={0} sx={cardSx}>
          <Box
            sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2.5 }}
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
              <PersonOutlineOutlinedIcon sx={{ fontSize: 22 }} />
            </Box>
            <Box>
              <Typography variant="subtitle1" fontWeight={700}>
                Student Artist Information
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Your personal and academic enrollment information registered
                with CAFA
              </Typography>
            </Box>
          </Box>

          {accountInformationError && (
            <Alert severity="warning" sx={{ mb: 2.5, borderRadius: 2 }}>
              {accountInformationError}
            </Alert>
          )}
          {accountInformationValidationError && (
            <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>
              {accountInformationValidationError}
            </Alert>
          )}
          {loadingAccountInformation && (
            <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
              <CircularProgress size={28} sx={{ color: "#ef3340" }} />
            </Box>
          )}

          <Stack spacing={3}>
            {/* Personal Details Subgroup */}
            <Box>
              <Typography
                variant="caption"
                fontWeight={700}
                color="text.secondary"
                sx={{
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  display: "block",
                  mb: 1.5,
                }}
              >
                Personal Details
              </Typography>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    sm: "1fr 1fr",
                    md: "1fr 1fr 1fr",
                  },
                  gap: 2,
                }}
              >
                <TextField
                  label="First Name"
                  name="first_name"
                  value={accountInformation.first_name}
                  onChange={handleAccountInformationChange}
                  required
                  size="small"
                  disabled={
                    loadingAccountInformation || savingAccountInformation
                  }
                />
                <TextField
                  label="Middle Name"
                  name="middle_name"
                  value={accountInformation.middle_name}
                  onChange={handleAccountInformationChange}
                  size="small"
                  disabled={
                    loadingAccountInformation || savingAccountInformation
                  }
                />
                <TextField
                  label="Last Name"
                  name="last_name"
                  value={accountInformation.last_name}
                  onChange={handleAccountInformationChange}
                  required
                  size="small"
                  disabled={
                    loadingAccountInformation || savingAccountInformation
                  }
                />
                <TextField
                  label="Birthdate"
                  name="birthdate"
                  type="date"
                  value={normalizeDateInput(accountInformation.birthdate)}
                  onChange={handleAccountInformationChange}
                  required
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  disabled={
                    loadingAccountInformation || savingAccountInformation
                  }
                />
              </Box>
            </Box>

            <Divider
              sx={{
                borderColor: isDark
                  ? "rgba(255,255,255,0.06)"
                  : "rgba(0,0,0,0.06)",
              }}
            />

            {/* Academic Credentials Subgroup */}
            <Box>
              <Typography
                variant="caption"
                fontWeight={700}
                color="text.secondary"
                sx={{
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  display: "block",
                  mb: 1.5,
                }}
              >
                Academic Credentials (Enrollment Roster)
              </Typography>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr 1fr" },
                  gap: 2,
                }}
              >
                <TextField
                  label="Student Number"
                  name="student_number"
                  value={accountInformation.student_number}
                  required
                  size="small"
                  disabled
                  helperText="Verified student roster identifier"
                />
                <FormControl required disabled size="small">
                  <InputLabel id="seller-settings-year-level-label">
                    Year Level
                  </InputLabel>
                  <Select
                    labelId="seller-settings-year-level-label"
                    name="year_level"
                    label="Year Level"
                    value={accountInformation.year_level}
                  >
                    <MenuItem value="First Year">First Year</MenuItem>
                    <MenuItem value="Second Year">Second Year</MenuItem>
                    <MenuItem value="Third Year">Third Year</MenuItem>
                    <MenuItem value="Fourth Year">Fourth Year</MenuItem>
                    <MenuItem value="Fifth Year">Fifth Year</MenuItem>
                  </Select>
                </FormControl>
                <FormControl required disabled size="small">
                  <InputLabel id="seller-settings-course-label">
                    Course
                  </InputLabel>
                  <Select
                    labelId="seller-settings-course-label"
                    name="course"
                    label="Course"
                    value={accountInformation.course}
                  >
                    {accountInformation.course &&
                      !courseOptions.includes(accountInformation.course) && (
                        <MenuItem value={accountInformation.course}>
                          {accountInformation.course}
                        </MenuItem>
                      )}
                    {courseOptions.map((course) => (
                      <MenuItem key={course} value={course}>
                        {course}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </Box>

            <Divider
              sx={{
                borderColor: isDark
                  ? "rgba(255,255,255,0.06)"
                  : "rgba(0,0,0,0.06)",
              }}
            />

            {/* Contact & Address Subgroup */}
            <Box>
              <Typography
                variant="caption"
                fontWeight={700}
                color="text.secondary"
                sx={{
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  display: "block",
                  mb: 1.5,
                }}
              >
                Contact & Address
              </Typography>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                  gap: 2,
                }}
              >
                <TextField
                  label="Email"
                  name="email"
                  type="email"
                  value={accountInformation.email}
                  onChange={handleAccountInformationChange}
                  required
                  size="small"
                  disabled={
                    loadingAccountInformation || savingAccountInformation
                  }
                />
                <TextField
                  label="Phone Number"
                  name="phone_number"
                  type="tel"
                  value={accountInformation.phone_number}
                  onChange={handleAccountInformationChange}
                  required
                  size="small"
                  disabled={
                    loadingAccountInformation || savingAccountInformation
                  }
                />
                <TextField
                  label="Home / Studio Address"
                  name="address"
                  value={accountInformation.address}
                  onChange={handleAccountInformationChange}
                  required
                  size="small"
                  disabled={
                    loadingAccountInformation || savingAccountInformation
                  }
                  sx={{ gridColumn: { xs: "auto", sm: "1 / -1" } }}
                />
              </Box>
            </Box>
          </Stack>

          <Box
            sx={{
              display: "flex",
              justifyContent: "flex-end",
              mt: 3,
              pt: 2,
              borderTop: "1px solid",
              borderColor: isDark
                ? "rgba(255,255,255,0.06)"
                : "rgba(0,0,0,0.06)",
            }}
          >
            <Button
              variant="contained"
              onClick={handleSaveAccountInformation}
              disabled={loadingAccountInformation || savingAccountInformation}
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

        {/* Account Password Section */}
        <Paper elevation={0} sx={cardSx}>
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              alignItems: { xs: "stretch", sm: "center" },
              gap: 2,
              justifyContent: "space-between",
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
                  Account Password & Security
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Update your authentication credentials regularly to keep your
                  store secure
                </Typography>
              </Box>
            </Box>

            <Button
              variant="outlined"
              onClick={handleOpenPasswordEdit}
              sx={{
                borderRadius: 2,
                px: 2.5,
                py: 1,
                textTransform: "none",
                fontWeight: 700,
                borderColor: isDark
                  ? "rgba(255,255,255,0.2)"
                  : "rgba(15,23,42,0.2)",
                color: "text.primary",
                flexShrink: 0,
                "&:hover": {
                  borderColor: "#10b981",
                  color: "#10b981",
                },
              }}
            >
              Update Password
            </Button>
          </Box>
        </Paper>

        {/* Data Privacy Rights (RA 10173) Section */}
        <Paper elevation={0} sx={cardSx}>
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", md: "row" },
              alignItems: { xs: "stretch", md: "center" },
              gap: 2.5,
              justifyContent: "space-between",
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
                  Data Privacy &amp; Account Rights (RA 10173)
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 0.5, lineHeight: 1.6 }}
                >
                  Export a portable JSON archive of your artist profile,
                  artworks, and sales history (Sec. 18 Data Portability) or
                  request account deactivation and listing archival (Sec. 16
                  Erasure / Blocking).
                </Typography>
              </Box>
            </Box>

            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1.5}
              sx={{ flexShrink: 0 }}
            >
              <Button
                variant="outlined"
                startIcon={<DownloadOutlinedIcon />}
                onClick={handleExportSellerData}
                disabled={exportingData}
                sx={{
                  borderRadius: 2,
                  px: 2,
                  py: 1,
                  textTransform: "none",
                  fontWeight: 700,
                  borderColor: isDark
                    ? "rgba(255,255,255,0.2)"
                    : "rgba(15,23,42,0.2)",
                  color: "text.primary",
                  "&:hover": { borderColor: "#ef3340", color: "#ef3340" },
                }}
              >
                {exportingData ? "Exporting..." : "Export My Data (JSON)"}
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
                sx={{
                  borderRadius: 2,
                  px: 2,
                  py: 1,
                  textTransform: "none",
                  fontWeight: 700,
                }}
              >
                Deactivate Account
              </Button>
            </Stack>
          </Box>
        </Paper>
      </Stack>

      {/* Deactivate Account Confirmation Dialog */}
      <DeactivateAccount
        open={deleteDialogOpen}
        onClose={() => !deletingAccount && setDeleteDialogOpen(false)}
        onSubmit={handleDeactivateSellerAccount}
        password={deletePassword}
        onPasswordChange={(e) => setDeletePassword(e.target.value)}
        error={deleteError}
        loading={deletingAccount}
      />

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
        autoHideDuration={2500}
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
            backgroundColor:
              snackbarSeverity === "error"
                ? theme.palette.error.main
                : snackbarSeverity === "warning"
                  ? theme.palette.warning.main
                  : snackbarSeverity === "info"
                    ? theme.palette.info.main
                    : theme.palette.success.main,
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
