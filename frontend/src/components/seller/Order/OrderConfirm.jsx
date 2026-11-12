import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Slide,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import AssignmentTurnedInOutlinedIcon from "@mui/icons-material/AssignmentTurnedInOutlined";

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

const getConfirmationMessage = (status, order) => {
  const orderNumber = order?.orderNumber || order?.orderId || order?.id || "this order";
  const messages = {
    Confirmed: `Confirm order ${orderNumber} and start preparing it?`,
    Packed: `Confirm order ${orderNumber} is packed and ready to move forward?`,
    Shipped: `Confirm order ${orderNumber} is shipped or ready for buyer pickup?`,
    Delivered: `Confirm order ${orderNumber} has been delivered to the buyer?`,
    Cancelled: `Cancel order ${orderNumber}? This action cannot be undone.`,
  };
  return messages[status] || `Update order ${orderNumber} to ${status}?`;
};

export default function OrderConfirm({
  open,
  order,
  status,
  error = "",
  saving = false,
  onClose,
  onConfirm,
}) {
  const theme = useTheme();
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState("");
  const confirmingRef = useRef(false);
  const isBusy = saving || confirming;
  const isCancellation = status === "Cancelled";

  useEffect(() => {
    if (open) setConfirmError("");
  }, [open, status]);

  const handleConfirm = async () => {
    if (confirmingRef.current || isBusy) return;
    confirmingRef.current = true;
    setConfirming(true);
    setConfirmError("");
    try {
      const saved = await onConfirm();
      if (saved) onClose();
    } catch (confirmSubmitError) {
      setConfirmError(confirmSubmitError.message || "Unable to update this order. Please try again.");
    } finally {
      confirmingRef.current = false;
      setConfirming(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={isBusy ? undefined : onClose}
      disableEscapeKeyDown={isBusy}
      aria-labelledby="order-confirm-title"
      sx={{ zIndex: (currentTheme) => currentTheme.zIndex.modal + 1 }}
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
        id="order-confirm-title"
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
        <AssignmentTurnedInOutlinedIcon
          sx={{ color: "#ef3340", fontSize: 20 }}
        />
        Confirm order update
        <Button
          aria-label="Close order confirmation"
          onClick={onClose}
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
      <DialogContent dividers>
        {(error || confirmError) && <Alert severity="error" sx={{ mb: 2 }}>{error || confirmError}</Alert>}
        <Typography>{getConfirmationMessage(status, order)}</Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={isBusy} color="text.secondary">
          Go back
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={isBusy}
          color="error"
          variant="contained"
          sx={{ borderRadius: 1.5, px: 2.5, textTransform: "none", fontWeight: 700, color: "#fff" }}
        >
          {isBusy && <CircularProgress size={16} color="inherit" sx={{ mr: 1 }} />}
          {isBusy ? "Updating..." : `Confirm ${status || "update"}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
