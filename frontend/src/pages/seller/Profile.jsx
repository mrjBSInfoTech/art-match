import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  IconButton,
  Paper,
  Snackbar,
  Slide,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
// Icons
import PersonIcon from "@mui/icons-material/Person";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import CakeOutlinedIcon from "@mui/icons-material/CakeOutlined";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import VerifiedUserOutlinedIcon from "@mui/icons-material/VerifiedUserOutlined";
import ProfileCOR from "../../components/seller/Profile/ProfileCOR";

// Slide Transition for Snackbar
function SlideTransition(props) {
  return <Slide {...props} direction="up" />;
}

export default function Profile() {
  // Seller/Student Info
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [address, setAddress] = useState("");
  const [cor, setCor] = useState("");
  const [yearLevel, setYearLevel] = useState("");
  const [course, setCourse] = useState("");
  const [studentNumber, setStudentNumber] = useState("");
  const [status, setStatus] = useState("");
  const [registeredDate, setRegisteredDate] = useState("");
  const [approvedDate, setApprovedDate] = useState("");
  const [profileImage, setProfileImage] = useState("");

  // Modals & Notifications
  const [openCor, setOpenCor] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");

  useEffect(() => {
    setFirstName(localStorage.getItem("seller_first_name") || "");
    setLastName(localStorage.getItem("seller_last_name") || "");
    setMiddleName(localStorage.getItem("seller_middle_name") || "");
    setBirthdate(localStorage.getItem("seller_birthdate") || "");
    setEmail(localStorage.getItem("seller_email") || "");
    setPhoneNumber(localStorage.getItem("seller_phone_number") || "");
    setAddress(localStorage.getItem("seller_address") || "");
    setCor(localStorage.getItem("seller_cor") || "");
    setYearLevel(localStorage.getItem("seller_year_level") || "");
    setCourse(localStorage.getItem("seller_course") || "");
    setStudentNumber(localStorage.getItem("seller_student_number") || "");
    setStatus(localStorage.getItem("seller_register_status") || "pending");
    setRegisteredDate(localStorage.getItem("seller_registered_date") || "");
    setApprovedDate(localStorage.getItem("seller_approved_date") || "");
    setProfileImage(localStorage.getItem("seller_profile_image") || "");
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return isNaN(date.getTime())
      ? "N/A"
      : date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
  };

  const handleCopy = (text, label) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    showSnackbar(`${label} copied to clipboard!`);
  };

  const getStatusColor = (currentStatus) => {
    const s = String(currentStatus || "").toLowerCase();
    switch (s) {
      case "verified":
      case "approved":
        return { color: "success", label: "Verified" };
      case "pending":
        return { color: "warning", label: "Pending" };
      case "denied":
      case "rejected":
        return { color: "error", label: "Denied" };
      default:
        return { color: "default", label: currentStatus || "Unknown" };
    }
  };

  const statusConfig = getStatusColor(status);
  const fullName = [firstName, middleName, lastName].filter(Boolean).join(" ");

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
    <Box sx={{ maxWidth: 1100, mx: "auto", pb: 5 }}>
      <Helmet titleTemplate="%s - ArtMatch">
        <title>Profile</title>
      </Helmet>

      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, md: 4 },
          mb: 3,
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
          background: "background.paper",
        }}
      >
        <Grid container spacing={3} alignItems="center">
          <Grid item>
            <Avatar
              sx={{
                width: 90,
                height: 90,
                bgcolor: "primary.main",
                fontSize: 36,
                fontWeight: "bold",
                boxShadow: 2,
              }}
              src={
                profileImage
                  ? `http://localhost:5000/uploads/seller/profile/${encodeURIComponent(profileImage)}`
                  : undefined
              }
              alt="ArtMatch"
            />
          </Grid>

          <Grid
            item
            xs={12}
            sm={6}
            md={6}
            lg={6}
            xl={6}
            sx={{
              display: "flex",
              flexDirection: "column",
              boxSizing: "border-box",
              flexBasis: "50%",
              maxWidth: "50%",
            }}
          >
            <Stack spacing={0.5}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Typography variant="h5" fontWeight="700">
                  {fullName || "Student Name"}
                </Typography>
                <Chip
                  label={statusConfig.label}
                  color={statusConfig.color}
                  size="small"
                  sx={{ fontWeight: "600", color: "white" }}
                />
              </Stack>

              <Typography variant="body2" color="text.secondary">
                {course ? `${course} • ${yearLevel || "N/A"}` : "Student"}
              </Typography>

              <Typography variant="body2" color="text.secondary">
                Student No: <strong>{studentNumber || "N/A"}</strong>
              </Typography>
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      {/* Main Details Grid */}
      <Grid
        container
        spacing={3}
        sx={{
          width: "100%",
          m: 0,
          justifyContent: { md: "space-between" },
          alignItems: "stretch",
        }}
      >
        {/* Personal Details Card */}
        <Grid
          item
          xs={12}
          sm={6}
          md={6}
          sx={{
            display: "flex",
            flex: { xs: "0 0 100%", sm: "0 0 48.5%" },
            maxWidth: { xs: "100%", sm: "48.5%" },
            boxSizing: "border-box",
          }}
        >
          <Paper
            elevation={0}
            sx={{
              p: 3,
              width: "100%",
              display: "flex",
              flexDirection: "column",
              flex: 1,
              minWidth: 0,
              borderRadius: 3,
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <Typography variant="h6" fontWeight="600" mb={2}>
              Personal Information
            </Typography>
            <Divider sx={{ mb: 2.5 }} />

            <Stack spacing={2.5} sx={{ flexGrow: 1 }}>
              <InfoRow
                icon={<EmailOutlinedIcon color="action" />}
                label="Email Address"
                value={email}
                onCopy={() => handleCopy(email, "Email")}
              />
              <InfoRow
                icon={<PhoneOutlinedIcon color="action" />}
                label="Phone Number"
                value={phoneNumber}
                onCopy={() => handleCopy(phoneNumber, "Phone Number")}
              />
              <InfoRow
                icon={<CakeOutlinedIcon color="action" />}
                label="Birthdate"
                value={formatDate(birthdate)}
              />
              <InfoRow
                icon={<HomeOutlinedIcon color="action" />}
                label="Address"
                value={address}
              />
            </Stack>
          </Paper>
        </Grid>

        {/* Academic & Account Status Card */}
        <Grid
          item
          xs={12}
          sm={6}
          md={6}
          sx={{
            display: "flex",
            flex: { xs: "0 0 100%", sm: "0 0 48.5%" },
            maxWidth: { xs: "100%", sm: "48.5%" },
            boxSizing: "border-box",
          }}
        >
          <Paper
            elevation={0}
            sx={{
              p: 3,
              width: "100%",
              display: "flex",
              flexDirection: "column",
              flex: 1,
              minWidth: 0,
              borderRadius: 3,
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <Typography variant="h6" fontWeight="600" mb={2}>
              Academic & Account Details
            </Typography>
            <Divider sx={{ mb: 2.5 }} />

            <Stack spacing={2.5} sx={{ flexGrow: 1 }}>
              <InfoRow
                icon={<BadgeOutlinedIcon color="action" />}
                label="Student Number"
                value={studentNumber}
                onCopy={() => handleCopy(studentNumber, "Student Number")}
              />
              <InfoRow
                icon={<SchoolOutlinedIcon color="action" />}
                label="Course & Year Level"
                value={
                  course ? `${course} (Year ${yearLevel || "N/A"})` : "N/A"
                }
              />
              <InfoRow
                icon={<CalendarTodayOutlinedIcon color="action" />}
                label="Registered Date"
                value={formatDate(registeredDate)}
              />
              <InfoRow
                icon={<VerifiedUserOutlinedIcon color="action" />}
                label="Approved Date"
                value={formatDate(approvedDate)}
              />
            </Stack>

            {/* COR File Card Link */}
            <Box sx={{ mt: 3 }}>
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight="600"
                display="block"
                mb={1}
              >
                ATTACHED CERTIFICATE OF REGISTRATION (COR)
              </Typography>
              <Card
                variant="outlined"
                sx={{
                  borderRadius: 2,
                  bgcolor: "action.hover",
                  cursor: "pointer",
                  transition: "0.2s",
                  "&:hover": { borderColor: "primary.main" },
                }}
                onClick={() => setOpenCor(true)}
              >
                <CardContent
                  sx={{
                    py: 1.5,
                    px: 2,
                    "&:last-child": { pb: 1.5 },
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Button size="small" startIcon={<VisibilityIcon />}>
                    View
                  </Button>
                </CardContent>
              </Card>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* COR Dialog Modal */}
      <ProfileCOR
        open={openCor}
        handleClose={() => setOpenCor(false)}
        corFileName={cor}
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

function InfoRow({ icon, label, value, onCopy }) {
  return (
    <Stack direction="row" spacing={2} alignItems="center">
      <Box
        sx={{
          p: 1,
          borderRadius: 2,
          bgcolor: "action.selected",
          display: "flex",
          alignItems: "center",
        }}
      >
        {icon}
      </Box>
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary" display="block">
          {label}
        </Typography>
        <Typography variant="body2" fontWeight="500" noWrap>
          {value || "N/A"}
        </Typography>
      </Box>
      {onCopy && value && (
        <Tooltip title="Copy">
          <IconButton size="small" onClick={onCopy}>
            <ContentCopyIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    </Stack>
  );
}
