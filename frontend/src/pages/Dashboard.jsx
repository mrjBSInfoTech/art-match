import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import {
  Box,
  Card,
  CardMedia,
  CardContent,
  Divider,
  FormControl,
  InputLabel,
  LinearProgress,
  Select,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Paper,
} from "@mui/material";

export default function Dashboard() {
  return (
    <Box sx={{ p: 3 }}>
      <Helmet titleTemplate="%s - Barangay Management System">
        <title>Dashboard</title>
      </Helmet>
      <Box>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: "bold" }}>
          Dashboard
        </Typography>
      </Box>
    </Box>
  );
}
