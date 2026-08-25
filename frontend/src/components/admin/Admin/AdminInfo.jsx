import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Slide,
  Typography,
  Stack,
} from "@mui/material";

// Animation transition
const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

function AdminInfo({ open, handleClose, selectedAdmin }) {
  const [admin, setAdmin] = useState(null);

  useEffect(() => {
    if (selectedAdmin) {
      setAdmin(selectedAdmin);
    } else {
      setAdmin(null);
    }
  }, [selectedAdmin, open]);

  function capitalize(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

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
      <DialogTitle sx={{ fontWeight: "bold" }}>Admin Information</DialogTitle>

      <DialogContent dividers>
        {admin && (
          <Stack spacing={1.5}>
            <Typography variant="body2"><strong>Username:</strong> {admin.username}</Typography>
            <Typography variant="body2"><strong>Name:</strong> {admin.first_name} {admin.last_name}</Typography>
            <Typography variant="body2"><strong>Email:</strong> {admin.email}</Typography>
            <Typography variant="body2"><strong>Role:</strong> {capitalize(admin.role)}</Typography>
            <Typography variant="body2"><strong>Can Add:</strong> {admin.can_add ? "Yes" : "No"}</Typography>
            <Typography variant="body2"><strong>Can Edit:</strong> {admin.can_edit ? "Yes" : "No"}</Typography>
            <Typography variant="body2"><strong>Can Delete:</strong> {admin.can_delete ? "Yes" : "No"}</Typography>
            <Typography variant="body2"><strong>Password Changes:</strong> {admin.password_changed ?? 0}</Typography>
            <Typography variant="body2"><strong>Date Created:</strong> {admin.date_created ? new Date(admin.date_created).toLocaleString() : "N/A"}</Typography>
          </Stack>
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

export default AdminInfo;
