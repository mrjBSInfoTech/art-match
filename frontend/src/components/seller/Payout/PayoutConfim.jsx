import { useEffect, useState, forwardRef } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Slide,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";

const Transition = forwardRef(function Transition(props, ref) {
  return (
    <Slide
      {...props}
      direction="up"
      ref={ref}
      timeout={500}
      easing={{
        enter: "cubic-bezier(0.4, 0, 0.2, 1)",
        exit: "ease-out",
      }}
    />
  );
});

export default function PayoutConfirm({ open, handleClose, onSubmit, submitting = false }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setPassword("");
    setError("");
  }, [open]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmedPassword = password.trim();

    if (!trimmedPassword) {
      setError("Enter your password to continue.");
      return;
    }

    setError("");
    try {
      await onSubmit(trimmedPassword);
    } catch (submitError) {
      setError(submitError?.message || "Unable to confirm your password.");
    }
  };

  return (
    <Dialog
      open={open}
      onClose={submitting ? undefined : handleClose}
      fullWidth
      maxWidth="sm"
      TransitionComponent={Transition}
      keepMounted
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: "hidden",
        },
      }}
    >
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <DialogTitle sx={{ px: 3, py: 2.5, borderBottom: "1px solid", borderColor: "divider" }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Box
                sx={{
                  display: "grid",
                  placeItems: "center",
                  width: 42,
                  height: 42,
                  borderRadius: 2,
                  bgcolor: "rgba(239, 68, 68, 0.1)",
                  color: "error.main",
                }}
              >
                <LockOutlinedIcon />
              </Box>
              <Box>
                <Typography variant="h6" fontWeight={800}>
                  Confirm your password
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Save or update your payout wallet securely.
                </Typography>
              </Box>
            </Stack>
            <IconButton
              aria-label="Close password confirmation"
              onClick={handleClose}
              disabled={submitting}
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent sx={{ px: 3, py: 2.5 }}>
          <Stack spacing={2.5}>
            <Alert severity="warning">
              Enter your current password to confirm this payout wallet change.
            </Alert>

            <TextField
              autoFocus
              fullWidth
              type="password"
              label="Current password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                if (error) setError("");
              }}
              disabled={submitting}
              helperText="Your password is used only to verify your identity before saving the wallet."
              slotProps={{
                htmlInput: {
                  autoComplete: "current-password",
                },
              }}
            />

            {error && (
              <Alert severity="error">{error}</Alert>
            )}
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2.5 }}>
          <Button onClick={handleClose} disabled={submitting} sx={{ textTransform: "none" }}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="error"
            disabled={submitting || !password.trim()}
            sx={{
              color: "#fff",
              textTransform: "none",
              minWidth: 150,
            }}
          >
            {submitting ? "Verifying..." : "Confirm password"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
