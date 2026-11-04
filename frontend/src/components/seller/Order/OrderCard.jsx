import { Box, Chip, Paper, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import ArtworkImage from "../../common/ArtworkImage";
import { formatCurrency, formatOrderDate } from "./orderPresentation.js";

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

export default function OrderCard({
  order,
  onClick,
  onViewDetails,
}) {
  const theme = useTheme();
  const items = Array.isArray(order.items) ? order.items : [];
  const primaryItem = items[0] || {};
  const status = order.status || "Pending";
  const pillStyle = getStatusPillStyle(theme, status);

  const handleClick = () => {
    if (onClick) onClick();
    else if (onViewDetails) onViewDetails(order);
  };

  const grossAmount = order.earning?.gross ?? order.total ?? order.subtotal ?? 0;
  const platformTake = (order.earning?.commission || 0) + (order.earning?.processingFee || 0);
  const platformTakePercent = order.total && order.total > 0
    ? Math.round((platformTake / order.total) * 100)
    : 0;
  const netPayout = order.earning?.net ?? order.total ?? grossAmount;

  const artistName = order.sellerName || primaryItem.artistName || "Student Artist";
  const buyerName = order.customer || order.buyerName || "Buyer";
  const artworkTitle = primaryItem.title
    ? `${primaryItem.title}${items.length > 1 ? ` (+${items.length - 1} more)` : ""}`
    : "Untitled artwork";

  return (
    <Paper
      component="article"
      role="button"
      tabIndex={0}
      elevation={0}
      onClick={handleClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleClick();
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
          borderColor: "primary.light",
          transform: "translateY(-1px)",
        },
        "&:focus-visible": {
          outline: "2px solid",
          outlineColor: "primary.main",
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
            {items.length > 0 ? (
              items.map((item, idx) => (
                <ArtworkImage
                  key={item.id || item.artworkId || idx}
                  image={item.image}
                  alt={item.title || "Purchased artwork"}
                  sx={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: idx === 0 ? "block" : "none",
                  }}
                />
              ))
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

            {/* Artist & Buyer Subtitle */}
            <Typography
              variant="body2"
              sx={{
                color: "text.secondary",
                fontSize: 13,
                fontWeight: 500,
                mb: 0.35,
              }}
            >
              Artist: <strong style={{ color: "inherit" }}>{artistName}</strong> · Buyer: <strong style={{ color: "inherit" }}>{buyerName}</strong>
            </Typography>

            {/* Date Sold */}
            <Stack direction="row" spacing={0.5} alignItems="center">
              <CalendarTodayOutlinedIcon sx={{ fontSize: 13, color: "text.secondary" }} />
              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: 12 }}>
                Date Sold: {formatOrderDate(order.date)}
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
          {/* Price / Gross */}
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
              PRICE / GROSS
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
              {formatCurrency(grossAmount)}
            </Typography>
          </Box>

          {/* Platform Take */}
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
              PLATFORM TAKE
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
              {formatCurrency(platformTake)} ({platformTakePercent}%)
            </Typography>
          </Box>

          {/* Net Payout */}
          <Box
            sx={{
              bgcolor: alpha(theme.palette.success.main, theme.palette.mode === "dark" ? 0.12 : 0.08),
              border: "1px solid",
              borderColor: alpha(theme.palette.success.main, 0.35),
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
                color: "success.main",
                letterSpacing: 0.5,
                textTransform: "uppercase",
              }}
            >
              NET PAYOUT
            </Typography>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 800,
                color: "success.main",
                fontSize: 14,
                fontVariantNumeric: "tabular-nums",
                mt: 0.25,
              }}
            >
              {formatCurrency(netPayout)}
            </Typography>
          </Box>
        </Stack>
      </Stack>
    </Paper>
  );
}
