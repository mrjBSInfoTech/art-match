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
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import { formatCurrency, formatOrderDate } from "./orderPresentation.js";
import { isPayMongoOrder, calculateProcessingFee } from "../../../utils/orderPayments.js";

const safeAlpha = (color, opacity) => (typeof alpha === "function" ? alpha(color, opacity) : color);

const getStatusPillStyle = (theme, status) => {
  const warning = theme?.palette?.warning?.main || "#ed6c02";
  const info = theme?.palette?.info?.main || "#0288d1";
  const secondary = theme?.palette?.secondary?.main || "#9c27b0";
  const primary = theme?.palette?.primary?.main || "#d32f2f";
  const success = theme?.palette?.success?.main || "#2e7d32";
  const error = theme?.palette?.error?.main || "#d32f2f";
  const isDark = theme?.palette?.mode === "dark";

  const styles = {
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
    Cancelled: {
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

export default function OrderTable({ orders = [], onOrderClick }) {
  const theme = useTheme();

  if (!orders || orders.length === 0) {
    return null;
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
      <TableContainer>
        <Table size="small" aria-label="Seller orders table" sx={{ minWidth: 880 }}>
          <TableHead sx={{ bgcolor: "background.default" }}>
            <TableRow sx={{ "& th": { fontWeight: 700, fontSize: 12, py: 1.5, color: "text.secondary" } }}>
              <TableCell>Order ID & Date</TableCell>
              <TableCell>Artwork</TableCell>
              <TableCell>Customer</TableCell>
              <TableCell>Delivery</TableCell>
              <TableCell align="right">Price / Gross</TableCell>
              <TableCell align="right">Platform Take</TableCell>
              <TableCell align="right">Net Payout</TableCell>
              <TableCell align="center">Status</TableCell>
              <TableCell align="center">Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {orders.map((order) => {
              const items = Array.isArray(order.items) ? order.items : [];
              const primaryItem = items[0] || {};
              const status = order.status || "Pending";
              const pillStyle = getStatusPillStyle(theme, status);

              const isOnline = isPayMongoOrder(order);
              const grossAmount = order.earning?.gross ?? order.subtotal ?? order.total ?? 0;
              const recordedFee = (order.earning?.commission || 0) + (order.earning?.processingFee || 0);
              const platformTake =
                recordedFee > 0 ? recordedFee : isOnline ? calculateProcessingFee(grossAmount) : 0;
              const platformTakePercent =
                grossAmount > 0 ? Math.round((platformTake / grossAmount) * 100) : 0;
              const netPayout =
                order.earning?.net && recordedFee > 0
                  ? order.earning.net
                  : Math.max(0, grossAmount - platformTake);

              const buyerName = order.customer || order.buyerName || "Buyer";
              const artworkTitle = primaryItem.title
                ? `${primaryItem.title}${items.length > 1 ? ` (+${items.length - 1} more)` : ""}`
                : "Untitled artwork";

              const isPickup = order.deliveryMethod === "pickup";

              const handleRowClick = () => {
                if (onOrderClick) {
                  onOrderClick(order);
                }
              };

              return (
                <TableRow
                  key={order.orderId || order.id}
                  hover
                  onClick={handleRowClick}
                  sx={{
                    cursor: "pointer",
                    "& td": { py: 1.5, verticalAlign: "middle" },
                  }}
                >
                  {/* Order ID & Date */}
                  <TableCell>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 800, color: "text.primary", fontFamily: "monospace" }}
                    >
                      {order.id || `AM-${String(order.orderId).padStart(6, "0")}`}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                      {formatOrderDate(order.date)}
                    </Typography>
                  </TableCell>

                  {/* Artwork Title & Meta */}
                  <TableCell sx={{ minWidth: 160, maxWidth: 260 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 700,
                        color: "text.primary",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        maxWidth: 240,
                      }}
                      title={artworkTitle}
                    >
                      {artworkTitle}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {items.length > 0
                        ? `Qty: ${items.reduce(
                            (acc, it) => acc + (Number(it.qty || it.quantity) || 1),
                            0,
                          )}`
                        : "1 item"}
                    </Typography>
                  </TableCell>

                  {/* Customer */}
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary" }}>
                      {buyerName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                      {order.payment === "cod" ? "Cash on Delivery" : "Online Payment"}
                    </Typography>
                  </TableCell>

                  {/* Delivery */}
                  <TableCell>
                    <Chip
                      size="small"
                      icon={
                        isPickup ? (
                          <StorefrontOutlinedIcon sx={{ fontSize: "14px !important" }} />
                        ) : (
                          <LocalShippingOutlinedIcon sx={{ fontSize: "14px !important" }} />
                        )
                      }
                      label={isPickup ? "Meet-up" : "Door-to-Door"}
                      variant="outlined"
                      sx={{ fontSize: 11, fontWeight: 600, height: 22 }}
                    />
                    {order.courier && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: "block", mt: 0.25 }}
                      >
                        {order.courier}
                      </Typography>
                    )}
                  </TableCell>

                  {/* Price / Gross */}
                  <TableCell align="right">
                    <Typography variant="body2" sx={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                      {formatCurrency(grossAmount)}
                    </Typography>
                  </TableCell>

                  {/* Platform Take */}
                  <TableCell align="right">
                    <Typography
                      variant="body2"
                      sx={{ color: "text.secondary", fontVariantNumeric: "tabular-nums" }}
                    >
                      {formatCurrency(platformTake)}
                    </Typography>
                    {platformTakePercent > 0 && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                        ({platformTakePercent}%)
                      </Typography>
                    )}
                  </TableCell>

                  {/* Net Payout */}
                  <TableCell align="right">
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 800,
                        color: "success.main",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {formatCurrency(netPayout)}
                    </Typography>
                  </TableCell>

                  {/* Status */}
                  <TableCell align="center">
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
                          height: 20,
                          fontSize: 10,
                          fontWeight: 700,
                          borderRadius: "16px",
                          bgcolor: safeAlpha(theme?.palette?.warning?.main || "#ed6c02", 0.12),
                          color: theme?.palette?.warning?.main || "#ed6c02",
                          border: `1px solid ${safeAlpha(
                            theme?.palette?.warning?.main || "#ed6c02",
                            0.4,
                          )}`,
                          mt: 0.5,
                          display: "inline-flex",
                        }}
                      />
                    )}
                  </TableCell>

                  {/* Action */}
                  <TableCell align="center">
                    <Button
                      size="small"
                      variant="outlined"
                      color="inherit"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRowClick();
                      }}
                      sx={{
                        textTransform: "none",
                        fontSize: 11,
                        fontWeight: 700,
                        borderRadius: 2,
                        py: 0.25,
                        px: 1.25,
                      }}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}

