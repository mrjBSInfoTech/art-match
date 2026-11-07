import { useEffect, useState, forwardRef } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Slide,
  Stack,
  TextField,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
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
  const theme = useTheme();
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
      open={Boolean(open)}
      onClose={submitting ? undefined : handleClose}
      TransitionComponent={Transition}
      keepMounted
      disableRestoreFocus
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
        <LockOutlinedIcon sx={{ color: "#ef3340", fontSize: 20 }} />
        Confirm Your Password
        <Button
          aria-label="Close"
          onClick={handleClose}
          disabled={submitting}
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

      <Box component="form" onSubmit={handleSubmit} noValidate>
        <DialogContent dividers sx={{ px: 3, py: 2.5 }}>
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

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={handleClose}
            disabled={submitting}
            color="inherit"
            sx={{ textTransform: "none", color: "text.secondary" }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={submitting || !password.trim()}
            sx={{
              borderRadius: 1.5,
              px: 2.5,
              textTransform: "none",
              fontWeight: 700,
              color: "#fff",
              backgroundColor: "#ef3340",
              "&:hover": { backgroundColor: "#d62835" },
            }}
          >
            {submitting ? "Verifying..." : "Confirm Password"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
