import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import {
  Box,
  Button,
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

export default function Concern() {
  const [date, setDate] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState("");
  const [part, setPart] = useState(1);

  // Toggle handlers
  const goToPartTwo = () => setPart(2);
  const goToPartOne = () => setPart(1);

  return (
    <Box p={3}>
      <Helmet titleTemplate="%s - Barangay Management System">
        <title>Concern</title>
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
          {part === 1 ? "Concerns" : "Concern Solved"}
        </Typography>

        <Button
          variant="contained"
          color="primary"
          onClick={part === 1 ? goToPartTwo : goToPartOne}
          sx={{
            width: { xs: 130, sm: 150 },
            height: { xs: 35, sm: 45 },
            fontSize: { xs: 12, sm: 16 },
          }}
        >
          {part === 1 ? "Solved" : "Back"}
        </Button>
      </Box>

      {/* Conditional Content */}
      {part === 1 && (
        <Paper sx={{ p: 3, mt: 3, borderRadius: 2 }} variant="outlined">
          <Typography variant="h6" sx={{ mb: 2 }}>
            Concern List
          </Typography>
          {/* Your Table or List goes here */}
        </Paper>
      )}

      {part === 2 && (
        <Paper sx={{ p: 3, mt: 3, borderRadius: 2 }} variant="outlined">
          <Typography variant="h6" sx={{ mb: 2 }}>
            Solved Concern List
          </Typography>
          {/* Your detailed form or message content goes here */}
        </Paper>
      )}
    </Box>
  );
}
