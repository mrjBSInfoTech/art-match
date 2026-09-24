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
  Slide,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  EmailRounded,
  LockRounded,
  Visibility,
  VisibilityOff,
} from "@mui/icons-material";
import { FaFacebookF, FaGoogle } from "react-icons/fa6";
import Nexus from "../../assets/Nexus.png";
import { loginUser } from "../../api/buyer/buyerAuthenticationAPI";
import { hasValidToken, setToken } from "../../../utils/auth";

function SlideTransition(props) {
  return <Slide {...props} direction="up" />;
}

export default function Login() {
  const [username, setUsername] = useState("student@cafa.edu.cn");
  const [password, setPassword] = useState("********");
  const [showPassword, setShowPassword] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");
  const navigate = useNavigate();

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

  const handleSocialLogin = (provider) => {
    showSnackbar(`${provider} login is not configured yet.`, "error");
  };

  const closeSnackbar = (event, reason) => {
    if (reason === "clickaway") return;
    setSnackbarOpen(false);
  };

  return (
    <Container
      maxWidth={false}
      disableGutters
      sx={{
        minHeight: "100vh",
        background: "#f2f1ef",
        px: { xs: 2, md: 4 },
        py: { xs: 2, md: 3 },
      }}
    >
      <Helmet titleTemplate="%s - ArtMatch">
        <title>Login</title>
      </Helmet>

      <Box
        sx={{
          maxWidth: 1360,
          minHeight: "calc(100vh - 40px)",
          mx: "auto",
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1.08fr 0.92fr" },
          background: "#f2f1ef",
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            px: { xs: 2.5, md: 4 },
            pt: { xs: 2, md: 3 },
            pb: { xs: 2.5, md: 3 },
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.1 }}>
            <Box component="img" src={Nexus} alt="Nexus logo" sx={{ width: 26, height: 26 }} />
            <Typography
              sx={{
                fontSize: "1.05rem",
                fontWeight: 800,
                letterSpacing: 0.6,
                color: "#d43e3e",
                textTransform: "uppercase",
              }}
            >
              Red Nexus
            </Typography>
          </Box>

          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              pt: { xs: 4, md: 2 },
              pb: { xs: 2, md: 1 },
            }}
          >
            <Box
              sx={{
                width: { xs: "100%", sm: 430, md: 420 },
                background: "#f7f7f5",
                borderRadius: 2.5,
                boxShadow: "0 12px 24px rgba(0,0,0,0.08)",
                border: "1px solid rgba(0,0,0,0.06)",
                overflow: "hidden",
              }}
            >
              <Box
                component="img"
                src="https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=900&q=80"
                alt="Art card"
                sx={{
                  display: "block",
                  width: "100%",
                  height: { xs: 280, sm: 310 },
                  objectFit: "cover",
                }}
              />

              <Box sx={{ px: 2.2, py: 1.7, display: "flex", alignItems: "center", gap: 1.8 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography
                    sx={{
                      fontSize: "1.05rem",
                      fontWeight: 700,
                      color: "#232323",
                      lineHeight: 1.2,
                    }}
                  >
                    Reborn Petals
                  </Typography>
                  <Typography
                    sx={{
                      mt: 0.3,
                      fontSize: "0.82rem",
                      color: "#6c6c6c",
                      fontWeight: 500,
                    }}
                  >
                    by Wang Yue (Oil Painting Dept.)
                  </Typography>
                </Box>

                <Box sx={{ flex: 0.8 }}>
                  <Typography
                    sx={{
                      fontSize: "1.05rem",
                      fontWeight: 700,
                      color: "#232323",
                      textAlign: "right",
                      lineHeight: 1.2,
                    }}
                  >
                    Structured Silence
                  </Typography>
                  <Typography
                    sx={{
                      mt: 0.3,
                      fontSize: "0.82rem",
                      color: "#6c6c6c",
                      textAlign: "right",
                      fontWeight: 500,
                    }}
                  >
                    by Zhou Jin (Sculpture Dept.)
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>

          <Typography
            sx={{
              fontSize: "0.9rem",
              color: "#6a6865",
              fontWeight: 500,
              px: { xs: 1, md: 0 },
            }}
          >
            Central Academy of Fine Arts (CAFA)
          </Typography>
        </Box>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            px: { xs: 2.5, md: 5 },
            py: { xs: 3, md: 4 },
          }}
        >
          <Box sx={{ width: "100%", maxWidth: 500, pt: { md: 2 } }}>
            <Typography
              align="center"
              sx={{
                fontSize: { xs: "2.2rem", md: "3.2rem" },
                fontWeight: 700,
                color: "#222222",
                letterSpacing: "-0.06em",
                mb: 1.5,
              }}
            >
              Sign In
            </Typography>

            <Typography
              align="center"
              sx={{
                fontSize: "0.95rem",
                color: "#6d6d6d",
                mb: 3,
              }}
            >
              Welcome back to Red Nexus. Please sign in to your account.
            </Typography>

            <Box
              component="form"
              onSubmit={(e) => {
                e.preventDefault();
                handleLogin();
              }}
            >
              <Stack spacing={2.2}>
                <Box>
                  <Typography
                    sx={{
                      fontSize: "0.74rem",
                      letterSpacing: "0.08em",
                      fontWeight: 700,
                      color: "#4b4b4b",
                      textTransform: "uppercase",
                      mb: 1,
                    }}
                  >
                    Email Address
                  </Typography>
                  <TextField
                    fullWidth
                    variant="outlined"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    size="small"
                    placeholder="student@cafa.edu.cn"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <EmailRounded sx={{ color: "#b7b5b1", fontSize: "1.15rem" }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 1.5,
                        background: "#f4f4f4",
                        color:"black",
                        height: 52,
                        "& fieldset": { borderColor: "rgba(0,0,0,0.14)" },
                        "&:hover fieldset": { borderColor: "rgba(0,0,0,0.2)" },
                        "&.Mui-focused fieldset": { borderColor: "#d83c3c" },
                      },
                    }}
                  />
                </Box>

                <Box>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      mb: 1,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: "0.74rem",
                        letterSpacing: "0.08em",
                        fontWeight: 700,
                        color: "#4b4b4b",
                        textTransform: "uppercase",
                      }}
                    >
                      Password
                    </Typography>
                    <Link
                      component={RouterLink}
                      to="/buyer/forgot-password"
                      underline="hover"
                      sx={{
                        fontSize: "0.76rem",
                        color: "#d63d3d",
                        fontWeight: 600,
                      }}
                    >
                      Forgot Password?
                    </Link>
                  </Box>

                  <TextField
                    fullWidth
                    variant="outlined"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    size="small"
                    placeholder="••••••••••••"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockRounded sx={{ color: "#b7b5b1", fontSize: "1.15rem" }} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label="toggle password visibility"
                            onClick={() => setShowPassword((prev) => !prev)}
                            edge="end"
                            size="small"
                            sx={{ color: "#6d6d6d" }}
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 1.5,
                        background: "#f4f4f4",
                        color:"black",
                        height: 52,
                        "& fieldset": { borderColor: "rgba(0,0,0,0.14)" },
                        "&:hover fieldset": { borderColor: "rgba(0,0,0,0.2)" },
                        "&.Mui-focused fieldset": { borderColor: "#d83c3c" },
                      },
                    }}
                  />
                </Box>

                <Button
                  type="submit"
                  variant="contained"
                  sx={{
                    height: 52,
                    borderRadius: 2,
                    bgcolor: "#e94848",
                    color: "#fff",
                    textTransform: "none",
                    fontSize: "1.06rem",
                    fontWeight: 700,
                    boxShadow: "none",
                    "&:hover": { bgcolor: "#d93b3b" },
                  }}
                >
                  Sign In
                </Button>
              </Stack>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", my: 3 }}>
              <Divider sx={{ flex: 1, borderColor: "rgba(0,0,0,0.18)" }} />
              <Typography
                sx={{
                  px: 2,
                  fontSize: "0.72rem",
                  color: "#6d6d6d",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                }}
              >
                Or continue with
              </Typography>
              <Divider sx={{ flex: 1, borderColor: "rgba(0,0,0,0.18)" }} />
            </Box>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.4}>
              <Button
                type="button"
                fullWidth
                variant="outlined"
                onClick={() => handleSocialLogin("Google")}
                startIcon={<FaGoogle />}
                sx={{
                  height: 48,
                  borderRadius: 1.6,
                  borderColor: "rgba(0,0,0,0.18)",
                  color: "#222",
                  background: "#fff",
                  fontWeight: 600,
                  textTransform: "none",
                  "&:hover": { borderColor: "rgba(0,0,0,0.4)", background: "#fff" },
                }}
              >
                Google
              </Button>
              <Button
                type="button"
                fullWidth
                variant="outlined"
                onClick={() => handleSocialLogin("Facebook")}
                startIcon={<FaFacebookF />}
                sx={{
                  height: 48,
                  borderRadius: 1.6,
                  borderColor: "rgba(0,0,0,0.18)",
                  color: "#222",
                  background: "#fff",
                  fontWeight: 600,
                  textTransform: "none",
                  "&:hover": { borderColor: "rgba(0,0,0,0.4)", background: "#fff" },
                }}
              >
                Facebook
              </Button>
            </Stack>

            <Typography
              align="center"
              sx={{
                mt: 3,
                fontSize: "0.95rem",
                color: "#4b4b4b",
              }}
            >
              New here?{" "}
              <Link
                component={RouterLink}
                to="/buyer/register"
                underline="hover"
                sx={{ color: "#dc3b38", fontWeight: 700 }}
              >
                Create an account (Register)
              </Link>
            </Typography>

            <Typography
              align="center"
              sx={{
                mt: 3,
                fontSize: "0.95rem",
                color: "#4b4b4b",
              }}
            >
              Or{" "}
              <Link
                component={RouterLink}
                to="/buyer/main"
                underline="hover"
                sx={{ color: "#dc3b38", fontWeight: 700 }}
              >
                continue as a guest
              </Link>
            </Typography>

            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                gap: 2,
                mt: 4,
                fontSize: "0.82rem",
                color: "#7a7a7a",
                flexWrap: "wrap",
              }}
            >
              <Link href="#" underline="hover" sx={{ color: "#7a7a7a" }}>
                Terms of Service
              </Link>
              <Link href="#" underline="hover" sx={{ color: "#7a7a7a" }}>
                Privacy Policy
              </Link>
              <Typography sx={{ color: "#7a7a7a" }}>Red Nexus © 2026</Typography>
            </Box>
          </Box>
        </Box>
      </Box>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3200}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        TransitionComponent={SlideTransition}
      >
        <Alert
          onClose={closeSnackbar}
          severity={snackbarSeverity}
          variant="filled"
          sx={{
            width: "100%",
            color: "#ffffff",
            "& .MuiAlert-message": { color: "#ffffff" },
            "& .MuiAlert-icon": { color: "#ffffff" },
            "& .MuiAlert-action": { color: "#ffffff" },
          }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
}
