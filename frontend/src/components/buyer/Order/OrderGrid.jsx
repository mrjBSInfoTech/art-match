import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  alpha,
  Box,
  Button,
  Chip,
  Grid,
  Paper,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Typography,
  useTheme,
} from "@mui/material";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import AssignmentReturnOutlinedIcon from "@mui/icons-material/AssignmentReturnOutlined";
import WatermarkedArtworkImage from "../Artwork/WatermarkedArtworkImage";
import { getSecureTrackingUrl } from "../../../utils/trackingUrl.js";
import { getShipmentCourier } from "../../../utils/shipmentCouriers.js";
import {
  DELIVERY_LIFECYCLE_STEPS,
  getDeliveryProgressStepIndex,
  isRefundedOrder,
} from "../../../utils/orderStatusTabs.js";
import {
  getPaymentColor,
  getPaymentLabel,
  getPaymentMethodLabel,
  getPaymentReference,
  isPayMongoOrder,
  needsPaymentSupport,
} from "../../../utils/orderPayments.js";

const statusColor = {
  Pending: "warning",
  Confirmed: "info",
  Packed: "info",
  Shipped: "primary",
  Delivered: "success",
  Cancelled: "error",
};

const chipBackground = {
  default: "rgba(255,255,255,0.10)",
  error: "#8f343b",
  info: "#285b7d",
  primary: "#315b91",
  success: "#286344",
  warning: "#805619",
};

const returnColor = {
  Requested: "warning",
  Approved: "success",
  Rejected: "error",
  "Return Shipped": "info",
  Received: "info",
  Completed: "success",
  Cancelled: "default",
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const formatDate = (value, options = { dateStyle: "medium", timeStyle: "short" }) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString("en-PH", options);
};

