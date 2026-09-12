import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import {
  Box,
  Button,
  Container,
  Divider,
  IconButton,
  InputAdornment,
  Link,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography,
  Alert,
  Slide,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import {
  EmailRounded,
  LockRounded,
  Visibility,
  VisibilityOff,
  Person as PersonIcon,
} from "@mui/icons-material";
import Nexus from "../../assets/Nexus.png";
import { loginUser } from "../../api/buyer/buyerAuthenticationAPI";
import { hasValidToken, setToken } from "../../../utils/auth";

function SlideTransition(props) {
  return <Slide {...props} direction="up" />;
}

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  useEffect(() => {
    const buyerToken = localStorage.getItem("buyer_token");
    if (buyerToken && hasValidToken(buyerToken)) {
      navigate("/buyer/main", { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Enter" && username && password) {
        handleLogin();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [username, password]);

  const handleLogin = async () => {
    if (!username || !password) {
      showSnackbar("Please fill in all fields", "error");
      return;
    }

    try {
      const data = await loginUser({ username, password });
      showSnackbar("Login successful!", "success");

      // Store token and user data in localStorage
      setToken("buyer", data.token);
      localStorage.setItem("buyer_customer_id", data.customer_id);
      localStorage.setItem("buyer_username", data.username || "");
      localStorage.setItem("buyer_first_name", data.first_name);
      localStorage.setItem("buyer_last_name", data.last_name);
      localStorage.setItem("buyer_email", data.email);
      localStorage.setItem("buyer_phone_number", data.phone_number);
      localStorage.setItem("buyer_profile_image", data.profile_image || "");

      setTimeout(() => {
        navigate("/buyer/main", { replace: true });
      }, 1500);
    } catch (error) {
      showSnackbar(error.message || "Login failed", "error");
    }
  };

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
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 8 } }}>
      <Helmet titleTemplate="%s - ArtMatch">
        <title>Login</title>
      </Helmet>
      <Paper
        elevation={0}
        sx={{
          borderRadius: 4,
          overflow: "hidden",
          border: "1px solid",
          borderColor: "divider",
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1.05fr 0.95fr" },
          minHeight: 650,
        }}
      >
        <Box
          sx={{
            p: { xs: 4, md: 6 },
            bgcolor: "#af4f4f",
            color: "white",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 2,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Typography variant="h5" fontWeight={700}>
              Welcome back
            </Typography>
          </Box>
          <Typography variant="h3" fontWeight={700} sx={{ maxWidth: 360 }}>
            Discover curated art that fits your style.
          </Typography>
          <Typography
            variant="body1"
            sx={{ color: "rgba(255,255,255,0.9)", maxWidth: 360 }}
          >
            Log in to save favorites, follow artists, and check out your next
            piece.
          </Typography>
        </Box>

        <Box
          component="form"
          onSubmit={(e) => {
            e.preventDefault();
            handleLogin();
          }}
          sx={{
            p: { xs: 4, md: 6 },
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <Stack spacing={3}>
            <Box>
              <Typography variant="h4" fontWeight={700} sx={{ mb: 1 }}>
                Sign in
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Enter your email and password to continue.
              </Typography>
            </Box>

            <Box>
              <Typography
                variant="body1"
                sx={{
                  fontWeight: "600",
                  color: "#444",
                  mb: 0.75,
                  ml: 0.5,
                  fontSize: "0.95rem",
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
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon
                        sx={{ color: "#af4f4f", fontSize: "1.25rem" }}
                      />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            <Box>
              <Typography
                variant="body1"
                sx={{
                  fontWeight: "600",
                  color: "#444",
                  mb: 0.75,
                  ml: 0.5,
                  fontSize: "0.95rem",
                }}
              >
                Password
              </Typography>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Enter your password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockRounded
                        sx={{ color: "#af4f4f", fontSize: "1.25rem" }}
                      />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            <Button
              type="submit"
              variant="contained"
              size="large"
              sx={{
                py: 1.2,
                borderRadius: 2,
                bgcolor: "#af4f4f",
                color: "white",
                fontWeight: "600",
                "&:hover": { bgcolor: "#9a3f3f" },
              }}
            >
              Sign in
            </Button>

            <Divider>or</Divider>

            <Typography variant="body2" align="center">
              Dont have an account?{" "}
              <Link
                component={RouterLink}
                to="/buyer/register"
                underline="hover"
                sx={{ fontWeight: 700, color: "#af4f4f" }}
              >
                Register here
              </Link>
            </Typography>

            <Typography variant="body2" align="center">
              Enter as{" "}
              <Link
                component={RouterLink}
                to="/buyer/main"
                underline="hover"
                sx={{ fontWeight: 700, color: "#af4f4f" }}
              >
                Guest
              </Link>
            </Typography>
          </Stack>
        </Box>
      </Paper>

      {/* Snackbar Notification */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={closeSnackbar}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        TransitionComponent={SlideTransition}
      >
        <Alert
          onClose={closeSnackbar}
          severity={snackbarSeverity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
}
