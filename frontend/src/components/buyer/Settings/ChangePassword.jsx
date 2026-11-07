import React, { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Slide,
  Typography,
  Alert,
  CircularProgress,
  Stack,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
// Icons
import CloseIcon from "@mui/icons-material/Close";
import LockResetIcon from "@mui/icons-material/LockReset";

// Animation transition matching ArtworkForm.jsx
const Transition = React.forwardRef(function Transition(props, ref) {
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

function ChangePassword({
  open,
  handleClose,
  onSubmit,
  onConfirm,
  loading = false,
  error = "",
}) {
  const theme = useTheme();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [internalError, setInternalError] = useState("");
  const submitting = useRef(false);

  useEffect(() => {
    if (open) {
      setInternalError("");
      setIsSubmitting(false);
      submitting.current = false;
    }
  }, [open]);

  const handleConfirm = async () => {
    const handler = onConfirm || onSubmit;
    if (submitting.current || !handler) return;
    submitting.current = true;
    setIsSubmitting(true);
    setInternalError("");
    try {
      await handler();
      handleClose();
    } catch (submitError) {
      setInternalError(
        submitError.message || "Unable to update password. Please try again.",
      );
    } finally {
      submitting.current = false;
      setIsSubmitting(false);
    }
  };

  const activeLoading = loading || isSubmitting;
  const displayError = error || internalError;

  return (
    <Dialog
      open={Boolean(open)}
      onClose={activeLoading ? undefined : handleClose}
      disableEscapeKeyDown={activeLoading}
      aria-labelledby="password-confirm-title"
      TransitionComponent={Transition}
      keepMounted
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
        id="password-confirm-title"
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
        <LockResetIcon sx={{ color: "#ef3340", fontSize: 20 }} />
        Confirm Password Change
        <Button
          aria-label="Cancel and close confirmation dialog"
          onClick={handleClose}
          disabled={activeLoading}
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

      <DialogContent dividers sx={{ py: 2.5 }}>
        <Stack spacing={2}>
          {displayError && (
            <Alert severity="error" sx={{ borderRadius: 2 }}>
              {displayError}
            </Alert>
          )}
          <Alert severity="warning" sx={{ borderRadius: 2 }}>
            Are you sure you want to change your account password? Once updated, you will be required to use your new password on all future sign-ins.
          </Alert>
          <Typography variant="body2" color="text.secondary">
            Please ensure you have safely noted your new password. You will continue to remain logged in on this current session.
          </Typography>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button
          onClick={handleClose}
          disabled={activeLoading}
          color="inherit"
          sx={{ textTransform: "none", color: "text.secondary" }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={activeLoading}
          variant="contained"
          sx={{
            borderRadius: 1.5,
            px: 2.5,
            textTransform: "none",
            fontWeight: 700,
            color: "#fff",
            backgroundColor: "#ef3340",
            boxShadow: "0 2px 10px rgba(239, 51, 64, 0.3)",
            "&:hover": { backgroundColor: "#d62835" },
          }}
        >
          {activeLoading && (
            <CircularProgress size={16} color="inherit" sx={{ mr: 1 }} />
          )}
          {activeLoading ? "Updating..." : "Confirm & Update"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ChangePassword;
