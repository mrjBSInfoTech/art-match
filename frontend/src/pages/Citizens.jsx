import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import {
  Box,
  FormControl,
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

export default function Citizens() {
  const [date, setDate] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState("verified");
  const [loading, setLoading] = useState(false);
  const [citizensErrorMessage, setCitizensErrorMessage] = useState("");
  const [part, setPart] = useState(1);

  // Toggle handlers
  const goToPartTwo = () => setPart(2);
  const goToPartOne = () => setPart(1);

  useEffect(() => {
    if (sortOption === "verified") {
      setPart(1);
    } else if (sortOption === "pending") {
      setPart(2);
    }
  }, [sortOption]);

  return (
    <Box p={3}>
      <Helmet titleTemplate="%s - Barangay Management System">
        <title>Citizens</title>
      </Helmet>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography
          variant="h4"
          gutterBottom
          sx={{ fontWeight: "bold", fontSize: { xs: 24, sm: 32 } }}
        >
          {part === 1 ? "Citizens - Verified" : "Citizens - Pending"}
        </Typography>
      </Box>

      {/* Filter Section */}
      <Paper sx={{ p: 3, mt: 3, borderRadius: 2 }} variant="outlined">
        <Typography variant="h6">Filter</Typography>
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            justifyContent: "space-between",
            alignItems: { xs: "stretch", md: "center" },
            gap: 2,
            mb: 2,
            mt: 2,
          }}
        >
          <TextField
            variant="outlined"
            placeholder="Search citizens..."
            size="small"
            sx={{
              width: { xs: "100%", md: 250 },
              minWidth: { xs: "100%", md: 250 },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              gap: 2,
              width: { xs: "100%", md: "auto" },
            }}
          >
            <FormControl
              size="small"
              sx={{
                width: { xs: "100%", sm: 180 },
              }}
            >
              <InputLabel>Sort</InputLabel>
              <Select
                value={sortOption}
                label="Sort"
                onChange={(e) => setSortOption(e.target.value)}
              >
                <MenuItem value="verified">Verified</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>
      </Paper>

      {part === 1 && (
        <Paper sx={{ p: 3, mt: 3, borderRadius: 2 }} variant="outlined">
          <Typography variant="h6" sx={{ mb: 2 }}>
            Verified List
          </Typography>
        </Paper>
      )}
      {part === 2 && (
        <Paper sx={{ p: 3, mt: 3, borderRadius: 2 }} variant="outlined">
          <Typography variant="h6" sx={{ mb: 2 }}>
            Pending List
          </Typography>
        </Paper>
      )}
    </Box>
  );
}
