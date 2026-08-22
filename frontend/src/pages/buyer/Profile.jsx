import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import {
  Avatar,
  Box,
  Button,
  TextField,
  Stack,
  Typography,
} from "@mui/material";
// Icons
import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";

export default function Profile() {
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  useEffect(() => {
    const storedUsername = localStorage.getItem("buyer_username");
    const storedFirstName = localStorage.getItem("buyer_first_name");
    const storedLastName = localStorage.getItem("buyer_last_name");
    const storedEmail = localStorage.getItem("buyer_email");
    const storedPhoneNumber = localStorage.getItem("buyer_phone_number");

    setUsername(storedUsername || "N/A");
    setFirstName(storedFirstName || "N/A");
    setLastName(storedLastName || "N/A");
    setEmail(storedEmail || "N/A");
    setPhoneNumber(storedPhoneNumber || "N/A");
  }, []);

  return (
    <Box
      sx={{
        minHeight: "100%",
        p: { xs: 2, sm: 3, md: 4 },
        backgroundColor: "#fafafa",
      }}
    >
      <Helmet titleTemplate="%s - ArtMatch">
        <title>Profile</title>
      </Helmet>

      <Box sx={{ maxWidth: 1120, mx: "auto" }}>
        <Typography variant="overline" sx={{ color: "error.main", fontWeight: 800, letterSpacing: 1.5 }}>
          Account settings
        </Typography>
        <Typography variant="h4" sx={{ mt: 0.5, mb: 3, fontWeight: 800 }}>
          My profile
        </Typography>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "280px minmax(0, 1fr)" },
            gap: 2.5,
            alignItems: "stretch",
          }}
        >
          <Box
            sx={{
              position: "relative",
              overflow: "hidden",
              p: { xs: 3, sm: 4 },
              borderRadius: 3,
              color: "#fff",
              background: "linear-gradient(145deg, #af4f4f 0%, #7f2929 100%)",
              boxShadow: "0 14px 30px rgba(127, 41, 41, 0.2)",
            }}
          >
            <AccountCircleOutlinedIcon sx={{ position: "absolute", right: -18, top: -18, fontSize: 150, opacity: 0.1 }} />
            <Stack spacing={2.5} sx={{ position: "relative", height: "100%" }}>
              <Avatar sx={{ width: 86, height: 86, bgcolor: "#fff", color: "error.main", fontSize: 34, fontWeight: 800 }}>
                {username ? username.charAt(0).toUpperCase() : "U"}
              </Avatar>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 800, overflowWrap: "anywhere" }}>
                  {firstName} {lastName}
                </Typography>
                <Typography sx={{ mt: 0.75, opacity: 0.8, overflowWrap: "anywhere" }}>
                  @{username}
                </Typography>
              </Box>
              <Box sx={{ mt: "auto", pt: 3, borderTop: "1px solid rgba(255,255,255,0.22)" }}>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  ArtMatch buyer account
                </Typography>
              </Box>
            </Stack>
          </Box>

          <Box sx={{ p: { xs: 2.5, sm: 3.5 }, border: "1px solid", borderColor: "divider", borderRadius: 3, bgcolor: "background.paper" }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>Personal information</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Review the details connected to your account.</Typography>
              </Box>
              <EditOutlinedIcon sx={{ color: "error.main" }} />
            </Stack>

            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" }, gap: 2 }}>
              <TextField fullWidth label="First name" value={firstName} InputProps={{ readOnly: true }} />
              <TextField fullWidth label="Last name" value={lastName} InputProps={{ readOnly: true }} />
              <TextField fullWidth label="Email" value={email} InputProps={{ readOnly: true, startAdornment: <EmailOutlinedIcon sx={{ mr: 1, color: "text.secondary" }} /> }} />
              <TextField fullWidth label="Phone number" value={phoneNumber} InputProps={{ readOnly: true, startAdornment: <PhoneOutlinedIcon sx={{ mr: 1, color: "text.secondary" }} /> }} />
              <TextField fullWidth label="Username" value={username} InputProps={{ readOnly: true }} sx={{ gridColumn: { sm: "1 / -1" } }} />
            </Box>

            <Button variant="contained" color="error" startIcon={<EditOutlinedIcon />} sx={{ mt: 3, minWidth: 170 }}>
              Update profile
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
