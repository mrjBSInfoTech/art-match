import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Chip,
  Slide,
  Box,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
// Icons
import CloseIcon from "@mui/icons-material/Close";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";

// Animation transition
const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

function StudentInfo({ open, handleClose, selectedStudent }) {
  const theme = useTheme();
  const [student, setStudent] = useState(null);

  useEffect(() => {
    if (selectedStudent) {
      setStudent(selectedStudent);
    } else {
      setStudent(null);
    }
  }, [selectedStudent, open]);

  const detailLabelSx = {
    display: "block",
    color: theme.palette.text.secondary,
    fontSize: 11,
    lineHeight: 1.2,
    mb: 0.35,
  };

  const detailValueSx = {
    color: theme.palette.text.primary,
    fontSize: 12,
    fontWeight: 600,
    lineHeight: 1.35,
  };

  const formatDate = (value) =>
    value
      ? new Date(value).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      : "N/A";

  const imageUrl = student?.image
    ? `http://localhost:5000/uploads/seller/uploadProfile/${encodeURIComponent(student.image)}`
    : "http://localhost:5000/uploads/profile.jpg";

  const status = student?.register_status || "Pending";

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      TransitionComponent={Transition}
      keepMounted
      PaperProps={{
        sx: {
          width: "min(100% - 24px, 470px)",
          maxWidth: "470px",
          borderRadius: 3,
          overflow: "hidden",
          backgroundColor: theme.palette.background.paper,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.75,
          px: 2.5,
          py: 1.75,
          color: theme.palette.text.primary,
          fontSize: 16,
          fontWeight: 700,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <SchoolOutlinedIcon sx={{ color: "#ef3340", fontSize: 20 }} />
        Student Information
        <Button
          aria-label="Close student information"
          onClick={handleClose}
          sx={{
            minWidth: 28,
            width: 28,
            height: 28,
            ml: "auto",
            p: 0,
            color: theme.palette.text.secondary,
          }}
        >
          <CloseIcon sx={{ fontSize: 18 }} />
        </Button>
      </DialogTitle>

      <DialogContent
        sx={{ p: 2.5 }}
      >
        {student ? (
          <Box>
            <Box
              sx={{
                position: "relative",
                width: "100%",
                aspectRatio: "16 / 7",
                overflow: "hidden",
                borderRadius: 2,
                border: `1px solid ${theme.palette.divider}`,
                backgroundColor: theme.palette.background.default,
                mt: 1.5,
              }}
            >
              <Box
                component="img"
                src={imageUrl}
                alt={`${student.first_name || "Student"} profile`}
                onError={(event) => {
                  event.currentTarget.src =
                    "http://localhost:5000/uploads/profile.jpg";
                }}
                sx={{
                  width: "100%",
                  height: "100%",
                  display: "block",
                  objectFit: "cover",
                }}
              />
            </Box>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                gap: 1.5,
                mt: 1.75,
                p: 1.5,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2,
                backgroundColor: theme.palette.background.default,
              }}
            >
              <Box>
                <Typography sx={detailLabelSx}>Name</Typography>
                <Typography sx={detailValueSx}>
                  {student.first_name || "N/A"}{" "}
                  {student.middle_name ? `${student.middle_name} ` : ""}
                  {student.last_name || ""}
                </Typography>
              </Box>
              <Box>
                <Typography sx={detailLabelSx}>Student Number</Typography>
                <Typography sx={detailValueSx}>
                  {student.student_number || "N/A"}
                </Typography>
              </Box>
              <Box sx={{ gridColumn: { xs: "auto", sm: "1 / -1" } }}>
                <Typography sx={detailLabelSx}>Email</Typography>
                <Typography sx={detailValueSx}>
                  {student.email || "N/A"}
                </Typography>
              </Box>
              <Box>
                <Typography sx={detailLabelSx}>Course</Typography>
                <Typography sx={detailValueSx}>
                  {student.course || "N/A"}
                </Typography>
              </Box>
              <Box>
                <Typography sx={detailLabelSx}>Year Level</Typography>
                <Typography sx={detailValueSx}>
                  {student.year_level || "N/A"}
                </Typography>
              </Box>
              <Box>
                <Typography sx={detailLabelSx}>Phone Number</Typography>
                <Typography sx={detailValueSx}>
                  {student.phone_number || "N/A"}
                </Typography>
              </Box>
              <Box>
                <Typography sx={detailLabelSx}>Birthdate</Typography>
                <Typography sx={detailValueSx}>
                  {formatDate(student.birthdate)}
                </Typography>
              </Box>
              <Box sx={{ gridColumn: { xs: "auto", sm: "1 / -1" } }}>
                <Typography sx={detailLabelSx}>Address</Typography>
                <Typography sx={detailValueSx}>
                  {student.address || "N/A"}
                </Typography>
              </Box>
              <Box>
                <Typography sx={detailLabelSx}>Registered</Typography>
                <Typography sx={detailValueSx}>
                  {formatDate(student.registered_date)}
                </Typography>
              </Box>
            </Box>
          </Box>
        ) : (
          <Typography color="text.secondary">No student selected.</Typography>
        )}
      </DialogContent>

      <DialogActions
        sx={{
          px: 2.5,
          py: 1.5,
          borderTop: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Button
          onClick={handleClose}
          sx={{
            ml: "auto",
            backgroundColor: theme.palette.action.hover,
            color: theme.palette.text.primary,
            borderRadius: 1.5,
            px: 2.5,
            textTransform: "none",
            fontWeight: 700,
            "&:hover": { backgroundColor: theme.palette.action.selected },
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default StudentInfo;
