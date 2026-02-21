import React, { useState, useEffect } from "react";
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

export default function History() {
  const [date, setDate] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState("");
  /**

  // Filter and Sort Logic
  const filteredTransactions = transactions
    .filter((transaction) => {
      // Filter by search query (search in transaction_id)
      if (searchQuery && !transaction.transaction_id.toString().includes(searchQuery)) {
        return false;
      }
      // Filter by date if selected
      if (date) {
        const transactionDate = new Date(transaction.transaction_date).toDateString();
        const selectedDate = date.$d.toDateString();
        if (transactionDate !== selectedDate) {
          return false;
        }
      }
      return true;
    })
    .sort((a, b) => {
      if (sortOption === "highToLow") {
        return b.total_amount - a.total_amount;
      } else if (sortOption === "lowToHigh") {
        return a.total_amount - b.total_amount;
      }
      return 0;
    });
   */
  return (
    <Box sx={{ p: 3 }}>
      <Box>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: "bold" }}>
          History
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
            placeholder="Search history..."
            size="small"
            sx={{ 
              width: { xs: "100%", md: 250 },
              minWidth: { xs: "100%", md: 250 }
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

          <Box sx={{ 
            display: "flex", 
            flexDirection: { xs: "column", sm: "row" },
            gap: 2,
            width: { xs: "100%", md: "auto" }
          }}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                label="Select Date"
                value={date}
                onChange={(newDate) => setDate(newDate)}
                enableAccessibleFieldDOMStructure={false}
                slots={{ textField: TextField }}
                slotProps={{
                  textField: {
                    size: "small",
                    fullWidth: true,
                  },
                }}
                sx={{ 
                  width: { xs: "100%", sm: 200 }
                }}
              />
            </LocalizationProvider>

            <FormControl 
              size="small" 
              sx={{ 
                width: { xs: "100%", sm: 180 }
              }}
            >
              <InputLabel>Sort</InputLabel>
              <Select
                value={sortOption}
                label="Sort"
                onChange={(e) => setSortOption(e.target.value)}
              >
                <MenuItem value="highToLow">Residents</MenuItem>
                <MenuItem value="lowToHigh">Household</MenuItem>
                <MenuItem value="lowToHigh">Announcement</MenuItem>
                <MenuItem value="lowToHigh">Files</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>  
      </Paper>

      {/* History List */}
      <Paper sx={{ p: 3, mt: 3, borderRadius: 2 }} variant="outlined">
        <Typography variant="h6" sx={{ mb: 2 }}>
          History List
        </Typography>

      </Paper>
    </Box>
  );
}
