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
} from "@mui/material";
// Icons
import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";

import { cacheBuyerProfile, getBuyerSecuritySettings, updateBuyerProfile } from "../../api/buyer/buyerAuthenticationAPI";

export default function Profile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
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

  useEffect(() => {
    let active = true;
    getBuyerSecuritySettings().then((profile) => {
      if (active) applyProfile(profile);
    }).catch((err) => {
      if (active) setError(err.message);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    const profile = {
      username: username.trim(), first_name: firstName.trim(),
      last_name: lastName.trim(), email: email.trim(), phone_number: phoneNumber.trim(),
    };
    try {
      await updateBuyerProfile(profile);
      applyProfile({ ...profile, profile_image: profileImage });
      setSuccess("Personal information updated successfully.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    setSuccess("");
    if (!file.type.startsWith("image/") || file.size > 2 * 1024 * 1024) {
      setError("Choose an image of 2MB or smaller.");
      return;
    }
    setSaving(true);
    try {
      const form = new FormData();
      form.append("profile_image", file);
      const result = await updateBuyerProfile(form);
      setProfileImage(result.profile_image);
      cacheBuyerProfile({ profile_image: result.profile_image });
      setSuccess("Profile photo updated successfully.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

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
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
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
              <Button component="label" variant="outlined" color="inherit" disabled={loading || saving}>
                {saving ? "Saving..." : "Upload photo"}
                <input hidden type="file" accept="image/*" onChange={handleUpload} disabled={loading || saving} />
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
    </Box>
  );
}
