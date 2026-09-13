import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  Box,
  CircularProgress,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import StudentCard from "../../components/admin/Student/StudentCard";
import {
  deleteStudent,
  fetchStudents,
  updateStudent,
} from "../../api/admin/studentAPI";
import SearchIcon from "@mui/icons-material/Search";

export default function Student() {
  const theme = useTheme();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
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
          }}
        >
          <TextField
            variant="outlined"
            placeholder="Search students..."
            size="small"
            sx={{
              width: { xs: "100%", sm: 275 },
              "& .MuiOutlinedInput-root": {
                color: theme.palette.text.primary,
                backgroundColor: theme.palette.background.default,
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
          <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 220 } }}>
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
            onSave={saveStudent}
            onDelete={removeStudent}
            onAccessChange={loadStudents}
          />
        )}
      </Paper>
    </Box>
  );
}
