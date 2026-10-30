import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  MenuItem,
  Slide,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import OpenInNewOutlinedIcon from "@mui/icons-material/OpenInNewOutlined";
import { SHIPMENT_COURIERS, getShipmentCourier } from "../../../utils/shipmentCouriers.js";
import { getSecureTrackingUrl } from "../../../utils/trackingUrl.js";

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
  order,
  fulfillmentTarget,
  statusError,
  setStatusError,
  courier,
  onCourierChange,
  trackingNumber,
  setTrackingNumber,
  trackingUrl,
  setTrackingUrl,
  saving,
  submitButtonText,
  onClose,
  onSubmit,
}) {
  const theme = (typeof useTheme === "function" ? useTheme() : null) || {
    palette: {
      mode: "light",
      divider: "#e0e0e0",
      text: { primary: "#111", secondary: "#666" },
      background: { paper: "#fff" },
    },
  };

  // Internal state when not controlled externally
  const [internalCourier, setInternalCourier] = useState("");
  const [internalTrackingNumber, setInternalTrackingNumber] = useState("");
  const [internalTrackingUrl, setInternalTrackingUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const effectiveOrder = fulfillmentTarget?.order || fulfillmentTarget || order;

  useEffect(() => {
    if (effectiveOrder) {
      const match = getShipmentCourier(effectiveOrder.courier || effectiveOrder.return_courier);
      if (courier === undefined) {
        setInternalCourier(match?.value || SHIPMENT_COURIERS[0]?.value || "");
      }
      if (trackingNumber === undefined) {
        setInternalTrackingNumber(effectiveOrder.trackingNumber || effectiveOrder.return_tracking_number || "");
      }
      if (trackingUrl === undefined) {
        setInternalTrackingUrl(
          effectiveOrder.trackingUrl ||
          effectiveOrder.return_tracking_url ||
          match?.trackingUrl ||
          ""
        );
      }
      setCopied(false);
    }
  }, [effectiveOrder, courier, trackingNumber, trackingUrl]);

  const activeCourierValue = courier !== undefined ? courier : internalCourier;
  const activeTrackingNumber = trackingNumber !== undefined ? trackingNumber : internalTrackingNumber;
  const activeTrackingUrl = trackingUrl !== undefined ? trackingUrl : internalTrackingUrl;
  const selectedCourier = getShipmentCourier(activeCourierValue);
  const secureTrackingUrl = getSecureTrackingUrl(activeTrackingUrl || selectedCourier?.trackingUrl);

  const handleCourierChange = (value) => {
    if (onCourierChange) {
      onCourierChange(value);
      const match = getShipmentCourier(value);
      if (match?.trackingUrl && setTrackingUrl && !trackingUrl) {
        setTrackingUrl(match.trackingUrl);
      }
    } else {
      setInternalCourier(value);
      const match = getShipmentCourier(value);
      setInternalTrackingNumber("");
      setInternalTrackingUrl(match?.trackingUrl || "");
      if (setStatusError) setStatusError("");
    }
  };

  const handleTrackingNumberChange = (value) => {
    if (setTrackingNumber) {
      setTrackingNumber(value);
    } else {
      setInternalTrackingNumber(value);
    }
  };

  const handleTrackingUrlChange = (value) => {
    if (setTrackingUrl) {
      setTrackingUrl(value);
    } else {
      setInternalTrackingUrl(value);
    }
  };

  const handleCopyTrackingNumber = async () => {
    if (!activeTrackingNumber) return;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(activeTrackingNumber);
      }
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const isReturn = fulfillmentTarget?.status === "Return Shipped";
  const validReturnTracking = !activeTrackingUrl.trim() || Boolean(getSecureTrackingUrl(activeTrackingUrl.trim()));

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
          backgroundColor: theme?.palette?.background?.paper || "#fff",
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
          color: theme?.palette?.text?.primary || "#111",
          fontSize: 16,
          fontWeight: 700,
          borderBottom: `1px solid ${theme?.palette?.divider || "#e0e0e0"}`,
        }}
      >
        <LocalShippingOutlinedIcon sx={{ color: "error.main", fontSize: 20 }} />
        {isReturn
          ? "Return Tracking Details"
          : onSubmit
          ? "Add Tracking Link"
          : "Delivery Tracking"}
        <Button
          aria-label="Close tracking dialog"
          onClick={onClose}
          disabled={saving}
          sx={{
            minWidth: 28,
            width: 28,
            height: 28,
            ml: "auto",
            p: 0,
            color: theme?.palette?.text?.secondary || "#666",
          }}
        >
          <CloseIcon sx={{ fontSize: 18 }} />
        </Button>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5}>
          {statusError && <Alert severity="error">{statusError}</Alert>}

          <Typography variant="body2" color="text.secondary">
            {isReturn
              ? "Choose the return shipping courier and enter tracking details so the delivery can be monitored."
              : onSubmit
              ? "Choose the courier and add its tracking information. The recipient will use these details to track the delivery."
              : "Select any shipping courier to view tracking details or open its official tracking portal."}
          </Typography>

          <TextField
            select
            label="Courier"
            required={!isReturn}
            value={activeCourierValue}
            onChange={(event) => handleCourierChange(event.target.value)}
            disabled={saving}
            fullWidth
          >
            {SHIPMENT_COURIERS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>

          {selectedCourier?.trackingNumberLabel && (
            <TextField
              label={selectedCourier.trackingNumberLabel}
              required={Boolean(onSubmit && !isReturn)}
              value={activeTrackingNumber}
              onChange={(event) => handleTrackingNumberChange(event.target.value)}
              inputProps={{ maxLength: 100 }}
              InputProps={{
                endAdornment: activeTrackingNumber ? (
                  <InputAdornment position="end">
                    <Button
                      size="small"
                      startIcon={<ContentCopyOutlinedIcon sx={{ fontSize: 15 }} />}
                      onClick={handleCopyTrackingNumber}
                      sx={{ textTransform: "none", fontWeight: 700, whiteSpace: "nowrap" }}
                    >
                      {copied ? "Copied" : "Copy"}
                    </Button>
                  </InputAdornment>
                ) : null,
              }}
              disabled={saving}
              fullWidth
            />
          )}

          <TextField
            label={isReturn ? "Return tracking URL (optional)" : (selectedCourier?.trackingUrl ? "Tracking Link" : "Tracking / Share Link")}
            placeholder={selectedCourier?.trackingUrl ? undefined : "https://share.lalamove.com/..."}
            required={Boolean(onSubmit && !isReturn)}
            value={activeTrackingUrl}
            onChange={(event) => handleTrackingUrlChange(event.target.value)}
            inputProps={{ maxLength: 2048 }}
            InputProps={{
              endAdornment: secureTrackingUrl ? (
                <InputAdornment position="end">
                  <IconButton
                    component="a"
                    href={secureTrackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    edge="end"
                    size="small"
                    title={`Open tracking on ${selectedCourier?.label || "Courier"}`}
                    sx={{ color: "error.main" }}
                  >
                    <OpenInNewOutlinedIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </InputAdornment>
              ) : null,
            }}
            helperText={
              isReturn
                ? "Enter the courier tracking link or URL so both parties can track the returned shipment."
                : selectedCourier?.trackingUrl
                ? "Official courier tracking page. You can enter or paste a specific tracking link here."
                : "Open the booked delivery, use Share, and paste the generated tracking/share link here."
            }
            error={isReturn && Boolean(activeTrackingUrl.trim() && !validReturnTracking)}
            disabled={saving}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={saving} sx={{ color: "text.secondary" }}>
          {isReturn ? "Back" : onSubmit ? "Cancel" : "Close"}
        </Button>
        {secureTrackingUrl && (
          <Button
            component="a"
            href={secureTrackingUrl}
            target="_blank"
            rel="noopener noreferrer"
            variant={onSubmit ? "outlined" : "contained"}
            color="error"
            endIcon={<OpenInNewOutlinedIcon sx={{ fontSize: 16 }} />}
            sx={{ fontWeight: 700, textTransform: "none", ...(onSubmit ? {} : { color: "#fff" }) }}
          >
            Track on {selectedCourier?.label || "Courier"}
          </Button>
        )}
        {onSubmit && (
          <Button
            variant="contained"
            color="error"
            onClick={onSubmit}
            disabled={
              saving ||
              (isReturn
                ? !validReturnTracking
                : !selectedCourier ||
                  !activeTrackingUrl.trim() ||
                  (Boolean(selectedCourier.trackingNumberLabel) && !activeTrackingNumber.trim()))
            }
            sx={{ color: "#fff", textTransform: "none" }}
          >
            {saving ? "Saving..." : submitButtonText || (isReturn ? "Confirm" : `Mark ${fulfillmentTarget?.status || "Shipped"}`)}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
