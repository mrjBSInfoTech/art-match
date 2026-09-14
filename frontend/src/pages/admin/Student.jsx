import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Slide,
  Snackbar,
  TextField,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import SearchIcon from "@mui/icons-material/Search";
import StudentCard from "../../components/admin/Student/StudentCard";
import StudentForm from "../../components/admin/Student/StudentForm";
import StudentBulkAdd from "../../components/admin/Student/StudentAddBulk";
import StudentDelete from "../../components/admin/Student/StudentDelete";
import {
  addStudents,
  deleteStudent,
  fetchStudents,
  updateStudent,
} from "../../api/admin/studentAPI";

// Slide Transition for Snackbar
function SlideTransition(props) {
  return <Slide {...props} direction="up" />;
}

export default function Student() {
  const theme = useTheme();
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [openStudentForm, setOpenStudentForm] = useState(false);
  const [openStudentDelete, setOpenStudentDelete] = useState(false);
  const [openBulkAdd, setOpenBulkAdd] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");

  const loadStudents = async () => {
    try {
      setLoading(true);
      setStudents(await fetchStudents());
      setError("");
    } catch (err) {
      setError(err.message || "Failed to load students.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  const saveStudent = async (id, data) => {
    await updateStudent(id, data);
    await loadStudents();
  };

  const removeStudent = async (id) => {
    await deleteStudent(id);
    await loadStudents();
  };

  const handleOpenAdd = () => {
    setSelectedStudent(null);
    setOpenStudentForm(true);
  };

  const handleOpenEdit = (student) => {
    setSelectedStudent(student);
    setOpenStudentForm(true);
  };

  const handleOpenDelete = (student) => {
    setSelectedStudent(student);
    setOpenStudentDelete(true);
  };

  const handleCloseForm = () => {
    setOpenStudentForm(false);
    setSelectedStudent(null);
  };

  const handleSubmitStudent = async (formData) => {
    try {
      if (selectedStudent) {
        await updateStudent(selectedStudent.student_id, formData);
        showSnackbar("Student updated successfully.", "success");
      } else {
        await addStudents(formData);
        showSnackbar("Student created successfully.", "success");
      }

      await loadStudents();
      handleCloseForm();
    } catch (err) {
      showSnackbar(err.message || "Unable to save student.", "error");
      throw err;
    }
  };

  const handleDeleteStudent = async (id) => {
    try {
      await deleteStudent(id);
      await loadStudents();
      showSnackbar("Student deleted successfully.", "success");
      setOpenStudentDelete(false);
      setSelectedStudent(null);
    } catch (err) {
      showSnackbar(err.message || "Unable to delete student.", "error");
    }
  };

  const handleBulkSuccess = async () => {
    setOpenBulkAdd(false);
    await loadStudents();
    showSnackbar("Students imported successfully.", "success");
  };

  const filteredStudents = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();
    return students.filter((student) => {
      const matchesSearch = [
        student.first_name,
        student.middle_name,
        student.last_name,
        student.student_number,
        student.email,
        student.course,
      ].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(search),
      );
      const matchesCourse =
        courseFilter === "all" ||
        String(student.course || "").includes(courseFilter);
      return matchesSearch && matchesCourse;
    });
  }, [courseFilter, searchQuery, students]);

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

  return (
    <Box
      sx={{
        p: { xs: 1.5, sm: 2.5 },
        minHeight: "100vh",
        backgroundColor: theme.palette.background.default,
        color: theme.palette.text.primary,
      }}
    >
      <Helmet titleTemplate="%s - ArtMatch">
        <title>Students</title>
      </Helmet>
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "stretch", sm: "center" },
          gap: 2,
          mb: 2,
        }}
      >
        <Box>
          <Typography
            sx={{
              fontSize: { xs: 28, sm: 34 },
              fontWeight: 800,
              lineHeight: 1.1,
              color: theme.palette.text.primary,
            }}
          >
            Manage Students
          </Typography>
          <Typography
            sx={{
              mt: 0.75,
              color: theme.palette.text.secondary,
              fontSize: 13,
            }}
          >
            Monitor and manage the student accounts of the platform
          </Typography>
        </Box>
        <Box
          sx={{ display: "flex", gap: 1, width: { xs: "100%", sm: "auto" } }}
        >
          <Button
            variant="outlined"
            onClick={() => setOpenBulkAdd(true)}
            sx={{
              width: { xs: "100%", sm: 150 },
              height: { xs: 38, sm: 44 },
              minWidth: { xs: 45, sm: 50 },
              fontSize: { xs: 12, sm: 14 },
              padding: 0,
              borderRadius: 1.5,
              textTransform: "none",
              fontWeight: 700,
            }}
          >
            Bulk Add
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleOpenAdd}
            sx={{
              width: { xs: "100%", sm: 150 },
              height: { xs: 38, sm: 44 },
              minWidth: { xs: 45, sm: 50 },
              fontSize: { xs: 12, sm: 16 },
              padding: 0,
              borderRadius: 1.5,
              textTransform: "none",
              fontWeight: 700,
            }}
          >
            Add Student
          </Button>
        </Box>
      </Box>

      <Paper
        sx={{
          p: { xs: 1.25, sm: 1.5 },
          mt: 2,
          borderRadius: 2,
          backgroundColor: theme.palette.background.paper,
          borderColor: theme.palette.divider,
        }}
        variant="outlined"
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", lg: "row" },
            justifyContent: "space-between",
            alignItems: { xs: "stretch", lg: "center" },
            gap: 1.25,
            width: "100%",
          }}
        >
          <TextField
            variant="outlined"
            placeholder="Search students..."
            size="small"
            sx={{
              width: { xs: "100%", lg: 320 },
              maxWidth: { lg: 360 },
              flex: { lg: 1 },
              "& .MuiOutlinedInput-root": {
                color: theme.palette.text.primary,
                backgroundColor: theme.palette.background.default,
                borderRadius: 1.5,
                "& fieldset": { borderColor: theme.palette.divider },
                "&:hover fieldset": {
                  borderColor: theme.palette.text.secondary,
                },
              },
              "& .MuiInputBase-input::placeholder": {
                color: theme.palette.text.secondary,
                opacity: 1,
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
          <FormControl
            size="small"
            sx={{
              minWidth: { xs: "100%", sm: 220 },
              width: { xs: "100%", lg: "auto" },
            }}
          >
            <InputLabel
              sx={{ color: theme.palette.text.secondary, fontSize: 12 }}
            >
              Course
            </InputLabel>
            <Select
              value={courseFilter}
              label="Course"
              onChange={(event) => setCourseFilter(event.target.value)}
              sx={{
                fontSize: 12,
                color: theme.palette.text.primary,
                backgroundColor: theme.palette.background.default,
                borderRadius: 1.5,
                ".MuiOutlinedInput-notchedOutline": {
                  borderColor: theme.palette.divider,
                },
              }}
            >
              <MenuItem value="all">All Courses</MenuItem>
              <MenuItem value="BSA">Bachelor of Science in Arts</MenuItem>
              <MenuItem value="BSCS">
                Bachelor of Science in Computer Science
              </MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>

      <Paper
        sx={{ p: { xs: 1.5, sm: 2 }, mt: 2, borderRadius: 2 }}
        variant="outlined"
      >
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Typography align="center" color="error" sx={{ py: 3 }}>
            {error}
          </Typography>
        ) : filteredStudents.length === 0 ? (
          <Typography align="center" color="text.secondary" sx={{ py: 3 }}>
            No student records found.
          </Typography>
        ) : (
          <StudentCard
            students={filteredStudents}
            onEdit={handleOpenEdit}
            onDelete={handleOpenDelete}
          />
        )}
      </Paper>

      <StudentForm
        open={openStudentForm}
        handleClose={handleCloseForm}
        selectedStudent={selectedStudent}
        onSubmit={handleSubmitStudent}
      />

      <StudentBulkAdd
        open={openBulkAdd}
        handleClose={() => setOpenBulkAdd(false)}
        onSuccess={handleBulkSuccess}
        showSnackbar={showSnackbar}
      />

      <StudentDelete
        open={openStudentDelete}
        handleClose={() => {
          setOpenStudentDelete(false);
          setSelectedStudent(null);
        }}
        onSubmit={handleDeleteStudent}
        selectedStudent={selectedStudent}
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
