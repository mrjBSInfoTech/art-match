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

function OfficialInfo({
  open,
  handleClose,
  selectedOfficial,
}) {

  const [official, setOfficial] = useState(null);

  useEffect(() => {
    if (selectedOfficial) {
      setOfficial(selectedOfficial);
    } else {
      setOfficial(null);
    }
  }, [selectedOfficial, open]);

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
      <DialogTitle>Official Information</DialogTitle>

      <DialogContent>
        {official ? (
          <Box sx={{ mt: 1 }}>

            <Typography variant="body2" color="text.secondary">
              <strong>First Name:</strong> {official.first_name}
            </Typography>

            <Typography variant="body2" color="text.secondary">
              <strong>Middle Name:</strong> {official.middle_name || "N/A"}
            </Typography>

            <Typography variant="body2" color="text.secondary">
              <strong>Last Name:</strong> {official.last_name}
            </Typography>

            <Typography variant="body2" color="text.secondary">
              <strong>Position:</strong> {official.position}
            </Typography>

            <Typography variant="body2" color="text.secondary">
              <strong>Email:</strong> {official.email}
            </Typography>

            <Typography variant="body2" color="text.secondary">
              <strong>Phone Number:</strong> {official.phone_number}
            </Typography>

            <Typography variant="body2" color="text.secondary">
              <strong>Birthdate:</strong> {new Date(official.dob).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric"
              })}
            </Typography>

            <Typography variant="body2" color="text.secondary">
              <strong>Address:</strong> {official.address}
            </Typography>

          </Box>
        ) : (
          <Typography>No official selected.</Typography>
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

export default OfficialInfo;
