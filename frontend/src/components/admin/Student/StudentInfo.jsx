import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Slide,
  Box,
  Typography,
} from "@mui/material";

// Animation transition
const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

function StudentInfo({
  open,
  handleClose,
  selectedStudent,
}) {

  const [student, setStudent] = useState(null);

  useEffect(() => {
    if (selectedStudent) {
      setStudent(selectedStudent);
    } else {
      setStudent(null);
    }
  }, [selectedStudent, open]);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      TransitionComponent={Transition}
      keepMounted
      PaperProps={{
        sx: { minWidth: "350px" },
      }}
    >
      <DialogTitle sx={{fontWeight: "bold"}}>Student Information</DialogTitle>

      <DialogContent>
        {student ? (
          <Box sx={{ mt: 1 }}>

            <Typography variant="body2" color="text.secondary">
              <strong>First Name:</strong> {student.first_name}
            </Typography>

            <Typography variant="body2" color="text.secondary">
              <strong>Middle Name:</strong> {student.middle_name || "Not provided"}
            </Typography>

            <Typography variant="body2" color="text.secondary">
              <strong>Last Name:</strong> {student.last_name}
            </Typography>

            <Typography variant="body2" color="text.secondary">
              <strong>Email:</strong> {student.email || "Not provided"}
            </Typography>
            
            <Typography variant="body2" color="text.secondary">
              <strong>Address:</strong> {student.address || "Not provided"}
            </Typography>
            
            <Typography variant="body2" color="text.secondary">
              <strong>Phone Number:</strong> {student.phone_number || "Not provided"}
            </Typography>

            <Typography variant="body2" color="text.secondary">
              <strong>Student Number:</strong> {student.student_number || "Not provided"}
            </Typography>

            <Typography variant="body2" color="text.secondary">
              <strong>Course:</strong> {student.course || "Not provided"}
            </Typography>

            <Typography variant="body2" color="text.secondary">
              <strong>Year Level:</strong> {student.year_level || "Not provided"}
            </Typography>

            <Typography variant="body2" color="text.secondary">
              <strong>Birthdate:</strong>{" "}
              {student.birthdate ? new Date(student.birthdate).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              }) : "Not provided"}
            </Typography>

            <Typography variant="body2" color="text.secondary">
              <strong>Register Status:</strong> {student.register_status ? student.register_status.toUpperCase(0).charAt(0) + student.register_status.slice(1) : "Pending"}
            </Typography>

            <Typography variant="body2" color="text.secondary">
              <strong>Register Date:</strong> {student.registered_date ? new Date(student.registered_date).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              }) : "Not provided"}
            </Typography>
    
            <Typography variant="body2" color="text.secondary">
              <strong>Approved Date:</strong> {student.approved_date ? new Date(student.approved_date).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              }) : "Not provided"}
            </Typography>
          </Box>
        ) : (
          <Typography>No student selected.</Typography>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} color="secondary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default StudentInfo;
