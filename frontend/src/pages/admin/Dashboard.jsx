import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  FormControl,
  InputLabel,
  InputAdornment,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
  Snackbar,
  Slide,
} from "@mui/material";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fetchArtworks } from "../../api/admin/artworkAPI";
import { fetchAuditLogs } from "../../api/admin/auditLogsAPI";
import * as XLSX from "xlsx";
import dayjs from "dayjs";
import Export from "../../components/admin/Dashboard/Export";
import PasswordWarning from "../../components/admin/Dashboard/PasswordWarning";
// Icons
import ColorLensRoundedIcon from "@mui/icons-material/ColorLensRounded";
import CreditScoreIcon from "@mui/icons-material/CreditScore";
import SellRoundedIcon from "@mui/icons-material/SellRounded";

// Slide Transition for Snackbar
function SlideTransition(props) {
  return <Slide {...props} direction="up" />;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [artworks, setArtworks] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [artworkErrorMessage, setArtworkErrorMessage] = useState("");
  const [logsErrorMessage, setLogsErrorMessage] = useState("");
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");
  const [openExportDialog, setOpenExportDialog] = useState(false);
  const [openPasswordWarning, setOpenPasswordWarning] = useState(false);
  const passwordChanged = localStorage.getItem("admin_password_changed");

  useEffect(() => {
    if (passwordChanged === "0" || passwordChanged === "false") {
      setOpenPasswordWarning(true);
    }
  }, [passwordChanged]);

  // Fetch all artworks from API
  const loadArtworks = async () => {
    try {
      setLoading(true);
      setArtworkErrorMessage("");
      const response = await fetchArtworks();
      if (response && Array.isArray(response)) {
        setArtworks(response);
      } else if (response && response.data && Array.isArray(response.data)) {
        setArtworks(response.data);
      } else {
        setArtworks([]);
        setArtworkErrorMessage("No data received from server.");
      }
    } catch (err) {
      setArtworks([]);
      setArtworkErrorMessage("Failed to load artworks: " + err.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    loadArtworks();
  }, []);

  // Fetch all logs from API
  const loadLogs = async () => {
    try {
      setLoading(true);
      setLogsErrorMessage("");
      const response = await fetchAuditLogs();
      if (response && Array.isArray(response)) {
        setLogs(response);
      } else if (response && response.data && Array.isArray(response.data)) {
        setLogs(response.data);
      } else {
        setLogs([]);
        setLogsErrorMessage("No data received from server.");
      }
    } catch (err) {
      setLogs([]);
      setLogsErrorMessage("Failed to load logs: " + err.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    loadLogs();
  }, []);

  // Open Export Data Dialog
  const handleOpenExportDialog = () => {
    setOpenExportDialog(true);
  };

  // Open Password Warning Dialog
  const handleOpenPasswordWarning = () => {
    setOpenPasswordWarning(true);
  };

  const exportLogsCSV = () => {
    if (logs.length === 0) return;

    const headers = ["Date Time", "Action", "Role", "Status", "Information"];

    const logRows = logs.map((log) => [
      dayjs(log.datetime).format("YYYY-MM-DD HH:mm:ss"),
      String(log.action || ""),
      String(log.role || ""),
      String(log.status || ""),
      String(log.information || ""),
    ]);

    const csvContent =
      headers.join(",") +
      "\n" +
      logRows
        .map((row) =>
          row
            .map((value) => {
              const safeValue = String(value).replace(/"/g, '""');
              return `"${safeValue}"`;
            })
            .join(","),
        )
        .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "Logs.csv";
    link.click();
    URL.revokeObjectURL(url);
    setOpenExportDialog(false);
  };

  const exportLogsExcel = () => {
    if (logs.length === 0) return;

    const data = logs.map((log) => ({
      "Date Time": dayjs(log.datetime).format("YYYY-MM-DD HH:mm:ss"),
      Action: log.action,
      Role: log.role,
      Status: log.status,
      Information: log.information,
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "All Logs");
    XLSX.writeFile(workbook, "Logs.xlsx");
    setOpenExportDialog(false);
  };

  const artworkCount = artworks.length;
  const soldCount = 0;
  const salesCount = 0;

  // Snackbar handlers
  const showSnackbar = (message, severity = "success") => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const closeSnackbar = (event, reason) => {
    if (reason === "clickaway") return;
    setSnackbarOpen(false);
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case "success":
        return "success.light";
      case "error":
        return "error.light";
      default:
        return "primary.light";
    }
  };

  const salesData = [
    { month: "Jan", sales: 1200 },
    { month: "Feb", sales: 1800 },
    { month: "Mar", sales: 1500 },
    { month: "Apr", sales: 2500 },
    { month: "May", sales: 3000 },
    { month: "Jun", sales: 4200 },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Helmet titleTemplate="%s - ArtMatch">
        <title>Dashboard</title>
      </Helmet>
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "space-between",
          mb: 2,
        }}
      >
        <Typography
          variant="h4"
          gutterBottom
          sx={{ fontWeight: "bold", fontSize: { xs: 24, sm: 32 } }}
        >
          Dashboard
        </Typography>
        <Button
          variant="contained"
          color="error"
          onClick={handleOpenExportDialog}
          sx={{
            width: { xs: "100%", sm: 150 },
            height: { xs: 35, sm: 45 },
            minWidth: { xs: 45, sm: 50 },
            fontSize: { xs: 12, sm: 16 },
            padding: 0,
          }}
        >
          Export Data
        </Button>
      </Box>
      <Box
        sx={{
          mt: 3,
          display: "flex",
          gap: 3,
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        <Card
          variant="outlined"
          sx={{
            flex: "1 1 350px",
            maxWidth: 600,
            height: 150,
            padding: 2,
            borderRadius: 2,
            bgcolor: "background.paper",
          }}
        >
          <CardContent>
            <Typography
              gutterBottom
              variant="h5"
              sx={{ fontWeight: "bold", color: "#b73636" }}
            >
              Total Artworks
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 2 }}>
              <ColorLensRoundedIcon color="error" sx={{ fontSize: 30 }} />
              <Typography
                sx={{ fontWeight: "bold", color: "#b73636", fontSize: 30 }}
              >
                {artworkCount}
              </Typography>
            </Box>
          </CardContent>
        </Card>

        <Card
          variant="outlined"
          sx={{
            flex: "1 1 350px",
            maxWidth: 600,
            height: 150,
            padding: 2,
            borderRadius: 2,
            bgcolor: "background.paper",
          }}
        >
          <CardContent>
            <Typography
              gutterBottom
              variant="h5"
              sx={{ fontWeight: "bold", color: "#b73636" }}
            >
              Sold
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 2 }}>
              <SellRoundedIcon color="error" sx={{ fontSize: 30 }} />
              <Typography
                variant="h4"
                sx={{ fontWeight: "bold", color: "#b73636" }}
              >
                {soldCount}
              </Typography>
            </Box>
          </CardContent>
        </Card>

        <Card
          variant="outlined"
          sx={{
            flex: "1 1 350px",
            maxWidth: 600,
            height: 150,
            padding: 2,
            borderRadius: 2,
            bgcolor: "background.paper",
          }}
        >
          <CardContent>
            <Typography
              gutterBottom
              variant="h5"
              sx={{ fontWeight: "bold", color: "#b73636" }}
            >
              Total Sales
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 2 }}>
              <CreditScoreIcon color="error" sx={{ fontSize: 30 }} />
              <Typography
                variant="h4"
                sx={{ fontWeight: "bold", color: "#b73636" }}
              >
                {salesCount}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>

      <Paper
        sx={{ p: { xs: 2, md: 3 }, mt: 3, borderRadius: 2 }}
        variant="outlined"
      >
        <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold" }}>
          Monthly Sales
        </Typography>

        <Box sx={{ width: "100%", height: 330, overflowX: "auto" }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="sales"
                stroke="#b73636"
                strokeWidth={3}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>
        <Export
          open={openExportDialog}
          handleClose={() => setOpenExportDialog(false)}
          onExportCSV={exportLogsCSV}
          onExportExcel={exportLogsExcel}
        />
        <PasswordWarning
          open={openPasswordWarning}
          handleClose={() => setOpenPasswordWarning(false)}
          navigate={navigate}
        />
      </Paper>
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
