import { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Grid,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import StudentInfo from "./StudentInfo";
import StudentBulkVerify from "./StudentBulkVerify";
import StudentBulkDeny from "./StudentBulkDeny";
// Icons
import VerifiedUserRoundedIcon from "@mui/icons-material/VerifiedUserRounded";
import HourglassBottomRoundedIcon from "@mui/icons-material/HourglassBottomRounded";

export default function StudentPendingCard({
  students = [],
  onVerify,
  onDeny,
  onBulkVerify,
  onBulkDeny,
  onView,
}) {
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [corPreviewOpen, setCorPreviewOpen] = useState(false);
  const [corPreviewUrl, setCorPreviewUrl] = useState("");
  const [studentInfoOpen, setStudentInfoOpen] = useState(false);
  const [openBulkVerify, setOpenBulkVerify] = useState(false);
  const [openBulkDeny, setOpenBulkDeny] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);

  const open = Boolean(studentInfoOpen);
  const pendingStudents = Array.isArray(students) ? students : [];
  const isAllSelected =
    pendingStudents.length > 0 &&
    selectedStudentIds.length === pendingStudents.length;
  const isSomeSelected =
    selectedStudentIds.length > 0 &&
    selectedStudentIds.length < pendingStudents.length;

  const toggleStudentSelection = (studentId) => {
    setSelectedStudentIds((current) =>
      current.includes(studentId)
        ? current.filter((id) => id !== studentId)
        : [...current, studentId],
    );
  };

  const handleSelectAll = () => {
    if (selectedStudentIds.length === pendingStudents.length) {
      setSelectedStudentIds([]);
      return;
    }
    setSelectedStudentIds(pendingStudents.map((student) => student.student_id));
  };
  // 🔹 Execute Bulk Verify
  const handleBulkVerify = () => {
    const ids = Array.from(selectedStudentIds);
    if (onBulkVerify) {
      onBulkVerify(ids);
    }
    setSelectedStudentIds([]);
  };

  // 🔹 Execute Bulk Deny
  const handleBulkDeny = () => {
    const ids = Array.from(selectedStudentIds);
    if (onBulkDeny) {
      onBulkDeny(ids);
    }
    setSelectedStudentIds([]);
  };

  const handleOpenInfo = (student) => {
    setSelectedStudent(student);
    setStudentInfoOpen(true);
  };

  const handleCloseInfo = () => {
    setStudentInfoOpen(false);
    setSelectedStudent(null);
  };

  const getStudentName = (student) => {
    return `${student.first_name || ""} ${student.middle_name ? student.middle_name.charAt(0) + ". " : ""}${student.last_name || ""}`.trim();
  };

  const getInitials = (name) => {
    if (!name) return "S";
    const parts = name.split(" ").filter(Boolean);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
  };

  const getCorUrl = (student) => {
    if (!student?.cor) return "";
    if (/^https?:\/\//i.test(student.cor)) return student.cor;
    return `http://localhost:5000/uploads/seller/uploadCOR/${encodeURIComponent(student.cor)}`;
  };

  const openCorPreview = (student) => {
    const url = getCorUrl(student);
    if (!url) return; 
    setCorPreviewUrl(url);
    setCorPreviewOpen(true);
  };

  const hide = (style) => {
    style.display = "none";
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 1.5,
        }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          alignItems={{ xs: "flex-start", sm: "center" }}
        >
          <Typography variant="h6" sx={{ fontWeight: "bold" }}>
            Pending Students
          </Typography>
          {pendingStudents.length > 0 && (
            <Typography variant="body2" color="text.secondary">
              {selectedStudentIds.length > 0
                ? `${selectedStudentIds.length} selected`
                : "Select students"}
            </Typography>
          )}
        </Stack>

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          alignItems={{ xs: "flex-start", sm: "center" }}
        >
          {selectedStudentIds.length > 0 && (
            <>
              <Button
                variant="contained"
                color="success"
                size="small"
                sx={{ color: "white" }}
                onClick={handleBulkVerify}
              >
                Verify Selected
              </Button>
              {hide && (
                <Button
                  variant="contained"
                  color="error"
                  size="small"
                  sx={{ color: "white" }}
                  onClick={handleBulkDeny}
                >
                  Deny Selected
                </Button>
              )}
              
            </>
          )}

          {pendingStudents.length > 0 && (
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Checkbox
                checked={isAllSelected}
                indeterminate={isSomeSelected}
                onChange={handleSelectAll}
              />
              <Typography variant="body2">Select All</Typography>
            </Box>
          )}
        </Stack>
      </Box>

      {pendingStudents.length === 0 ? (
        <Typography align="center" color="textSecondary" sx={{ py: 3 }}>
          No pending student registrations
        </Typography>
      ) : (
        <Grid container spacing={2}>
          {pendingStudents.map((student) => {
            const studentId = student.student_id ?? student.id;
            const studentName = getStudentName(student);
            const corUrl = getCorUrl(student);
            const isSelected = selectedStudentIds.includes(studentId);

            return (
              <Grid item xs={12} sm={6} md={4} key={studentId}>
                <Card
                  sx={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    borderRadius: 2,
                    boxShadow:
                      "0 2px 4px rgba(0,0,0,0.1), 0 8px 16px rgba(0,0,0,0.1)",
                  }}
                >
                  <CardContent
                    sx={{
                      p: 3,
                      display: "flex",
                      flexDirection: "column",
                      gap: 1.5,
                      flexGrow: 1,
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                      }}
                    >
                      <Box
                        sx={{ display: "flex", alignItems: "center", flex: 1 }}
                      >
                        <Checkbox
                          checked={isSelected}
                          onChange={() => toggleStudentSelection(studentId)}
                          sx={{ mr: 1, p: 0.5 }}
                        />
                        <Typography
                          variant="subtitle1"
                          sx={{
                            fontWeight: 600,
                            lineHeight: 1.2,
                            wordBreak: "break-word",
                          }}
                        >
                          {studentName}
                        </Typography>
                      </Box>

                      <IconButton
                        size="small"
                        onClick={() => handleOpenInfo(student)}
                        aria-label="student-info"
                      >
                        <InfoOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Box>

                    <Chip
                      label="Pending Verification"
                      size="small"
                      color="warning"
                      sx={{ alignSelf: "flex-start" }}
                    />

                    <Box>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ fontWeight: 600, mb: 0.25 }}
                      >
                        Course:
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ wordBreak: "break-word" }}
                      >
                        {student.course ||
                          student.course_name ||
                          "Not provided"}
                      </Typography>
                    </Box>

                    <Box>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ fontWeight: 600, mb: 0.25 }}
                      >
                        Year Level:
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ wordBreak: "break-word" }}
                      >
                        {student.year_level || student.year || "Not provided"}
                      </Typography>
                    </Box>

                    <Box>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ fontWeight: 600, mb: 0.25 }}
                      >
                        Student Number:
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ wordBreak: "break-word" }}
                      >
                        {student.student_number}
                      </Typography>
                    </Box>

                    <Box>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ fontWeight: 600, mb: 0.25 }}
                      >
                        COR:
                      </Typography>
                      {corUrl ? (
                        <Button
                          size="small"
                          onClick={() => openCorPreview(student)}
                          sx={{ p: 0, minWidth: 0, textTransform: "none" }}
                        >
                          View COR
                        </Button>
                      ) : (
                        <Typography variant="body2">No COR uploaded</Typography>
                      )}
                    </Box>

                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      spacing={1}
                      sx={{ mt: "auto", pt: 1 }}
                    >
                      <Button
                        fullWidth
                        size="small"
                        variant="contained"
                        color="success"
                        sx={{ color: "white" }}
                        onClick={() => onVerify(student)}
                      >
                        Verify
                      </Button>
                      {hide && (
                        <Button
                          fullWidth
                          size="small"
                          variant="contained"
                          color="error"
                          onClick={() => onDeny(student)}
                        >
                          Deny
                        </Button>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      <StudentInfo
        open={studentInfoOpen}
        handleClose={handleCloseInfo}
        selectedStudent={selectedStudent}
      />

      <Dialog
        open={corPreviewOpen}
        onClose={() => setCorPreviewOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Student COR</DialogTitle>
        <DialogContent>
          {corPreviewUrl ? (
            <Box
              component="img"
              src={corPreviewUrl}
              alt="Student COR"
              sx={{
                width: "100%",
                maxHeight: 500,
                objectFit: "contain",
                borderRadius: 1,
              }}
            />
          ) : (
            <Typography variant="body2">
              No COR available for preview.
            </Typography>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
