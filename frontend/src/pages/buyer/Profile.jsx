import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import {
  Alert,
  Avatar,
  Box,
  Button,
  TextField,
  Stack,
  Typography,
  Snackbar,
  Slide,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import ProfileConfirm from "../../components/buyer/Profile/ProfileConfirm";
import ChangeProfileImage from "../../components/buyer/Profile/ChangeProfileImage";
// Icons
import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";

import { cacheBuyerProfile, getBuyerSecuritySettings, updateBuyerProfile } from "../../api/buyer/buyerAuthenticationAPI";
import ConnectionErrorPanel from "../../components/buyer/ConnectionErrorPanel";

function SlideTransition(props) {
  return <Slide {...props} direction="up" />;
}

export default function Profile() {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [profileImageDialogOpen, setProfileImageDialogOpen] = useState(false);
  const [pendingProfile, setPendingProfile] = useState(null);
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [profileImage, setProfileImage] = useState("");

  const applyProfile = (profile) => {
    setUsername(profile.username || "");
    setFirstName(profile.first_name || "");
    setLastName(profile.last_name || "");
    setEmail(profile.email || "");
    setPhoneNumber(profile.phone_number || "");
    setProfileImage(profile.profile_image || "");
    cacheBuyerProfile(profile);
  };

  const loadProfile = () => {
    setLoading(true);
    setError("");
    return getBuyerSecuritySettings()
      .then((profile) => {
        applyProfile(profile);
      })
      .catch((err) => {
        setError(err.message || "Unable to load profile.");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleSave = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setPendingProfile({
      username: username.trim(), first_name: firstName.trim(),
      last_name: lastName.trim(), email: email.trim(), phone_number: phoneNumber.trim(),
    });
    setConfirmOpen(true);
  };

  const handleConfirmSave = async () => {
    if (!pendingProfile || saving) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await updateBuyerProfile(pendingProfile);
      applyProfile({ ...pendingProfile, profile_image: profileImage });
      setSuccess("Personal information updated successfully.");
      setConfirmOpen(false);
      setPendingProfile(null);
    } catch (err) {
      setError(err.message || "Unable to update personal information.");
      setConfirmOpen(false);
      setPendingProfile(null);
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (file) => {
    if (!file) return;
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      const form = new FormData();
      form.append("profile_image", file);
      const result = await updateBuyerProfile(form);
      setProfileImage(result.profile_image);
      cacheBuyerProfile({ profile_image: result.profile_image });
      setSuccess("Profile photo updated successfully.");
    } catch (err) {
      throw new Error(err.message || "Unable to update profile image.");
    } finally {
      setSaving(false);
    }
  };

  const closeSnackbar = (event, reason) => {
    if (reason === "clickaway") return;
    setError("");
    setSuccess("");
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case "error":
        return theme.palette.error.main;
      case "warning":
        return theme.palette.warning.main;
      case "info":
        return theme.palette.info.main;
      default:
        return theme.palette.success.main;
    }
  };

  if (error && !loading && !username && !email) {
    return (
      <ConnectionErrorPanel
        title="Profile Unavailable"
        onRetry={loadProfile}
      />
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100%",
        p: { xs: 2, sm: 3, md: 4 },
      }}
    >
      <Helmet titleTemplate="%s - ArtMatch">
        <title>Profile</title>
      </Helmet>

      <Box sx={{ maxWidth: 1120, mx: "auto" }}>
        <Typography
          variant="overline"
          sx={{ color: "error.main", fontWeight: 800, letterSpacing: 1.5 }}
        >
          Account settings
        </Typography>
        <Typography variant="h4" sx={{ mt: 0.5, mb: 3, fontWeight: 800 }}>
          My profile
        </Typography>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "280px minmax(0, 1fr)" },
            gap: 2.5,
            alignItems: "stretch",
          }}
        >
          <Box
            sx={{
              position: "relative",
              overflow: "hidden",
              p: { xs: 3, sm: 4 },
              borderRadius: 3,
              color: "error.contrastText",
              background: (theme) => `linear-gradient(145deg, ${theme.palette.error.main} 0%, ${theme.palette.error.dark} 100%)`,
              boxShadow: 3,
            }}
          >
            <AccountCircleOutlinedIcon
              sx={{
                position: "absolute",
                right: -18,
                top: -18,
                fontSize: 150,
                opacity: 0.1,
              }}
            />
            <Stack spacing={2.5} sx={{ position: "relative", height: "100%" }}>
              <Avatar
                src={
                  profileImage
                    ? `http://localhost:5000/uploads/buyer/uploadProfile/${encodeURIComponent(profileImage)}`
                    : "http://localhost:5000/uploads/buyer/profile.jpg"
                }
                sx={{
                  width: 86,
                  height: 86,
                  bgcolor: "background.paper",
                  color: "error.main",
                  fontSize: 34,
                  fontWeight: 800,
                }}
              >
                {username ? username.charAt(0).toUpperCase() : "U"}
              </Avatar>
              <Button
                type="button"
                variant="outlined"
                color="inherit"
                disabled={loading || saving}
                onClick={() => setProfileImageDialogOpen(true)}
              >
                {saving ? "Saving..." : "Upload photo"}
              </Button>
              <Typography variant="caption">Images up to 2MB</Typography>
              <Box>
                <Typography
                  variant="h5"
                  sx={{ fontWeight: 800, overflowWrap: "anywhere" }}
                >
                  {firstName} {lastName}
                </Typography>
                <Typography
                  sx={{ mt: 0.75, opacity: 0.8, overflowWrap: "anywhere" }}
                >
                  @{username}
                </Typography>
              </Box>
              <Box
                sx={{
                  mt: "auto",
                  pt: 3,
                  borderTop: 1,
                  borderColor: "error.light",
                }}
              >
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  ArtMatch buyer account
                </Typography>
              </Box>
            </Stack>
          </Box>

          <Box
            component="form"
            onSubmit={handleSave}
            sx={{
              p: { xs: 2.5, sm: 3.5 },
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 3,
              bgcolor: "background.paper",
            }}
          >
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ mb: 3 }}
            >
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  Personal information
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 0.5 }}
                >
                  Edit the details connected to your account.
                </Typography>
              </Box>
              <EditOutlinedIcon sx={{ color: "error.main" }} />
            </Stack>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2, minmax(0, 1fr))",
                },
                gap: 2,
              }}
            >
              <TextField
                fullWidth
                label="First name"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                required
                disabled={loading || saving}
              />
              <TextField
                fullWidth
                label="Last name"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                required
                disabled={loading || saving}
              />
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                disabled={loading || saving}
                InputProps={{
                  startAdornment: (
                    <EmailOutlinedIcon
                      sx={{ mr: 1, color: "text.secondary" }}
                    />
                  ),
                }}
              />
              <TextField
                fullWidth
                label="Phone number"
                type="tel"
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value)}
                required
                disabled={loading || saving}
                InputProps={{
                  startAdornment: (
                    <PhoneOutlinedIcon
                      sx={{ mr: 1, color: "text.secondary" }}
                    />
                  ),
                }}
              />
              <TextField
                fullWidth
                label="Username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
                disabled={loading || saving}
                sx={{ gridColumn: { sm: "1 / -1" } }}
              />
            </Box>

            <Button
              type="submit"
              disabled={loading || saving}
              variant="contained"
              color="error"
              startIcon={<EditOutlinedIcon />}
              sx={{ mt: 3, minWidth: 170 }}
            >
              {loading ? "Loading..." : saving ? "Saving..." : "Update profile"}
            </Button>
          </Box>
        </Box>
      </Box>
      <Snackbar
        open={Boolean(error || success)}
        autoHideDuration={3000}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        TransitionComponent={SlideTransition}
        sx={{
          "& .MuiSnackbar-root": {
            width: "auto",
          },
        }}
      >
        <Alert
          onClose={closeSnackbar}
          severity={error ? "error" : "success"}
          variant="filled"
          sx={{
            width: { xs: 280, sm: 360 },
            minHeight: 48,
            borderRadius: 2,
            boxShadow: "0 10px 28px rgba(15, 23, 42, 0.18)",
            backgroundColor: getSeverityColor(error ? "error" : "success"),
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
          {error || success}
        </Alert>
      </Snackbar>
      <ProfileConfirm
        open={confirmOpen}
        handleClose={() => {
          setConfirmOpen(false);
          setPendingProfile(null);
        }}
        onConfirm={handleConfirmSave}
        confirming={saving}
      />
      <ChangeProfileImage
        open={profileImageDialogOpen}
        handleClose={() => setProfileImageDialogOpen(false)}
        onSubmit={handleUpload}
      />
    </Box>
  );
}
