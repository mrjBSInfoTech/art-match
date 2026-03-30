import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import {
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Paper,
  Stack,
  TextField,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";
import BarangayIcon from "../assets/BarangayIcon.png";
import Footer from "../components/Footer";
import { fetchAnnouncements } from "../api/announcementAPI";

export default function Main() {
  const navigate = useNavigate();
  const location = useLocation();
  const [announcements, setAnnouncements] = useState([]);
  const [announcementErrorMessage, setAnnouncementErrorMessage] = useState("");

  // Load all announcements
  const loadAnnouncements = async () => {
    try {
      setAnnouncementErrorMessage("");
      console.log("Loading all announcements...");
      const response = await fetchAnnouncements();
      console.log("Announcements response:", response);
      if (response && Array.isArray(response)) {
        setAnnouncements(response);
      } else if (response && response.data && Array.isArray(response.data)) {
        setAnnouncements(response.data);
      } else {
        setAnnouncements([]);
        setAnnouncementErrorMessage("No data received from server.");
      }
    } catch (err) {
      console.error("Failed to fetch announcements:", err);
      setAnnouncements([]);
      setAnnouncementErrorMessage(
        `${err.message || "Failed to fetch announcements. Please try again later."}`,
      );
    }
  };

  useEffect(() => {
    loadAnnouncements();
  }, []);

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
        // If we're on a different page, navigate to the full path
        // Note: Standard react-router navigate(path) might not scroll on load.
        // See step 2 for the fix for that.
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

  return (
    <Box>
      <Helmet titleTemplate="%s - Barangay 415 Zone 42">
        <title>Home</title>
      </Helmet>
      {/* HERO SECTION */}
      <Box
        sx={{
          background: "#1e1f87",
          color: "white",
          py: 12,

          textAlign: "center",
        }}
        id="hero"
      >
        <Typography variant="h3" fontWeight="bold" gutterBottom>
          Discover Barangay415
        </Typography>

        <Typography variant="h6" sx={{ maxWidth: 700, mx: "auto", mb: 4 }}>
          Learn more about Barangay 415
        </Typography>

        <Box sx={{ display: "flex", justifyContent: "center", gap: 2 }}>
          <Button
            variant="contained"
            sx={{ backgroundColor: "white", color: "#3b82f6" }}
            onClick={() => {
              document
                .getElementById("about")
                .scrollIntoView({ behavior: "smooth" });
            }}
          >
            Learn More
          </Button>

          <Button
            variant="outlined"
            sx={{ borderColor: "white", color: "white" }}
            onClick={() => {
              navigate("/concerns");
            }}
          >
            Contact Us
          </Button>
        </Box>
      </Box>

      {/* About Us */}
      <Box
        id="about"
        sx={{
          pb: 10,
          px: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "#f5f5f5",
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
          />
        </Box>

        {/* TEXT CONTENT */}
        <Stack spacing={1} textAlign="center">
          <Typography variant="h3" fontWeight="bold" gutterBottom>
            About Us
          </Typography>

          <Typography sx={{ maxWidth: 700, mx: "auto" }}>
            Barangay 415 Zone 42 is committed to serving the community through
            transparent governance, inclusive programs, and sustainable
            development. We strive to improve the quality of life of our
            residents by providing efficient public services and fostering unity
            within the community.
          </Typography>
        </Stack>
      </Box>

      <Box sx={{ py: 20 }} id="mission-vision">
        {/* MISSION & VISION */}
        <Grid container justifyContent="center" spacing={6}>
          {/* Vision */}
          <Grid item xs={12} sm={6} md={5}>
            <Box
              sx={{
                width: "100%",
                maxWidth: 500,
                mx: "auto",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                border: "1px solid #ccc",
                borderRadius: 2,
                p: 4,
              }}
            >
              <Typography variant="h4" gutterBottom>
                Vision
              </Typography>

              <Typography>
                A progressive and sustainable Barangay 415 where residents enjoy
                improved quality of life, equal opportunities, and a strong
                sense of unity in a safe and clean environment.
              </Typography>
            </Box>
          </Grid>

          {/* Mission */}
          <Grid item xs={12} sm={6} md={5}>
            <Box
              sx={{
                width: "100%",
                maxWidth: 500,
                mx: "auto",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                border: "1px solid #ccc",
                borderRadius: 2,
                p: 4,
              }}
            >
              <Typography variant="h4" gutterBottom>
                Mission
              </Typography>

              <Typography>
                To provide efficient and accountable public service that
                empowers residents and promotes community development through
                inclusive governance and collaborative partnerships.
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* ANNOUNCEMENTS */}
      <Box
        id="announcements"
        sx={{ py: 10, px: 3, backgroundColor: "#f5f5f5" }}
      >
        <Typography variant="h4" textAlign="center" fontWeight="bold" mb={6}>
          Latest Announcements
        </Typography>

        <Grid container spacing={4}>
          {announcements.map((announcement) => (
            <Grid
              item
              xs={12}
              md={4}
              key={announcement.id}
              sx={{
                width: "30%",
              }}
            >
              <Card sx={{ p: 2 }}>
                <CardContent>
                  <Typography variant="body2" color="text.secondary">
                    {new Date(announcement.date_posted).toLocaleDateString(
                      "en-US",
                      {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      },
                    )}
                  </Typography>

                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    {announcement.title}
                  </Typography>

                  <Typography variant="body2">
                    {announcement.description.length > 100
                      ? `${announcement.description.substring(0, 100)}...`
                      : announcement.description}
                  </Typography>

                  <Button
                    sx={{ mt: 2 }}
                    onClick={() => {
                      navigate("/announcements");
                    }}
                  >
                    Read More →
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* MAP SECTION */}
      <Box sx={{ width: "100%", mb: -10, p: 0 }} id="location">
        <Box
          sx={{
            width: "100%",
            height: "300px",
            overflow: "hidden",
          }}
        >
          <iframe
            title="Barangay 415 Location"
            width="100%"
            height="100%"
            style={{ border: 0, display: "block" }}
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3860.9445419181066!2d120.9934460044199!3d14.60223508063279!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3397c90044880705%3A0x360b0bb9a22a7732!2sBarangay%20Hall%20Barangay%20415-Zone%2042!5e0!3m2!1sen!2sph!4v1759467000487!5m2!1sen!2sph"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </Box>
      </Box>
      <Footer />
    </Box>
  );
}
