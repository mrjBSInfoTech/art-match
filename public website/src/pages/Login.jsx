import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Box,
  Button,
  Container,
  TextField,
  Typography,
  Paper,
  Snackbar,
  Alert,
  Slide,
  InputAdornment,
  IconButton,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import {
  Visibility,
  VisibilityOff,
  Person as PersonIcon,
  Lock as LockIcon,
} from "@mui/icons-material";
import { loginUser } from "../api/authenticationAPI";
import BarangayIcon from "../assets/BarangayIcon.png";

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
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const theme = useTheme();
  
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down("sm"));

  {
    /*Check if user is already logged in
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      navigate("/", { replace: true });
    }
  }, [navigate]);
*/
  }
  // Handle Enter key login
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Enter" && !isLoading) {
        event.preventDefault();
        handleLogin();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [username, password, isLoading]);

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

    setIsLoading(true);
    try {
      const data = await loginUser({ username, password });

      localStorage.setItem("token", data.token);
      localStorage.setItem("username", data.username);
      localStorage.setItem("account_type", data.account_type);
      localStorage.setItem("first_name", data.first_name);
      localStorage.setItem("last_name", data.last_name);
      localStorage.setItem("image", data.image);

      showSnackbar("✅ Login successful!");

      // Redirect based on account type
      if (data.account_type === "admin" || data.account_type === "staff") {
        // Redirect to admin dashboard
        window.location.href = "http://localhost:5173/dashboard";
      } else {
        navigate("/");
      }
    } catch (error) {
      showSnackbar(`❌ Login failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
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
      {/* LEFT SIDE - ICON ONLY (Hidden on mobile) */}
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
            //boxShadow: "10px 0px 50px rgba(0, 0, 0, 0.5)",
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

      {/* RIGHT SIDE - LOGIN FORM */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: isSmallMobile ? 2 : isMobile ? 3 : 4,
          minHeight: "100vh",
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
            Sign In
          </Typography>

          <Typography
            variant="body2"
            sx={{
              textAlign: "center",
              color: "#666",
              mb: 4,
            }}
          >
            Enter your credentials to access your account
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

          {/* Login Button */}
          <Button
            fullWidth
            variant="contained"
            size="large"
            onClick={handleLogin}
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
            {isLoading ? "Signing in..." : "Sign In"}
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

          {/* Register Link */}
          <Box sx={{ textAlign: "center" }}>
            <Typography sx={{ color: "#666", fontSize: "0.95rem" }}>
              Don't have an account?{" "}
              <Link
                to="/register"
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
                Register here
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
            This is a secure login portal. Keep your credentials private.
          </Typography>
        </Paper>
      </Box>

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

export default Login;
