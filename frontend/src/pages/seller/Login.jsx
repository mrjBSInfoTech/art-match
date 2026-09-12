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
  Snackbar,
  Select,
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
import { loginUser } from "../../api/seller/sellerAuthenticationAPI";
import Nexus from "../../assets/Nexus.png";
import { hasValidToken, setToken } from "../../../utils/auth";

function SlideTransition(props) {
  return <Slide {...props} direction="up" />;
}

const Login = () => {
  const [studentNumber, setStudentNumber] = useState("");
  const [password, setPassword] = useState("");
  const [module, setModule] = useState("Student");
  const [showPassword, setShowPassword] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  useEffect(() => {
    const sellerToken = localStorage.getItem("seller_token");
    if (sellerToken && hasValidToken(sellerToken)) {
      navigate("/seller/dashboard", { replace: true });
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
  }, [studentNumber, password]);

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

  const handleModuleChange = (event) => {
    const selectedModule = event.target.value;
    setModule(selectedModule);

    if (selectedModule === "Student") {
      navigate("/seller/login");
    } else if (selectedModule === "Admin") {
      navigate("/admin/login");
    }
  };

  const handleLogin = async () => {
    if (!studentNumber || !password) {
      showSnackbar("Please fill in all fields", "error");
      return;
    }

    try {
      const data = await loginUser({ student_number: studentNumber, password });

      setToken("seller", data.token);

      localStorage.setItem("seller_student_id", data.student_id || "");
      localStorage.setItem("seller_student_number", data.student_number || "");
      localStorage.setItem("seller_first_name", data.first_name || "");
      localStorage.setItem("seller_middle_name", data.middle_name || "");
      localStorage.setItem("seller_last_name", data.last_name || "");
      localStorage.setItem("seller_email", data.email || "");
      localStorage.setItem("seller_phone_number", data.phone_number || "");
      localStorage.setItem("seller_address", data.address || "");
      localStorage.setItem("seller_birthdate", data.birthdate || "");
      localStorage.setItem("seller_cor", data.cor || "");
      localStorage.setItem("seller_year_level", data.year_level || "");
      localStorage.setItem("seller_course", data.course || "");
      localStorage.setItem(
        "seller_register_status",
        data.register_status || "",
      );
      localStorage.setItem(
        "seller_registered_date",
        data.registered_date || "",
      );
      localStorage.setItem("seller_approved_date", data.approved_date || "");
      localStorage.setItem("seller_profile_image", data.profile_image || "");

      showSnackbar("Login successful!", "success");
      navigate("/seller/dashboard", { replace: true });
    } catch (error) {
      showSnackbar(`Login failed: ${error.message}`, "error");
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
              <MenuItem value="Admin">Admin</MenuItem>
              <MenuItem value="Student">Student</MenuItem>
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
              Student Number
            </Typography>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Enter your student number"
              value={studentNumber}
              onChange={(e) => setStudentNumber(e.target.value)}
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

          <Divider />

          <Typography variant="body2" align="center">
            Don&apos;t have an account?{" "}
            <Link
              component={RouterLink}
              to="/seller/register"
              underline="hover"
              sx={{ fontWeight: 700 }}
            >
              Create one
            </Link>
          </Typography>
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
