import { useState, useEffect, createElement } from "react";
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
  Stack,
} from "@mui/material";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
  Pie,
  PieChart,
} from "recharts";
import { useTheme } from "@mui/material/styles";
import { fetchArtworks } from "../../api/admin/artworkAPI";
import { fetchAuditLogs } from "../../api/admin/auditLogsAPI";
import { fetchStudents } from "../../api/admin/studentAPI";
import { fetchDashboard } from "../../api/admin/dashboardAPI";
import { buildProgramDistribution } from "../../utils/adminDashboard";
import ConnectionErrorPanel from "../../components/admin/ConnectionErrorPanel";
import AdminLoadingPanel from "../../components/admin/AdminLoadingPanel";
import * as XLSX from "xlsx";
import dayjs from "dayjs";
import Export from "../../components/admin/Dashboard/Export";
import ArtworkImage from "../../components/common/ArtworkImage";
// Icons
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ColorLensRoundedIcon from "@mui/icons-material/ColorLensRounded";
import CreditScoreIcon from "@mui/icons-material/CreditScore";
import SellRoundedIcon from "@mui/icons-material/SellRounded";
import SchoolRoundedIcon from "@mui/icons-material/SchoolRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

// Slide Transition for Snackbar
function SlideTransition(props) {
  return <Slide {...props} direction="up" />;
}

