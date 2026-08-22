import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Chip,
  FormControl,
  InputLabel,
  InputAdornment,
  LinearProgress,
  Grid,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
  Snackbar,
  Slide,
  Stack,
} from "@mui/material";
// Icons
import HomeIcon from "@mui/icons-material/Home";
import PersonIcon from "@mui/icons-material/Person";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";

// Slide Transition for Snackbar
function SlideTransition(props) {
  return <Slide {...props} direction="up" />;
}

export default function Orders() {
  const [loading, setLoading] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");

  const orders = [
    {
      id: 1,
      date: "2023-08-15",
      status: "Shipped",
      total: 150.0,
    },
    {
      id: 2,
      date: "2023-08-20",
      status: "Processing",
      total: 200.0,
    },
    {
      id: 3,
      date: "2023-08-25",
      status: "Delivered",
      total: 300.0,
    },
  ];
  const statusColor = {
    Shipped: "primary",
    Processing: "warning",
    Delivered: "success",
  };

  // Snackbar handlers
  const showSnackbar = (message, severity = "success") => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity); // Set it to "success" or "error"
    setSnackbarOpen(true);
  };

  const closeSnackbar = (event, reason) => {
    if (reason === "clickaway") return;
    setSnackbarOpen(false);
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case "success":
        return "success.light"; // Green
      case "error":
        return "error.light"; // Red
      default:
        return "primary.light"; 
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Helmet titleTemplate="%s - ArtMatch">
        <title>Orders</title>
      </Helmet>
      <Grid container spacing={3}>
        {orders.map((order) => (
          <Grid key={order.id} size={12}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 5,
              }}
            >
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
                sx={{
                  alignItems: { sm: "center" },
                  justifyContent: "space-between",
                }}
              >
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    Order {order.id}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Placed on {order.date}
                  </Typography>
                </Box>
                <Chip
                  label={order.status}
                  color={statusColor[order.status]}
                  size="small"
                  sx={{ fontSize: "0.875rem", fontWeight: 700, width: "100px", textAlign: "center", py: 2 }}
                />
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  ${order.total}
                </Typography>
                <Button variant="outlined" sx={{borderRadius: 9999}}>View details</Button>
              </Stack>
            </Paper>
          </Grid>
        ))}
      </Grid>
      {/* Snackbar Notification */}
      {/* //For Future Use 
      <Snackbar
        open={snackbarOpen}
        severity={snackbarSeverity}
        variant="filled"
        autoHideDuration={3000}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        TransitionComponent={SlideTransition}
      >
        <Alert
          onClose={closeSnackbar}
          severity={snackbarSeverity}
          sx={{
            width: "100%",
            backgroundColor: getSeverityColor(snackbarSeverity),
            color: "#fff",
            "& .MuiAlert-icon": {
              color: "#fff",
            },
          }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    */}
    </Box>
  );
}
