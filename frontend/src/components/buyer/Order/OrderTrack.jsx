import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  Slide,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import OpenInNewOutlinedIcon from "@mui/icons-material/OpenInNewOutlined";
import { getShipmentCourier } from "../../../utils/shipmentCouriers.js";
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
  courier,
  trackingNumber,
  setTrackingNumber,
  trackingUrl,
  setTrackingUrl,
  saving,
  submitButtonText,
  onClose,
  onSubmit,
}) {
  const theme = useTheme();

  // Internal state when not controlled externally
  const [internalTrackingNumber, setInternalTrackingNumber] = useState("");
  const [internalTrackingUrl, setInternalTrackingUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const navigate = useNavigate();

  const effectiveOrder = fulfillmentTarget?.order || fulfillmentTarget || order;
  const isReturn = Boolean(
    fulfillmentTarget?.status === "Return Shipped" ||
    effectiveOrder?.isReturn ||
    effectiveOrder?.activeReturn?.status === "Return Shipped" ||
    effectiveOrder?.return_courier ||
    effectiveOrder?.activeReturn?.return_courier
  );

  useEffect(() => {
    if (effectiveOrder) {
      const activeCourier = isReturn
        ? (effectiveOrder.return_courier || effectiveOrder.activeReturn?.return_courier || effectiveOrder.courier)
        : effectiveOrder.courier;
      const activeNum = isReturn
        ? (effectiveOrder.return_tracking_number || effectiveOrder.activeReturn?.return_tracking_number || effectiveOrder.trackingNumber)
        : effectiveOrder.trackingNumber;
      const activeUrl = isReturn
        ? (effectiveOrder.return_tracking_url || effectiveOrder.activeReturn?.return_tracking_url || effectiveOrder.trackingUrl)
        : effectiveOrder.trackingUrl;

      const match = getShipmentCourier(activeCourier);
      if (trackingNumber === undefined) {
        setInternalTrackingNumber(activeNum || "");
      }
      if (trackingUrl === undefined) {
        setInternalTrackingUrl(activeUrl || match?.trackingUrl || "");
      }
      setCopied(false);
    }
  }, [effectiveOrder, isReturn, courier, trackingNumber, trackingUrl]);

  const activeCourierValue = courier !== undefined ? courier : effectiveOrder?.courier || "";
  const activeTrackingNumber = trackingNumber !== undefined ? trackingNumber : internalTrackingNumber;
  const activeTrackingUrl = trackingUrl !== undefined ? trackingUrl : internalTrackingUrl;
  const selectedCourier = getShipmentCourier(activeCourierValue);
  const secureTrackingUrl = getSecureTrackingUrl(activeTrackingUrl || selectedCourier?.trackingUrl);

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

  const isMeetupOrder = !isReturn && !onSubmit && effectiveOrder?.deliveryMethod === "pickup";
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
        {isMeetupOrder ? (
          <StorefrontOutlinedIcon sx={{ color: "error.main", fontSize: 20 }} />
        ) : (
          <LocalShippingOutlinedIcon sx={{ color: "error.main", fontSize: 20 }} />
        )}
        {isMeetupOrder
          ? "Meet-up Delivery Details"
          : isReturn
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
        {isMeetupOrder ? (
          <Stack spacing={2.5}>
            {statusError && <Alert severity="error">{statusError}</Alert>}
            <Alert severity="info" icon={<StorefrontOutlinedIcon fontSize="inherit" />}>
              This order is fulfilled through <strong>Meet-up Delivery</strong>. The seller personally meets you at a mutually agreed campus or local spot to hand over the artwork.
            </Alert>

            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: "action.hover",
                border: `1px solid ${theme?.palette?.divider || "#e0e0e0"}`,
              }}
            >
              <Typography
                variant="caption"
                fontWeight={700}
                color="text.secondary"
                sx={{ textTransform: "uppercase", letterSpacing: 0.5, display: "block", mb: 0.5 }}
              >
                Meet-up Progress
              </Typography>
              <Typography variant="body1" fontWeight={700} color="error.main">
                {effectiveOrder?.status === "Delivered"
                  ? "Handover Completed (Delivered)"
                  : effectiveOrder?.status === "Shipped"
                  ? "Ready for Meet-up"
                  : effectiveOrder?.status === "Packed"
                  ? "Artwork Prepared & Packed"
                  : effectiveOrder?.status === "Confirmed"
                  ? "Order Confirmed"
                  : "Pending Confirmation"}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {effectiveOrder?.status === "Delivered"
                  ? "The meet-up was completed and marked delivered by the seller."
                  : effectiveOrder?.status === "Shipped"
                  ? "The seller is ready to meet. Check your Messages for exact arrival and location updates."
                  : effectiveOrder?.status === "Packed"
                  ? "The seller has finished preparing the artwork for your meetup."
                  : "The seller will confirm your order and coordinate the meetup schedule in chat."}
              </Typography>
            </Box>

            {effectiveOrder?.deliveryProof && (
              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: "action.selected",
                  border: `1px solid ${theme?.palette?.divider || "#e0e0e0"}`,
                }}
              >
                <Typography variant="caption" fontWeight={700} color="text.secondary" display="block">
                  Completion Proof & Notes:
                </Typography>
                {effectiveOrder.deliveryProof.notes && (
                  <Typography variant="body2" sx={{ mt: 0.5, fontStyle: "italic" }}>
                    &ldquo;{effectiveOrder.deliveryProof.notes}&rdquo;
                  </Typography>
                )}
                {effectiveOrder.deliveredAt && (
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                    Delivered on {new Date(effectiveOrder.deliveredAt).toLocaleString("en-PH")}
                  </Typography>
                )}
              </Box>
            )}
          </Stack>
        ) : (
          <Stack spacing={2.5}>
            {statusError && <Alert severity="error">{statusError}</Alert>}

            <Typography variant="body2" color="text.secondary">
              {isReturn
                ? "Use the tracking details provided for this return."
                : onSubmit
                  ? "Add the shipment tracking details so the recipient can follow the delivery."
                  : "Use the shipment tracking link and number provided by the seller."}
            </Typography>

            {activeCourierValue && (
              <Typography variant="body2" color="text.secondary">
                Courier: {selectedCourier?.label || activeCourierValue}
              </Typography>
            )}

            {(selectedCourier?.trackingNumberLabel || activeTrackingNumber || onSubmit) && (
              <TextField
                label={selectedCourier?.trackingNumberLabel || "Tracking Number"}
                required={Boolean(onSubmit)}
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

            {(selectedCourier || activeTrackingUrl) && (
              <TextField
                label="Tracking Link"
                placeholder="https://"
                required={Boolean(onSubmit)}
                value={activeTrackingUrl}
                onChange={(event) => handleTrackingUrlChange(event.target.value)}
                inputProps={{ maxLength: 2048 }}
                InputProps={{
                  readOnly: !onSubmit,
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
                  onSubmit
                    ? "Enter the secure tracking or delivery-share link."
                    : "Open the tracking link to view the latest delivery status."
                }
                disabled={saving}
                fullWidth
              />
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={saving} sx={{ color: "text.secondary" }}>
          {isReturn ? "Back" : onSubmit ? "Cancel" : "Close"}
        </Button>
        {isMeetupOrder && (
          <Button
            variant="contained"
            color="error"
            startIcon={<ChatBubbleOutlineRoundedIcon fontSize="small" />}
            onClick={() => {
              onClose();
              const sellerId = effectiveOrder?.sellerId || effectiveOrder?.items?.[0]?.sellerId;
              if (sellerId && navigate) {
                navigate(`/buyer/messages?seller=${encodeURIComponent(sellerId)}`);
              }
            }}
            sx={{ color: "#fff", textTransform: "none", borderRadius: 2 }}
          >
            Chat with Seller
          </Button>
        )}
        {!isMeetupOrder && secureTrackingUrl && (
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
            Track on {selectedCourier?.label || activeCourierValue || "Courier"}
          </Button>
        )}
        {!isMeetupOrder && onSubmit && (
          <Button
            variant="contained"
            color="error"
            onClick={onSubmit}
            disabled={
              saving ||
              !activeCourierValue ||
              !activeTrackingUrl.trim()
            }
            sx={{ color: "#fff", textTransform: "none" }}
          >
            {saving ? "Saving..." : submitButtonText || (isReturn ? "Confirm Return Shipped" : `Mark ${fulfillmentTarget?.status || "Shipped"}`)}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
