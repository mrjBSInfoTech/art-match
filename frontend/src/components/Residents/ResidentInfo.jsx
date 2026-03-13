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

function ResidentInfo({
  open,
  handleClose,
  selectedResident,
}) {

  const [resident, setResident] = useState(null);

  useEffect(() => {
    if (selectedResident) {
      setResident(selectedResident);
    } else {
      setResident(null);
    }
  }, [selectedResident, open]);

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
      <DialogTitle>Resident Information</DialogTitle>

      <DialogContent>
        {resident ? (
          <Box sx={{ mt: 1 }}>

            <Typography variant="body2" color="text.secondary">
              <strong>First Name:</strong> {resident.first_name}
            </Typography>

            <Typography variant="body2" color="text.secondary">
              <strong>Middle Name:</strong> {resident.middle_name || "N/A"}
            </Typography>

            <Typography variant="body2" color="text.secondary">
              <strong>Last Name:</strong> {resident.last_name}
            </Typography>

            <Typography variant="body2" color="text.secondary">
              <strong>Gender:</strong> {resident.gender}
            </Typography>

            <Typography variant="body2" color="text.secondary">
              <strong>Email:</strong> {resident.email}
            </Typography>

            <Typography variant="body2" color="text.secondary">
              <strong>Phone Number:</strong> {resident.phone_number}
            </Typography>

            <Typography variant="body2" color="text.secondary">
              <strong>Birthdate:</strong> {new Date(resident.dob).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric"
              })}
            </Typography>

            <Typography variant="body2" color="text.secondary">
              <strong>Address:</strong> {resident.address}
            </Typography>

          </Box>
        ) : (
          <Typography>No resident selected.</Typography>
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

export default ResidentInfo;
