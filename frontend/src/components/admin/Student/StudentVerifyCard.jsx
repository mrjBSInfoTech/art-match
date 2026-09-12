import { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import StudentInfo from "./StudentInfo";
// Icons
import VerifiedUserRoundedIcon from "@mui/icons-material/VerifiedUserRounded";
import HourglassBottomRoundedIcon from "@mui/icons-material/HourglassBottomRounded";

export default function StudentVerifyCard({ students = [] }) {
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [corPreviewOpen, setCorPreviewOpen] = useState(false);
  const [corPreviewUrl, setCorPreviewUrl] = useState("");
  const [studentInfoOpen, setStudentInfoOpen] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);

  const open = Boolean(studentInfoOpen);
  const verifiedStudents = Array.isArray(students) ? students : [];

  const getStudentName = (student) => {
    return `${student.first_name || ""} ${student.middle_name ? student.middle_name.charAt(0) + ". " : ""}${student.last_name || ""}`.trim();
  };

  const handleOpenInfo = (student) => {
    setSelectedStudent(student);
    setStudentInfoOpen(true);
  };

  const handleCloseInfo = () => {
    setStudentInfoOpen(false);
    setSelectedStudent(null);
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
            Verified Students
          </Typography>
          {verifiedStudents.length > 0 && (
            <Typography variant="body2" color="text.secondary">
              {verifiedStudents.length} verified
            </Typography>
          )}
        </Stack>
      </Box>

      {verifiedStudents.length === 0 ? (
        <Typography align="center" color="textSecondary" sx={{ py: 3 }}>
          No verified student records
        </Typography>
      ) : (
        <Grid container spacing={2}>
          {verifiedStudents.map((student) => {
            const studentId = student.student_id ?? student.id;
            const studentName = getStudentName(student);
            const corUrl = getCorUrl(student);

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
                      icon={<VerifiedUserRoundedIcon />}
                      label="Verified"
                      size="small"
                      color="success"
                      sx={{ alignSelf: "flex-start", color: "white" }}
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
