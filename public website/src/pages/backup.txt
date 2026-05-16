import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Alert,
  Slide,
  TextField,
  Button,
  Typography,
  Paper,
  Box,
  InputAdornment,
  IconButton,
  Snackbar,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import {
  Visibility,
  VisibilityOff,
  Person as PersonIcon,
  Lock as LockIcon,
} from "@mui/icons-material";
import { registerUser } from "../api/authenticationAPI";
import BarangayIcon from "../assets/BarangayIcon.png";

// Slide Transition for Snackbar
function SlideTransition(props) {
  return <Slide {...props} direction="up" />;
}

const Register = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Handle Enter key register
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Enter" && !isLoading) {
        event.preventDefault();
        handleRegister();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [username, password, confirmPassword, isLoading]);

  // Snackbar handlers
  const showSnackbar = (message) => {
    setSnackbarMessage(message);
    setSnackbarOpen(true);
  };

  const closeSnackbar = (event, reason) => {
    if (reason === "clickaway") return;
    setSnackbarOpen(false);
  };

  const handleRegister = async () => {
    if (!username || !password || !confirmPassword) {
      showSnackbar("❌ Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
      showSnackbar("❌ Passwords do not match");
      return;
    }

    if (password.length < 6) {
      showSnackbar("❌ Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);
    try {
      const response = await registerUser({ username, password });

      console.log("Register response:", response);

      showSnackbar("✅ Registration Successful!");

      // Clear form
      setUsername("");
      setPassword("");
      setConfirmPassword("");

      setTimeout(() => {
        navigate("/");
      }, 1500);
    } catch (error) {
      console.error("Register error:", error);

      // Extract error message from different possible locations
      const errorMessage =
        error.response?.data?.message || error.message || "Registration failed";

      showSnackbar(`❌ ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleClickShowConfirmPassword = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        background: "linear-gradient(135deg, #466ABE 0%, #2d4a8e 100%)",
        overflow: "hidden",
      }}
    >
      {/* LEFT SIDE - REGISTER FORM */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: isSmallMobile ? 2 : isMobile ? 3 : 4,
          minHeight: "100vh",
          order: isMobile ? 1 : 0,
          backgroundColor: "white",
        }}
      >
        <Paper
          elevation={24}
          sx={{
            padding: isSmallMobile ? 3 : isMobile ? 4 : 5,
            borderRadius: "20px",
            width: "100%",
            maxWidth: "450px",
            background: "white",
            boxShadow: "0px 20px 60px rgba(0, 0, 0, 0.3)",
          }}
        >
          {/* Logo on Mobile */}
          {isMobile && (
            <Box sx={{ display: "flex", justifyContent: "center", mb: 3 }}>
              <img
                src={BarangayIcon}
                alt="Barangay Logo"
                style={{ height: "80px" }}
              />
            </Box>
          )}

          {/* Title */}
          <Typography
            variant="h4"
            sx={{
              fontWeight: "bold",
              mb: 1,
              textAlign: "center",
              color: "#333",
            }}
          >
            Create Account
          </Typography>

          <Typography
            variant="body2"
            sx={{
              textAlign: "center",
              color: "#666",
              mb: 4,
            }}
          >
            Join the barangay management community
          </Typography>

          {/* Username Field */}
          <TextField
            fullWidth
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            margin="normal"
            variant="outlined"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <PersonIcon sx={{ color: "#466ABE" }} />
                </InputAdornment>
              ),
            }}
            sx={{
              mb: 2.5,
              "& .MuiOutlinedInput-root": {
                borderRadius: "12px",
                "&:hover fieldset": {
                  borderColor: "#466ABE",
                },
              },
            }}
            disabled={isLoading}
          />

          {/* Password Field */}
          <TextField
            fullWidth
            label="Password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            margin="normal"
            variant="outlined"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockIcon sx={{ color: "#466ABE" }} />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={handleClickShowPassword}
                    edge="end"
                    disabled={isLoading}
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{
              mb: 2.5,
              "& .MuiOutlinedInput-root": {
                borderRadius: "12px",
                "&:hover fieldset": {
                  borderColor: "#466ABE",
                },
              },
            }}
            disabled={isLoading}
          />

          {/* Confirm Password Field */}
          <TextField
            fullWidth
            label="Confirm Password"
            type={showConfirmPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            margin="normal"
            variant="outlined"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockIcon sx={{ color: "#466ABE" }} />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={handleClickShowConfirmPassword}
                    edge="end"
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{
              mb: 3,
              "& .MuiOutlinedInput-root": {
                borderRadius: "12px",
                "&:hover fieldset": {
                  borderColor: "#466ABE",
                },
              },
            }}
            disabled={isLoading}
          />

          {/* Register Button */}
          <Button
            fullWidth
            variant="contained"
            size="large"
            onClick={handleRegister}
            disabled={isLoading}
            sx={{
              background: "linear-gradient(135deg, #466ABE 0%, #2d4a8e 100%)",
              color: "white",
              fontWeight: "600",
              padding: "12px 24px",
              borderRadius: "12px",
              mb: 2,
              fontSize: "1rem",
              transition: "all 0.3s ease",
              textTransform: "none",
              "&:hover": {
                boxShadow: "0px 10px 25px rgba(70, 106, 190, 0.4)",
                transform: "translateY(-2px)",
              },
              "&:disabled": {
                background: "#ccc",
              },
            }}
          >
            {isLoading ? "Creating Account..." : "Register"}
          </Button>

          {/* Divider */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              mb: 2,
              gap: 1,
            }}
          >
            <Box sx={{ flex: 1, height: "1px", background: "#ddd" }} />
            <Typography sx={{ color: "#999", fontSize: "0.85rem" }}>
              OR
            </Typography>
            <Box sx={{ flex: 1, height: "1px", background: "#ddd" }} />
          </Box>

          {/* Login Link */}
          <Box sx={{ textAlign: "center" }}>
            <Typography sx={{ color: "#666", fontSize: "0.95rem" }}>
              Already have an account?{" "}
              <Link
                to="/login"
                style={{
                  color: "#466ABE",
                  fontWeight: "600",
                  textDecoration: "none",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  e.target.style.textDecoration = "underline";
                }}
                onMouseLeave={(e) => {
                  e.target.style.textDecoration = "none";
                }}
              >
                Sign in here
              </Link>
            </Typography>
          </Box>

          {/* Footer Note */}
          <Typography
            sx={{
              textAlign: "center",
              fontSize: "0.75rem",
              color: "#999",
              mt: 3,
            }}
          >
            By registering, you agree to our terms of service
          </Typography>
        </Paper>
      </Box>

      {/* RIGHT SIDE - ICON ONLY (Hidden on mobile) */}
      {!isMobile && (
        <Box
          sx={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 4,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              backgroundColor: "white",
              borderRadius: "50%",
              width: 500,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <img
              src={BarangayIcon}
              alt="Barangay Logo"
              style={{ height: "500px", width: "auto" }}
            />
          </Box>
        </Box>
      )}

      {/* Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={closeSnackbar}
        TransitionComponent={SlideTransition}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={closeSnackbar}
          severity={snackbarMessage.includes("✅") ? "success" : "error"}
          sx={{ width: "100%", borderRadius: "12px", boxShadow: 2 }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Register;
