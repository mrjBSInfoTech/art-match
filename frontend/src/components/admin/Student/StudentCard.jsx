import { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  IconButton,
  Menu,
  MenuItem,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import StudentInfo from "./StudentInfo";

export default function StudentCard({ students = [], onEdit, onDelete }) {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [openInfoDialog, setOpenInfoDialog] = useState(false);

  const getId = (student) => student?.student_id ?? student?.id;
  const getName = (student) =>
    `${student?.first_name || ""} ${student?.last_name || ""}`.trim() ||
    "Unnamed student";

  const handleMenuOpen = (event, student) => {
    setAnchorEl(event.currentTarget);
    setSelectedStudent(student);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  return (
    <Box>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, minmax(0, 1fr))",
            md: "repeat(3, minmax(0, 1fr))",
            lg: "repeat(5, minmax(0, 1fr))",
          },
          gap: { xs: 1.5, sm: 2 },
          alignItems: "stretch",
        }}
      >
        {students.map((student) => {
          const id = getId(student);

          return (
            <Card
              key={id}
              sx={{
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                height: "100%",
                minHeight: 270,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
                boxShadow: "none",
                backgroundColor: theme.palette.background.paper,
                transition: "border-color 0.2s, box-shadow 0.2s",
                "&:hover": {
                  borderColor: "text.secondary",
                  boxShadow: "0 5px 14px rgba(15, 23, 42, 0.1)",
                },
              }}
            >
              <Box
                sx={{
                  width: "100%",
                  height: 170,
                  position: "relative",
                  backgroundColor:
                    theme.palette.mode === "dark" ? "#1e293b" : "#f1f5f9",
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CardMedia
                  component="img"
                  sx={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    objectPosition: "center",
                  }}
                  image={
                    student.image
                      ? `http://localhost:5000/uploads/seller/uploadProfile/${encodeURIComponent(student.image)}`
                      : "http://localhost:5000/uploads/profile.jpg"
                  }
                  alt={getName(student)}
                  onError={(event) => {
                    event.target.onerror = null;
                    event.target.src =
                      "http://localhost:5000/uploads/profile.jpg";
                  }}
                />
              </Box>

              <CardContent
                sx={{
                  p: 1.5,
                  "&:last-child": { pb: 1.5 },
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    mb: 0.75,
                  }}
                >
                  <Box sx={{ flex: 1 }}>
                    <Typography
                      variant="subtitle2"
                      sx={{
                        fontWeight: 700,
                        lineHeight: 1.2,
                        fontSize: 14,
                      }}
                      noWrap
                    >
                      {getName(student)}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        color: "text.secondary",
                        display: "block",
                        mt: 0.25,
                        fontSize: 11,
                      }}
                    >
                      {student.student_number || "No student number"}
                    </Typography>
                  </Box>

                  <IconButton
                    size="small"
                    onClick={(event) => handleMenuOpen(event, student)}
                  >
                    <MoreVertIcon fontSize="small" />
                  </IconButton>
                </Box>

                <Button
                  variant="contained"
                  size="small"
                  fullWidth
                  startIcon={<VisibilityOutlinedIcon sx={{ fontSize: 15 }} />}
                  onClick={() => {
                    setSelectedStudent(student);
                    setOpenInfoDialog(true);
                  }}
                  sx={{
                    mt: "auto",
                    py: 0.7,
                    backgroundColor:
                      theme.palette.mode === "dark" ? "#1e293b" : "#f1f5f9",
                    color: theme.palette.text.primary,
                    border: "1px solid",
                    borderColor: "divider",
                    boxShadow: "none",
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: "none",
                    borderRadius: 1.5,
                    "& .MuiButton-startIcon": {
                      color: theme.palette.error.main,
                    },
                    "&:hover": {
                      backgroundColor: theme.palette.action.hover,
                      borderColor: theme.palette.text.secondary,
                      boxShadow: "none",
                    },
                  }}
                >
                  View Details
                </Button>

                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl) && getId(selectedStudent) === id}
                  onClose={handleMenuClose}
                  anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                  transformOrigin={{ vertical: "top", horizontal: "right" }}
                >
                  <MenuItem
                    onClick={() => {
                      onEdit?.(selectedStudent);
                      handleMenuClose();
                    }}
                    sx={{ color: "success.main" }}
                  >
                    <EditIcon sx={{ mr: 1, fontSize: 20 }} />
                    Edit
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      onDelete?.(id);
                      handleMenuClose();
                    }}
                    sx={{ color: "error.main" }}
                  >
                    <DeleteIcon sx={{ mr: 1, fontSize: 20 }} />
                    Delete
                  </MenuItem>
                </Menu>
              </CardContent>
            </Card>
          );
        })}
      </Box>

      <StudentInfo
        open={openInfoDialog}
        handleClose={() => setOpenInfoDialog(false)}
        selectedStudent={selectedStudent}
      />
    </Box>
  );
}
