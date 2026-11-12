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
  Paper,
  Slide,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import { formatPayoutCurrency, payoutValue } from "../../seller/Payout/payoutDisplay";

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

export default function PayoutConfirm({
  open,
  handleClose,
  onClose,
  onSubmit,
  onConfirm,
  submitting = false,
  payout = null,
  title = "Confirm Admin Password",
  message = "Enter your current password to authorize and release this payout transfer to the seller's wallet.",
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
      setError(
        submitError?.response?.data?.message ||
          submitError?.message ||
          "Unable to confirm your password. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  const payoutAmount = payout ? payoutValue(payout) : null;
  const destinationName = payout?.destination?.institutionName || "";
  const maskedAccount = payout?.destination?.maskedAccountNumber || payout?.destination?.accountNumber || "";

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
              type="password"
              label="Admin password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                if (error) setError("");
              }}
              disabled={isBusy}
              helperText="Confirming password will release this payout directly to the seller's wallet via PayMongo."
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
            disabled={isBusy || !password.trim()}
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
            {isBusy ? (
              <Stack direction="row" spacing={1} alignItems="center">
                <CircularProgress size={16} color="inherit" />
                <span>Sending Payout…</span>
              </Stack>
            ) : (
              "Confirm & Send Payout"
            )}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

