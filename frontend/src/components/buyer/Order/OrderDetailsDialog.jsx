import React, { forwardRef } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Paper,
  Slide,
  Stack,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import OpenInNewOutlinedIcon from "@mui/icons-material/OpenInNewOutlined";
import WatermarkedArtworkImage from "../Artwork/WatermarkedArtworkImage";
import {
  getPaymentColor,
  getPaymentLabel,
  getPaymentMethodLabel,
  isPayMongoOrder,
  needsPaymentSupport,
} from "../../../utils/orderPayments.js";
import { getShipmentCourier } from "../../../utils/shipmentCouriers.js";
import { getSecureTrackingUrl } from "../../../utils/trackingUrl.js";

const Transition = forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const formatDateTime = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "N/A"
    : date.toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });
};

const statusColor = {
  Pending: "warning",
  Confirmed: "info",
  Packed: "info",
  Shipped: "primary",
  Delivered: "success",
  Cancelled: "error",
};

export default function OrderDetailsDialog({
  open,
  onClose,
  order,
  onTrackOrder,
  onContactSeller,
  onRequestReturn,
}) {
  const theme = useTheme();
  if (!order) return null;

  const items = Array.isArray(order.items) ? order.items : [];
  const isMeetup = order.deliveryMethod === "pickup";
  const courier = getShipmentCourier(order.courier);
  const trackingUrl = getSecureTrackingUrl(order.trackingUrl);
  const hasActiveReturnTracking = Boolean(
    order.activeReturn && (
      order.activeReturn.status === "Return Shipped" ||
      order.activeReturn.return_tracking_url ||
      order.activeReturn.return_tracking_number ||
      order.activeReturn.return_courier
    )
  );
  const returnCourier = getShipmentCourier(order.activeReturn?.return_courier);
  const returnTrackingUrl = getSecureTrackingUrl(
    order.activeReturn?.return_tracking_url || returnCourier?.trackingUrl
  );
  const returnTrackingNumber = order.activeReturn?.return_tracking_number || "";

  const detailLabelSx = {
    color: "text.secondary",
    fontSize: 12,
    fontWeight: 600,
    flexShrink: 0,
  };

  const detailValueSx = {
    color: "text.primary",
    fontSize: 12,
    fontWeight: 600,
    textAlign: "right",
    overflowWrap: "anywhere",
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      TransitionComponent={Transition}
      keepMounted
      PaperProps={{
        sx: {
          width: "min(100% - 24px, 500px)",
          maxWidth: "500px",
          m: 1.5,
          borderRadius: 3,
          overflow: "hidden",
          bgcolor: "background.paper",
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
          color: "text.primary",
          fontSize: 16,
          fontWeight: 700,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <ShoppingBagOutlinedIcon sx={{ color: "error.main", fontSize: 20 }} />
        Order Details
        <Button
          aria-label="Close order details"
          onClick={onClose}
          sx={{
            minWidth: 28,
            width: 28,
            height: 28,
            ml: "auto",
            p: 0,
            color: "text.secondary",
          }}
        >
          <CloseIcon sx={{ fontSize: 18 }} />
        </Button>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 2.5 }}>
        <Stack spacing={2}>
          {needsPaymentSupport(order) && (
            <Alert severity="warning">
              Payment received. This order needs support review for refund processing.
            </Alert>
          )}

          {/* Header Summary */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 1.5,
            }}
          >
            <Box>
              <Typography variant="subtitle1" fontWeight={800}>
                {order.id || `Order #${order.orderId}`}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Placed on {formatDateTime(order.date)}
              </Typography>
            </Box>
            <Stack direction="row" spacing={0.75}>
              <Chip
                label={order.status}
                color={statusColor[order.status] || "default"}
                size="small"
                sx={{ fontWeight: 700 }}
              />
              <Chip
                label={isMeetup ? "Meet-up Delivery" : "Door-to-Door"}
                color={isMeetup ? "info" : "default"}
                size="small"
                variant="outlined"
                sx={{ fontWeight: 600 }}
              />
            </Stack>
          </Box>

          {/* Purchased Items */}
          <Paper
            variant="outlined"
            sx={{ p: 2, borderRadius: 2, bgcolor: "background.default" }}
          >
            <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: "uppercase", display: "block", mb: 1.5 }}>
              Artworks & Products
            </Typography>
            <Stack spacing={1.5} divider={<Divider />}>
              {items.map((item, idx) => (
                <Stack key={item.id || idx} direction="row" spacing={1.5} alignItems="center">
                  <WatermarkedArtworkImage
                    image={item.image}
                    alt={item.title || "Artwork"}
                    sx={{
                      width: 56,
                      height: 56,
                      objectFit: "cover",
                      borderRadius: 1.5,
                      flexShrink: 0,
                      bgcolor: "action.hover",
                    }}
                  />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={700} noWrap>
                      {item.title || "Untitled artwork"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {[item.artist, item.qty != null ? `Qty: ${item.qty}` : ""].filter(Boolean).join(" · ")}
                    </Typography>
                    {item.selectedProducts?.map((product) => (
                      <Typography key={product.id} variant="caption" color="text.secondary" display="block">
                        {product.name} × {product.quantity}
                      </Typography>
                    ))}
                    {item.orderNote && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        Note: {item.orderNote}
                      </Typography>
                    )}
                    {item.review?.sellerResponse && (
                      <Box
                        sx={{
                          mt: 1,
                          p: 1.25,
                          borderRadius: 1.5,
                          bgcolor: "action.hover",
                          borderLeft: "3px solid",
                          borderColor: "primary.main",
                        }}
                      >
                        <Typography variant="caption" fontWeight={700} display="block">
                          Seller response
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{ mt: 0.25, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
                        >
                          {item.review.sellerResponse}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                  <Typography variant="body2" fontWeight={700} sx={{ flexShrink: 0 }}>
                    {formatCurrency(item.lineTotal ?? Number(item.price) * Number(item.qty || 1))}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </Paper>

          {/* Financial Breakdown */}
          <Paper
            variant="outlined"
            sx={{ p: 2, borderRadius: 2, bgcolor: "background.default" }}
          >
            <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: "uppercase", display: "block", mb: 1.5 }}>
              Payment Information
            </Typography>
            <Stack spacing={1}>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography sx={detailLabelSx}>Payment Method:</Typography>
                <Typography sx={detailValueSx}>{getPaymentMethodLabel(order)}</Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography sx={detailLabelSx}>Payment Status:</Typography>
                <Chip
                  label={getPaymentLabel(order)}
                  color={getPaymentColor(order)}
                  size="small"
                  variant="outlined"
                  sx={{ height: 20, fontSize: 10, fontWeight: 700 }}
                />
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography sx={detailLabelSx}>Subtotal:</Typography>
                <Typography sx={detailValueSx}>{formatCurrency(order.subtotal || order.total)}</Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography sx={detailLabelSx}>Shipping Fee:</Typography>
                <Typography sx={detailValueSx}>{isMeetup ? "₱0 (Meet-up Delivery)" : "₱0 (Paid to courier)"}</Typography>
              </Box>
              <Divider sx={{ my: 0.5 }} />
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography sx={{ ...detailLabelSx, fontWeight: 700 }}>Total Paid:</Typography>
                <Typography sx={{ ...detailValueSx, fontWeight: 800, color: "error.main", fontSize: 14 }}>
                  {formatCurrency(order.total)}
                </Typography>
              </Box>
            </Stack>
          </Paper>

          {/* Delivery & Meetup Details */}
          <Paper
            variant="outlined"
            sx={{ p: 2, borderRadius: 2, bgcolor: "background.default" }}
          >
            <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: "uppercase", display: "block", mb: 1.5 }}>
              {isMeetup ? "Meet-up Delivery Arrangement" : "Shipping & Tracking Details"}
            </Typography>
            {isMeetup ? (
              <Stack spacing={1}>
                <Stack direction="row" spacing={1} alignItems="flex-start">
                  <StorefrontOutlinedIcon color="primary" sx={{ mt: 0.25, fontSize: 18 }} />
                  <Typography variant="body2" color="text.secondary">
                    This order is handled via in-person meet-up delivery. Coordinate the exact meeting place, date, and time with the seller in Messages.
                  </Typography>
                </Stack>
                {order.deliveredAt && (
                  <Typography variant="caption" color="success.main" fontWeight={700} sx={{ mt: 0.5, display: "block" }}>
                    Delivered on {formatDateTime(order.deliveredAt)}
                  </Typography>
                )}
              </Stack>
            ) : (
              <Stack spacing={1}>
                {order.address && (
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <Typography sx={detailLabelSx}>Delivery Address:</Typography>
                    <Typography sx={{ ...detailValueSx, maxWidth: "65%" }}>{order.address}</Typography>
                  </Box>
                )}
                {courier && (
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography sx={detailLabelSx}>Courier:</Typography>
                    <Typography sx={detailValueSx}>{courier.label}</Typography>
                  </Box>
                )}
                {order.trackingNumber && (
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography sx={detailLabelSx}>Tracking Number:</Typography>
                    <Typography sx={detailValueSx}>{order.trackingNumber}</Typography>
                  </Box>
                )}
                {order.deliveredAt && (
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography sx={detailLabelSx}>Delivered:</Typography>
                    <Typography sx={detailValueSx}>{formatDateTime(order.deliveredAt)}</Typography>
                  </Box>
                )}
              </Stack>
            )}

            {/* Delivery Proof from Seller (if available) */}
            {order.deliveryProof && (
              <Box sx={{ mt: 1.5, pt: 1.5, borderTop: `1px dashed ${theme.palette.divider}` }}>
                <Typography variant="caption" fontWeight={700} color="text.secondary" display="block">
                  Completion Proof from Seller:
                </Typography>
                {order.deliveryProof.notes && (
                  <Typography variant="body2" sx={{ mt: 0.5, fontStyle: "italic" }}>
                    &ldquo;{order.deliveryProof.notes}&rdquo;
                  </Typography>
                )}
                {order.deliveryProof.submittedAt && (
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                    Confirmed on {formatDateTime(order.deliveryProof.submittedAt)}
                  </Typography>
                )}
              </Box>
            )}
          </Paper>

          {/* Return & Refund Info if applicable */}
          {(order.activeReturn || String(order.paymentStatus).toLowerCase() === "refunded") && (
            <Paper
              variant="outlined"
              sx={{ p: 2, borderRadius: 2, bgcolor: "action.hover", borderColor: "warning.main" }}
            >
              <Typography variant="subtitle2" fontWeight={800} color="warning.main" sx={{ mb: 0.5 }}>
                Return / Refund Status: {order.activeReturn?.status || "Refunded"}
              </Typography>
              {order.activeReturn?.reason && (
                <Typography variant="body2">
                  <strong>Reason:</strong> {order.activeReturn.reason}
                </Typography>
              )}
              {order.activeReturn?.details && (
                <Typography variant="body2" color="text.secondary">
                  <strong>Details:</strong> {order.activeReturn.details}
                </Typography>
              )}
              {hasActiveReturnTracking && (
                <Box sx={{ mt: 1.5, p: 1.5, borderRadius: 1.5, bgcolor: "background.paper", border: `1px solid ${theme.palette.divider}` }}>
                  <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" sx={{ textTransform: "uppercase", mb: 0.5 }}>
                    Return Shipment Details
                  </Typography>
                  {returnCourier && (
                    <Typography variant="body2">
                      <strong>Courier:</strong> {returnCourier.label}
                    </Typography>
                  )}
                  {returnTrackingNumber && (
                    <Typography variant="body2">
                      <strong>{returnCourier?.trackingNumberLabel || "Tracking No."}:</strong> {returnTrackingNumber}
                    </Typography>
                  )}
                  {returnTrackingUrl && (
                    <Box sx={{ mt: 1 }}>
                      <Button
                        component="a"
                        href={returnTrackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        size="small"
                        variant="contained"
                        color="error"
                        endIcon={<OpenInNewOutlinedIcon sx={{ fontSize: 16 }} />}
                        sx={{ color: "#fff", textTransform: "none", fontWeight: 700 }}
                      >
                        Track Return on {returnCourier?.label || "Courier"}
                      </Button>
                    </Box>
                  )}
                </Box>
              )}
            </Paper>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 2.5, py: 1.75, gap: 1, flexWrap: "wrap" }}>
        <Button onClick={onClose} sx={{ color: "text.secondary", textTransform: "none" }}>
          Close
        </Button>
        {onContactSeller && (
          <Button
            variant="outlined"
            startIcon={<ChatBubbleOutlineRoundedIcon fontSize="small" />}
            onClick={() => {
              onClose();
              onContactSeller(order);
            }}
            sx={{ textTransform: "none", borderRadius: 2 }}
          >
            Message Seller
          </Button>
        )}
        {hasActiveReturnTracking && returnTrackingUrl ? (
          <Button
            variant="outlined"
            component="a"
            href={returnTrackingUrl}
            target="_blank"
            rel="noopener noreferrer"
            startIcon={<LocalShippingOutlinedIcon fontSize="small" />}
            endIcon={<OpenInNewOutlinedIcon sx={{ fontSize: 16 }} />}
            sx={{ textTransform: "none", borderRadius: 2, fontWeight: 700 }}
          >
            Track Return
          </Button>
        ) : onTrackOrder && order.status !== "Cancelled" && (
          <Button
            variant="outlined"
            startIcon={<LocalShippingOutlinedIcon fontSize="small" />}
            onClick={() => {
              onClose();
              if (hasActiveReturnTracking) {
                onTrackOrder({
                  ...order,
                  isReturn: true,
                  courier: order.activeReturn?.return_courier,
                  trackingNumber: returnTrackingNumber,
                  trackingUrl: returnTrackingUrl,
                  activeReturn: order.activeReturn,
                });
              } else {
                onTrackOrder(order);
              }
            }}
            sx={{ textTransform: "none", borderRadius: 2 }}
          >
            {hasActiveReturnTracking ? "Track Return" : isMeetup ? "Meet-up Progress" : "Track Shipment"}
          </Button>
        )}
        {order.status === "Delivered" && onRequestReturn && (
          <Button
            variant="contained"
            color="error"
            disabled={!order.returnEligible}
            onClick={() => {
              onClose();
              onRequestReturn(order);
            }}
            sx={{ color: "#fff", textTransform: "none", borderRadius: 2 }}
          >
            Request Return
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
