import { useState, useEffect } from "react";
import axios from "axios";
import {
  TextField,
  Button,
  Container,
  Typography,
  Paper,
  Box,
  Snackbar,
  Alert,
  Slide,
  InputAdornment,
  IconButton,
  Link,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import {
  Visibility,
  VisibilityOff,
  Person as PersonIcon,
  Lock as LockIcon,
} from "@mui/icons-material";
import { loginUser } from "../api/authenticationAPI";
import SaleSyncLogo from "../assets/SaleSync_Logo_Design.png";

// Slide Transition for Snackbar
function SlideTransition(props) {
  return <Slide {...props} direction="up" />;
}

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Check if user is already logged in
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      // User is already logged in, redirect to dashboard
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  // Handle Enter key login
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        handleLogin();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [username, password]);

  // Snackbar handlers
  const showSnackbar = (message) => {
    setSnackbarMessage(message);
    setSnackbarOpen(true);
  };

  const closeSnackbar = (event, reason) => {
    if (reason === "clickaway") return;
    setSnackbarOpen(false);
  };

  const handleLogin = async () => {
    if (!username || !password) {
      showSnackbar("❌ Please fill in all fields");
      return;
    }

    try {
      const data = await loginUser({ username, password });

      localStorage.setItem("token", data.token);
      localStorage.setItem("username", data.username);

      showSnackbar("✅ Login successful!");

      navigate("/dashboard");
    } catch (error) {
      showSnackbar(`❌ Login failed: ${error.message}`);
    }
  };

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
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
        overflowY: "auto",
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

        {/* Login Title */}
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
          Log In
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
              placeholder="Enter your password"
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

          {/* Login Button */}
          <Button
            variant="contained"
            fullWidth
            onClick={handleLogin}
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
            Login
          </Button>

          {/* Sign Up Link */}
          <Typography
            variant="body2"
            align="center"
            sx={{
              mt: 2.5, // Reduced margin
              color: "#666",
              fontSize: "0.9rem", // Smaller font
            }}
          >
            Don't have an account?{" "}
            <Link
              component="button"
              variant="body2"
              onClick={() => navigate("/register")}
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
              Sign Up
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

export default Login;
