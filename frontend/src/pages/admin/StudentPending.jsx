import { useState, useEffect, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import {
  Alert,
  Box,
  Button,
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
// Icons
import SearchIcon from "@mui/icons-material/Search";
import HomeIcon from "@mui/icons-material/Home";
import PersonIcon from "@mui/icons-material/Person";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import StudentPendingCard from "../../components/admin/Student/StudentPendingCard";
import StudentBulkVerify from "../../components/admin/Student/StudentBulkVerify";
import StudentBulkDeny from "../../components/admin/Student/StudentBulkDeny";
import {
  fetchStudents,
  updateStudent,
  denyStudent,
  bulkUpdateStudents,
  bulkDenyStudents,
} from "../../api/admin/studentAPI";

// Slide Transition for Snackbar
function SlideTransition(props) {
  return <Slide {...props} direction="up" />;
}

export default function StudentPending() {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [openStudentBulkVerify, setOpenStudentBulkVerify] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [openStudentBulkDeny, setOpenStudentBulkDeny] = useState(false);
  const [date, setDate] = useState(null);
  const [typeFilter, setTypeFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [studentErrorMessage, setStudentErrorMessage] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");

  // Fetch pending students from API
  const loadStudents = async () => {
    try {
      setLoading(true);
      const data = await fetchStudents("pending");
      console.log("Pending students loaded:", data);
      setStudents(data || []);
    } catch (err) {
      console.error("Error loading students:", err);
      setStudentErrorMessage("Failed to load students. Please try again later.");
    } finally {
      setLoading(false);
    }
  };
  // Load residents and citizens
  useEffect(() => {
    loadStudents();
  }, []);

  // Open Bulk Verify Student Modal
  const handleOpenStudentBulkVerify = (ids) => {
    setSelectedStudentIds(ids);
    setOpenStudentBulkVerify(true);
  };
  // Open Bulk Deny Student Modal
  const handleOpenStudentBulkDeny = (ids) => {
    setSelectedStudentIds(ids);
    setOpenStudentBulkDeny(true);
  };

  // ========== STUDENT HANDLERS ==========
  // Verify student registration
  const handleVerifyStudent = async (student) => {
    try {
      await updateStudent(student.student_id, "verified");
      showSnackbar("Student verified successfully", "success");
      await loadStudents();
    } catch (err) {
      console.error(`Error updating student: ${err.message}`, "error");
      showSnackbar(err.message || "Error updating student", "error");
    }
  };

  // Bulk verify selected students
  const handleBulkVerifyStudents = async (ids) => {
    try {
      await bulkUpdateStudents(ids);

      showSnackbar(`${ids.length} student(s) verified successfully`, "success");
      await loadStudents();
    } catch (err) {
      console.error("Error bulk verifying students:", err);
      setStudentErrorMessage(err.message || "Failed to bulk verify students");
    }
  };

  // Deny student registration
  const handleDenyStudent = async (student) => {
    try {
      await denyStudent(student.student_id);
      showSnackbar("Student was denied", "success");
      await loadStudents();
    } catch (err) {
      console.error("Error denying student:", err, "error");
      setStudentErrorMessage(err.message || "Error denying student");
    }
  };

  // Bulk deny selected students
  const handleBulkDenyStudents = async (ids) => {
    try {
      await bulkDenyStudents(ids);
      showSnackbar(`${ids.length} student(s) denied successfully`, "success");
      await loadStudents();
    } catch (err) {
      console.error("Error bulk denying students:", err);
      setStudentErrorMessage(err.message || "Failed to bulk deny students");
    }
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
        return "success.light"; 
      case "error":
        return "error.light"; 
      default:
        return "primary.light"; 
    }
  };

  // Filter students based on search and type filter
  const filteredPendingStudents = useMemo(() => {
    return students.filter((student) => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        (student.name && student.name.toLowerCase().includes(searchLower)) ||
        (student.student_name && student.student_name.toLowerCase().includes(searchLower)) ||
        (student.full_name && student.full_name.toLowerCase().includes(searchLower)) ||
        (student.email && student.email.toLowerCase().includes(searchLower));

      const matchesType =
        typeFilter === "all" ||
        (student.course && student.course.includes(typeFilter));

      return matchesSearch && matchesType;
    });
  }, [students, searchQuery, typeFilter]);

  return (
    <Box sx={{ p: 3 }}>
      <Helmet titleTemplate="%s - ArtMatch">
        <title>Student Pending</title>
      </Helmet>
      <Box>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: "bold" }}>
          Student Pending
        </Typography>
      </Box>

      {/* Filter Section */}
      <Paper sx={{ p: 3, mt: 3, borderRadius: 2 }} variant="outlined">
        <Typography variant="h6" sx={{ fontWeight: "bold" }}>Filter</Typography>
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
            placeholder="Search students..."
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
            <FormControl size="small" sx={{ width: { xs: "100%", lg: 180 } }}>
              <InputLabel>Course</InputLabel>
              <Select
                //value={typeFilter}
                label="Type"
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="BSA">Bachelor of Science in Arts</MenuItem>
                <MenuItem value="BSCS">
                  Bachelor of Science in Computer Science
                </MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>
      </Paper>
      <Paper sx={{ p: 3, mt: 3, borderRadius: 2 }} variant="outlined">
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        ) : studentErrorMessage ? (
          <Typography align="center" color="error" sx={{ py: 3 }}>
            {studentErrorMessage}
          </Typography>
        ) : (
          <StudentPendingCard
            students={filteredPendingStudents}
            onVerify={handleVerifyStudent}
            onDeny={handleDenyStudent}
            onBulkVerify={handleOpenStudentBulkVerify}
            onBulkDeny={handleOpenStudentBulkDeny}
          />
        )}
      </Paper>
      <StudentBulkVerify
        open={openStudentBulkVerify}
        handleClose={() => setOpenStudentBulkVerify(false)}
        onSubmit={handleBulkVerifyStudents}
        selectedStudents={selectedStudentIds}
      />
      <StudentBulkDeny
        open={openStudentBulkDeny}
        handleClose={() => setOpenStudentBulkDeny(false)}
        onSubmit={handleBulkDenyStudents}
        selectedStudents={selectedStudentIds}
      />
      {/* Snackbar Notification */}
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
    </Box>
  );
}
