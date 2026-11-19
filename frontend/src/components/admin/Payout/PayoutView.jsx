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
  IconButton,
  InputAdornment,
  Slide,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";

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

export default function PayoutView({
  open,
  handleClose,
  onClose,
  onSubmit,
  onConfirm,
  submitting = false,
  title = "Unlock PayMongo Wallet ID",
  message = "Enter your current admin password to reveal the active PayMongo Wallet ID.",
  helperText = "For security, the active PayMongo Wallet ID stays masked until you verify your password.",
  confirmLabel = "Unlock & View Wallet",
  submittingLabel = "Verifying…",
}) {
  const theme = useTheme();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const closeDialog = onClose || handleClose;
  const isBusy = submitting || busy;

  useEffect(() => {
    if (!open) return;
    setPassword("");
    setShowPassword(false);
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
      setError(
        submitError?.response?.data?.message ||
          submitError?.message ||
          "Unable to confirm your password. Please try again.",
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
        <LockOutlinedIcon sx={{ color: "#ef3340", fontSize: 20 }} />
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
            <Alert severity="warning">
              {message}
            </Alert>

            <TextField
              autoFocus
              fullWidth
              type={showPassword ? "text" : "password"}
              label="Admin password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                if (error) setError("");
              }}
              disabled={isBusy}
              helperText={helperText}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      onClick={() => setShowPassword((prev) => !prev)}
                      edge="end"
                      size="small"
                      disabled={isBusy}
                    >
                      {showPassword ? (
                        <VisibilityOffOutlinedIcon fontSize="small" />
                      ) : (
                        <VisibilityOutlinedIcon fontSize="small" />
                      )}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
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
            color="error"
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
                <span>{submittingLabel}</span>
              </Stack>
            ) : (
              confirmLabel
            )}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

