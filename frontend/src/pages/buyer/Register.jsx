import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Container,
  Divider,
  IconButton,
  InputAdornment,
  Link,
  Paper,
  Snackbar,
  Slide,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  Lock as LockIcon,
  Person as PersonIcon,
  Visibility,
  VisibilityOff,
  Email as EmailIcon,
  Phone as LocalPhoneIcon,
} from "@mui/icons-material";
import { registerUser } from "../../api/buyer/buyerAuthenticationAPI";
import Nexus from "../../assets/Nexus.png";
import { hasValidToken } from "../../../utils/auth";

function SlideTransition(props) {
  return <Slide {...props} direction="up" />;
}

const Register = () => {
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

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
  }, [
    username,
    firstName,
    lastName,
    email,
    phoneNumber,
    password,
    confirmPassword,
    isLoading,
  ]);

  const handleRegister = async () => {
    if (
      !username ||
      !firstName ||
      !lastName ||
      !email ||
      !phoneNumber ||
      !password ||
      !confirmPassword
    ) {
      showSnackbar("Please fill in all fields", "error");
      return;
    }

    if (password !== confirmPassword) {
      showSnackbar("Passwords do not match", "error");
      return;
    }

    if (password.length < 6) {
      showSnackbar("Password must be at least 6 characters", "error");
      return;
    }

    setIsLoading(true);
    try {
      const response = await registerUser({
        username,
        first_name: firstName,
        last_name: lastName,
        email,
        phone_number: phoneNumber,
        password,
      });
      console.log("Register response:", response);

      showSnackbar("Registration Successful!", "success");

      // Clear form
      setUsername("");
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhoneNumber("");
      setPassword("");
      setConfirmPassword("");

      setTimeout(() => {
        navigate("/buyer/login", { replace: true });
      }, 1500);
    } catch (error) {
      console.error("Register error:", error);

      // Extract error message from different possible locations
      const errorMessage =
        error.response?.data?.message || error.message || "Registration failed";

      showSnackbar(`${errorMessage}`, "error");
    } finally {
      setIsLoading(false);
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
        <title>Register</title>
      </Helmet>
      <Paper
        elevation={0}
        sx={{
          borderRadius: 4,
          overflow: "hidden",
          border: "1px solid",
          borderColor: "divider",
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "0.95fr 1.05fr" },
          minHeight: 680,
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
          <Typography variant="h5" fontWeight={700}>
            Join as a Buyer
          </Typography>
          <Typography variant="h3" fontWeight={700} sx={{ maxWidth: 360 }}>
            Discover and collect amazing art
          </Typography>
          <Typography
            variant="body1"
            sx={{ color: "rgba(255,255,255,0.9)", maxWidth: 360 }}
          >
            Join our community of art enthusiasts and start building your
            collection today.
          </Typography>
        </Box>

        <Box
          sx={{
            p: { xs: 4, md: 6 },
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            overflowY: "auto",
          }}
        >
          <Stack spacing={2.5}>
            <Box>
              <Typography variant="h4" fontWeight={700} sx={{ mb: 1 }}>
                Create your account
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Fill in your details to get started
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
                name="username"
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
                First Name
              </Typography>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Enter your first name"
                name="first_name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
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
                Last Name
              </Typography>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Enter your last name"
                name="last_name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
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
                Email
              </Typography>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Enter your email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon
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
                Phone Number
              </Typography>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Enter your phone number"
                name="phone_number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LocalPhoneIcon
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
                placeholder="Create a password"
                type={showPassword ? "text" : "password"}
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon
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
                Confirm Password
              </Typography>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Confirm your password"
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon
                        sx={{ color: "#af4f4f", fontSize: "1.25rem" }}
                      />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            <Button
              onClick={handleRegister}
              variant="contained"
              size="large"
              fullWidth
              sx={{
                py: 1.2,
                borderRadius: 2,
                bgcolor: "#af4f4f",
                color: "white",
                fontWeight: "600",
                mt: 1,
                "&:hover": { bgcolor: "#9a3f3f" },
              }}
            >
              Create Account
            </Button>

            <Divider>or</Divider>

            <Typography variant="body2" align="center">
              Already have an account?{" "}
              <Link
                component={RouterLink}
                to="/buyer/login"
                underline="hover"
                sx={{ fontWeight: 700, color: "#af4f4f" }}
              >
                Sign in here
              </Link>
            </Typography>
          </Stack>
        </Box>
      </Paper>

      {/* Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={closeSnackbar}
        TransitionComponent={SlideTransition}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
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
};

export default Register;
