import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import {
  Box,
  Button,
  FormControl,
  Grid,
  InputLabel,
  InputAdornment,
  MenuItem,
  Paper,
  Select,
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
  Divider,
  LinearProgress,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import Footer from "../components/Footer";

//Logo
import PlaceIcon from '@mui/icons-material/Place';
import CallIcon from '@mui/icons-material/Call';
import EmailIcon from '@mui/icons-material/Email';
import WatchLaterIcon from '@mui/icons-material/WatchLater';
import FacebookIcon from '@mui/icons-material/Facebook';
import InstagramIcon from '@mui/icons-material/Instagram';
import XIcon from '@mui/icons-material/X';

export default function Concerns() {
  const [date, setDate] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState("");
  return (
    <Box>
      <Helmet titleTemplate="%s - Barangay 415 Zone 42">
        <title>Concerns</title>
      </Helmet>
      {/* CONCERNS */}
      <Box sx={{ py: 10, px: 3,mb: -10, backgroundColor: "#f5f5f5" }} id="concerns">
        <Typography variant="h4" textAlign="center" fontWeight="bold" mb={6}>
          Contact Us
        </Typography>

        <Grid container spacing={4} justifyContent="center">
          <Grid 
            sx={{width: 600, }}
          >
            <Card sx={{mb: 4, p: 2 }}>
              <CardContent>
                <Typography variant="h4" gutterBottom sx={{fontWeight: "bold"}} color="primary">
                  Get In Touch
                </Typography>
                
                {/* Location */}
                <Box sx={{ mb: 3, display: "flex", gap: 2 }}>
                  <PlaceIcon sx={{ color: "primary.main", mt: 0.5 }} />
                  <Box>
                    <Typography variant="body2" sx={{fontWeight: "bold"}}>
                      Location
                    </Typography>
                    <Typography variant="body2" sx={{color: "text.secondary"}}>
                      Barangay 415, Zone 42, Sampaloc, Manila, Philippines
                    </Typography>
                  </Box>
                </Box>

                {/* Contact Numbers */}
                <Box id="contact-info" sx={{ mb: 3, display: "flex", gap: 2 }}>
                  <CallIcon sx={{ color: "primary.main", mt: 0.5 }} />
                  <Box>
                    <Typography variant="body2" sx={{fontWeight: "bold"}}>
                      Contact Numbers
                    </Typography>
                    <Typography variant="body2" sx={{color: "text.secondary"}}>
                      Main: (02) 1234-5678
                    </Typography>
                    <Typography variant="body2" sx={{color: "text.secondary"}}>
                      Mobile: 0917-123-4567
                    </Typography>
                  </Box>
                </Box>

                {/* Email */}
                <Box sx={{ mb: 3, display: "flex", gap: 2 }}>
                  <EmailIcon sx={{ color: "primary.main", mt: 0.5 }} />
                  <Box>
                    <Typography variant="body2" sx={{fontWeight: "bold"}}>
                      Email
                    </Typography>
                    <Typography variant="body2" sx={{color: "text.secondary"}}>
                      info@barangay415.gov.ph
                    </Typography>
                  </Box>
                </Box>

                {/* Office Hours */}
                <Box sx={{ mb: 3, display: "flex", gap: 2 }}>
                  <WatchLaterIcon sx={{ color: "primary.main", mt: 0.5 }} />
                  <Box>
                    <Typography variant="body2" sx={{fontWeight: "bold"}}>
                      Office Hours
                    </Typography>
                    <Typography variant="body2" sx={{color: "text.secondary"}}>
                      Monday to Sunday: 8:00 AM - 12:00 AM
                    </Typography>
                  </Box>
                </Box>

                <Divider sx={{ my: 2 }} />

                {/* Follow Us */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <Typography variant="body2" sx={{fontWeight: "bold"}}>
                    Follow Us
                  </Typography>
                  <Box sx={{ display: "flex", gap: 2 }}>
                    <a href="https://www.facebook.com" target="_blank" rel="noopener noreferrer">
                      <FacebookIcon sx={{ color: "primary.main", cursor: "pointer", fontSize: 24 }} />
                    </a>
                    <a href="https://www.instagram.com" target="_blank" rel="noopener noreferrer">
                      <InstagramIcon sx={{ color: "primary.main", cursor: "pointer", fontSize: 24 }} />
                    </a>
                    <a href="https://www.x.com" target="_blank" rel="noopener noreferrer">
                      <XIcon sx={{ color: "primary.main", cursor: "pointer", fontSize: 24 }} />
                    </a>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}
            sx={{width: 600}}
          >
            <Paper sx={{ p: 4 }}>
              <Typography variant="h6" gutterBottom>
                Send a Message
              </Typography>

              <TextField fullWidth label="Name" sx={{ mb: 2 }} />
              <TextField fullWidth label="Email" sx={{ mb: 2 }} />
              <FormControl
                fullWidth label="Sort" 
                sx={{
                  width: { xs: "100%", sm: "100%" },
                  mb: 2
                }}
              >
                <InputLabel>Sort</InputLabel>
                <Select
                  value={sortOption}
                  label="Sort"
                  onChange={(e) => setSortOption(e.target.value)}
                >
                  <MenuItem value="complaint">Complaint</MenuItem>
                  <MenuItem value="concerns">Concerns</MenuItem>
                  <MenuItem value="feedback">Feedback</MenuItem>
                </Select>
              </FormControl>
              <TextField fullWidth label="Message" multiline rows={4} />

              <Button variant="contained" sx={{ mt: 2 }}>
                Send Message
              </Button>
            </Paper>
          </Grid>
        </Grid>
      </Box>
      <Footer />
    </Box>
  );
}