export default function OrderGrid({
  orders = [],
  actionPending = "",
  onCancel,
  onReview,
  onRequestReturn,
  onViewReturn,
  onTrackOrder,
}) {
  const theme = useTheme();
  const navigate = useNavigate();
  const [copyStatus, setCopyStatus] = useState(null);
  const copyTrackingNumber = async (order) => {
    try {
      await navigator.clipboard.writeText(order.trackingNumber);
      setCopyStatus({ orderId: order.orderId, copied: true });
    } catch {
      setCopyStatus({ orderId: order.orderId, copied: false });
    }
  };
  const isDark = theme.palette.mode === "dark";
  const colors = isDark
    ? {
        card: "#1b2029",
        text: "#fff",
        secondary: "rgba(255,255,255,0.72)",
        muted: "rgba(255,255,255,0.62)",
        subtle: "rgba(255,255,255,0.55)",
        divider: "rgba(255,255,255,0.12)",
        inset: "rgba(255,255,255,0.045)",
        hover: "rgba(255,255,255,0.08)",
        buttonBorder: "rgba(255,255,255,0.35)",
        buttonDisabled: "rgba(255,255,255,0.35)",
        buttonDisabledBorder: "rgba(255,255,255,0.16)",
        image: "rgba(255,255,255,0.08)",
      }
    : {
        card: "#fff",
        text: "#1b1f23",
        secondary: "rgba(0,0,0,0.72)",
        muted: "rgba(0,0,0,0.62)",
        subtle: "rgba(0,0,0,0.55)",
        divider: "rgba(0,0,0,0.12)",
        inset: "rgba(0,0,0,0.035)",
        hover: "rgba(0,0,0,0.04)",
        buttonBorder: "rgba(0,0,0,0.32)",
        buttonDisabled: "rgba(0,0,0,0.38)",
        buttonDisabledBorder: "rgba(0,0,0,0.16)",
        image: "rgba(0,0,0,0.06)",
      };

  const chipSx = (color, outlined = false) => {
    if (isDark) {
      return {
        color: "#fff",
        backgroundColor: outlined ? "rgba(255,255,255,0.04)" : chipBackground[color] || chipBackground.default,
        borderColor: color === "default" ? "rgba(255,255,255,0.24)" : chipBackground[color],
        fontWeight: 700,
        "& .MuiChip-label": { px: 1.1 },
      };
    }
    const paletteColor = color === "default" ? theme.palette.grey[700] : theme.palette[color].dark;
    const mainColor = color === "default" ? theme.palette.grey[600] : theme.palette[color].main;
    return {
      color: paletteColor,
      backgroundColor: outlined ? "transparent" : alpha(mainColor, 0.12),
      borderColor: alpha(mainColor, 0.55),
      fontWeight: 700,
      "& .MuiChip-label": { px: 1.1 },
    };
  };

  return (
    <Grid container spacing={2}>
      {orders.map((order) => {
        const items = Array.isArray(order.items) ? order.items : [];
        const reference = isPayMongoOrder(order) ? getPaymentReference(order).trim() : "";
        const returnStatus = order.activeReturn?.status;
        const returnChipColor = returnColor[returnStatus] || "default";
        const orderChipColor = statusColor[order.status] || "default";
        const trackingUrl = getSecureTrackingUrl(order.trackingUrl);
        const courier = getShipmentCourier(order.courier);
        const placedDate = formatDate(order.date, {
          year: "numeric",
          month: "numeric",
          day: "numeric",
        });
        const sellerName = order.sellerName || items.find((i) => i.artist)?.artist || "";
        const deliveryStepIndex = getDeliveryProgressStepIndex(order.status);

        return (
          <Grid size={{ xs: 12 }} key={order.orderId}>
            <Paper
              variant="outlined"
              sx={{
                p: { xs: 2, sm: 2.5 },
                borderRadius: 2.5,
                color: colors.text,
                backgroundColor: colors.card,
                borderColor: colors.divider,
                boxShadow: isDark ? "0 8px 24px rgba(0,0,0,0.12)" : "0 2px 8px rgba(0,0,0,0.04)",
              }}
            >
              <Stack
                direction={{ xs: "column", md: "row" }}
                justifyContent="space-between"
                alignItems={{ md: "flex-start" }}
                gap={2}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
                    {order.id && (
                      <Typography
                        variant="h6"
                        sx={{ color: colors.text, fontWeight: 900, letterSpacing: 0.2 }}
                      >
                        {order.id}
                      </Typography>
                    )}
                    {sellerName && (
                      <Chip
                        size="small"
                        icon={<StorefrontOutlinedIcon sx={{ fontSize: "16px !important" }} />}
                        label={`Seller: ${sellerName}`}
                        variant="outlined"
                        sx={{
                          fontWeight: 600,
                          fontSize: 12,
                          height: 24,
                          borderColor: colors.divider,
                          color: colors.text,
                        }}
                      />
                    )}
                  </Stack>
                  <Typography variant="body2" sx={{ color: colors.secondary, mt: 0.25 }}>
                    {placedDate ? `Placed ${placedDate} · ` : ""}
                    {getPaymentMethodLabel(order)}
                    {" · "}
                    {order.deliveryMethod === "pickup" ? "Store / Campus Pickup" : "Door-to-Door"}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ display: "block", mt: 0.75, color: colors.muted }}
                  >
                    {order.deliveryMethod === "pickup"
                      ? "Pickup order. Coordinate collection schedule directly with the seller."
                      : "Artworks only. Delivery is arranged with a third-party courier and paid directly to the seller."}
                  </Typography>
                  {reference && (
                    <Typography
                      variant="caption"
                      sx={{
                        display: "block",
                        mt: 0.5,
                        color: colors.muted,
                        overflowWrap: "anywhere",
                      }}
                    >
                      Checkout: {reference}
                    </Typography>
                  )}
                </Box>

                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent={{ xs: "flex-start", md: "flex-end" }}
                  flexWrap="wrap"
                  gap={1}
                  sx={{ flexShrink: 0 }}
                >
                  <Chip
                    label={getPaymentLabel(order)}
                    size="small"
                    variant={isPayMongoOrder(order) ? "filled" : "outlined"}
                    sx={chipSx(getPaymentColor(order), !isPayMongoOrder(order))}
                  />
                  <Chip
                    label={order.status || "Status unavailable"}
                    size="small"
                    sx={chipSx(orderChipColor)}
                  />
                  {returnStatus && (
                    <Chip
                      label={`Return: ${returnStatus}`}
                      size="small"
                      variant="outlined"
                      sx={chipSx(returnChipColor, true)}
                    />
                  )}
                  <Typography
                    variant="h6"
                    sx={{ ml: { sm: 0.5 }, color: colors.text, fontWeight: 800, whiteSpace: "nowrap" }}
                  >
                    {formatCurrency(order.total)}
                  </Typography>
                </Stack>
              </Stack>

              {needsPaymentSupport(order) && (
                <Alert
                  severity="warning"
                  sx={isDark ? {
                    mt: 2,
                    color: "#fff",
                    backgroundColor: "rgba(128,86,25,0.24)",
                    border: "1px solid rgba(255,190,80,0.35)",
                    "& .MuiAlert-icon": { color: "#ffd08a" },
                  } : { mt: 2 }}
                >
                  Payment received, but this checkout needs support review for a refund.
                </Alert>
              )}

              {deliveryStepIndex >= 0 && order.status !== "Cancelled" && (
                <Box
                  sx={{
                    mt: 2,
                    p: 1.5,
                    borderRadius: 2,
                    backgroundColor: colors.inset,
                    border: `1px solid ${colors.divider}`,
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{ color: colors.muted, fontWeight: 700, display: "block", mb: 1, textTransform: "uppercase", letterSpacing: 0.5 }}
                  >
                    Delivery Progress
                  </Typography>
                  <Stepper
                    activeStep={deliveryStepIndex}
                    alternativeLabel
                    sx={{
                      "& .MuiStepLabel-label": {
                        fontSize: { xs: "0.7rem", sm: "0.75rem" },
                        fontWeight: 600,
                        color: colors.muted,
                        mt: 0.5,
                        "&.Mui-active": {
                          color: "error.main",
                          fontWeight: 800,
                        },
                        "&.Mui-completed": {
                          color: colors.text,
                          fontWeight: 700,
                        },
                      },
                      "& .MuiStepIcon-root": {
                        fontSize: { xs: "1.2rem", sm: "1.35rem" },
                        color: colors.divider,
                        "&.Mui-active": {
                          color: "error.main",
                        },
                        "&.Mui-completed": {
                          color: "success.main",
                        },
                      },
                    }}
                  >
                    {DELIVERY_LIFECYCLE_STEPS.map((label) => (
                      <Step key={label}>
                        <StepLabel>{label}</StepLabel>
                      </Step>
                    ))}
                  </Stepper>
                </Box>
              )}

              {(order.status === "Shipped" || order.status === "Delivered") && (
                <Alert
                  severity={order.status === "Delivered" ? "success" : "info"}
                  action={onTrackOrder ? (
                    <Button
                      size="small"
                      onClick={() => onTrackOrder(order)}
                      sx={{ color: "inherit", textTransform: "none", whiteSpace: "nowrap", fontWeight: 700 }}
                    >
                      {order.status === "Delivered" ? "View delivery tracking" : "Track delivery"}
                    </Button>
                  ) : trackingUrl ? (
                    <Button
                      component="a"
                      href={trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      size="small"
                      sx={{ color: "inherit", textTransform: "none", whiteSpace: "nowrap" }}
                    >
                      {order.status === "Delivered" ? "View delivery tracking" : "Track delivery"}
                    </Button>
                  ) : undefined}
                  sx={isDark ? {
                    mt: 2,
                    color: "#fff",
                    backgroundColor: order.status === "Delivered"
                      ? "rgba(40,99,68,0.22)"
                      : "rgba(40,91,125,0.22)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    "& .MuiAlert-icon": { color: "#fff" },
                  } : { mt: 2 }}
                >
                  {order.status === "Delivered"
                    ? "Your order has been delivered. Please review the artwork if you’re happy with it."
                    : "Shipping update: your order is on the way and should arrive soon."}
                  {courier && (
                    <Typography variant="body2" sx={{ mt: 0.75 }}>
                      Courier: {courier.label}
                    </Typography>
                  )}
                  {order.trackingNumber && (
                    <Stack direction="row" alignItems="center" flexWrap="wrap" gap={0.75}>
                      <Typography variant="body2" sx={{ overflowWrap: "anywhere", userSelect: "text" }}>
                        {courier?.trackingNumberLabel || "Tracking Number"}: {order.trackingNumber}
                      </Typography>
                      <Button
                        size="small"
                        onClick={() => copyTrackingNumber(order)}
                        aria-label={`Copy tracking number for ${order.id || order.orderId}`}
                        sx={{ color: "inherit", textTransform: "none", minWidth: 0 }}
                      >
                        {copyStatus?.orderId === order.orderId && copyStatus.copied ? "Copied" : "Copy"}
                      </Button>
                      {copyStatus?.orderId === order.orderId && (
                        <Typography variant="caption" role="status">
                          {copyStatus.copied ? "Tracking number copied." : "Select the tracking number to copy it manually."}
                        </Typography>
                      )}
                    </Stack>
                  )}
                </Alert>
              )}

              {order.status === "Delivered" && (
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  flexWrap="wrap"
                  gap={{ xs: 0.5, sm: 2 }}
                  sx={{
                    mt: 1.5,
                    p: 1.5,
                    borderRadius: 1.5,
                    backgroundColor: colors.inset,
                  }}
                >
                  {formatDate(order.deliveredAt) && (
                    <Typography variant="body2" sx={{ color: colors.secondary }}>
                      Delivered {formatDate(order.deliveredAt)}
                    </Typography>
                  )}
                  {formatDate(order.returnDeadline) && (
                    <Typography variant="body2" sx={{ color: colors.secondary }}>
                      Return requests accepted through {formatDate(order.returnDeadline)}.
                    </Typography>
                  )}
                  {!order.returnEligible && (
                    <Typography variant="caption" sx={{ color: colors.subtle }}>
                      {order.returnDeadline && order.returnWindowOpen === false
                        ? "Return period ended."
                        : "No items are currently eligible for a new return request."}
                    </Typography>
                  )}
                </Stack>
              )}

              {(order.activeReturn || isRefundedOrder(order)) && (
                <Paper
                  variant="outlined"
                  sx={{
                    mt: 2,
                    p: 2,
                    borderRadius: 2,
                    backgroundColor: isDark ? "rgba(143, 52, 59, 0.12)" : "#fff8f8",
                    borderColor: isDark ? "rgba(239, 68, 68, 0.35)" : "#fecaca",
                  }}
                >
                  <Stack spacing={1}>
                    <Stack
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                      flexWrap="wrap"
                      gap={1}
                    >
                      <Stack direction="row" alignItems="center" gap={1}>
                        <AssignmentReturnOutlinedIcon sx={{ color: "error.main", fontSize: 20 }} />
                        <Typography variant="subtitle2" fontWeight={800} sx={{ color: colors.text }}>
                          Refund & Return Details
                        </Typography>
                      </Stack>
                      {order.activeReturn?.status ? (
                        <Chip
                          label={`Status: ${order.activeReturn.status}`}
                          size="small"
                          color={
                            order.activeReturn.status === "Completed" || order.activeReturn.status === "Approved"
                              ? "success"
                              : order.activeReturn.status === "Rejected"
                              ? "error"
                              : "warning"
                          }
                          sx={{ fontWeight: 700 }}
                        />
                      ) : String(order.paymentStatus).toLowerCase() === "refunded" ? (
                        <Chip label="Payment Refunded" size="small" color="success" sx={{ fontWeight: 700 }} />
                      ) : null}
                    </Stack>

                    {order.activeReturn?.reason && (
                      <Typography variant="body2" sx={{ color: colors.secondary }}>
                        <strong>Reason:</strong> {order.activeReturn.reason}
                      </Typography>
                    )}

                    {order.activeReturn?.details && (
                      <Typography variant="body2" sx={{ color: colors.muted }}>
                        <strong>Details:</strong> {order.activeReturn.details}
                      </Typography>
                    )}

                    {order.activeReturn?.seller_response && (
                      <Box
                        sx={{
                          p: 1.25,
                          borderRadius: 1.5,
                          backgroundColor: colors.inset,
                          borderLeft: "3px solid",
                          borderColor: "primary.main",
                        }}
                      >
                        <Typography variant="caption" sx={{ color: colors.subtle, display: "block", fontWeight: 700 }}>
                          Seller response:
                        </Typography>
                        <Typography variant="body2" sx={{ color: colors.text }}>
                          {order.activeReturn.seller_response}
                        </Typography>
                      </Box>
                    )}

                    {order.activeReturn?.requested_at && (
                      <Typography variant="caption" sx={{ color: colors.subtle }}>
                        Requested on {formatDate(order.activeReturn.requested_at)}
                        {order.activeReturn.completed_at ? ` · Completed on ${formatDate(order.activeReturn.completed_at)}` : ""}
                      </Typography>
                    )}

                    {String(order.paymentStatus).toLowerCase() === "refunded" && (
                      <Alert severity="success" sx={{ py: 0.5, px: 1.5, "& .MuiAlert-message": { fontSize: 13 } }}>
                        Refund completed. The payment has been refunded to your account.
                      </Alert>
                    )}

                    {order.activeReturn && (
                      <Box sx={{ pt: 0.5 }}>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => onViewReturn(order.activeReturn)}
                          sx={{
                            color: colors.text,
                            borderColor: colors.buttonBorder,
                            textTransform: "none",
                            fontSize: 12,
                            "&:hover": { borderColor: colors.text, backgroundColor: colors.hover },
                          }}
                        >
                          View return in Messages
                        </Button>
                      </Box>
                    )}
                  </Stack>
                </Paper>
              )}

              <Stack
                spacing={1.5}
                sx={{ mt: 2, py: 1.5, borderTop: `1px solid ${colors.divider}`, borderBottom: `1px solid ${colors.divider}` }}
              >
                {items.map((item) => (
                  <Stack
                    key={item.id}
                    direction={{ xs: "column", sm: "row" }}
                    alignItems={{ sm: "center" }}
                    justifyContent="space-between"
                    gap={1.5}
                  >
                    <Stack direction="row" alignItems="center" gap={1.5} minWidth={0}>
                      <WatermarkedArtworkImage
                        image={item.image}
                        alt={item.title || "Artwork"}
                        sx={{
                          width: 64,
                          height: 64,
                          objectFit: "cover",
                          borderRadius: 1.5,
                          flexShrink: 0,
                          backgroundColor: colors.image,
                        }}
                      />
                      <Box minWidth={0}>
                        <Typography variant="body2" fontWeight={700} sx={{ color: colors.text, overflowWrap: "anywhere" }}>
                          {item.title || "Untitled artwork"}
                        </Typography>
                        <Typography variant="caption" sx={{ color: colors.muted }}>
                          {[item.artist, item.qty != null ? `Qty ${item.qty}` : ""].filter(Boolean).join(" · ")}
                        </Typography>
                        {item.selectedProducts?.map((product) => (
                          <Typography key={product.id} variant="caption" display="block" sx={{ color: colors.muted }}>
                            {product.name} × {product.quantity}
                          </Typography>
                        ))}
                        {item.orderNote && (
                          <Typography variant="caption" display="block" sx={{ color: colors.muted, whiteSpace: "pre-wrap" }}>
                            Request: {item.orderNote}
                          </Typography>
                        )}
                      </Box>
                    </Stack>
                    <Stack
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                      gap={1.5}
                      sx={{ pl: { xs: 9.5, sm: 0 }, flexShrink: 0 }}
                    >
                      <Typography variant="body2" fontWeight={700} sx={{ color: colors.text, whiteSpace: "nowrap" }}>
                        {formatCurrency(item.lineTotal ?? Number(item.price) * Number(item.qty || 0))}
                      </Typography>
                      {item.review ? (
                        <Chip
                          label="Reviewed"
                          size="small"
                          variant="outlined"
                          sx={{
                            color: isDark ? "#fff" : "success.dark",
                            borderColor: "success.main",
                            backgroundColor: isDark ? "transparent" : alpha(theme.palette.success.main, 0.08),
                          }}
                        />
                      ) : order.status === "Delivered" ? (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => onReview(order, item)}
                          sx={{
                            color: colors.text,
                            borderColor: colors.buttonBorder,
                            textTransform: "none",
                            whiteSpace: "nowrap",
                            "&:hover": { borderColor: colors.text, backgroundColor: colors.hover },
                          }}
                        >
                          Review item
                        </Button>
                      ) : null}
                    </Stack>
                  </Stack>
                ))}
              </Stack>

              <Stack
                direction={{ xs: "column", md: "row" }}
                justifyContent="space-between"
                alignItems={{ md: "center" }}
                gap={1.5}
                sx={{ pt: 1.5 }}
              >
                {order.address && (
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="overline" sx={{ color: colors.subtle, lineHeight: 1.4 }}>
                      {order.deliveryMethod === "pickup" ? "Pickup Location" : "Ship to"}
                    </Typography>
                    <Typography variant="body2" sx={{ color: colors.secondary, overflowWrap: "anywhere" }}>
                      {order.address}
                    </Typography>
                  </Box>
                )}
                <Stack
                  direction="row"
                  flexWrap="wrap"
                  justifyContent={{ xs: "flex-start", md: "flex-end" }}
                  gap={1}
                  sx={{ flexShrink: 0 }}
                >
                  {onTrackOrder && order.status !== "Cancelled" && (
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => onTrackOrder(order)}
                      sx={{
                        color: colors.text,
                        borderColor: colors.buttonBorder,
                        textTransform: "none",
                        "&:hover": { borderColor: colors.text, backgroundColor: colors.hover },
                      }}
                    >
                      Track Order
                    </Button>
                  )}
                  {(order.sellerId || items[0]?.sellerId) && (
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => navigate(`/buyer/messages?seller=${encodeURIComponent(order.sellerId || items[0]?.sellerId)}`)}
                      sx={{
                        color: colors.text,
                        borderColor: colors.buttonBorder,
                        textTransform: "none",
                        "&:hover": { borderColor: colors.text, backgroundColor: colors.hover },
                      }}
                    >
                      Contact Seller
                    </Button>
                  )}
                  {order.activeReturn && (
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => onViewReturn(order.activeReturn)}
                      sx={{
                        color: colors.text,
                        borderColor: colors.buttonBorder,
                        textTransform: "none",
                        "&:hover": { borderColor: colors.text, backgroundColor: colors.hover },
                      }}
                    >
                      View return in Messages
                    </Button>
                  )}
                  {order.status === "Delivered" && (
                    <Button
                      size="small"
                      variant="outlined"
                      disabled={!order.returnEligible || !items.some((item) => item.returnEligible) || Boolean(actionPending)}
                      onClick={() => onRequestReturn(order)}
                      sx={{
                        color: colors.text,
                        borderColor: colors.buttonBorder,
                        textTransform: "none",
                        "&:hover": { borderColor: colors.text, backgroundColor: colors.hover },
                        "&.Mui-disabled": { color: colors.buttonDisabled, borderColor: colors.buttonDisabledBorder },
                      }}
                    >
                      Request return
                    </Button>
                  )}
                  {order.status === "Pending" && !isPayMongoOrder(order) && (
                    <Button
                      color="error"
                      size="small"
                      disabled={Boolean(actionPending)}
                      onClick={() => onCancel(order)}
                      sx={{ textTransform: "none" }}
                    >
                      Cancel order
                    </Button>
                  )}
                </Stack>
              </Stack>
            </Paper>
          </Grid>
        );
      })}
    </Grid>
  );
}
