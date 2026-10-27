import { Alert, alpha, Box, Button, Chip, Grid, Paper, Stack, Typography, useTheme } from "@mui/material";
import WatermarkedArtworkImage from "../Artwork/WatermarkedArtworkImage";
import { getSecureTrackingUrl } from "../../../utils/trackingUrl.js";
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
}) {
  const theme = useTheme();
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
        const placedDate = formatDate(order.date, {
          year: "numeric",
          month: "numeric",
          day: "numeric",
        });

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
                  {order.id && (
                    <Typography
                      variant="h6"
                      sx={{ color: colors.text, fontWeight: 900, letterSpacing: 0.2 }}
                    >
                      {order.id}
                    </Typography>
                  )}
                  <Typography variant="body2" sx={{ color: colors.secondary, mt: 0.25 }}>
                    {placedDate ? `Placed ${placedDate} · ` : ""}
                    {getPaymentMethodLabel(order)}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ display: "block", mt: 0.75, color: colors.muted }}
                  >
                    Artworks only. Delivery is arranged with a third-party courier
                    and paid directly to the seller.
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

              {(order.status === "Shipped" || order.status === "Delivered") && (
                <Alert
                  severity={order.status === "Delivered" ? "success" : "info"}
                  action={trackingUrl ? (
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
                        {formatCurrency(Number(item.price) * Number(item.qty || 0))}
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
                      Ship to
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
