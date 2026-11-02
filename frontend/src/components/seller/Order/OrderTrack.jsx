import React from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Slide,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";

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

export default function OrderTrack({
  open,
  fulfillmentTarget,
  statusError,
  courier,
  onCourierChange,
  trackingNumber,
  setTrackingNumber,
  trackingUrl,
  setTrackingUrl,
  saving,
  onClose,
  onSubmit,
}) {
  const theme = useTheme();

  return (
    <Dialog
      open={open}
      onClose={() => !saving && onClose()}
      TransitionComponent={Transition}
      keepMounted
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
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
        <LocalShippingOutlinedIcon sx={{ color: "error.main", fontSize: 20 }} />
        Add Tracking Link
        <Button
          aria-label="Close tracking link dialog"
          onClick={onClose}
          disabled={saving}
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
        <Stack spacing={2.5}>
          {statusError && <Alert severity="error">{statusError}</Alert>}

          <Typography variant="body2" color="text.secondary">
            Add the courier name and tracking details. The buyer will use these details to
            track the delivery.
          </Typography>

          <TextField
            label="Courier"
            required
            value={courier}
            onChange={(event) => onCourierChange(event.target.value)}
            inputProps={{ maxLength: 50 }}
            disabled={saving}
            fullWidth
          />

          <TextField
            label="Tracking Number or ID (optional)"
            value={trackingNumber}
            onChange={(event) => setTrackingNumber(event.target.value)}
            inputProps={{ maxLength: 100 }}
            disabled={saving}
            fullWidth
          />

          <TextField
            label="Tracking Link"
            placeholder="https://"
            required
            value={trackingUrl}
            onChange={(event) => setTrackingUrl(event.target.value)}
            inputProps={{ maxLength: 2048 }}
            helperText="Enter the secure tracking page or delivery-share link."
            disabled={saving}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={saving} sx={{ color: "text.secondary" }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={onSubmit}
          disabled={
            saving ||
            !courier.trim() ||
            !trackingUrl.trim()
          }
          sx={{ color: "#fff", textTransform: "none" }}
        >
          {saving ? "Saving..." : `Mark ${fulfillmentTarget?.status || "Shipped"}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
