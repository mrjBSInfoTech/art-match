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
import { fetchArtworks } from "../../api/admin/artworkAPI";
import { fetchAuditLogs } from "../../api/admin/auditLogsAPI";
import { fetchStudents } from "../../api/admin/studentAPI";
import * as XLSX from "xlsx";
import dayjs from "dayjs";
import Export from "../../components/admin/Dashboard/Export";
import PasswordWarning from "../../components/admin/Dashboard/PasswordWarning";
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
  const navigate = useNavigate();
  const [artworks, setArtworks] = useState([]);
  const [students, setStudents] = useState([]);
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

  useEffect(() => {
    const loadStudents = async () => {
      try {
        const response = await fetchStudents("verified");
        setStudents(Array.isArray(response) ? response : []);
      } catch {
        setStudents([]);
      }
    };

    loadStudents();
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

  const programDefinitions = [
    {
      name: "BS Architecture",
      color: "#ef2028",
      mockStudents: 2,
      mockArtworks: 2,
    },
    {
      name: "BFA Painting",
      color: "#f6a400",
      mockStudents: 1,
      mockArtworks: 2,
    },
    {
      name: "BFA Advertising Arts",
      color: "#6366e8",
      mockStudents: 1,
      mockArtworks: 2,
    },
    {
      name: "BS Interior Design",
      color: "#10b981",
      mockStudents: 1,
      mockArtworks: 1,
    },
    {
      name: "BFA Industrial Design",
      color: "#12a9c5",
      mockStudents: 1,
      mockArtworks: 1,
    },
  ];
  const normalizeProgram = (value) =>
    String(value || "")
      .trim()
      .toLowerCase();
  const programData = programDefinitions.map((program) => {
    const programKey = normalizeProgram(program.name);
    const matchingStudents = students.filter((student) => {
      const course = normalizeProgram(student.course);
      return course === programKey || course.includes(programKey);
    });
    const matchingArtworks = artworks.filter((artwork) => {
      const course = normalizeProgram(artwork.course || artwork.program);
      return course === programKey || course.includes(programKey);
    });

    return {
      ...program,
      students: matchingStudents.length || program.mockStudents,
      artworks: matchingArtworks.length || program.mockArtworks,
    };
  });
  const artworkDistributionCount = programData.reduce(
    (total, program) => total + program.artworks,
    0,
  );
  const enrolledArtists = programData.reduce(
    (total, program) => total + program.students,
    0,
  );
  const programChartData = programData.filter(
    (program) => program.students > 0,
  );
  const chartData = programChartData;
  const getRecordTime = (record) =>
    new Date(
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
  const getArtworkImage = (artwork) =>
    artwork.image
      ? `http://localhost:5000/uploads/seller/uploadArtwork/${encodeURIComponent(artwork.image)}`
      : "";
  const formatActivityDate = (datetime) =>
    datetime ? dayjs(datetime).format("M/D/YYYY") : "-";

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
            minHeight: 142,
            borderRadius: 2.5,
            bgcolor: "background.paper",
            borderColor: "#e5eaf0",
            boxShadow: "0 2px 8px rgba(15, 23, 42, 0.05)",
          }}
        >
          <CardContent sx={{ p: 2.25, "&:last-child": { pb: 2.25 } }}>
            <Box sx={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 94 }}>
              <Box sx={{ position: "absolute", left: 0, textAlign: "left" }}>
                <Typography sx={{ color: "#64748b", fontSize: 11, fontWeight: 800, letterSpacing: 0.7, textTransform: "uppercase" }}>
                  Total Artworks
                </Typography>
                <Typography sx={{ mt: 0.5, color: "#172033", fontSize: 30, fontWeight: 800, lineHeight: 1.1 }}>
                  {artworkCount}
                </Typography>
                <Typography variant="caption" sx={{ color: "#94a3b8" }}>
                  {pendingArtworks.length} pending review
                </Typography>
              </Box>
              <Box sx={{ position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)", width: 44, height: 44, display: "grid", placeItems: "center", borderRadius: 2, bgcolor: "#fff1f2", color: "#b73636" }}>
                <ColorLensRoundedIcon />
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Card
          variant="outlined"
          sx={{
            flex: "1 1 350px",
            maxWidth: 600,
            minHeight: 142,
            borderRadius: 2.5,
            bgcolor: "background.paper",
            borderColor: "#e5eaf0",
            boxShadow: "0 2px 8px rgba(15, 23, 42, 0.05)",
          }}
        >
          <CardContent sx={{ p: 2.25, "&:last-child": { pb: 2.25 } }}>
            <Box sx={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 94 }}>
              <Box sx={{ position: "absolute", left: 0, textAlign: "left" }}>
                <Typography sx={{ color: "#64748b", fontSize: 11, fontWeight: 800, letterSpacing: 0.7, textTransform: "uppercase" }}>
                  Sold
                </Typography>
                <Typography sx={{ mt: 0.5, color: "#172033", fontSize: 30, fontWeight: 800, lineHeight: 1.1 }}>
                  {soldCount}
                </Typography>
                <Typography variant="caption" sx={{ color: "#94a3b8" }}>
                  Completed purchases
                </Typography>
              </Box>
              <Box sx={{ position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)", width: 44, height: 44, display: "grid", placeItems: "center", borderRadius: 2, bgcolor: "#fff1f2", color: "#b73636" }}>
                <SellRoundedIcon />
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Card
          variant="outlined"
          sx={{
            flex: "1 1 350px",
            maxWidth: 600,
            minHeight: 142,
            borderRadius: 2.5,
            bgcolor: "background.paper",
            borderColor: "#e5eaf0",
            boxShadow: "0 2px 8px rgba(15, 23, 42, 0.05)",
          }}
        >
          <CardContent sx={{ p: 2.25, "&:last-child": { pb: 2.25 } }}>
            <Box sx={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 94 }}>
              <Box sx={{ position: "absolute", left: 0, textAlign: "left" }}>
                <Typography sx={{ color: "#64748b", fontSize: 11, fontWeight: 800, letterSpacing: 0.7, textTransform: "uppercase" }}>
                  Total Sales
                </Typography>
                <Typography sx={{ mt: 0.5, color: "#172033", fontSize: 30, fontWeight: 800, lineHeight: 1.1 }}>
                  ₱{Number(salesCount).toLocaleString()}
                </Typography>
                <Typography variant="caption" sx={{ color: "#94a3b8" }}>
                  Total revenue generated
                </Typography>
              </Box>
              <Box sx={{ position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)", width: 44, height: 44, display: "grid", placeItems: "center", borderRadius: 2, bgcolor: "#fff1f2", color: "#b73636" }}>
                <CreditScoreIcon />
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>

      <Paper
        sx={{
          p: { xs: 2, md: 3 },
          mt: 3,
          borderRadius: 2,
          borderColor: "#e2e8f0",
          boxShadow: "0 2px 8px rgba(15, 23, 42, 0.04)",
        }}
        variant="outlined"
      >
        <Box
          sx={{
            display: "flex",
            alignItems: { xs: "flex-start", sm: "center" },
            justifyContent: "space-between",
            flexDirection: { xs: "column", sm: "row" },
            gap: 1,
            mb: 2,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box
              sx={{
                width: 30,
                height: 30,
                borderRadius: 1.5,
                display: "grid",
                placeItems: "center",
                bgcolor: "#fff1f2",
                color: "#ef2028",
              }}
            >
              <SchoolRoundedIcon sx={{ fontSize: 18 }} />
            </Box>
            <Box>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  flexWrap: "wrap",
                }}
              >
                <Typography sx={{ fontWeight: 800, fontSize: 15 }}>
                  CAFA Program Distribution
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    px: 1,
                    py: 0.4,
                    borderRadius: 1,
                    bgcolor: "#ffe4e6",
                    color: "#e11d48",
                    fontWeight: 700,
                  }}
                >
                  COLLEGE OF ARCHITECTURE & FINE ARTS
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">
                Departmental breakdown of student artists & artwork catalog
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: "flex", gap: 0.75 }}>
            <Button
              size="small"
              variant="contained"
              sx={{
                minWidth: 0,
                px: 1.5,
                textTransform: "none",
                bgcolor: "#f8fafc",
                color: "#172033",
                boxShadow: "none",
                border: "1px solid #edf1f5",
                fontSize: 11,
              }}
            >
              By Artists ({enrolledArtists})
            </Button>
            <Button
              size="small"
              variant="text"
              sx={{
                minWidth: 0,
                px: 1.5,
                textTransform: "none",
                color: "text.secondary",
                fontSize: 11,
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
              md: "minmax(260px, 0.8fr) minmax(380px, 1.2fr)",
            },
            gap: { xs: 2, md: 3 },
            alignItems: "center",
          }}
        >
          <Box sx={{ height: { xs: 250, md: 280 }, position: "relative" }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="students"
                  nameKey="name"
                  cx="50%"
                  cy="48%"
                  innerRadius="45%"
                  outerRadius="72%"
                  paddingAngle={1}
                  stroke="#ffffff"
                  strokeWidth={2}
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [`${value} students`, "Enrolled"]}
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
              }}
            >
              <Typography
                variant="caption"
                sx={{ display: "block", color: "#ef2028", fontWeight: 700 }}
              >
                CAFA
              </Typography>
              <Typography
                sx={{ fontSize: 20, fontWeight: 800, lineHeight: 1.1 }}
              >
                {enrolledArtists}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Enrolled Artists
              </Typography>
            </Box>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", textAlign: "center", mt: -1 }}
            >
              Hover or tap any sector to view program share
            </Typography>
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              gap: 1,
            }}
          >
            {programData.map((program) => {
              const percentage = enrolledArtists
                ? Math.round((program.students / enrolledArtists) * 100)
                : 0;
              return (
                <Box
                  key={program.name}
                  sx={{
                    border: "1px solid #e8edf2",
                    borderRadius: 1.5,
                    p: 1.2,
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 1,
                    }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography noWrap sx={{ fontSize: 12, fontWeight: 700 }}>
                        <Box
                          component="span"
                          sx={{
                            display: "inline-block",
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            bgcolor: program.color,
                            mr: 0.75,
                          }}
                        />
                        {program.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {program.students}{" "}
                        {program.students === 1 ? "student" : "students"}
                      </Typography>
                    </Box>
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>
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
                      bgcolor: "#edf2f5",
                      "& .MuiLinearProgress-bar": {
                        bgcolor: program.color,
                        borderRadius: 2,
                      },
                    }}
                  />
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", textAlign: "right", mt: 0.35 }}
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
                border: "1px solid #bbf7d0",
                bgcolor: "#f0fdf4",
                borderRadius: 1.5,
              }}
            >
              <InfoOutlinedIcon
                sx={{ color: "#16a34a", fontSize: 18, mt: 0.1 }}
              />
              <Typography variant="caption" color="#166534">
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
      </Paper>
      <Box
        sx={{
          display: "flex",
          gap: 2,
          flexDirection: { xs: "column", md: "row" },
          mt: 3,
        }}
      >
        <Paper
          sx={{
            p: { xs: 1.5, sm: 2, md: 3 },
            mt: 3,
            borderRadius: 2,
            width: { xs: "100%", md: "50%" },
          }}
          variant="outlined"
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: "bold" }}>
              Artworks Pending Verification
            </Typography>
            <Button
              onClick={() => navigate("/admin/artwork")}
              endIcon={
                <ArrowForwardIcon sx={{ fontSize: "18px !important" }} />
              }
              sx={{
                color: "#980404",
                fontSize: { xs: 12, sm: 14 },
                fontWeight: 600,
                textTransform: "none",
                borderRadius: "8px",
                px: 1.5,
                py: 0.5,
                transition: "all 0.2s ease-in-out",
                "&:hover": {
                  backgroundColor: "rgba(152, 4, 4, 0.08)",
                },
              }}
            >
              View all
            </Button>
          </Box>
          <Stack spacing={1}>
            {pendingArtworks.length > 0 ? (
              pendingArtworks.map((artwork) => (
                <Box
                  key={artwork.artwork_id || artwork.id || artwork.title}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.25,
                    p: 1,
                    borderRadius: 1.5,
                    bgcolor: "#f8fafc",
                  }}
                >
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      flexShrink: 0,
                      borderRadius: 1,
                      overflow: "hidden",
                      bgcolor: "#e2e8f0",
                    }}
                  >
                    {getArtworkImage(artwork) ? (
                      <Box
                        component="img"
                        src={getArtworkImage(artwork)}
                        alt={artwork.title || "Artwork"}
                        sx={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <ColorLensRoundedIcon sx={{ m: 1.5, color: "#94a3b8" }} />
                    )}
                  </Box>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography noWrap sx={{ fontSize: 12, fontWeight: 700 }}>
                      {artwork.title || "Untitled artwork"}
                    </Typography>
                    <Typography noWrap variant="caption" color="text.secondary">
                      By{" "}
                      {artwork.artist_name ||
                        artwork.seller_name ||
                        artwork.first_name ||
                        "Student artist"}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: "right", flexShrink: 0 }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 700 }}>
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
                        borderRadius: 1,
                        bgcolor: "#fef3c7",
                        color: "#92400e",
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
          sx={{
            p: { xs: 1.5, sm: 2, md: 3 },
            mt: 3,
            borderRadius: 2,
            width: { xs: "100%", md: "50%" },
          }}
          variant="outlined"
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: "bold" }}>
              Recent System Activity
            </Typography>
            <Button
              onClick={() => navigate("/admin/audit-logs")}
              endIcon={
                <ArrowForwardIcon sx={{ fontSize: "18px !important" }} />
              }
              sx={{
                color: "#980404",
                fontSize: { xs: 12, sm: 14 },
                fontWeight: 600,
                textTransform: "none",
                borderRadius: "8px",
                px: 1.5,
                py: 0.5,
                transition: "all 0.2s ease-in-out",
                "&:hover": {
                  backgroundColor: "rgba(152, 4, 4, 0.08)",
                },
              }}
            >
              View all
            </Button>
          </Box>
          <Stack spacing={1}>
            {recentActivity.length > 0 ? (
              recentActivity.map((log, index) => (
                <Box
                  key={log.id || log.log_id || `${log.datetime}-${index}`}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    p: 1,
                    px: 2.5,
                    borderRadius: 1.5,
                    bgcolor: "#f8fafc",
                  }}
                >
                  <Box
                    sx={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      bgcolor: "#10b981",
                      flexShrink: 0,
                    }}
                  />
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography noWrap sx={{ fontSize: 12, fontWeight: 700 }}>
                      {log.action || "System activity"}
                    </Typography>
                    <Typography noWrap variant="caption" color="text.secondary">
                      {log.information || log.role || "Admin activity"}
                    </Typography>
                  </Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ flexShrink: 0 }}
                  >
                    {formatActivityDate(log.datetime)}
                  </Typography>
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
      <PasswordWarning
        open={openPasswordWarning}
        handleClose={() => setOpenPasswordWarning(false)}
        navigate={navigate}
      />
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
