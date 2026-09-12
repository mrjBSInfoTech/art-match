import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Slide,
  Alert,
  Typography,
} from "@mui/material";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

function ChangeInfoProfile({
  open,
  handleClose,
  password,
  onPasswordChange,
  error,
  loading,
  onConfirm,
}) {
  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : handleClose}
      disableRestoreFocus
      TransitionComponent={Transition}
      keepMounted
      fullWidth
      maxWidth="xs"
      PaperProps={{
        sx: {
          borderRadius: 3,
          p: 1,
        },
      }}
    >
      <DialogTitle sx={{ fontWeight: "bold" }}>
        Confirm Your Password
      </DialogTitle>
      <DialogContent dividers sx={{ pt: 2, pb: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Enter your current password to confirm these account changes.
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <TextField
          autoFocus
          fullWidth
          type="password"
          label="Current Password"
          value={password}
          onChange={onPasswordChange}
          disabled={loading}
          onKeyDown={(event) => {
            if (event.key === "Enter") onConfirm();
          }}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} color="inherit" disabled={loading}>
          Cancel
        </Button>
        <Button onClick={onConfirm} variant="contained" disabled={loading}>
          {loading ? "Verifying..." : "Confirm & Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ChangeInfoProfile;
