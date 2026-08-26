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
import { styled } from "@mui/material/styles";
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
import { updateAdmin } from "../../api/admin/adminAPI";

const DropZone = styled(Box, {
  shouldForwardProp: (prop) => prop !== "isDragActive",
})(({ theme, isDragActive }) => ({
  minHeight: 130,
  border: `2px dashed ${isDragActive ? theme.palette.primary.main : theme.palette.grey[400]}`,
  borderRadius: theme.shape.borderRadius,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: theme.spacing(2),
  cursor: "pointer",
  backgroundColor: isDragActive ? theme.palette.action.hover : "transparent",
  transition: "all 0.2s ease-in-out",
  "&:hover": { backgroundColor: theme.palette.action.hover },
}));

const getImageUrl = (image) =>
  image
    ? `http://localhost:5000/uploads/uploadAdmin/${encodeURIComponent(image)}`
    : "http://localhost:5000/uploads/profile.jpg";

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
  const [image, setImage] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploadError, setUploadError] = useState("");
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
    const storedImage = localStorage.getItem("admin_image") || "";
    setFirstName(storedFirst);
    setLastName(storedLast);
    setEmail(storedEmail);
    setUsername(storedUsername);
    setImage(storedImage);
  }, []);

  const handleImageChange = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setUploadError("Please choose an image file.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setUploadError("Image must be 2MB or smaller.");
      return;
    }
    setSelectedFile(file);
    setImagePreview(URL.createObjectURL(file));
    setUploadError("");
  };

  const handleImageSubmit = async () => {
    if (!selectedFile) return;
    try {
      setLoading(true);
      const adminId = localStorage.getItem("admin_id");
      const response = await updateAdmin(adminId, { file: selectedFile });
      const updatedImage = response.image || selectedFile.name;
      setImage(updatedImage);
      setSelectedFile(null);
      setImagePreview(null);
      localStorage.setItem("admin_image", updatedImage);
      window.dispatchEvent(new Event("admin-profile-updated"));
      showSnackbar("Profile image updated successfully.");
    } catch (error) {
      showSnackbar(error.message || "Unable to update profile image.", "error");
    } finally {
      setLoading(false);
    }
  };

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
              src={imagePreview || getImageUrl(image)}
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
        <Stack spacing={1.5} sx={{ mt: 3, maxWidth: 520 }}>
          <Typography variant="subtitle1" fontWeight="700">Profile image</Typography>
          {uploadError && <Alert severity="error">{uploadError}</Alert>}
          <DropZone
            isDragActive={isDragActive}
            onDragEnter={() => setIsDragActive(true)}
            onDragLeave={() => setIsDragActive(false)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              setIsDragActive(false);
              handleImageChange(event.dataTransfer.files?.[0]);
            }}
            onClick={() => document.getElementById("admin-profile-image-input")?.click()}
          >
            {imagePreview ? (
              <Box component="img" src={imagePreview} alt="Profile preview" sx={{ maxWidth: "100%", maxHeight: 100, objectFit: "contain" }} />
            ) : (
              <>
                <Typography fontWeight="700">Drag an image here</Typography>
                <Typography variant="body2" color="text.secondary">PNG, JPG, or WEBP up to 2MB</Typography>
              </>
            )}
            <input id="admin-profile-image-input" hidden type="file" accept="image/*" onChange={(event) => handleImageChange(event.target.files?.[0])} />
          </DropZone>
          <Button variant="contained" onClick={handleImageSubmit} disabled={!selectedFile || loading}>
            {loading ? "Uploading..." : "Save profile image"}
          </Button>
        </Stack>
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
