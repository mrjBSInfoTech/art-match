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
  Person as PersonIcon,
  Lock as LockIcon,
  Email as EmailIcon,
  Home as HomeIcon,
  Phone as PhoneIcon,
  School as SchoolIcon,
  CloudUpload as CloudUploadIcon,
  Visibility,
  VisibilityOff,
} from "@mui/icons-material";
import Nexus from "../../assets/Nexus.png";
import { registerUser } from "../../api/seller/sellerAuthenticationAPI";
import { hasValidToken } from "../../../utils/auth";

function SlideTransition(props) {
  return <Slide {...props} direction="up" />;
}

export default function Register() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");
  const [form, setForm] = useState({
    first_name: "",
    middle_name: "",
    last_name: "",
    birthdate: "",
    email: "",
    phone_number: "",
    address: "",
    student_number: "",
    year_level: "",
    course: "",
    password: "",
    confirmPassword: "",
  });
  const [corImage, setCorImage] = useState(null);
  const [corImagePreview, setCorImagePreview] = useState(null);

  useEffect(() => {
    const sellerToken = localStorage.getItem("seller_token");
    if (sellerToken && hasValidToken(sellerToken)) {
      navigate("/seller/dashboard", { replace: true });
    }
  }, [navigate]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCORChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        showSnackbar("Please upload an image file", "error");
        return;
      }
      setCorImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCorImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
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

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (
      !form.first_name ||
      !form.middle_name ||
      !form.last_name ||
      !form.birthdate ||
      !form.email ||
      !form.phone_number ||
      !form.address ||
      !form.student_number ||
      !form.year_level ||
      !form.course ||
      !form.password ||
      !form.confirmPassword
    ) {
      showSnackbar("Please fill in all fields.", "error");
      return;
    }

    if (form.password !== form.confirmPassword) {
      showSnackbar("Passwords do not match.", "error");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("first_name", form.first_name);
      formData.append("middle_name", form.middle_name);
      formData.append("last_name", form.last_name);
      formData.append("birthdate", form.birthdate);
      formData.append("email", form.email);
      formData.append("phone_number", form.phone_number);
      formData.append("address", form.address);
      formData.append("student_number", form.student_number);
      if (corImage) {
        formData.append("cor", corImage);
      }
      formData.append("year_level", form.year_level);
      formData.append("course", form.course);
      formData.append("password", form.password);

      setLoading(true);
      await registerUser(formData);

      showSnackbar("Account created successfully.", "success");
      setTimeout(() => navigate("/seller/login", { replace: true }), 3000);
    } catch (error) {
      showSnackbar(error.message || "Registration failed.", "error");
    } finally {
      setLoading(false);
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
        <title>Register</title>
      </Helmet>

      <Paper
        elevation={24}
        sx={{
          backgroundColor: "white",
          padding: isMobile ? "25px 20px" : "40px 35px",
          borderRadius: "20px",
          width: "100%",
          maxWidth: "500px",
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
          Register
        </Typography>

        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={2.5}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <Box sx={{ flex: 1 }}>
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
                  value={form.first_name}
                  onChange={handleChange}
                  size="small"
                  required
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
              <Box sx={{ flex: 1 }}>
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
                  Middle Name
                </Typography>
                <TextField
                  fullWidth
                  variant="outlined"
                  placeholder="Enter your middle name"
                  name="middle_name"
                  value={form.middle_name}
                  onChange={handleChange}
                  size="small"
                  required
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
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <Box sx={{ flex: 1 }}>
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
                  value={form.last_name}
                  onChange={handleChange}
                  size="small"
                  required
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
              <Box sx={{ flex: 1 }}>
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
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  size="small"
                  required
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailIcon
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
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <Box sx={{ flex: 1 }}>
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
                  value={form.phone_number}
                  onChange={handleChange}
                  size="small"
                  required
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PhoneIcon
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
              <Box sx={{ flex: 1 }}>
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
                  Birthdate
                </Typography>
                <TextField
                  fullWidth
                  type="date"
                  variant="outlined"
                  name="birthdate"
                  value={form.birthdate}
                  onChange={handleChange}
                  size="small"
                  required
                  InputLabelProps={{ shrink: true }}
                  sx={{
                    "& .MuiOutlinedInput-input": {
                      borderRadius: "10px",
                    },
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
                />
              </Box>
            </Stack>
            <Box sx={{ flex: 1 }}>
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
                Address
              </Typography>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Enter your address"
                name="address"
                value={form.address}
                onChange={handleChange}
                size="small"
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <HomeIcon
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
            <Box sx={{ flex: 1 }}>
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
                name="student_number"
                value={form.student_number}
                onChange={handleChange}
                size="small"
                required
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
            <Box sx={{ flex: 1 }}>
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
                Year Level
              </Typography>
              <Select
                fullWidth
                variant="outlined"
                name="year_level"
                value={form.year_level}
                onChange={handleChange}
                size="small"
                required
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
                <MenuItem value="">Select a year level</MenuItem>
                <MenuItem value="First Year">First Year</MenuItem>
                <MenuItem value="Second Year">Second Year</MenuItem>
                <MenuItem value="Third Year">Third Year</MenuItem>
                <MenuItem value="Fourth Year">Fourth Year</MenuItem>
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
                Course
              </Typography>
              <Select
                fullWidth
                variant="outlined"
                name="course"
                value={form.course}
                onChange={handleChange}
                size="small"
                required
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
                <MenuItem value="">Select a course</MenuItem>
                <MenuItem value="Bachelor of Science in Architecture">
                  Bachelor of Science in Architecture
                </MenuItem>
                <MenuItem value="Bachelor of Science in Fine Arts">
                  Bachelor of Science in Fine Arts
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
                {/* COR is optional - still in development */}
                Certificate of Registration (COR)
              </Typography>
              <Box
                sx={{
                  border: "2px dashed #e0e0e0",
                  borderRadius: "10px",
                  p: 2,
                  textAlign: "center",
                  backgroundColor: "#f8f9fa",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    borderColor: "#466ABE",
                    backgroundColor: "#f0f4ff",
                  },
                }}
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCORChange}
                  style={{ display: "none" }}
                  id="cor-file-input"
                />
                <label
                  htmlFor="cor-file-input"
                  style={{ cursor: "pointer", width: "100%", display: "block" }}
                >
                  <CloudUploadIcon
                    sx={{ fontSize: "3rem", color: "#af4f4f", mb: 1 }}
                  />
                  <Typography variant="body2" sx={{ color: "#666" }}>
                    Click to upload COR image
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#999" }}>
                    PNG, JPG up to 2MB
                  </Typography>
                </label>
              </Box>
              {corImagePreview && (
                <Box
                  sx={{
                    mt: 2,
                    border: "1px solid #e0e0e0",
                    borderRadius: "10px",
                    overflow: "hidden",
                    backgroundColor: "#f9f9f9",
                  }}
                >
                  <Box
                    component="img"
                    src={corImagePreview}
                    alt="COR Preview"
                    sx={{
                      width: "100%",
                      maxHeight: "300px",
                      objectFit: "contain",
                      borderRadius: "8px",
                    }}
                  />
                </Box>
              )}
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
                name="password"
                value={form.password}
                onChange={handleChange}
                size="small"
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon
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
                type={showPassword ? "text" : "password"}
                variant="outlined"
                placeholder="Confirm your password"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                size="small"
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon
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
              type="submit"
              variant="contained"
              fullWidth
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
              {loading ? "Registering..." : "Register"}
            </Button>

            <Divider />

            <Typography variant="body2" align="center">
              Already have an account?{" "}
              <Link
                component={RouterLink}
                to="/seller/login"
                underline="hover"
                sx={{ fontWeight: 700 }}
              >
                Sign in
              </Link>
            </Typography>
          </Stack>
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
}
