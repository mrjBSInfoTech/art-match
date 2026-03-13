import { useState, useEffect } from "react";
import axios from "axios";
import {
  Alert,
  Slide,
  TextField,
  Button,
  Container,
  Typography,
  Paper,
  Box,
  InputAdornment,
  IconButton,
  Link,
  Snackbar,
  useTheme,
  useMediaQuery,
  MenuItem,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import {
  WaterDrop as WaterDropIcon,
  Visibility,
  VisibilityOff,
  Person as PersonIcon,
  Lock as LockIcon,
  Badge as BadgeIcon,
} from "@mui/icons-material";
import { registerUser } from "../api/authenticationAPI";
import SaleSyncLogo from "../assets/SaleSync_Logo_Design.png";

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
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Handle Enter key register
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        handleRegister();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [username, password, confirmPassword]);

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
    }
  };

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleClickShowConfirmPassword = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  return (
    <Container
      maxWidth={false}
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        padding: "20px",
        background:
          "linear-gradient(135deg, #16C47F 0%, #FFD65A, #FF9D23 , #F93827 100%)",
        overflow: "hidden",
      }}
    >
      <Paper
        elevation={24}
        style={{
          backgroundColor: "white",
          padding: isMobile ? "25px 20px" : "40px 35px", // Reduced padding
          borderRadius: "20px", // Slightly smaller radius
          width: "100%",
          maxWidth: "450px", // Reduced max width
          boxShadow: "0px 15px 40px rgba(0, 0, 0, 0.2)", // Reduced shadow
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Logo */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            mb: 2, // Reduced margin
          }}
        >
          <Box
            component="img"
            src={SaleSyncLogo}
            alt="SaleSync Logo"
            sx={{
              height: 50,
              width: "auto",
            }}
          />
        </Box>

        {/* Subtitle */}
        <Typography
          variant="subtitle1"
          align="center"
          gutterBottom
          sx={{
            color: "#666",
            mb: 4, // Reduced margin
            fontSize: { xs: "0.85rem", sm: "1rem" }, // Smaller font
          }}
        >
          Product Management System
        </Typography>

        {/* Register Title */}
        <Typography
          variant="h6" // Changed from h5 to h6
          align="center"
          gutterBottom
          sx={{
            fontWeight: "600",
            color: "#333",
            mb: 3, // Reduced margin
            fontSize: { xs: "1.2rem", sm: "1.4rem" }, // Smaller font
          }}
        >
          Create an Account
        </Typography>

        <Box
          component="form"
          noValidate
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2.5, // Reduced gap
          }}
        >
          {/* Username Field */}
          <Box>
            <Typography
              variant="body1"
              sx={{
                fontWeight: "600",
                color: "#444",
                mb: 0.75, // Reduced margin
                ml: 0.5,
                fontSize: "0.95rem", // Smaller font
              }}
            >
              Username
            </Typography>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              size="small" // Added small size
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonIcon
                      sx={{ color: "#FFD65A", fontSize: "1.25rem" }}
                    />{" "}
                    {/* Smaller icon */}
                  </InputAdornment>
                ),
                sx: {
                  borderRadius: "10px", // Smaller radius
                  backgroundColor: "#f8f9fa",
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#e0e0e0",
                  },
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#FFD65A",
                  },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#FFD65A",
                    borderWidth: "2px",
                  },
                  fontSize: "0.95rem", // Smaller text
                },
              }}
            />
          </Box>

          {/* Password Field */}
          <Box>
            <Typography
              variant="body1"
              sx={{
                fontWeight: "600",
                color: "#444",
                mb: 0.75, // Reduced margin
                ml: 0.5,
                fontSize: "0.95rem", // Smaller font
              }}
            >
              Password
            </Typography>
            <TextField
              fullWidth
              type={showPassword ? "text" : "password"}
              variant="outlined"
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              size="small" // Added small size
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon sx={{ color: "#FFD65A", fontSize: "1.25rem" }} />{" "}
                    {/* Smaller icon */}
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={handleClickShowPassword}
                      edge="end"
                      sx={{ color: "#666", padding: "6px" }} // Smaller padding
                      size="small"
                    >
                      {showPassword ? (
                        <VisibilityOff fontSize="small" />
                      ) : (
                        <Visibility fontSize="small" />
                      )}{" "}
                      {/* Smaller icons */}
                    </IconButton>
                  </InputAdornment>
                ),
                sx: {
                  borderRadius: "10px", // Smaller radius
                  backgroundColor: "#f8f9fa",
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#e0e0e0",
                  },
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#FFD65A",
                  },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#FFD65A",
                    borderWidth: "2px",
                  },
                  fontSize: "0.95rem", // Smaller text
                },
              }}
            />
          </Box>

          {/* Confirm Password Field */}
          <Box>
            <Typography
              variant="body1"
              sx={{
                fontWeight: "600",
                color: "#444",
                mb: 0.75, // Reduced margin
                ml: 0.5,
                fontSize: "0.95rem", // Smaller font
              }}
            >
              Confirm Password
            </Typography>
            <TextField
              fullWidth
              type={showConfirmPassword ? "text" : "password"}
              variant="outlined"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              size="small" // Added small size
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon sx={{ color: "#FFD65A", fontSize: "1.25rem" }} />{" "}
                    {/* Smaller icon */}
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={handleClickShowConfirmPassword}
                      edge="end"
                      sx={{ color: "#666", padding: "6px" }} // Smaller padding
                      size="small"
                    >
                      {showConfirmPassword ? (
                        <VisibilityOff fontSize="small" />
                      ) : (
                        <Visibility fontSize="small" />
                      )}{" "}
                      {/* Smaller icons */}
                    </IconButton>
                  </InputAdornment>
                ),
                sx: {
                  borderRadius: "10px", // Smaller radius
                  backgroundColor: "#f8f9fa",
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#e0e0e0",
                  },
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#FFD65A",
                  },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#FFD65A",
                    borderWidth: "2px",
                  },
                  fontSize: "0.95rem", // Smaller text
                },
              }}
            />
          </Box>

          {/* Register Button */}
          <Button
            variant="contained"
            fullWidth
            onClick={handleRegister}
            sx={{
              height: "48px", // Reduced height
              fontWeight: "700",
              textTransform: "none",
              fontSize: "16px", // Smaller font
              backgroundColor: "#FFD65A",
              borderRadius: "10px", // Smaller radius
              mt: 1.5, // Reduced margin
              "&:hover": {
                backgroundColor: "#d3b14cff",
                transform: "translateY(-1px)", // Reduced lift
                boxShadow: "0px 8px 15px rgba(94, 96, 206, 0.2)", // Reduced shadow
              },
              transition: "all 0.2s ease",
              boxShadow: "0px 4px 10px rgba(94, 96, 206, 0.15)", // Reduced shadow
            }}
          >
            Register
          </Button>

          {/* Login Link */}
          <Typography
            variant="body2"
            align="center"
            sx={{
              mt: 2.5, // Reduced margin
              color: "#666",
              fontSize: "0.9rem", // Smaller font
            }}
          >
            Already have an account?{" "}
            <Link
              component="button"
              variant="body2"
              onClick={() => navigate("/")}
              sx={{
                fontWeight: "600",
                color: "#FFD65A",
                textDecoration: "none",
                fontSize: "0.9rem", // Smaller font
                "&:hover": {
                  textDecoration: "underline",
                },
              }}
            >
              Login
            </Link>
          </Typography>
        </Box>
      </Paper>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        TransitionComponent={SlideTransition}
      >
        <Alert
          onClose={closeSnackbar}
          severity={snackbarMessage.includes("❌") ? "error" : "success"}
          sx={{ width: "100%" }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Register;
