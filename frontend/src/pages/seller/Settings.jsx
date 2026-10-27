import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
  Snackbar,
  Slide,
} from "@mui/material";
import ChangePassword from "../../components/seller/Settings/ChangePassword";
import ChangeInfoProfile from "../../components/seller/Settings/ChangeInfoProfile";
import ChangeProfileImage from "../../components/seller/Settings/ChangeProfileImage";
import {
  updateSeller,
  getSellerProfile,
  verifyPassword,
  changePassword,
} from "../../api/seller/sellerAPI";
import {
  getMissingSellerProfileFields,
  requiredSellerProfileFields,
} from "../../utils/sellerProfile";
import {
  fetchStorefront,
  saveStorefront,
} from "../../api/seller/storefrontAPI";
// Icons
import PersonIcon from "@mui/icons-material/Person";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import LockResetIcon from "@mui/icons-material/LockReset";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import ThemeModeSetting from "../../components/settings/ThemeModeSetting";

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
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");
  const [openPasswordForm, setOpenPasswordForm] = useState(false);
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
  const [accountInformationValidationError, setAccountInformationValidationError] =
    useState("");
  const [savingAccountInformation, setSavingAccountInformation] =
    useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [confirmationPassword, setConfirmationPassword] = useState("");
  const [passwordVerificationError, setPasswordVerificationError] =
    useState("");
  const [profileImageDialogOpen, setProfileImageDialogOpen] = useState(false);
  const [aboutText, setAboutText] = useState("");
  const [storefrontName, setStorefrontName] = useState("");
  const [loadingAbout, setLoadingAbout] = useState(true);
  const [savingAbout, setSavingAbout] = useState(false);
  const [aboutError, setAboutError] = useState("");

  useEffect(() => {
    let active = true;
    getSellerProfile()
      .then((profile) => {
        if (!active) return;
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
                    ? profile.course ||
                        localStorage.getItem("seller_course") ||
                        ""
                    : profile[field] || "",
                ),
          ]),
        );
        setAccountInformation(nextInformation);
        fields.forEach((field) =>
          localStorage.setItem(`seller_${field}`, nextInformation[field]),
        );
        setAccountInformationError("");
      })
      .catch((error) => {
        if (active) {
          setAccountInformation(
            Object.fromEntries(
              [
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
              ].map((field) => [
                field,
                field === "birthdate"
                  ? normalizeDateInput(
                      localStorage.getItem(`seller_${field}`),
                    )
                  : localStorage.getItem(`seller_${field}`) || "",
              ]),
            ),
          );
          setAccountInformationError(
            `Unable to refresh your account information: ${error.message || "Unknown error"}. Showing saved sign-in details.`,
          );
        }
      })
      .finally(() => {
        if (active) setLoadingAccountInformation(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    fetchStorefront()
      .then((storefront) => {
        if (!active) return;
        setStorefrontName(storefront?.shop_name || "");
        setAboutText(storefront?.shop_description || "");
      })
      .catch((error) => {
        if (active) setAboutError(error.message || "Unable to load your About details.");
      })
      .finally(() => {
        if (active) setLoadingAbout(false);
      });
    return () => {
      active = false;
    };
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
      setAccountInformationValidationError("Upload an image file for your COR.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setAccountInformationValidationError("The COR image must be 2 MB or smaller.");
      return;
    }
    setCorFile(file);
    setAccountInformationValidationError("");
  };

  const handleSaveAccountInformation = () => {
    const sellerId = localStorage.getItem("seller_student_id");
    if (!sellerId) {
      setAccountInformationValidationError("Seller account not found. Please sign in again.");
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

  const handleSaveAbout = async () => {
    try {
      setSavingAbout(true);
      setAboutError("");
      const saved = await saveStorefront({
        shop_name: storefrontName.trim(),
        shop_description: aboutText.trim(),
      });
      const savedAbout = saved?.shop_description || "";
      setAboutText(savedAbout);
      localStorage.setItem("seller_shop_description", savedAbout);
      localStorage.setItem("seller_store_description", savedAbout);
      window.dispatchEvent(new Event("seller-profile-updated"));
      showSnackbar("About information saved to your profile.");
    } catch (error) {
      setAboutError(error.message || "Unable to save your About information.");
    } finally {
      setSavingAbout(false);
    }
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

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2.5 } }}>
      <Helmet titleTemplate="%s - ArtMatch">
        <title>Settings</title>
      </Helmet>

      <ThemeModeSetting />

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
                ? `http://localhost:5000/uploads/seller/uploadProfile/${encodeURIComponent(localStorage.getItem("seller_profile_image"))}`
                : "http://localhost:5000/uploads/seller/profile.jpg"
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

      <Paper sx={{ p: 3, mt: 3, borderRadius: 2 }} variant="outlined">
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
          <Box
            sx={{
              p: 1.5,
              borderRadius: 2.5,
              bgcolor: "rgba(30, 31, 135, 0.08)",
              color: "#1e1f87",
            }}
          >
            <PersonIcon />
          </Box>
          <Box>
            <Typography variant="body1" fontWeight="700">
              About
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Share a short introduction that appears on your seller profile.
            </Typography>
          </Box>
        </Box>
        {aboutError && <Alert severity="error" sx={{ mb: 2 }}>{aboutError}</Alert>}
        <TextField
          fullWidth
          multiline
          minRows={4}
          maxRows={10}
          label="About you"
          placeholder="Tell buyers about yourself, your art, and what inspires you."
          value={aboutText}
          onChange={(event) => setAboutText(event.target.value)}
          disabled={loadingAbout || savingAbout || Boolean(aboutError)}
          inputProps={{ maxLength: 2000 }}
          helperText={`${aboutText.length}/2000`}
        />
        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
          <Button
            variant="contained"
            onClick={handleSaveAbout}
            disabled={loadingAbout || savingAbout || Boolean(aboutError)}
            sx={{
              mt: 2,
              color: "#fff",
              bgcolor: "#1e1f87",
              textTransform: "none",
              fontWeight: "bold",
              boxShadow: "none",
              "&:hover": { bgcolor: "#151663" },
            }}
          >
            {loadingAbout ? "Loading..." : savingAbout ? "Saving..." : "Save About"}
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
              Complete your student information here. All fields except middle
              name are required before you can add new artwork.
            </Typography>
          </Box>
        </Box>
        {accountInformationError && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {accountInformationError}
          </Alert>
        )}
        {accountInformationValidationError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {accountInformationValidationError}
          </Alert>
        )}
        {loadingAccountInformation && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
            <CircularProgress size={24} />
          </Box>
        )}
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
            required
            disabled={loadingAccountInformation || savingAccountInformation}
          />
          <TextField
            label="Last Name"
            name="last_name"
            value={accountInformation.last_name}
            onChange={handleAccountInformationChange}
            required
            disabled={loadingAccountInformation || savingAccountInformation}
          />
          <TextField
            label="Middle Name"
            name="middle_name"
            value={accountInformation.middle_name}
            onChange={handleAccountInformationChange}
            disabled={loadingAccountInformation || savingAccountInformation}
          />
          <TextField
            label="Birthdate"
            name="birthdate"
            type="date"
            value={normalizeDateInput(accountInformation.birthdate)}
            onChange={handleAccountInformationChange}
            required
            InputLabelProps={{ shrink: true }}
            disabled={loadingAccountInformation || savingAccountInformation}
          />
          <TextField
            label="Email"
            name="email"
            type="email"
            value={accountInformation.email}
            onChange={handleAccountInformationChange}
            required
            disabled={loadingAccountInformation || savingAccountInformation}
          />
          <TextField
            label="Phone Number"
            name="phone_number"
            type="tel"
            value={accountInformation.phone_number}
            onChange={handleAccountInformationChange}
            required
            disabled={loadingAccountInformation || savingAccountInformation}
          />
          <TextField
            label="Address"
            name="address"
            value={accountInformation.address}
            onChange={handleAccountInformationChange}
            required
            disabled={loadingAccountInformation || savingAccountInformation}
            sx={{ gridColumn: { xs: "auto", sm: "1 / -1" } }}
          />
          <TextField
            label="Student Number"
            name="student_number"
            value={accountInformation.student_number}
            onChange={handleAccountInformationChange}
            required
            disabled={loadingAccountInformation || savingAccountInformation}
          />
          <FormControl
            required
            disabled={loadingAccountInformation || savingAccountInformation}
          >
            <InputLabel id="seller-settings-year-level-label">
              Year Level
            </InputLabel>
            <Select
              labelId="seller-settings-year-level-label"
              name="year_level"
              label="Year Level"
              value={accountInformation.year_level}
              onChange={handleAccountInformationChange}
            >
              <MenuItem value="First Year">First Year</MenuItem>
              <MenuItem value="Second Year">Second Year</MenuItem>
              <MenuItem value="Third Year">Third Year</MenuItem>
              <MenuItem value="Fourth Year">Fourth Year</MenuItem>
            </Select>
          </FormControl>
          <FormControl
            required
            disabled={loadingAccountInformation || savingAccountInformation}
          >
            <InputLabel id="seller-settings-course-label">Course</InputLabel>
            <Select
              labelId="seller-settings-course-label"
              name="course"
              label="Course"
              value={accountInformation.course}
              onChange={handleAccountInformationChange}
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
          <Box sx={{ gridColumn: { xs: "auto", sm: "1 / -1" } }}>
            <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
              Certificate of Registration (COR)
            </Typography>
            <Button
              component="label"
              variant="outlined"
              startIcon={<CloudUploadIcon />}
              disabled={loadingAccountInformation || savingAccountInformation}
            >
              {corFile ? "Change COR image" : "Upload COR image"}
              <input
                hidden
                type="file"
                accept="image/*"
                onChange={handleCORChange}
              />
            </Button>
            <FormHelperText>
              {corFile
                ? `Selected: ${corFile.name}`
                : accountInformation.cor
                  ? `Current file: ${accountInformation.cor}`
                  : "Optional. Image file up to 2 MB."}
            </FormHelperText>
          </Box>
        </Box>
        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
          <Button
            variant="contained"
            onClick={handleSaveAccountInformation}
            disabled={loadingAccountInformation || savingAccountInformation}
            sx={{
              mt: 3,
              color: "#fff",
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
              color: "#fff",
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
