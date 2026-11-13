import { Box, Button, Chip, Paper, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import ArtworkImage from "../../common/ArtworkImage";
import {
  formatPayoutCurrency,
  formatPayoutDate,
  getPayoutProcessingFee,
  getPayoutNet,
  payoutApprovalLabel,
  payoutDisplayStatus,
  payoutIdentifier,
  payoutStatusMessage,
} from "./payoutDisplay";

const safeAlpha = (color, opacity) =>
  typeof alpha === "function" ? alpha(color, opacity) : color;

const getStatusPillStyle = (theme, status) => {
  const warning = theme?.palette?.warning?.main || "#ed6c02";
  const info = theme?.palette?.info?.main || "#0288d1";
  const secondary = theme?.palette?.secondary?.main || "#9c27b0";
  const primary = theme?.palette?.primary?.main || "#d32f2f";
  const success = theme?.palette?.success?.main || "#2e7d32";
  const error = theme?.palette?.error?.main || "#d32f2f";
  const isDark = theme?.palette?.mode === "dark";

  const styles = {
    // Payout statuses
    Held: {
      bgcolor: safeAlpha(warning, isDark ? 0.18 : 0.12),
      color: warning,
      borderColor: safeAlpha(warning, 0.4),
    },
    Eligible: {
      bgcolor: safeAlpha(info, isDark ? 0.18 : 0.12),
      color: info,
      borderColor: safeAlpha(info, 0.4),
    },
    Processing: {
      bgcolor: safeAlpha(primary, isDark ? 0.18 : 0.12),
      color: primary,
      borderColor: safeAlpha(primary, 0.4),
    },
    Paid: {
      bgcolor: safeAlpha(success, isDark ? 0.18 : 0.12),
      color: success,
      borderColor: safeAlpha(success, 0.4),
    },
    Failed: {
      bgcolor: safeAlpha(error, isDark ? 0.22 : 0.12),
      color: error,
      borderColor: safeAlpha(error, 0.4),
    },
    Cancelled: {
      bgcolor: safeAlpha(theme?.palette?.grey?.[500] || "#9e9e9e", isDark ? 0.18 : 0.12),
      color: theme?.palette?.text?.secondary || "rgba(0, 0, 0, 0.6)",
      borderColor: safeAlpha(theme?.palette?.grey?.[500] || "#9e9e9e", 0.4),
    },
    Reversed: {
      bgcolor: safeAlpha(error, isDark ? 0.22 : 0.12),
      color: error,
      borderColor: safeAlpha(error, 0.4),
    },
    // Order statuses
    Pending: {
      bgcolor: safeAlpha(warning, isDark ? 0.18 : 0.12),
      color: warning,
      borderColor: safeAlpha(warning, 0.4),
    },
    Confirmed: {
      bgcolor: safeAlpha(info, isDark ? 0.18 : 0.12),
      color: info,
      borderColor: safeAlpha(info, 0.4),
    },
    Packed: {
      bgcolor: safeAlpha(secondary, isDark ? 0.18 : 0.12),
      color: secondary,
      borderColor: safeAlpha(secondary, 0.4),
    },
    Shipped: {
      bgcolor: safeAlpha(primary, isDark ? 0.18 : 0.12),
      color: primary,
      borderColor: safeAlpha(primary, 0.4),
    },
    Delivered: {
      bgcolor: safeAlpha(success, isDark ? 0.18 : 0.12),
      color: success,
      borderColor: safeAlpha(success, 0.4),
    },
  };

  return (
    styles[status] || {
      bgcolor: safeAlpha(theme?.palette?.grey?.[500] || "#9e9e9e", isDark ? 0.18 : 0.12),
      color: theme?.palette?.text?.secondary || "rgba(0, 0, 0, 0.6)",
      borderColor: safeAlpha(theme?.palette?.grey?.[500] || "#9e9e9e", 0.4),
    }
  );
};

export function SinglePayoutCard({ payout, admin = false, onReview }) {
  const theme = useTheme();
  const isDark = theme?.palette?.mode === "dark";

  const payoutStatus = payoutDisplayStatus(payout);
  const payoutPillStyle = getStatusPillStyle(theme, payoutStatus);
  const orderPillStyle = getStatusPillStyle(theme, payout.status || "Delivered");

  const grossAmount = Number(payout.gross || 0);
  const fee = getPayoutProcessingFee(payout);
  const recordedFee = Number(payout.commission || 0) + fee;
  const refundAmount = Number(payout.refundAmount || 0);
  const totalDeduction = recordedFee + refundAmount;
  const platformTakePercent =
    grossAmount > 0 ? Math.round((totalDeduction / grossAmount) * 100) : 0;
  const netPayout = getPayoutNet(payout);

  const handleClick = () => {
    if (admin && typeof onReview === "function") {
      onReview(payout);
    }
  };

  return (
    <Paper
      component="article"
      role={admin && typeof onReview === "function" ? "button" : "region"}
      tabIndex={admin && typeof onReview === "function" ? 0 : undefined}
      elevation={0}
      onClick={handleClick}
      onKeyDown={(event) => {
        if (
          (event.key === "Enter" || event.key === " ") &&
          admin &&
          typeof onReview === "function"
        ) {
          event.preventDefault();
          handleClick();
        }
      }}
      sx={{
        p: { xs: 1.75, sm: 2.5 },
        borderRadius: 3.5,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        overflow: "hidden",
        minWidth: 0,
        width: "100%",
        cursor: admin && typeof onReview === "function" ? "pointer" : "default",
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
        direction={{ xs: "column", lg: "row" }}
        alignItems={{ xs: "stretch", lg: "center" }}
        justifyContent="space-between"
        spacing={2}
        sx={{ minWidth: 0, width: "100%" }}
      >
        {/* Left Side: Thumbnail / Icon Box + Title + Meta */}
        <Stack
          direction="row"
          spacing={{ xs: 1.5, sm: 2 }}
          alignItems={{ xs: "flex-start", sm: "center" }}
          sx={{ minWidth: 0, flex: 1, width: "100%" }}
        >
          {/* Thumbnail / Artwork Image Box matching OrderCard */}
          <Box
            sx={{
              width: { xs: 52, sm: 58 },
              height: { xs: 52, sm: 58 },
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
            <ArtworkImage
              image={payout.artworkImage || payout.image}
              alt={payout.artworkTitle || payout.orderNumber || "Purchased artwork"}
              sx={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          </Box>

          {/* Details */}
          <Box sx={{ minWidth: 0, flex: 1 }}>
            {/* Title & Status Pills */}
            <Stack
              direction="row"
              useFlexGap
              spacing={0.75}
              alignItems="center"
              flexWrap="wrap"
              sx={{ mb: 0.5, minWidth: 0 }}
            >
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 800,
                  color: "text.primary",
                  lineHeight: 1.3,
                  wordBreak: "normal",
                  overflowWrap: "break-word",
                }}
              >
                {payout.orderNumber}
              </Typography>
              <Chip
                label={payoutStatus}
                size="small"
                sx={{
                  height: 22,
                  fontSize: 11,
                  fontWeight: 700,
                  borderRadius: "16px",
                  bgcolor: payoutPillStyle.bgcolor,
                  color: payoutPillStyle.color,
                  border: `1px solid ${payoutPillStyle.borderColor}`,
                  px: 0.5,
                }}
              />
              {payout.status && (
                <Chip
                  label={`Order: ${payout.status}`}
                  size="small"
                  sx={{
                    height: 22,
                    fontSize: 10,
                    fontWeight: 700,
                    borderRadius: "16px",
                    bgcolor: orderPillStyle.bgcolor,
                    color: orderPillStyle.color,
                    border: `1px solid ${orderPillStyle.borderColor}`,
                    px: 0.5,
                  }}
                />
              )}
              {payout.paymentStatus && (
                <Chip
                  label={payout.paymentStatus}
                  size="small"
                  sx={{
                    height: 22,
                    fontSize: 10,
                    fontWeight: 700,
                    borderRadius: "16px",
                    bgcolor: safeAlpha(theme.palette.success.main, isDark ? 0.18 : 0.12),
                    color: theme.palette.success.main,
                    border: `1px solid ${safeAlpha(theme.palette.success.main, 0.4)}`,
                    px: 0.5,
                  }}
                />
              )}
            </Stack>

            {/* Seller & Subtitle details */}
            <Typography
              variant="body2"
              sx={{
                color: "text.secondary",
                fontSize: 13,
                fontWeight: 500,
                mb: 0.4,
                lineHeight: 1.45,
                wordBreak: "normal",
                overflowWrap: "break-word",
              }}
            >
              {admin && payout.sellerName && (
                <>
                  Seller: <strong style={{ color: "inherit" }}>{payout.sellerName}</strong> ·{" "}
                </>
              )}
              {payout.destination?.institutionName ? (
                <>
                  Destination:{" "}
                  <strong style={{ color: "inherit" }}>
                    {payout.destination.institutionName} (
                    {payout.destination.maskedAccountNumber || payout.destination.accountNumber})
                  </strong>{" "}
                  ·{" "}
                </>
              ) : null}
              {payout.approval &&
              !["Processing", "Paid", "Cancelled", "Reversed"].includes(payout.payoutStatus) ? (
                <>
                  Approval:{" "}
                  <strong style={{ color: "inherit" }}>
                    {!admin && payout.approval.status === "Approved"
                      ? "Approved for payout"
                      : payoutApprovalLabel(payout)}
                    {payout.approval.status !== "Not Requested" &&
                      ` (${payout.approval.approvalCount || 0}/${payout.approval.requiredApprovals || 3})`}
                  </strong>
                </>
              ) : (
                <span style={{ color: "inherit" }}>
                  {payout.failureReason || payout.holdReason || payoutStatusMessage[payout.payoutStatus]}
                </span>
              )}
            </Typography>

            {/* Date Eligible & Provider / Transfer ID */}
            <Stack direction="row" useFlexGap spacing={0.75} alignItems="center" flexWrap="wrap">
              <CalendarTodayOutlinedIcon sx={{ fontSize: 13, color: "text.secondary", flexShrink: 0 }} />
              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: 12 }}>
                Payout eligible from: {formatPayoutDate(payout.eligibleAt)}
              </Typography>
              {payout.providerTransferId && (
                <Typography
                  variant="caption"
                  sx={{
                    color: "text.secondary",
                    fontSize: 12,
                    overflowWrap: "anywhere",
                  }}
                >
                  · Transfer ID: {payout.providerTransferId}
                  {payout.providerBatchId ? ` (${payout.providerBatchId})` : ""}
                </Typography>
              )}
            </Stack>
          </Box>
        </Stack>

        {/* Right Side: 3 Metric Stat Boxes (+ Review button if admin) */}
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.25}
          alignItems={{ xs: "stretch", sm: "center" }}
          sx={{
            width: { xs: "100%", lg: "auto" },
            flexShrink: 0,
            pt: { xs: 1.5, lg: 0 },
            borderTop: { xs: "1px solid", lg: "none" },
            borderColor: { xs: "divider", lg: "transparent" },
          }}
        >
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "repeat(auto-fit, minmax(105px, 1fr))",
                lg: "repeat(3, minmax(112px, auto))",
              },
              gap: 1.25,
              flex: { xs: 1, lg: "initial" },
              width: { xs: "100%", lg: "auto" },
            }}
          >
            {/* Price / Gross */}
            <Box
              sx={{
                bgcolor: "background.default",
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
                px: { xs: 1.25, sm: 1.75 },
                py: 1,
                textAlign: "center",
                minWidth: 0,
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
                  fontSize: { xs: 13, sm: 14 },
                  fontVariantNumeric: "tabular-nums",
                  overflowWrap: "anywhere",
                  mt: 0.25,
                }}
              >
                {formatPayoutCurrency(grossAmount)}
              </Typography>
            </Box>

            {/* Platform Take / Deductions */}
            <Box
              sx={{
                bgcolor: "background.default",
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
                px: { xs: 1.25, sm: 1.75 },
                py: 1,
                textAlign: "center",
                minWidth: 0,
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
                {refundAmount > 0 && recordedFee === 0
                  ? "REFUNDED"
                  : refundAmount > 0
                  ? "DEDUCTIONS"
                  : "PLATFORM TAKE"}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 800,
                  color: refundAmount > 0 ? "error.main" : "text.primary",
                  fontSize: { xs: 13, sm: 14 },
                  fontVariantNumeric: "tabular-nums",
                  overflowWrap: "anywhere",
                  mt: 0.25,
                }}
              >
                {formatPayoutCurrency(totalDeduction)} ({platformTakePercent}%)
              </Typography>
            </Box>

            {/* Net Payout */}
            <Box
              sx={{
                bgcolor: safeAlpha(
                  theme?.palette?.success?.main || "#2e7d32",
                  isDark ? 0.12 : 0.08
                ),
                border: "1px solid",
                borderColor: safeAlpha(theme?.palette?.success?.main || "#2e7d32", 0.35),
                borderRadius: 2,
                px: { xs: 1.25, sm: 1.75 },
                py: 1,
                textAlign: "center",
                minWidth: 0,
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
                  fontSize: { xs: 13, sm: 14 },
                  fontVariantNumeric: "tabular-nums",
                  overflowWrap: "anywhere",
                  mt: 0.25,
                }}
              >
                {formatPayoutCurrency(netPayout)}
              </Typography>
            </Box>
          </Box>

          {/* Admin Review Action Button */}
          {admin && typeof onReview === "function" && (
            <Button
              variant="outlined"
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onReview(payout);
              }}
              sx={{
                borderRadius: 2,
                textTransform: "none",
                fontWeight: 700,
                height: 42,
                px: 2,
                flexShrink: 0,
                width: { xs: "100%", sm: "auto" },
                borderColor: "primary.main",
                color: "primary.main",
                "&:hover": {
                  borderColor: "primary.dark",
                  backgroundColor: safeAlpha(theme.palette.primary.main, 0.08),
                },
              }}
            >
              Review
            </Button>
          )}
        </Stack>
      </Stack>
    </Paper>
  );
}

export default function PayoutCard({
  orders,
  payout,
  order,
  admin = false,
  onReview,
}) {
  const items = orders || (payout ? [payout] : order ? [order] : []);

  if (items.length === 0) {
    return (
      <Paper
        variant="outlined"
        sx={{
          p: 4,
          borderRadius: 3,
          textAlign: "center",
          border: "1px dashed",
          borderColor: "divider",
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          No payouts found
        </Typography>
        <Typography variant="body2" color="text.secondary">
          No online-payment earnings to display.
        </Typography>
      </Paper>
    );
  }

  return (
    <Stack spacing={2}>
      {items.map((item) => (
        <SinglePayoutCard
          key={payoutIdentifier(item) || item.orderNumber || item.orderId}
          payout={item}
          admin={admin}
          onReview={onReview}
        />
      ))}
    </Stack>
  );
}
