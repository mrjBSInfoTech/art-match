import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Container,
  Divider,
  IconButton,
  InputAdornment,
  Link,
  MenuItem, 
  Paper,
  Select,
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
} from "@mui/icons-material";
import { loginUser } from "../../api/admin/adminAuthenticationAPI";
import Nexus from "../../assets/Nexus.png";
import { clearAuthData, hasValidToken, setToken } from "../../../utils/auth";

function SlideTransition(props) {
  return <Slide {...props} direction="up" />;
}

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [module, setModule] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  useEffect(() => {
    const adminToken = localStorage.getItem("admin_token");
    if (adminToken && hasValidToken(adminToken)) {
      navigate("/admin/dashboard", { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        handleLogin();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [username, password]);

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

  const handleLogin = async () => {
    if (!username || !password) {
      showSnackbar("Please fill in all fields", "error");
      return;
    }

    try {
      const data = await loginUser({ username: username, password: password });

      clearAuthData("admin");
      setToken("admin", data.token);

      localStorage.setItem("admin_token", data.token || "");
      localStorage.setItem("admin_username", data.username || "");
      localStorage.setItem("admin_first_name", data.first_name || "");
      localStorage.setItem("admin_last_name", data.last_name || "");
      localStorage.setItem("admin_email", data.email || "");

      showSnackbar("Login successful!", "success");
      navigate("/admin/dashboard", { replace: true });
    } catch (error) {
      showSnackbar(`Login failed: ${error.message}`, "error");
    }
  };

  const handleModuleChange = (event) => {
    const selectedModule = event.target.value;
    setModule(selectedModule);

    if (selectedModule === "Student") {
      navigate("/seller/login");
    } else if (selectedModule === "Admin") {
      navigate("/admin/login");
    }
  };

  return (
    <Container
      maxWidth={false}
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        padding: "20px",
        background: "#af4f4f",
        overflowY: "auto",
      }}
    >
      <Helmet titleTemplate="%s - ArtMatch">
        <title>Login</title>
      </Helmet>

      <Paper
        elevation={24}
        sx={{
          backgroundColor: "white",
          padding: isMobile ? "25px 20px" : "40px 35px",
          borderRadius: "20px",
          width: "100%",
          maxWidth: "450px",
          boxShadow: "0px 15px 40px rgba(0, 0, 0, 0.2)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            mb: 2,
          }}
        >
          <Box
            component="img"
            src={Nexus}
            alt="ArtMatch"
            sx={{ height: 50, width: "auto" }}
          />
        </Box>

        <Typography
          variant="h6"
          align="center"
          gutterBottom
          sx={{
            fontWeight: "600",
            color: "#333",
            mb: 3,
            fontSize: { xs: "1.2rem", sm: "1.4rem" },
          }}
        >
          Log In
        </Typography>

        <Stack spacing={2.5}>
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
              Module
            </Typography>
            <Select
              fullWidth
              variant="outlined"
              name="course"
              size="small"        
              value={module}
              onChange={handleModuleChange}
              sx={{
                borderRadius: "10px",
                backgroundColor: "#f8f9fa",
                fontSize: "0.95rem",
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#e0e0e0",
                },
                "&:hover .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#466ABE",
                },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#466ABE",
                  borderWidth: "2px",
                },
              }}
            >
              <MenuItem value="">Module</MenuItem>
              <MenuItem value="Admin">
                Admin
              </MenuItem>
              <MenuItem value="Student">
                Student
              </MenuItem>
            </Select>
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
                sx: {
                  borderRadius: "10px",
                  backgroundColor: "#f8f9fa",
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#e0e0e0",
                  },
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#466ABE",
                  },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#466ABE",
                    borderWidth: "2px",
                  },
                  fontSize: "0.95rem",
                },
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
              type={showPassword ? "text" : "password"}
              variant="outlined"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon sx={{ color: "#af4f4f", fontSize: "1.25rem" }} />
                  </InputAdornment>
                ),
                sx: {
                  borderRadius: "10px",
                  backgroundColor: "#f8f9fa",
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#e0e0e0",
                  },
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#af4f4f",
                  },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#af4f4f",
                    borderWidth: "2px",
                  },
                  fontSize: "0.95rem",
                },
              }}
            />
          </Box>

          <Button
            variant="contained"
            fullWidth
            onClick={handleLogin}
            sx={{
              height: "48px",
              fontWeight: "700",
              textTransform: "none",
              fontSize: "16px",
              backgroundColor: "#af4f4f",
              borderRadius: "10px",
              mt: 1.5,
              "&:hover": {
                backgroundColor: "#8a3d3d",
                transform: "translateY(-1px)",
                boxShadow: "0px 8px 15px rgba(175, 79, 79, 0.2)",
              },
              transition: "all 0.2s ease",
              boxShadow: "0px 4px 10px rgba(175, 79, 79, 0.15)",
            }}
          >
            Login
          </Button>
        </Stack>
      </Paper>
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
    </Container>
  );
};

export default Login;
