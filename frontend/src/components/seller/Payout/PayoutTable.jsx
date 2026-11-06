import {
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import {
  formatPayoutCurrency,
  formatPayoutDate,
  getPayoutProcessingFee,
  getPayoutNet,
  payoutApprovalLabel,
  payoutDisplayStatus,
  payoutIdentifier,
  payoutStatusMessage,
  payoutValue,
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
      bgcolor: safeAlpha(secondary, isDark ? 0.18 : 0.12),
      color: secondary,
      borderColor: safeAlpha(secondary, 0.4),
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
  };

  return (
    styles[status] || {
      bgcolor: safeAlpha(theme?.palette?.grey?.[500] || "#9e9e9e", isDark ? 0.18 : 0.12),
      color: theme?.palette?.text?.secondary || "rgba(0, 0, 0, 0.6)",
      borderColor: safeAlpha(theme?.palette?.grey?.[500] || "#9e9e9e", 0.4),
    }
  );
};

export default function PayoutTable({ orders = [], admin = false, onReview }) {
  const theme = useTheme();
  const isDark = theme?.palette?.mode === "dark";
  const primaryColor = theme?.palette?.primary?.main || "#d32f2f";
  const successColor = theme?.palette?.success?.main || "#2e7d32";
  const errorColor = theme?.palette?.error?.main || "#d32f2f";
  const dividerColor = theme?.palette?.divider || "rgba(0,0,0,0.12)";
  const textPrimary = theme?.palette?.text?.primary || "#1e293b";
  const textSecondary = theme?.palette?.text?.secondary || "#64748b";

  if (!orders || orders.length === 0) {
    return (
      <Paper
        variant="outlined"
        sx={{
          py: 5,
          px: 3,
          borderRadius: 3.5,
          textAlign: "center",
          border: "1px dashed",
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        <Typography variant="body1" fontWeight={700} color="text.secondary">
          No online-payment earnings to display.
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
          Buyer payment and seller payout are tracked separately. Eligibility never sends money automatically.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: 3.5,
        borderColor: "divider",
        overflow: "hidden",
        bgcolor: "background.paper",
      }}
    >
      <Box sx={{ px: { xs: 2, sm: 3 }, py: 2, borderBottom: "1px solid", borderColor: "divider" }}>
        <Typography variant="h6" fontWeight={800} sx={{ fontSize: 16 }}>
          Seller earnings and payouts
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>
          Buyer payments and seller payouts are tracked separately. Eligibility requires multi-admin review before release.
        </Typography>
      </Box>

      <TableContainer sx={{ maxHeight: { xs: 580, md: 720 }, overflowX: "auto" }}>
        <Table
          stickyHeader
          size="small"
          aria-label="Seller payout ledger"
          sx={{ minWidth: admin ? 1080 : 880 }}
        >
          <TableHead>
            <TableRow
              sx={{
                "& th": {
                  bgcolor: isDark ? "background.paper" : "#f8fafc",
                  fontWeight: 800,
                  fontSize: 11,
                  letterSpacing: 0.5,
                  textTransform: "uppercase",
                  color: "text.secondary",
                  py: 1.5,
                  borderBottom: "1px solid",
                  borderColor: "divider",
                  whiteSpace: "nowrap",
                },
              }}
            >
              <TableCell>Order & Date</TableCell>
              <TableCell>Artwork</TableCell>
              {admin && <TableCell>Seller</TableCell>}
              <TableCell>Buyer Payment</TableCell>
              <TableCell align="right">Artwork Total</TableCell>
              <TableCell align="right">Platform Fee</TableCell>
              <TableCell align="right">Refunded</TableCell>
              <TableCell align="right">Seller Payout</TableCell>
              <TableCell>Payout Status</TableCell>
              {admin && <TableCell align="center">Action</TableCell>}
            </TableRow>
          </TableHead>

          <TableBody>
            {orders.map((payout) => {
              const payoutStatus = payoutDisplayStatus(payout);
              const pillStyle = getStatusPillStyle(theme, payoutStatus);

              const grossAmount = Number(payout.gross || 0);
              const fee = getPayoutProcessingFee(payout);
              const recordedFee = Number(payout.commission || 0) + fee;
              const refundAmount = Number(payout.refundAmount || 0);
              const netPayout = getPayoutNet(payout);

              const feePercent =
                grossAmount > 0 ? Math.round((fee / grossAmount) * 100) : 0;

              const sellerName = payout.sellerName || `Seller ${payout.sellerId || ""}`;
              const artworkTitle = payout.artworkTitle || "Artwork Item";

              const handleRowReview = () => {
                if (admin && typeof onReview === "function") {
                  onReview(payout);
                }
              };

              return (
                <TableRow
                  key={payoutIdentifier(payout)}
                  hover
                  sx={{
                    "& td": { py: 1.75, verticalAlign: "middle" },
                    "&:last-child td": { borderBottom: 0 },
                    cursor: admin && typeof onReview === "function" ? "pointer" : "default",
                  }}
                  onClick={handleRowReview}
                >
                  {/* Order & Date */}
                  <TableCell>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 800, color: "text.primary", fontFamily: "monospace" }}
                    >
                      {payout.orderNumber}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        color: "text.secondary",
                        display: "flex",
                        alignItems: "center",
                        gap: 0.5,
                        mt: 0.25,
                      }}
                    >
                      <CalendarTodayOutlinedIcon sx={{ fontSize: 12, opacity: 0.7 }} />
                      {formatPayoutDate(payout.eligibleAt)}
                    </Typography>
                    {payout.status && (
                      <Chip
                        size="small"
                        label={`Order: ${payout.status}`}
                        sx={{
                          height: 18,
                          fontSize: 10,
                          fontWeight: 600,
                          mt: 0.5,
                          bgcolor: safeAlpha(theme.palette.text.primary, 0.05),
                          color: "text.secondary",
                          border: "none",
                        }}
                      />
                    )}
                  </TableCell>

                  {/* Artwork Title */}
                  <TableCell sx={{ minWidth: 140, maxWidth: 220 }}>
                    <Typography
                      variant="body2"
                      noWrap
                      sx={{ fontWeight: 700, color: textPrimary }}
                      title={artworkTitle}
                    >
                      {artworkTitle}
                    </Typography>
                    <Typography variant="caption" sx={{ color: textSecondary }} display="block">
                      PayMongo Online
                    </Typography>
                  </TableCell>

                  {/* Seller */}
                  {admin && (
                    <TableCell sx={{ minWidth: 140 }}>
                      <Typography
                        variant="body2"
                        noWrap
                        sx={{ fontWeight: 700, color: textPrimary }}
                      >
                        {sellerName}
                      </Typography>
                      <Typography variant="caption" sx={{ color: textSecondary }} display="block">
                        ID: #{payout.sellerId}
                      </Typography>
                    </TableCell>
                  )}

                  {/* Buyer Payment */}
                  <TableCell>
                    <Chip
                      size="small"
                      variant="outlined"
                      label={payout.paymentStatus || "Paid"}
                      color={payout.paymentStatus === "Paid" ? "success" : "default"}
                      sx={{ fontWeight: 700, fontSize: 11 }}
                    />
                  </TableCell>

                  {/* Artwork Total */}
                  <TableCell align="right" sx={{ fontWeight: 600, fontSize: 13, whiteSpace: "nowrap" }}>
                    {formatPayoutCurrency(grossAmount)}
                  </TableCell>

                  {/* Platform Take (Processing Fee) */}
                  <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                    {fee > 0 ? (
                      <>
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 700, color: "error.main", fontSize: 13 }}
                        >
                          −{formatPayoutCurrency(fee)}
                        </Typography>
                        <Typography variant="caption" sx={{ color: textSecondary }} display="block">
                          {feePercent}% processing
                        </Typography>
                      </>
                    ) : (
                      <Typography variant="body2" sx={{ color: textSecondary }}>
                        ₱0.00
                      </Typography>
                    )}
                  </TableCell>

                  {/* Refunded */}
                  <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                    {refundAmount > 0 ? (
                      <Typography variant="body2" sx={{ fontWeight: 600, color: "error.main" }}>
                        −{formatPayoutCurrency(refundAmount)}
                      </Typography>
                    ) : (
                      <Typography variant="body2" sx={{ color: textSecondary }}>
                        —
                      </Typography>
                    )}
                  </TableCell>

                  {/* Net Seller Payout */}
                  <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 800,
                        fontSize: 14,
                        color: netPayout > 0 ? successColor : textSecondary,
                      }}
                    >
                      {formatPayoutCurrency(netPayout)}
                    </Typography>
                    <Typography variant="caption" sx={{ color: textSecondary }} display="block">
                      Net student take
                    </Typography>
                  </TableCell>

                  {/* Payout Status */}
                  <TableCell sx={{ minWidth: 220, maxWidth: 280 }}>
                    <Chip
                      size="small"
                      label={payoutStatus}
                      sx={{
                        ...pillStyle,
                        border: "1px solid",
                        fontWeight: 800,
                        fontSize: 11,
                        px: 0.5,
                      }}
                    />

                    {payout.approval &&
                      !["Processing", "Paid", "Cancelled", "Reversed"].includes(payout.payoutStatus) && (
                        <Typography
                          variant="caption"
                          display="block"
                          sx={{ mt: 0.5, fontWeight: 600, color: "text.secondary" }}
                        >
                          {!admin && payout.approval.status === "Approved"
                            ? "Approved for payout"
                            : payoutApprovalLabel(payout)}
                          {payout.approval.status !== "Not Requested" &&
                            ` · ${payout.approval.approvalCount || 0} / ${
                              payout.approval.requiredApprovals || 3
                            } approvals`}
                        </Typography>
                      )}

                    {payout.providerTransferId && (
                      <Typography
                        variant="caption"
                        display="block"
                        color="text.secondary"
                        sx={{ mt: 0.5, fontFamily: "monospace", fontSize: 10 }}
                      >
                        Transfer: {payout.providerTransferId}
                        {payout.providerBatchId ? ` · Batch: ${payout.providerBatchId}` : ""}
                      </Typography>
                    )}

                    <Typography
                      variant="caption"
                      color="text.secondary"
                      display="block"
                      sx={{ mt: 0.5, fontSize: 11 }}
                    >
                      {payout.failureReason ||
                        payout.holdReason ||
                        payoutStatusMessage[payout.payoutStatus]}
                    </Typography>
                  </TableCell>

                  {/* Action */}
                  {admin && (
                    <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => onReview(payout)}
                        sx={{
                          borderRadius: 2,
                          fontWeight: 700,
                          fontSize: 11,
                          textTransform: "none",
                          px: 1.75,
                          borderColor: dividerColor,
                          color: textPrimary,
                          "&:hover": {
                            borderColor: primaryColor,
                            color: primaryColor,
                            bgcolor: safeAlpha(primaryColor, 0.06),
                          },
                        }}
                      >
                        Review
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}