export default function Dashboard() {
  const theme = useTheme();
  const navigate = useNavigate();
  const [statistics, setStatistics] = useState(null);
  const [statisticsError, setStatisticsError] = useState("");
  const [studentsError, setStudentsError] = useState("");
  const [distributionMode, setDistributionMode] = useState("students");
  const [artworks, setArtworks] = useState([]);
  const [students, setStudents] = useState([]);
  const [logs, setLogs] = useState([]);
  const [artworksLoading, setArtworksLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(true);
  const [artworkErrorMessage, setArtworkErrorMessage] = useState("");
  const [logsErrorMessage, setLogsErrorMessage] = useState("");
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");
  const [openExportDialog, setOpenExportDialog] = useState(false);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const result = await fetchDashboard();
        if (active) { setStatistics(result); setStatisticsError(""); }
      } catch (error) {
        if (active) { setStatistics(null); setStatisticsError(error.message); }
      }
    };
    refresh();
    window.addEventListener("focus", refresh);
    return () => { active = false; window.removeEventListener("focus", refresh); };
  }, []);

  // Fetch all artworks from API
  const loadArtworks = async () => {
    try {
      setArtworksLoading(true);
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
      setArtworksLoading(false);
    }
  };
  useEffect(() => {
    loadArtworks();
  }, []);

  useEffect(() => {
    const loadStudents = async () => {
      try {
        const response = await fetchStudents("verified");
        setStudents(Array.isArray(response) ? response : []);
      } catch {
        setStudentsError("Unable to load verified artists for the program distribution.");
        setStudents([]);
      }
    };

    loadStudents();
  }, []);

  // Fetch all logs from API
  const loadLogs = async () => {
    try {
      setLogsLoading(true);
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
      setLogsLoading(false);
    }
  };
  useEffect(() => {
    loadLogs();
  }, []);

  // Open Export Data Dialog
  const handleOpenExportDialog = () => {
    setOpenExportDialog(true);
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

  const artworkCount = statistics?.totalArtworks ?? "--";
  const soldCount = statistics?.soldCount ?? "--";
  const salesCount = statistics?.totalSales;

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

  if (
    (artworksLoading || logsLoading || (!statistics && !statisticsError)) &&
    artworks.length === 0 &&
    logs.length === 0 &&
    !statisticsError &&
    !artworkErrorMessage &&
    !logsErrorMessage
  ) {
    return (
      <AdminLoadingPanel
        title="Dashboard"
        subtitle="Monitor the overall performance of the platform"
        showFilters={false}
      />
    );
  }

  if (statisticsError || artworkErrorMessage || logsErrorMessage) {
    return (
      <ConnectionErrorPanel
        title="Dashboard Unavailable"
        onRetry={() => window.location.reload()}
      />
    );
  }

  const salesData = statistics?.monthlySales || [];
  const programData = buildProgramDistribution(students, artworks);
  const artworkDistributionCount = programData.reduce(
    (total, program) => total + program.artworks,
    0,
  );
  const enrolledArtists = programData.reduce(
    (total, program) => total + program.students,
    0,
  );
  const programChartData = programData.filter(
    (program) => program[distributionMode] > 0,
  );
  const chartData = programChartData;
  const distributionTotal = distributionMode === "students" ? enrolledArtists : artworkDistributionCount;
  const getRecordTime = (record) =>
    new Date(
      record.date_created ||
        record.request_date ||
        record.created_at ||
        record.createdAt ||
        record.uploaded_at ||
        record.datetime ||
        0,
    ).getTime();
  const pendingArtworks = artworks
    .filter((artwork) => {
      const status = String(
        artwork.request_status || artwork.status || "",
      ).toLowerCase();
      return status === "pending" || status === "pending verification";
    })
    .sort((first, second) => getRecordTime(second) - getRecordTime(first))
    .slice(0, 5);
  const recentActivity = [...logs]
    .sort((first, second) => getRecordTime(second) - getRecordTime(first))
    .slice(0, 5);
  const getArtworkImage = (artwork) => artwork.image || artwork.image_url || "";
  const formatActivityDate = (datetime) =>
    datetime ? dayjs(datetime).format("M/D/YYYY") : "-";

  return (
    <Box
      sx={{
        p: { xs: 1.5, sm: 2.5 },
        minHeight: "100vh",
        backgroundColor: theme.palette.background.default,
        color: theme.palette.text.primary,
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
        boxSizing: "border-box",
        overflowX: "hidden",
      }}
    >
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
        <Box>
          <Typography
            sx={{
              fontSize: { xs: 28, sm: 38 },
              fontWeight: 800,
              lineHeight: 1.1,
              color: theme.palette.text.primary,
            }}
          >
            Dashboard
          </Typography>
          <Typography
            sx={{
              mt: 0.75,
              color: theme.palette.text.secondary,
              fontSize: 13,
            }}
          >
            Monitor the overall performance of the platform
          </Typography>
        </Box>

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
      {studentsError && <Alert severity="warning" sx={{ mt: 2 }}>{studentsError}</Alert>}
      <Box
        sx={{
          mt: 3,
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            md: "repeat(3, 1fr)",
          },
          gap: 2,
        }}
      >
        {[
          {
            label: "TOTAL ARTWORKS",
            value: artworkCount,
            caption: `${statistics?.pendingArtworks ?? "--"} pending review`,
            icon: ColorLensRoundedIcon,
            tint: "rgba(244, 114, 182, 0.15)",
            accent: "primary.main",
          },
          {
            label: "SOLD",
            value: soldCount,
            caption: "Artwork units in paid orders",
            icon: SellRoundedIcon,
            tint: "rgba(34, 197, 94, 0.18)",
            accent: "success.main",
          },
          {
            label: "TOTAL SALES",
            value: salesCount == null ? "--" : `₱${Number(salesCount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            caption: "Paid artwork sales (excludes shipping)",
            icon: CreditScoreIcon,
            tint: "rgba(59, 130, 246, 0.18)",
            accent: "secondary.main",
          },
        ].map(({ label, value, caption, icon: MetricIcon, tint, accent }) => (
          <Card
            key={label}
            variant="outlined"
            sx={{
              position: "relative",
              borderRadius: 4,
              background: (theme) =>
                theme.palette.mode === "dark"
                  ? "linear-gradient(180deg, rgba(15, 23, 42, 0.96), rgba(15, 23, 42, 0.84))"
                  : "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.94))",
              border: "1px solid",
              borderColor: "divider",
              boxShadow: (theme) =>
                theme.palette.mode === "dark"
                  ? "0 20px 38px rgba(2, 6, 23, 0.28)"
                  : "0 18px 36px rgba(15, 23, 42, 0.08)",
              overflow: "hidden",
              transition: "transform 180ms ease, box-shadow 180ms ease",
              "&:hover": {
                transform: "translateY(-2px)",
              },
            }}
          >
            <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 2,
                }}
              >
                <Box>
                  <Typography
                    sx={{
                      color: "text.secondary",
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: 1.2,
                    }}
                  >
                    {label}
                  </Typography>
                  <Typography
                    sx={{
                      mt: 1,
                      color: "text.primary",
                      fontSize: 30,
                      fontWeight: 800,
                      lineHeight: 1,
                    }}
                  >
                    {value}
                  </Typography>
                  <Typography
                    sx={{
                      mt: 1,
                      color: "text.secondary",
                      fontSize: 12,
                    }}
                  >
                    {caption}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    display: "grid",
                    placeItems: "center",
                    borderRadius: 3,
                    background: (theme) =>
                      theme.palette.mode === "dark"
                        ? `linear-gradient(135deg, ${tint}, rgba(15,23,42,0.3))`
                        : `linear-gradient(135deg, ${tint}, rgba(255,255,255,0.7))`,
                    color: accent,
                    border: (theme) =>
                      `1px solid ${theme.palette.mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)"}`,
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25)",
                  }}
                >
                  {createElement(MetricIcon)}
                </Box>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Paper
        sx={{
          p: { xs: 2, md: 3 },
          mt: 3,
          borderRadius: 4,
          borderColor: "divider",
          background: (theme) =>
            theme.palette.mode === "dark"
              ? "linear-gradient(180deg, rgba(15, 23, 42, 0.96), rgba(15, 23, 42, 0.86))"
              : "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.94))",
          boxShadow: (theme) =>
            theme.palette.mode === "dark"
              ? "0 22px 48px rgba(2, 6, 23, 0.28)"
              : "0 18px 36px rgba(15, 23, 42, 0.08)",
          overflowX: "hidden",
          width: "100%",
          maxWidth: "100%",
        }}
        variant="outlined"
      >
        <Box
          sx={{
            display: "flex",
            alignItems: { xs: "flex-start", sm: "center" },
            justifyContent: "space-between",
            flexDirection: { xs: "column", sm: "row" },
            gap: 1.5,
            mb: 2,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              minWidth: 0,
              width: { xs: "100%", sm: "auto" },
            }}
          >
            <Box
              sx={{
                width: 30,
                height: 30,
                borderRadius: 1.5,
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
                bgcolor:
                  theme.palette.mode === "dark"
                    ? "rgba(239, 68, 68, 0.14)"
                    : "#fff1f2",
                color: "error.main",
              }}
            >
              <SchoolRoundedIcon sx={{ fontSize: 18 }} />
            </Box>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  flexWrap: "wrap",
                }}
              >
                <Typography
                  sx={{
                    fontWeight: 800,
                    fontSize: { xs: 14, sm: 15 },
                    lineHeight: 1.2,
                  }}
                >
                  CAFA Program Distribution
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    px: 1,
                    py: 0.4,
                    borderRadius: 1,
                    bgcolor:
                      theme.palette.mode === "dark"
                        ? "rgba(225, 29, 72, 0.16)"
                        : "#ffe4e6",
                    color: "error.main",
                    fontWeight: 700,
                    display: "inline-flex",
                    alignItems: "center",
                  }}
                >
                  COLLEGE OF ARCHITECTURE & FINE ARTS
                </Typography>
              </Box>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  display: "block",
                  mt: 0.5,
                  lineHeight: 1.4,
                }}
              >
                Verified student artists & artwork catalog by program
              </Typography>
            </Box>
          </Box>

          <Box
            sx={{
              display: "flex",
              gap: 0.75,
              width: { xs: "100%", sm: "auto" },
              flexWrap: "wrap",
              justifyContent: { xs: "stretch", sm: "flex-end" },
            }}
          >
            <Button
              size="small"
              variant={distributionMode === "students" ? "contained" : "outlined"}
              onClick={() => setDistributionMode("students")}
              aria-pressed={distributionMode === "students"}
              sx={{
                minWidth: 0,
                px: 1.75,
                py: 0.6,
                flex: { xs: 1, sm: "0 0 auto" },
                textTransform: "none",
                fontSize: { xs: 11, sm: 12 },
                fontWeight: distributionMode === "students" ? 700 : 600,
                borderRadius: 2,
                border: "1px solid",
                borderColor:
                  distributionMode === "students" ? "transparent" : "divider",
                bgcolor:
                  distributionMode === "students"
                    ? "error.main"
                    : theme.palette.mode === "dark"
                      ? "rgba(148, 163, 184, 0.08)"
                      : "#ffffff",
                color:
                  distributionMode === "students"
                    ? "#ffffff !important"
                    : "text.secondary",
                boxShadow:
                  distributionMode === "students"
                    ? "0 2px 8px rgba(211, 47, 47, 0.28)"
                    : "none",
                transition: "all 0.15s ease-in-out",
                "&:hover": {
                  bgcolor:
                    distributionMode === "students"
                      ? "error.dark"
                      : theme.palette.mode === "dark"
                        ? "rgba(148, 163, 184, 0.16)"
                        : "#f1f5f9",
                  color:
                    distributionMode === "students"
                      ? "#ffffff !important"
                      : "text.primary",
                },
              }}
            >
              By Artists ({enrolledArtists})
            </Button>
            <Button
              size="small"
              variant={distributionMode === "artworks" ? "contained" : "outlined"}
              onClick={() => setDistributionMode("artworks")}
              aria-pressed={distributionMode === "artworks"}
              sx={{
                minWidth: 0,
                px: 1.75,
                py: 0.6,
                flex: { xs: 1, sm: "0 0 auto" },
                textTransform: "none",
                fontSize: { xs: 11, sm: 12 },
                fontWeight: distributionMode === "artworks" ? 700 : 600,
                borderRadius: 2,
                border: "1px solid",
                borderColor:
                  distributionMode === "artworks" ? "transparent" : "divider",
                bgcolor:
                  distributionMode === "artworks"
                    ? "error.main"
                    : theme.palette.mode === "dark"
                      ? "rgba(148, 163, 184, 0.08)"
                      : "#ffffff",
                color:
                  distributionMode === "artworks"
                    ? "#ffffff !important"
                    : "text.secondary",
                boxShadow:
                  distributionMode === "artworks"
                    ? "0 2px 8px rgba(211, 47, 47, 0.28)"
                    : "none",
                transition: "all 0.15s ease-in-out",
                "&:hover": {
                  bgcolor:
                    distributionMode === "artworks"
                      ? "error.dark"
                      : theme.palette.mode === "dark"
                        ? "rgba(148, 163, 184, 0.16)"
                        : "#f1f5f9",
                  color:
                    distributionMode === "artworks"
                      ? "#ffffff !important"
                      : "text.primary",
                },
              }}
            >
              By Artworks ({artworkDistributionCount})
            </Button>
          </Box>
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md: "minmax(0, 0.82fr) minmax(0, 1.18fr)",
            },
            gap: { xs: 2, md: 3 },
            alignItems: "center",
            width: "100%",
            maxWidth: "100%",
          }}
        >
          <Box
            sx={{
              height: { xs: 220, sm: 250, md: 280 },
              position: "relative",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              minWidth: 0,
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey={distributionMode}
                  nameKey="name"
                  cx="50%"
                  cy="48%"
                  innerRadius="45%"
                  outerRadius="72%"
                  paddingAngle={1}
                  stroke={theme.palette.background.paper}
                  strokeWidth={2}
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [`${value} ${distributionMode === "students" ? "artists" : "artworks"}`, "Total"]}
                />
              </PieChart>
            </ResponsiveContainer>
            <Box
              sx={{
                position: "absolute",
                top: "48%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                textAlign: "center",
                pointerEvents: "none",
                px: 1,
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  display: "block",
                  color: "error.main",
                  fontWeight: 700,
                  fontSize: { xs: 11, sm: 12 },
                }}
              >
                CAFA
              </Typography>
              <Typography
                sx={{
                  fontSize: { xs: 18, sm: 20 },
                  fontWeight: 800,
                  lineHeight: 1.1,
                }}
              >
                {distributionTotal}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  fontSize: { xs: 10, sm: 12 },
                  display: "block",
                  maxWidth: { xs: 70, sm: 90, md: 100 },
                  lineHeight: 1.2,
                  mx: "auto",
                  whiteSpace: "normal",
                }}
              >
                {distributionMode === "students" ? "Verified Artists" : "Listed Artworks"}
              </Typography>
            </Box>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                display: "block",
                textAlign: "center",
                mt: -1,
                fontSize: { xs: 10, sm: 12 },
              }}
            >
              Hover or tap any sector to view program share
            </Typography>
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, minmax(0, 1fr))",
              },
              gap: 1,
              minWidth: 0,
              width: "100%",
            }}
          >
            {programData.map((program) => {
              const percentage = distributionTotal
                ? Math.round((program[distributionMode] / distributionTotal) * 100)
                : 0;
              return (
                <Box
                  key={program.name}
                  sx={{
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 1.5,
                    p: 1.2,
                    backgroundColor:
                      theme.palette.mode === "dark"
                        ? "rgba(148, 163, 184, 0.04)"
                        : "#f8fafc",
                    minWidth: 0,
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 1,
                    }}
                  >
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography
                        noWrap
                        sx={{
                          fontSize: { xs: 11, sm: 12 },
                          fontWeight: 700,
                        }}
                      >
                        <Box
                          component="span"
                          sx={{
                            display: "inline-block",
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            bgcolor: program.color,
                            mr: 0.75,
                            verticalAlign: "middle",
                          }}
                        />
                        {program.name}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: "block", mt: 0.25 }}
                      >
                        {program.students}{" "}
                        {program.students === 1 ? "student" : "students"}
                      </Typography>
                    </Box>
                    <Typography
                      variant="caption"
                      sx={{ fontWeight: 700, flexShrink: 0 }}
                    >
                      {percentage}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={percentage}
                    sx={{
                      mt: 0.8,
                      height: 4,
                      borderRadius: 2,
                      bgcolor:
                        theme.palette.mode === "dark"
                          ? "rgba(148, 163, 184, 0.16)"
                          : "#edf2f5",
                      "& .MuiLinearProgress-bar": {
                        bgcolor: program.color,
                        borderRadius: 2,
                      },
                    }}
                  />
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      display: "block",
                      textAlign: "right",
                      mt: 0.35,
                      lineHeight: 1.3,
                    }}
                  >
                    {program.artworks} {program.artworks === 1 ? "art" : "arts"}{" "}
                    listed
                  </Typography>
                </Box>
              );
            })}
            <Box
              sx={{
                gridColumn: { sm: "1 / -1" },
                display: "flex",
                gap: 1,
                alignItems: "flex-start",
                p: 1.4,
                border: `1px solid ${
                  theme.palette.mode === "dark"
                    ? "rgba(74, 222, 128, 0.45)"
                    : "#bbf7d0"
                }`,
                bgcolor:
                  theme.palette.mode === "dark"
                    ? "rgba(22, 101, 52, 0.28)"
                    : "#f0fdf4",
                borderRadius: 1.5,
                minWidth: 0,
              }}
            >
              <InfoOutlinedIcon
                sx={{
                  color: theme.palette.mode === "dark" ? "#4ade80" : "#16a34a",
                  fontSize: 18,
                  mt: 0.1,
                  flexShrink: 0,
                }}
              />
              <Typography
                variant="caption"
                sx={{
                  color: theme.palette.mode === "dark" ? "#bbf7d0" : "#166534",
                  lineHeight: 1.5,
                  fontSize: { xs: 11, sm: 12 },
                }}
              >
                <strong>100% Student Artist Proceeds (0% Platform Fee):</strong>{" "}
                RED NEXUS does not take any cut or commission from artist
                transactions. Every peso generated from art sales directly
                supports and empowers CAFA creators across architecture and fine
                arts departments.
              </Typography>
            </Box>
          </Box>
        </Box>
      </Paper>
      <Paper
        sx={{ p: { xs: 2, md: 3 }, mt: 3, borderRadius: 2 }}
        variant="outlined"
      >
        <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold" }}>
          Monthly Sales {statistics?.salesYear || ""}
        </Typography>

        <Box sx={{ width: "100%", height: 330, overflowX: "auto" }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip
                formatter={(value) => [
                  new Intl.NumberFormat("en-PH", {
                    style: "currency",
                    currency: "PHP",
                    maximumFractionDigits: 2,
                  }).format(Number(value)),
                  "Paid artwork sales",
                ]}
              />
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
      </Paper>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            md: "repeat(2, minmax(0, 1fr))",
          },
          gap: { xs: 2, sm: 2.5 },
          mt: 3,
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
          boxSizing: "border-box",
        }}
      >
        <Paper
          variant="outlined"
          sx={{
            p: { xs: 1.5, sm: 2, md: 2.5 },
            borderRadius: 3,
            minWidth: 0,
            maxWidth: "100%",
            width: "100%",
            boxSizing: "border-box",
            overflow: "hidden",
            bgcolor: (theme) =>
              theme.palette.mode === "dark"
                ? "background.paper"
                : "#ffffff",
          }}
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 1,
              flexWrap: "wrap",
              mb: 2,
            }}
          >
            <Typography
              variant="h6"
              sx={{
                fontWeight: "bold",
                fontSize: { xs: 15, sm: 16, md: 17 },
                lineHeight: 1.3,
                minWidth: 0,
              }}
            >
              Artworks Pending Verification
            </Typography>
            <Button
              onClick={() => navigate("/admin/artwork")}
              endIcon={
                <ArrowForwardIcon sx={{ fontSize: "16px !important" }} />
              }
              sx={{
                color: "#980404",
                fontSize: { xs: 12, sm: 13 },
                fontWeight: 600,
                textTransform: "none",
                borderRadius: "8px",
                px: { xs: 1, sm: 1.5 },
                py: 0.5,
                minWidth: 0,
                flexShrink: 0,
                transition: "all 0.2s ease-in-out",
                "&:hover": {
                  backgroundColor: "rgba(152, 4, 4, 0.08)",
                },
              }}
            >
              View all
            </Button>
          </Box>
          <Stack spacing={1} sx={{ minWidth: 0, width: "100%" }}>
            {artworksLoading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
                <CircularProgress size={24} aria-label="Loading pending artworks" />
              </Box>
            ) : artworkErrorMessage ? (
              <Typography color="error" variant="body2" sx={{ py: 2 }}>
                Pending artworks could not be loaded.
              </Typography>
            ) : pendingArtworks.length > 0 ? (
              pendingArtworks.map((artwork) => (
                <Box
                  key={artwork.artwork_id || artwork.id || artwork.title}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: { xs: 1, sm: 1.25 },
                    p: 1,
                    px: { xs: 1.25, sm: 1.5 },
                    borderRadius: 1.5,
                    bgcolor:
                      theme.palette.mode === "dark"
                        ? "rgba(255, 255, 255, 0.04)"
                        : "#f8fafc",
                    border: "1px solid",
                    borderColor:
                      theme.palette.mode === "dark"
                        ? "rgba(255, 255, 255, 0.06)"
                        : "#e2e8f0",
                    minWidth: 0,
                    maxWidth: "100%",
                    width: "100%",
                    boxSizing: "border-box",
                    overflow: "hidden",
                  }}
                >
                  <Box
                    sx={{
                      width: { xs: 40, sm: 48 },
                      height: { xs: 40, sm: 48 },
                      flexShrink: 0,
                      borderRadius: 1,
                      overflow: "hidden",
                      bgcolor:
                        theme.palette.mode === "dark"
                          ? "rgba(255, 255, 255, 0.08)"
                          : "#e2e8f0",
                    }}
                  >
                    {getArtworkImage(artwork) ? (
                      <ArtworkImage
                        image={getArtworkImage(artwork)}
                        alt={artwork.title || "Artwork"}
                        sx={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <ColorLensRoundedIcon sx={{ m: { xs: 1, sm: 1.5 }, color: "#94a3b8" }} />
                    )}
                  </Box>
                  <Box
                    sx={{
                      minWidth: 0,
                      flex: 1,
                      overflow: "hidden",
                      width: "100%",
                      maxWidth: "100%",
                    }}
                  >
                    <Typography
                      noWrap
                      sx={{
                        fontSize: { xs: 12, sm: 13 },
                        fontWeight: 700,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        maxWidth: "100%",
                      }}
                    >
                      {artwork.title || "Untitled artwork"}
                    </Typography>
                    <Typography
                      noWrap
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        display: "block",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        fontSize: { xs: 10.5, sm: 11.5 },
                        maxWidth: "100%",
                      }}
                    >
                      By{" "}
                      {artwork.artist_name ||
                        artwork.seller_name ||
                        artwork.first_name ||
                        "Student artist"}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: "right", flexShrink: 0, ml: "auto" }}>
                    <Typography sx={{ fontSize: { xs: 12, sm: 13 }, fontWeight: 700 }}>
                      ₱
                      {Number(
                        artwork.price || artwork.amount || 0,
                      ).toLocaleString()}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        display: "inline-block",
                        px: 0.75,
                        py: 0.1,
                        borderRadius: 1,
                        bgcolor:
                          theme.palette.mode === "dark"
                            ? "rgba(245, 158, 11, 0.2)"
                            : "#fef3c7",
                        color:
                          theme.palette.mode === "dark"
                            ? "#fbbf24"
                            : "#92400e",
                        fontSize: 10,
                        fontWeight: 600,
                      }}
                    >
                      Pending
                    </Typography>
                  </Box>
                </Box>
              ))
            ) : (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ py: 2, textAlign: "center" }}
              >
                No pending artworks found.
              </Typography>
            )}
          </Stack>
        </Paper>
        <Paper
          variant="outlined"
          sx={{
            p: { xs: 1.5, sm: 2, md: 2.5 },
            borderRadius: 3,
            minWidth: 0,
            maxWidth: "100%",
            width: "100%",
            boxSizing: "border-box",
            overflow: "hidden",
            bgcolor: (theme) =>
              theme.palette.mode === "dark"
                ? "background.paper"
                : "#ffffff",
          }}
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 1,
              flexWrap: "wrap",
              mb: 2,
            }}
          >
            <Typography
              variant="h6"
              sx={{
                fontWeight: "bold",
                fontSize: { xs: 15, sm: 16, md: 17 },
                lineHeight: 1.3,
                minWidth: 0,
              }}
            >
              Recent System Activity
            </Typography>
            <Button
              onClick={() => navigate("/admin/audit-logs")}
              endIcon={
                <ArrowForwardIcon sx={{ fontSize: "16px !important" }} />
              }
              sx={{
                color: "#980404",
                fontSize: { xs: 12, sm: 13 },
                fontWeight: 600,
                textTransform: "none",
                borderRadius: "8px",
                px: { xs: 1, sm: 1.5 },
                py: 0.5,
                minWidth: 0,
                flexShrink: 0,
                transition: "all 0.2s ease-in-out",
                "&:hover": {
                  backgroundColor: "rgba(152, 4, 4, 0.08)",
                },
              }}
            >
              View all
            </Button>
          </Box>
          <Stack spacing={1} sx={{ minWidth: 0, width: "100%" }}>
            {logsLoading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
                <CircularProgress size={24} aria-label="Loading recent activity" />
              </Box>
            ) : logsErrorMessage ? (
              <Typography color="error" variant="body2" sx={{ py: 2 }}>
                Recent activity could not be loaded.
              </Typography>
            ) : recentActivity.length > 0 ? (
              recentActivity.map((log, index) => (
                <Box
                  key={log.id || log.log_id || `${log.datetime}-${index}`}
                  sx={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 1.25,
                    p: { xs: 1, sm: 1.25 },
                    px: { xs: 1.25, sm: 1.5 },
                    borderRadius: 1.5,
                    bgcolor:
                      theme.palette.mode === "dark"
                        ? "rgba(255, 255, 255, 0.04)"
                        : "#f8fafc",
                    border: "1px solid",
                    borderColor:
                      theme.palette.mode === "dark"
                        ? "rgba(255, 255, 255, 0.06)"
                        : "#e2e8f0",
                    minWidth: 0,
                    maxWidth: "100%",
                    width: "100%",
                    boxSizing: "border-box",
                    overflow: "hidden",
                  }}
                >
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      bgcolor: "#10b981",
                      flexShrink: 0,
                      mt: 0.6,
                    }}
                  />
                  <Box
                    sx={{
                      minWidth: 0,
                      flex: 1,
                      overflow: "hidden",
                      width: "100%",
                      maxWidth: "100%",
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 1,
                        minWidth: 0,
                        width: "100%",
                        maxWidth: "100%",
                      }}
                    >
                      <Typography
                        noWrap
                        sx={{
                          fontSize: { xs: 11, sm: 12 },
                          fontWeight: 700,
                          minWidth: 0,
                          flex: 1,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                        title={log.action || "System activity"}
                      >
                        {log.action || "System activity"}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          flexShrink: 0,
                          whiteSpace: "nowrap",
                          fontSize: { xs: 10.5, sm: 11 },
                          ml: "auto",
                        }}
                      >
                        {formatActivityDate(log.datetime)}
                      </Typography>
                    </Box>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        display: "block",
                        fontSize: { xs: 11, sm: 11.5 },
                        wordBreak: "break-word",
                        overflowWrap: "anywhere",
                        whiteSpace: "normal",
                        lineHeight: 1.4,
                        mt: 0.35,
                        width: "100%",
                        maxWidth: "100%",
                        minWidth: 0,
                      }}
                    >
                      {log.information || log.role || "Admin activity"}
                    </Typography>
                  </Box>
                </Box>
              ))
            ) : (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ py: 2, textAlign: "center" }}
              >
                No recent activity found.
              </Typography>
            )}
          </Stack>
        </Paper>
      </Box>
      <Export
        open={openExportDialog}
        handleClose={() => setOpenExportDialog(false)}
        onExportCSV={exportLogsCSV}
        onExportExcel={exportLogsExcel}
      />
      {/* Snackbar Notification */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        TransitionComponent={SlideTransition}
      >
        <Alert
          onClose={closeSnackbar}
          severity={snackbarSeverity}
          variant="filled"
          sx={{
            width: { xs: 280, sm: 360 },
            minHeight: 48,
            borderRadius: 2,
            boxShadow: "0 10px 28px rgba(15, 23, 42, 0.18)",
            backgroundColor: getSeverityColor(snackbarSeverity),
            color: "#fff",
            alignItems: "center",
            "& .MuiAlert-icon": {
              color: "#fff",
              mr: 1,
            },
            "& .MuiAlert-message": {
              fontWeight: 600,
              fontSize: 14,
              display: "flex",
              alignItems: "center",
            },
            "& .MuiAlert-action": {
              alignItems: "center",
              paddingLeft: 1,
              color: "#fff",
            },
          }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
