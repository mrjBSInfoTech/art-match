import React, { useState, useEffect } from "react";
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
  Divider,
  LinearProgress,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import BarangayIcon from "../assets/BarangayIcon.png";
import Footer from "../components/Footer";

export default function About() {
  const [date, setDate] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState("");
  return (
    <Box>
      {/* About Us */}
      <Box
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
            mb: { xs: 4, sm: 0 }
          }}
        >
          <Box
            component="img"
            src={BarangayIcon}
            alt="Barangay Logo"
            sx={{
              height: { md: "500px", xs: "250px", sm: "500px" }, // Adjust size as needed
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
      <Box p={5}>
        <Typography
          variant="h3"
          fontWeight="bold"
          gutterBottom
          textAlign="center"
        >
          Officials
        </Typography>
      </Box>
      <Footer />
    </Box>
  );
}
