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
// Icons
import HomeIcon from "@mui/icons-material/Home";
import PersonIcon from "@mui/icons-material/Person";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import { fetchResidents } from "../api/residentAPI";
import { fetchPorts, updatePort } from "../api/portAPI";
import { changePassword } from "../api/authenticationAPI";
import ChangePassword from "../components/Settings/ChangePassword";
import PortForm from "../components/Settings/PortForm";

// Slide Transition for Snackbar
function SlideTransition(props) {
  return <Slide {...props} direction="up" />;
}

export default function Settings() {
  const [port, setPort] = useState(null);
  const [password, setPassword] = useState(null);
  const [loading, setLoading] = useState(false);
  const [portErrorMessage, setPortErrorMessage] = useState("");
  const [openPortForm, setOpenPortForm] = useState(false);
  const [selectedPort, setSelectedPort] = useState(null);
  const [openPasswordForm, setOpenPasswordForm] = useState(false);
  const [selectedPassword, setSelectedPassword] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");

  // Fetch all ports from API
  const loadPort = async () => {
    try {
      setLoading(true);
      const data = await fetchPorts();
      console.log("Ports loaded:", data);
      setPort(data?.[0] || {});
    } catch (err) {
      console.error("Error loading ports:", err);
      const message = setPortErrorMessage(
        "Failed to load ports: " + err.message,
      );
    } finally {
      setLoading(false);
    }
  };
  // ========== PASSWORD HANDLERS ==========
  // ✏️ Open Change Password Modal
  const handleOpenPasswordEdit = () => {
    setOpenPasswordForm(true);
  };

  // 💾 Submit Changed Password
  const handleSubmitPassword = async (formData) => {
    try {
      const { currentPassword, newPassword } = formData;

      // Update password if provided
      if (currentPassword && newPassword) {
        await changePassword(currentPassword, newPassword);
      }

      showSnackbar("Password updated successfully", "success");
      setOpenPasswordForm(false);
    } catch (err) {
      console.error("Error updating password:", err , "error");
      showSnackbar("Failed to update password: " + err.message, "error");
    }
  };

  // ========== PORT HANDLERS ==========
  // ✏️ Open Edit Port Modal
  const handleOpenPortEdit = (port) => {
    setPort(port);
    setOpenPortForm(true);
  };

  // Submit Port
  const handleSubmitPort = async (formData) => {
    try {
      await updatePort(port.port_id, formData);
      showSnackbar("Port updated successfully", "success");
      await loadPort();
      setOpenPortForm(false);
    } catch (err) {
      console.error("Error saving port:", err);
      setPortErrorMessage(err.message || "Error saving port");
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

  // Load port on component mount
  useEffect(() => {
    loadPort();
  }, []);
  return (
    <Box sx={{ p: 3 }}>
      <Helmet titleTemplate="%s - Barangay Management System">
        <title>Settings</title>
      </Helmet>
      <Box>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: "bold" }}>
          Settings
        </Typography>
      </Box>
      <Paper sx={{ p: 3, mt: 3, borderRadius: 2 }} variant="outlined">
        <Typography variant="h6" gutterBottom sx={{ fontWeight: "bold" }}>
          User Settings
        </Typography>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Typography variant="body1" gutterBottom>
            Change Password
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={handleOpenPasswordEdit}
            sx={{
              width: { xs: 130, sm: 150 },
              height: { xs: 35, sm: 45 },
              minWidth: { xs: 45, sm: 50 },
              fontSize: { xs: 12, sm: 16 },
              padding: 0,
            }}
          >
            Update
          </Button>
        </Box>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: "bold" }}>
          Port Number
        </Typography>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Typography variant="body1" gutterBottom>
            Port Number : {port?.port_number || "Loading..."}
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={() => handleOpenPortEdit(port)}
            sx={{
              width: { xs: 130, sm: 150 },
              height: { xs: 35, sm: 45 },
              minWidth: { xs: 45, sm: 50 },
              fontSize: { xs: 12, sm: 16 },
              padding: 0,
            }}
          >
            Update
          </Button>
        </Box>
      </Paper>
      <ChangePassword
        open={openPasswordForm}
        handleClose={() => setOpenPasswordForm(false)}
        onSubmit={handleSubmitPassword}
        selectedPassword={selectedPassword}
      />
      <PortForm
        open={openPortForm}
        handleClose={() => setOpenPortForm(false)}
        onSubmit={handleSubmitPort}
        selectedPort={port}
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
