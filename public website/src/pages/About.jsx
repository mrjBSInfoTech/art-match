import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Box,
  FormControl,
  InputLabel,
  InputAdornment,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Card,
  CardContent,
  CardMedia,
  Divider,
  LinearProgress,
} from "@mui/material";
import BarangayIcon from "../assets/BarangayIcon.png";
import Footer from "../components/Footer";
import { fetchOfficials } from "../api/officialAPI";
import OfficialCard from "../components/Official/OfficialCard";

export default function About() {
  const [date, setDate] = useState(null);
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState("");
  const [officials, setOfficials] = useState([]);
  const [officialErrorMessage, setOfficialErrorMessage] = useState("");

  // Handle navigation with support for hash links
  const handleNavigation = (path) => {
    if (path.includes("#")) {
      const [route, id] = path.split("#");

      // Check if we are already on the target route (e.g., /main)
      if (location.pathname === route) {
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
        }
      } else {
        navigate(path);
      }
    } else {
      navigate(path);
    }

    setMobileOpen(false);
    setSearchOpen(false);
  };
  useEffect(() => {
    // Check if there is a hash in the URL (e.g., #mission-vision)
    if (location.hash) {
      const id = location.hash.replace("#", "");
      const element = document.getElementById(id);
      if (element) {
        // Small timeout ensures the DOM is fully rendered before scrolling
        setTimeout(() => {
          element.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }
    }
  }, [location]);

  // Fetch all officials from API on component mount
  useEffect(() => {
    const loadOfficials = async () => {
      try {
        const data = await fetchOfficials();
        console.log("Officials loaded:", data);
        setOfficials(data || []);
      } catch (err) {
        console.error("Error loading officials:", err);
        setOfficialErrorMessage("Failed to load officials: " + err.message);
      }
    };
    loadOfficials();
  }, []);
  return (
    <Box>
      <Helmet titleTemplate="%s - Barangay Management System">
        <title>About</title>
      </Helmet>
      {/* History */}
      <Box
        id="history"
        sx={{
          pb: 10,
          px: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "#1e1f87",
          gap: 3, // Adds space between the logo and the text
          flexDirection: { xs: "column", sm: "row" }, // Stacks vertically on mobile, side-by-side on larger screens
        }}
      >
        {/* LOGO */}
        <Box
          sx={{
            bgcolor: "white",
            position: "relative",
            top: 40,
            borderRadius: "5%",
            mb: { xs: 4, sm: 0 },
          }}
        >
          <Box
            component="img"
            src={BarangayIcon}
            alt="Barangay Logo"
            sx={{
              height: {
                xs: "250px",
                sm: "350px",
                md: "450px",
                lg: "500px",
              },
              width: "auto",
              objectFit: "contain",
            }}
          ></Box>
        </Box>

        {/* TEXT CONTENT */}
        <Stack spacing={1} textAlign="center">
          <Typography variant="h3" fontWeight="bold" gutterBottom color="white">
            History
          </Typography>

          <Typography sx={{ maxWidth: 700, mx: "auto", color: "white" }}>
            Lorem ipsum dolor sit amet, consectetur adipisci elit, sed eiusmod
            tempor incidunt ut labore et dolore magna aliqua. Ut enim ad minim
            veniam, quis nostrum exercitationem ullam corporis suscipit
            laboriosam, nisi ut aliquid ex ea commodi consequatur. Quis aute
            iure reprehenderit in voluptate velit esse cillum dolore eu fugiat
            nulla pariatur. Excepteur sint obcaecat cupiditat non proident, sunt
            in culpa qui officia deserunt mollit anim id est laborum.
          </Typography>
        </Stack>
      </Box>

      <Box id="officials" sx={{ py: 10, px: 3 }}>
        <Typography
          variant="h3"
          fontWeight="bold"
          gutterBottom
          textAlign="center"
          mb={8}
        >
          Officials
        </Typography>

        {/* 1. BARANGAY CAPTAIN - Centered */}
        <Box sx={{ mb: 8 }}>
          <Typography
            variant="h6"
            fontWeight="bold"
            textAlign="center"
            mb={4}
            sx={{ color: "#1e1f87" }}
          >
            Barangay Captain
          </Typography>

          {/* Wrap in a Box with maxWidth so it doesn't stretch too wide */}
          <Box sx={{ maxWidth: 350, mx: "auto" }}>
            <OfficialCard
              columns="1fr" // Force single column for the Captain
              officials={officials.filter(
                (o) =>
                  o.position === "Chairman" ||
                  o.position === "Barangay Captain",
              )}
            />
          </Box>
        </Box>

        {/* 2. OFFICIALS - Row of 3 */}
        <Box sx={{ maxWidth: 1100, mx: "auto" }}>
          <Typography
            variant="h6"
            fontWeight="bold"
            textAlign="center"
            mb={4}
            sx={{ color: "#1e1f87" }}
          >
            Officials
          </Typography>

          <OfficialCard
            columns={{
              xs: "1fr",
              sm: "repeat(2, 1fr)",
              md: "repeat(3, 1fr)",
            }}
            officials={officials
              .filter((o) =>
                ["Secretary", "Treasurer", "Kagawad"].includes(o.position),
              )
              .sort((a, b) => {
                // Define priority: Secretary = 1, Treasurer = 2, Kagawad = 3
                const priority = { Secretary: 1, Treasurer: 2, Kagawad: 3 };
                return (
                  (priority[a.position] || 99) - (priority[b.position] || 99)
                );
              })}
          />
        </Box>
      </Box>
      <Footer />
    </Box>
  );
}
