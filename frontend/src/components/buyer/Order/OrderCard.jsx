import { Box, Chip, Paper, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import WatermarkedArtworkImage from "../Artwork/WatermarkedArtworkImage";
import { getPaymentLabel } from "../../../utils/orderPayments.js";

const getStatusPillStyle = (theme, status) => {
  const styles = {
    Pending: {
      bgcolor: alpha(theme.palette.warning.main, theme.palette.mode === "dark" ? 0.18 : 0.12),
      color: theme.palette.warning.main,
      borderColor: alpha(theme.palette.warning.main, 0.4),
    },
    Confirmed: {
      bgcolor: alpha(theme.palette.info.main, theme.palette.mode === "dark" ? 0.18 : 0.12),
      color: theme.palette.info.main,
      borderColor: alpha(theme.palette.info.main, 0.4),
    },
    Packed: {
      bgcolor: alpha(theme.palette.secondary.main, theme.palette.mode === "dark" ? 0.18 : 0.12),
      color: theme.palette.secondary.main,
      borderColor: alpha(theme.palette.secondary.main, 0.4),
    },
    Shipped: {
      bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.18 : 0.12),
      color: theme.palette.primary.main,
      borderColor: alpha(theme.palette.primary.main, 0.4),
    },
    Delivered: {
      bgcolor: alpha(theme.palette.success.main, theme.palette.mode === "dark" ? 0.18 : 0.12),
      color: theme.palette.success.main,
      borderColor: alpha(theme.palette.success.main, 0.4),
    },
    Cancelled: {
      bgcolor: alpha(theme.palette.error.main, theme.palette.mode === "dark" ? 0.22 : 0.12),
      color: theme.palette.error.main,
      borderColor: alpha(theme.palette.error.main, 0.4),
    },
  };

  return styles[status] || {
    bgcolor: alpha(theme.palette.grey[500], theme.palette.mode === "dark" ? 0.18 : 0.12),
    color: theme.palette.text.secondary,
    borderColor: alpha(theme.palette.grey[500], 0.4),
  };
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const formatDate = (value) => {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : new Intl.DateTimeFormat("en-PH", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
};

export default function OrderCard({
  order,
  onClick,
}) {
  const theme = useTheme();
  const items = Array.isArray(order.items) ? order.items : [];
  const primaryItem = items[0] || {};
  const status = order.status || "Pending";
  const pillStyle = getStatusPillStyle(theme, status);

  const sellerName = order.sellerName || primaryItem.artist || "Student Artist";
  const artworkTitle = primaryItem.title
    ? `${primaryItem.title}${items.length > 1 ? ` (+${items.length - 1} more)` : ""}`
    : "Untitled artwork";

  const totalQty = items.reduce((sum, item) => sum + (Number(item.qty) || 1), 0);
  const paymentLabel = getPaymentLabel(order);

  return (
    <Paper
      component="article"
      role="button"
      tabIndex={0}
      elevation={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick?.();
        }
      }}
      sx={{
        p: { xs: 2, sm: 2.5 },
        borderRadius: 3.5,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        cursor: "pointer",
        transition: "all 180ms cubic-bezier(0.4, 0, 0.2, 1)",
        "&:hover": {
          boxShadow: "0 12px 28px rgba(15, 23, 42, 0.08)",
          borderColor: "error.light",
          transform: "translateY(-1px)",
        },
        "&:focus-visible": {
          outline: "2px solid",
          outlineColor: "error.main",
          outlineOffset: "2px",
        },
      }}
    >
      <Stack
        direction={{ xs: "column", md: "row" }}
        alignItems={{ xs: "flex-start", md: "center" }}
        justifyContent="space-between"
        spacing={2}
      >
        {/* Left Side: Thumbnail / Icon + Title + Meta */}
        <Stack direction="row" spacing={2} alignItems="center" sx={{ minWidth: 0, flex: 1 }}>
          {/* Thumbnail / Package Icon Box */}
          <Box
            sx={{
              width: 58,
              height: 58,
              borderRadius: 2.5,
              bgcolor: "background.default",
              border: "1px solid",
              borderColor: "divider",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              overflow: "hidden",
              position: "relative",
            }}
          >
            {items.length > 0 && primaryItem.image ? (
              <WatermarkedArtworkImage
                image={primaryItem.image}
                alt={primaryItem.title || "Purchased artwork"}
                sx={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            ) : (
              <Inventory2OutlinedIcon sx={{ color: "error.main", fontSize: 28 }} />
            )}
          </Box>

          {/* Details */}
          <Box sx={{ minWidth: 0 }}>
            {/* Title & Status Pill */}
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mb: 0.35 }}>
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 800,
                  color: "text.primary",
                  lineHeight: 1.3,
                  overflowWrap: "anywhere",
                }}
              >
                {artworkTitle}
              </Typography>
              <Chip
                label={status}
                size="small"
                sx={{
                  height: 22,
                  fontSize: 11,
                  fontWeight: 700,
                  borderRadius: "16px",
                  bgcolor: pillStyle.bgcolor,
                  color: pillStyle.color,
                  border: `1px solid ${pillStyle.borderColor}`,
                  px: 0.5,
                }}
              />
              {order.activeReturn && (
                <Chip
                  label={`Return: ${order.activeReturn.status}`}
                  size="small"
                  sx={{
                    height: 22,
                    fontSize: 10,
                    fontWeight: 700,
                    borderRadius: "16px",
                    bgcolor: alpha(theme.palette.warning.main, theme.palette.mode === "dark" ? 0.18 : 0.12),
                    color: theme.palette.warning.main,
                    border: `1px solid ${alpha(theme.palette.warning.main, 0.4)}`,
                  }}
                />
              )}
            </Stack>

            {/* Artist & Order Reference Subtitle */}
            <Typography
              variant="body2"
              sx={{
                color: "text.secondary",
                fontSize: 13,
                fontWeight: 500,
                mb: 0.35,
              }}
            >
              Artist: <strong style={{ color: "inherit" }}>{sellerName}</strong> · Order: <strong style={{ color: "inherit" }}>#{order.id || order.orderId}</strong>
            </Typography>

            {/* Date Placed */}
            <Stack direction="row" spacing={0.5} alignItems="center">
              <CalendarTodayOutlinedIcon sx={{ fontSize: 13, color: "text.secondary" }} />
              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: 12 }}>
                Placed: {formatDate(order.date)}
              </Typography>
            </Stack>
          </Box>
        </Stack>

        {/* Right Side: 3 Metric Stat Boxes */}
        <Stack
          direction="row"
          spacing={1.25}
          alignItems="center"
          sx={{
            width: { xs: "100%", md: "auto" },
            justifyContent: { xs: "space-between", md: "flex-end" },
            pt: { xs: 1, md: 0 },
            borderTop: { xs: "1px solid", md: "none" },
            borderColor: { xs: "divider", md: "transparent" },
          }}
        >
          {/* Items / Quantity */}
          <Box
            sx={{
              bgcolor: "background.default",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2,
              px: { xs: 1.5, sm: 2 },
              py: 1,
              textAlign: "center",
              minWidth: { xs: "auto", sm: 105 },
              flex: { xs: 1, md: "initial" },
            }}
          >
            <Typography
              variant="caption"
              sx={{
                display: "block",
                fontSize: 10,
                fontWeight: 700,
                color: "text.secondary",
                letterSpacing: 0.5,
                textTransform: "uppercase",
              }}
            >
              ITEMS
            </Typography>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 800,
                color: "text.primary",
                fontSize: 14,
                fontVariantNumeric: "tabular-nums",
                mt: 0.25,
              }}
            >
              {totalQty}
            </Typography>
          </Box>

          {/* Payment Status */}
          <Box
            sx={{
              bgcolor: "background.default",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2,
              px: { xs: 1.5, sm: 2 },
              py: 1,
              textAlign: "center",
              minWidth: { xs: "auto", sm: 105 },
              flex: { xs: 1, md: "initial" },
            }}
          >
            <Typography
              variant="caption"
              sx={{
                display: "block",
                fontSize: 10,
                fontWeight: 700,
                color: "text.secondary",
                letterSpacing: 0.5,
                textTransform: "uppercase",
              }}
            >
              PAYMENT
            </Typography>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 800,
                color: "text.primary",
                fontSize: 14,
                fontVariantNumeric: "tabular-nums",
                mt: 0.25,
              }}
            >
              {paymentLabel}
            </Typography>
          </Box>

          {/* Total Amount Paid */}
          <Box
            sx={{
              bgcolor: alpha(theme.palette.error.main, theme.palette.mode === "dark" ? 0.12 : 0.08),
              border: "1px solid",
              borderColor: alpha(theme.palette.error.main, 0.38),
              borderRadius: 2,
              px: { xs: 1.5, sm: 2 },
              py: 1,
              textAlign: "center",
              minWidth: { xs: "auto", sm: 110 },
              flex: { xs: 1, md: "initial" },
            }}
          >
            <Typography
              variant="caption"
              sx={{
                display: "block",
                fontSize: 10,
                fontWeight: 700,
                color: "error.main",
                letterSpacing: 0.5,
                textTransform: "uppercase",
              }}
            >
              TOTAL AMOUNT
            </Typography>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 800,
                color: "error.main",
                fontSize: 14,
                fontVariantNumeric: "tabular-nums",
                mt: 0.25,
              }}
            >
              {formatCurrency(order.total)}
            </Typography>
          </Box>
        </Stack>
      </Stack>
    </Paper>
  );
}

