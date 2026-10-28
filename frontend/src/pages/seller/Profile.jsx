import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import LocalPhoneOutlinedIcon from "@mui/icons-material/LocalPhoneOutlined";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import { useNavigate } from "react-router-dom";
import { getSellerProfile } from "../../api/seller/sellerAPI";

const profileFields = [
  "first_name",
  "middle_name",
  "last_name",
  "student_number",
  "email",
  "phone_number",
  "address",
  "birthdate",
  "course",
  "year_level",
];

const getCachedProfile = () =>
  Object.fromEntries(
    profileFields.map((field) => [
      field,
      localStorage.getItem(`seller_${field}`) || "",
    ]),
  );

const getProfileImage = (image) => {
  if (!image) return "http://localhost:5000/uploads/seller/profile.jpg";
  if (image.startsWith("http")) return image;
  return `http://localhost:5000/uploads/seller/uploadProfile/${encodeURIComponent(image)}`;
};

const formatDate = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "N/A"
    : date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
};

function InfoRow({ icon, label, value }) {
  return (
    <Stack direction="row" spacing={2} alignItems="center">
      <Box
        sx={{
          p: 1,
          borderRadius: 2,
          bgcolor: "action.selected",
          display: "flex",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary" display="block">
          {label}
        </Typography>
        <Typography
          variant="body2"
          fontWeight="500"
          sx={{ overflowWrap: "anywhere" }}
        >
          {value || "N/A"}
        </Typography>
      </Box>
    </Stack>
  );
}

export default function Profile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(getCachedProfile);
  const [profileImage, setProfileImage] = useState(
    localStorage.getItem("seller_profile_image") || "",
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getSellerProfile()
      .then((data) => {
        if (!active) return;
        const nextProfile = Object.fromEntries(
          profileFields.map((field) => [field, data[field] || ""]),
        );
        setProfile(nextProfile);
        setProfileImage(data.profile_image || "");
        profileFields.forEach((field) => {
          localStorage.setItem(`seller_${field}`, nextProfile[field]);
        });
        if (data.profile_image) {
          localStorage.setItem("seller_profile_image", data.profile_image);
        }
        setError("");
      })
      .catch((loadError) => {
        if (active) {
          setError(
            `Unable to refresh your account overview: ${loadError.message || "Unknown error"}. Showing saved account details.`,
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const fullName = [
    profile.first_name,
    profile.middle_name,
    profile.last_name,
  ]
    .filter(Boolean)
    .join(" ");
  const registeredDate =
    localStorage.getItem("seller_registered_date") || "";
  const accountStatus =
    localStorage.getItem("seller_register_status") || "N/A";

  return (
    <Box sx={{ width: "100%", minWidth: 0, maxWidth: 1100, mx: "auto", pb: 5 }}>
      <Helmet titleTemplate="%s - ArtMatch">
        <title>Account Overview</title>
      </Helmet>

      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, md: 4 },
          mb: 3,
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2.5}
          alignItems="center"
          textAlign={{ xs: "center", sm: "left" }}
        >
          <Avatar
            src={getProfileImage(profileImage)}
            alt={fullName || "Seller"}
            sx={{
              width: 90,
              height: 90,
              bgcolor: "primary.main",
              fontSize: 36,
              fontWeight: 700,
            }}
          />
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              alignItems="center"
              spacing={1}
              sx={{ mb: 0.5 }}
            >
              <Typography
                component="h1"
                variant="h5"
                fontWeight={700}
                sx={{ overflowWrap: "anywhere" }}
              >
                {fullName || "Student / Seller"}
              </Typography>
              <Chip label="Student / Seller" size="small" color="primary" />
            </Stack>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ overflowWrap: "anywhere" }}
            >
              {profile.student_number || "Student number not available"}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 0.5, overflowWrap: "anywhere" }}
            >
              Email: <strong>{profile.email || "N/A"}</strong>
            </Typography>
          </Box>
          <Button
            variant="outlined"
            onClick={() => navigate("/seller/settings")}
            sx={{ textTransform: "none", flexShrink: 0 }}
          >
            Personal settings
          </Button>
        </Stack>
      </Paper>

      {error && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
          <CircularProgress size={24} />
        </Box>
      )}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
          gap: 3,
        }}
      >
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 3 },
            borderRadius: 3,
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Typography variant="h6" fontWeight={600} mb={2}>
            Personal Information
          </Typography>
          <Divider sx={{ mb: 2.5 }} />
          <Stack spacing={2.5}>
            <InfoRow
              icon={<AccountCircleOutlinedIcon color="action" />}
              label="Name"
              value={fullName}
            />
            <InfoRow
              icon={<BadgeOutlinedIcon color="action" />}
              label="Student Number"
              value={profile.student_number}
            />
            <InfoRow
              icon={<EmailOutlinedIcon color="action" />}
              label="Email"
              value={profile.email}
            />
            <InfoRow
              icon={<LocalPhoneOutlinedIcon color="action" />}
              label="Phone"
              value={profile.phone_number}
            />
            <InfoRow
              icon={<HomeOutlinedIcon color="action" />}
              label="Address"
              value={profile.address}
            />
            <InfoRow
              icon={<CalendarTodayOutlinedIcon color="action" />}
              label="Birthdate"
              value={formatDate(profile.birthdate)}
            />
          </Stack>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 3 },
            borderRadius: 3,
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Typography variant="h6" fontWeight={600} mb={2}>
            Account Details
          </Typography>
          <Divider sx={{ mb: 2.5 }} />
          <Stack spacing={2.5}>
            <InfoRow
              icon={<BadgeOutlinedIcon color="action" />}
              label="Account Type"
              value="Student / Seller"
            />
            <InfoRow
              icon={<CalendarTodayOutlinedIcon color="action" />}
              label="Member Since"
              value={formatDate(registeredDate)}
            />
            <InfoRow
              icon={<SchoolOutlinedIcon color="action" />}
              label="Course"
              value={profile.course}
            />
            <InfoRow
              icon={<SchoolOutlinedIcon color="action" />}
              label="Year Level"
              value={profile.year_level}
            />
            <InfoRow
              icon={<BadgeOutlinedIcon color="action" />}
              label="Account Status"
              value={accountStatus}
            />
          </Stack>
        </Paper>
      </Box>
    </Box>
  );
}
