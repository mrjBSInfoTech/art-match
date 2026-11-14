import { useEffect, useState, forwardRef } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
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
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";

const Transition = forwardRef(function Transition(props, ref) {
  return (
    <Slide
      direction="up"
      ref={ref}
      {...props}
      timeout={500}
      easing={{
        enter: "cubic-bezier(0.4, 0, 0.2, 1)",
        exit: "ease-out",
      }}
    />
  );
});

export default function SystemSettingsConfirm({
  open,
  handleClose,
  onClose,
  onSubmit,
  onConfirm,
  submitting = false,
  title = "Confirm System Settings Changes",
  message = "Enter your admin password to save these changes.",
}) {
  const theme = useTheme();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const closeDialog = onClose || handleClose;
  const isBusy = submitting || busy;

  useEffect(() => {
    if (!open) return;
    setPassword("");
    setError("");
    setBusy(false);
  }, [open]);

  const handleSubmit = async (event) => {
    if (event) event.preventDefault();
    const trimmedPassword = password.trim();

    if (!trimmedPassword) {
      setError("Enter your password to continue.");
      return;
    }

    setError("");
    setBusy(true);
    try {
      const handler = onConfirm || onSubmit;
      if (typeof handler === "function") {
        await handler(trimmedPassword);
      }
    } catch (submitError) {
      setPassword("");
      setError(
        submitError?.response?.data?.message ||
          submitError?.message ||
          "Unable to save these changes. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={Boolean(open)}
      onClose={isBusy ? undefined : closeDialog}
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
        <SettingsOutlinedIcon sx={{ color: "#ef3340", fontSize: 20 }} />
        {title}
        <Button
          aria-label="Close"
          onClick={closeDialog}
          disabled={isBusy}
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
          <Stack spacing={2}>

            <Alert severity="warning">{message}</Alert>

            <TextField
              autoFocus
              fullWidth
              type="password"
              label="Admin password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                if (error) setError("");
              }}
              disabled={isBusy}
              helperText="Your password is used to authorize saving system settings."
              slotProps={{
                htmlInput: {
                  autoComplete: "current-password",
                },
              }}
            />

            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={closeDialog}
            disabled={isBusy}
            color="inherit"
            sx={{ textTransform: "none", color: "text.secondary" }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isBusy || !password.trim()}
            sx={{
              borderRadius: 1.5,
              px: 2.5,
              textTransform: "none",
              fontWeight: 700,
              color: "#fff",
            }}
          >
            {isBusy ? (
              <Stack direction="row" spacing={1} alignItems="center">
                <CircularProgress size={16} color="inherit" />
                <span>Saving changes...</span>
              </Stack>
            ) : (
              "Confirm & Save"
            )}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

