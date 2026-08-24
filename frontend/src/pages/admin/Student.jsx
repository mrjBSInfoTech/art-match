import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Box, Paper, Typography } from "@mui/material";
import UserManagementPanel from "../../components/admin/UserManagementPanel";
import {
  deleteStudent,
  fetchStudents,
  updateStudent,
} from "../../api/admin/studentAPI";

const fields = [
  { key: "first_name", label: "First name" },
  { key: "middle_name", label: "Middle name" },
  { key: "last_name", label: "Last name" },
  { key: "student_number", label: "Student number" },
  { key: "email", label: "Email" },
  { key: "phone_number", label: "Phone number" },
  { key: "course", label: "Course" },
  { key: "year_level", label: "Year level" },
  { key: "address", label: "Address" },
  { key: "birthdate", label: "Birthdate" },
  { key: "register_status", label: "Registration status" },
];

export default function Student() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  return (
    <Box sx={{ p: 3 }}>
      <Helmet titleTemplate="%s - ArtMatch">
        <title>Students</title>
      </Helmet>
      <Typography variant="h4" sx={{ fontWeight: "bold", mb: 3 }}>
        Manage Students
      </Typography>
      <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 2 }} variant="outlined">
        <UserManagementPanel
          users={students}
          type="student"
          fields={fields}
          loading={loading}
          error={error}
          onSave={saveStudent}
          onDelete={removeStudent}
        />
      </Paper>
    </Box>
  );
}
