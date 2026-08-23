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
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import VisibilityIcon from "@mui/icons-material/Visibility";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import VerifiedUserOutlinedIcon from "@mui/icons-material/VerifiedUserOutlined";
// Icons
import HomeIcon from "@mui/icons-material/Home";
import PersonIcon from "@mui/icons-material/Person";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";

// Slide Transition for Snackbar
function SlideTransition(props) {
  return <Slide {...props} direction="up" />;
}

export default function Profile() {
  // Admin's Info
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [role, setRole] = useState("Administrator");

  const [loading, setLoading] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");

  
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

  useEffect(() => {
    const storedFirst = localStorage.getItem("admin_first_name") || "";
    const storedLast = localStorage.getItem("admin_last_name") || "";
    const storedEmail = localStorage.getItem("admin_email") || "";
    const storedUsername = localStorage.getItem("admin_username") || "";
    setFirstName(storedFirst);
    setLastName(storedLast);
    setEmail(storedEmail);
    setUsername(storedUsername);
  }, []);

  function InfoRow({ icon, label, value, onCopy }) {
    return (
      <Stack direction="row" spacing={2} alignItems="center">
        <Box sx={{ p: 1, borderRadius: 2, bgcolor: "action.selected", display: "flex", alignItems: "center" }}>{icon}</Box>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
          <Typography variant="body2" fontWeight="500" noWrap>{value || "N/A"}</Typography>
        </Box>
        {onCopy && value && (
          <Tooltip title="Copy">
            <IconButton size="small" onClick={onCopy}><ContentCopyIcon fontSize="small"/></IconButton>
          </Tooltip>
        )}
      </Stack>
    );
  }

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
              src={`http://localhost:5000/uploads/profile.jpg`}
              alt="Admin"
            />
          </Grid>

          <Grid item xs={12} sm={6} md={6} sx={{ display: "flex", flexDirection: "column" }}>
            <Stack spacing={0.5}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Typography variant="h5" fontWeight="700">
                  {`${firstName} ${lastName}`.trim() || "Admin Name"}
                </Typography>
                <Chip label={role} size="small" sx={{ fontWeight: 600 }} />
              </Stack>

              <Typography variant="body2" color="text.secondary">
                {username || "admin"}
              </Typography>

              <Typography variant="body2" color="text.secondary">
                Email: <strong>{email || "N/A"}</strong>
              </Typography>
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      {/* Main Details Grid */}
      <Grid container spacing={3} sx={{ width: "100%", m: 0, justifyContent: { md: "space-between" }, alignItems: "stretch" }}>
        <Grid item xs={12} sm={6} md={6} sx={{ display: "flex", flex: { xs: "0 0 100%", sm: "0 0 48.5%" }, maxWidth: { xs: "100%", sm: "48.5%" }, boxSizing: "border-box" }}>
          <Paper elevation={0} sx={{ p: 3, width: "100%", display: "flex", flexDirection: "column", flex: 1, minWidth: 0, borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
            <Typography variant="h6" fontWeight="600" mb={2}>Personal Information</Typography>
            <Divider sx={{ mb: 2.5 }} />
            <Stack spacing={2.5} sx={{ flexGrow: 1 }}>
              <InfoRow icon={<PersonIcon color="action" />} label="Name" value={`${firstName} ${lastName}`.trim()} />
              <InfoRow icon={<AccountCircleIcon color="action" />} label="Username" value={username} />
              <InfoRow icon={<HomeIcon color="action" />} label="Email" value={email} onCopy={() => navigator.clipboard.writeText(email || "")} />
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={6} sx={{ display: "flex", flex: { xs: "0 0 100%", sm: "0 0 48.5%" }, maxWidth: { xs: "100%", sm: "48.5%" }, boxSizing: "border-box" }}>
          <Paper elevation={0} sx={{ p: 3, width: "100%", display: "flex", flexDirection: "column", flex: 1, minWidth: 0, borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
            <Typography variant="h6" fontWeight="600" mb={2}>Account Details</Typography>
            <Divider sx={{ mb: 2.5 }} />
            <Stack spacing={2.5} sx={{ flexGrow: 1 }}>
              <InfoRow icon={<BadgeOutlinedIcon color="action" />} label="Role" value={role} />
              <InfoRow icon={<CalendarTodayOutlinedIcon color="action" />} label="Member Since" value={"N/A"} />
              <InfoRow icon={<VerifiedUserOutlinedIcon color="action" />} label="Status" value={"Active"} />
            </Stack>
            <Box sx={{ mt: 3 }}>
              <Typography variant="caption" color="text.secondary" fontWeight="600" display="block" mb={1}>Admin Actions</Typography>
              <Card variant="outlined" sx={{ borderRadius: 2, bgcolor: "action.hover", cursor: "pointer", transition: "0.2s", '&:hover': { borderColor: 'primary.main' } }}>
                <CardContent sx={{ py: 1.5, px: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}> 
                  <Button size="small" startIcon={<VisibilityIcon />}>View Activity</Button>
                </CardContent>
              </Card>
            </Box>
          </Paper>
        </Grid>
      </Grid>
      {/* Snackbar Notification */}
      {/* //For Future Use 
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
    */}
    </Box>
  );
}
