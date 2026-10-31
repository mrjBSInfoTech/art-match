import React from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  Alert,
} from "@mui/material";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import VerifiedOutlinedIcon from "@mui/icons-material/VerifiedOutlined";
import RefreshIcon from "@mui/icons-material/Refresh";

import ArtworkImage from "../../common/ArtworkImage";
import { getPaymentColor, getPaymentLabel } from "../../../utils/orderPayments.js";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const formatShortDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
};

export default function PurchaseTable({
  activeTab,
  loading,
  error,
  onRetry,
  search,
  filteredTransactions = [],
  filteredPurchasedItems = [],
  onSelectTransaction,
  onSelectOrder,
  copiedId,
  onCopyText,
}) {
  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 8 }}>
        <CircularProgress size={36} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={onRetry} startIcon={<RefreshIcon />}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      </Box>
    );
  }

  // TAB A: Transaction History Table
  if (activeTab === 0) {
    if (filteredTransactions.length === 0) {
      return (
        <Box sx={{ textAlign: "center", py: 8, px: 3 }}>
          <ReceiptLongOutlinedIcon sx={{ fontSize: 56, color: "text.disabled", mb: 1.5 }} />
          <Typography variant="h6" fontWeight={700} color="text.primary">
            {search ? "No matching transactions found" : "No completed transactions yet"}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 440, mx: "auto" }}>
            {search
              ? "Try checking your spelling or clear your search query to see all financial transactions."
              : "When you purchase artworks and your payment is confirmed, your transaction receipts and invoices will be recorded here."}
          </Typography>
          {!search && (
            <Button
              component={RouterLink}
              to="/buyer/shop"
              variant="contained"
              sx={{ mt: 2.5, textTransform: "none", fontWeight: 700, borderRadius: 2 }}
            >
              Explore Artwork Gallery
            </Button>
          )}
        </Box>
      );
    }

    return (
      <TableContainer sx={{ overflowX: "auto" }}>
        <Table size="small" sx={{ minWidth: 840 }}>
          <TableHead sx={{ bgcolor: (t) => (t.palette.mode === "dark" ? "background.default" : "#f8fafc") }}>
            <TableRow>
              {[
                "Order / Txn #",
                "Purchased Products",
                "Artist / Seller",
                "Date",
                "Amount",
                "Payment Method",
                "Status",
                "Refund",
                "Action",
              ].map((heading) => (
                <TableCell
                  key={heading}
                  sx={{
                    py: 1.5,
                    color: "text.secondary",
                    fontSize: 10.5,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    whiteSpace: "nowrap",
                  }}
                >
                  {heading}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredTransactions.map((tx) => (
              <TableRow
                key={tx.orderId}
                sx={{
                  "&:hover": { bgcolor: "action.hover" },
                  "&:last-child td": { borderBottom: 0 },
                }}
              >
                <TableCell sx={{ whiteSpace: "nowrap" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <Typography fontWeight={700} sx={{ fontSize: 13, color: "text.primary" }}>
                      {tx.orderNumber}
                    </Typography>
                    <Tooltip title={copiedId === tx.orderNumber ? "Copied!" : "Copy order number"}>
                      <IconButton size="small" onClick={() => onCopyText(tx.orderNumber, tx.orderNumber)}>
                        {copiedId === tx.orderNumber ? (
                          <CheckCircleOutlineIcon sx={{ fontSize: 15, color: "success.main" }} />
                        ) : (
                          <ContentCopyIcon sx={{ fontSize: 13, color: "text.disabled" }} />
                        )}
                      </IconButton>
                    </Tooltip>
                  </Box>
                  {tx.transactionId && tx.transactionId !== tx.orderNumber && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      Ref: {tx.transactionId.slice(0, 14)}…
                    </Typography>
                  )}
                </TableCell>
                <TableCell sx={{ minWidth: 200, maxWidth: 280 }}>
                  <Typography variant="body2" fontWeight={600} noWrap sx={{ fontSize: 13 }}>
                    {tx.products[0] || "Artwork"}
                  </Typography>
                  {tx.products.length > 1 && (
                    <Typography variant="caption" color="text.secondary">
                      +{tx.products.length - 1} other item{tx.products.length > 2 ? "s" : ""}
                    </Typography>
                  )}
                </TableCell>
                <TableCell sx={{ whiteSpace: "nowrap" }}>
                  <Typography variant="body2" sx={{ fontSize: 13 }}>
                    {tx.sellerName}
                  </Typography>
                </TableCell>
                <TableCell sx={{ whiteSpace: "nowrap" }}>
                  <Typography variant="body2" sx={{ fontSize: 12.5, color: "text.secondary" }}>
                    {formatShortDate(tx.date)}
                  </Typography>
                </TableCell>
                <TableCell sx={{ whiteSpace: "nowrap" }}>
                  <Typography variant="body2" fontWeight={800} color="primary.main" sx={{ fontSize: 13.5 }}>
                    {formatCurrency(tx.amount)}
                  </Typography>
                </TableCell>
                <TableCell sx={{ whiteSpace: "nowrap" }}>
                  <Chip
                    label={tx.paymentMethod}
                    size="small"
                    sx={{
                      height: 22,
                      fontSize: 11,
                      fontWeight: 700,
                      borderRadius: 1,
                      bgcolor: (t) =>
                        t.palette.mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                    }}
                  />
                </TableCell>
                <TableCell sx={{ whiteSpace: "nowrap" }}>
                  <Chip
                    label={getPaymentLabel(tx.rawOrder)}
                    size="small"
                    color={getPaymentColor(tx.rawOrder)}
                    sx={{ height: 22, fontSize: 11, fontWeight: 700, borderRadius: 1, color: "#fff" }}
                  />
                </TableCell>
                <TableCell sx={{ whiteSpace: "nowrap" }}>
                  {tx.refundStatus ? (
                    <Box>
                      <Chip
                        label={tx.refundStatus}
                        size="small"
                        color={tx.refundStatus === "Refunded" ? "error" : "warning"}
                        sx={{ height: 20, fontSize: 10, fontWeight: 700, borderRadius: 1 }}
                      />
                      {tx.refundAmount > 0 && (
                        <Typography variant="caption" color="error.main" display="block" fontWeight={700}>
                          -{formatCurrency(tx.refundAmount)}
                        </Typography>
                      )}
                    </Box>
                  ) : (
                    <Typography variant="caption" color="text.disabled">
                      —
                    </Typography>
                  )}
                </TableCell>
                <TableCell sx={{ whiteSpace: "nowrap" }}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => onSelectTransaction(tx)}
                    sx={{
                      fontSize: 11.5,
                      textTransform: "none",
                      fontWeight: 700,
                      borderRadius: 1.5,
                      py: 0.3,
                      px: 1.25,
                    }}
                  >
                    View Details
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  }

  // TAB B: Purchased Items Table
  if (filteredPurchasedItems.length === 0) {
    return (
      <Box sx={{ textAlign: "center", py: 8, px: 3 }}>
        <ShoppingBagOutlinedIcon sx={{ fontSize: 56, color: "text.disabled", mb: 1.5 }} />
        <Typography variant="h6" fontWeight={700} color="text.primary">
          {search ? "No matching purchased items" : "No purchased artworks yet"}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 440, mx: "auto" }}>
          {search
            ? "No artworks or products matched your search keyword."
            : "Once you purchase original artworks or student products, they will appear here with delivery tracking and Certificates of Authenticity."}
        </Typography>
        {!search && (
          <Button
            component={RouterLink}
            to="/buyer/shop"
            variant="contained"
            sx={{ mt: 2.5, textTransform: "none", fontWeight: 700, borderRadius: 2 }}
          >
            Browse Shop
          </Button>
        )}
      </Box>
    );
  }

  return (
    <TableContainer sx={{ overflowX: "auto" }}>
      <Table size="small" sx={{ minWidth: 920 }}>
        <TableHead sx={{ bgcolor: (t) => (t.palette.mode === "dark" ? "background.default" : "#f8fafc") }}>
          <TableRow>
            {[
              "Product",
              "Artist / Seller",
              "Order #",
              "Purchase Date",
              "Qty",
              "Price",
              "Delivery Status",
              "Return / Refund",
              "Certificate",
              "Actions",
            ].map((heading) => (
              <TableCell
                key={heading}
                sx={{
                  py: 1.5,
                  color: "text.secondary",
                  fontSize: 10.5,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  whiteSpace: "nowrap",
                }}
              >
                {heading}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredPurchasedItems.map((item) => (
            <TableRow
              key={`${item.orderId}-${item.itemId}`}
              sx={{
                "&:hover": { bgcolor: "action.hover" },
                "&:last-child td": { borderBottom: 0 },
              }}
            >
              {/* Product Thumbnail & Title */}
              <TableCell sx={{ minWidth: 220, maxWidth: 280 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <ArtworkImage
                    image={item.image}
                    alt={item.title}
                    sx={{
                      width: 52,
                      height: 52,
                      borderRadius: 1.5,
                      objectFit: "cover",
                      flexShrink: 0,
                      border: "1px solid",
                      borderColor: "divider",
                      bgcolor: "action.hover",
                    }}
                  />
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography
                      fontWeight={700}
                      sx={{
                        fontSize: 13,
                        color: "text.primary",
                        overflowWrap: "anywhere",
                      }}
                    >
                      {item.title}
                    </Typography>
                    {item.rawItem?.selectedProducts && item.rawItem.selectedProducts.length > 0 && (
                      <Typography variant="caption" color="text.secondary" display="block" noWrap>
                        Variant: {item.rawItem.selectedProducts.map((p) => p.name).join(", ")}
                      </Typography>
                    )}
                  </Box>
                </Box>
              </TableCell>

              {/* Artist */}
              <TableCell sx={{ whiteSpace: "nowrap" }}>
                <Typography variant="body2" sx={{ fontSize: 12.5 }}>
                  {item.artist}
                </Typography>
              </TableCell>

              {/* Order # */}
              <TableCell sx={{ whiteSpace: "nowrap" }}>
                <Typography
                  fontWeight={700}
                  sx={{
                    fontSize: 12.5,
                    color: "primary.main",
                    cursor: "pointer",
                    "&:hover": { textDecoration: "underline" },
                  }}
                  onClick={() => onSelectOrder(item.rawOrder)}
                >
                  {item.orderNumber}
                </Typography>
              </TableCell>

              {/* Date */}
              <TableCell sx={{ whiteSpace: "nowrap" }}>
                <Typography variant="body2" sx={{ fontSize: 12, color: "text.secondary" }}>
                  {formatShortDate(item.date)}
                </Typography>
              </TableCell>

              {/* Qty */}
              <TableCell sx={{ whiteSpace: "nowrap" }}>
                <Typography variant="body2" fontWeight={600} sx={{ fontSize: 13 }}>
                  {item.quantity}
                </Typography>
              </TableCell>

              {/* Price */}
              <TableCell sx={{ whiteSpace: "nowrap" }}>
                <Typography variant="body2" fontWeight={800} color="primary.main" sx={{ fontSize: 13 }}>
                  {formatCurrency(item.lineTotal)}
                </Typography>
                {item.quantity > 1 && (
                  <Typography variant="caption" color="text.secondary" display="block">
                    {formatCurrency(item.unitPrice)} ea
                  </Typography>
                )}
              </TableCell>

              {/* Delivery Status */}
              <TableCell sx={{ whiteSpace: "nowrap" }}>
                <Chip
                  label={item.deliveryStatus}
                  size="small"
                  color={
                    item.deliveryStatus === "Delivered"
                      ? "success"
                      : item.deliveryStatus === "Shipped"
                        ? "primary"
                        : item.deliveryStatus === "Confirmed"
                          ? "info"
                          : "warning"
                  }
                  sx={{ height: 22, fontSize: 10.5, fontWeight: 700, borderRadius: 1 }}
                />
              </TableCell>

              {/* Return / Refund Status */}
              <TableCell sx={{ whiteSpace: "nowrap" }}>
                {item.returnRefundStatus ? (
                  <Chip
                    label={item.returnRefundStatus}
                    size="small"
                    color={item.returnRefundStatus.includes("Refunded") ? "error" : "warning"}
                    sx={{ height: 22, fontSize: 10.5, fontWeight: 700, borderRadius: 1 }}
                  />
                ) : (
                  <Typography variant="caption" color="text.disabled">
                    —
                  </Typography>
                )}
              </TableCell>

              {/* Certificate of Authenticity */}
              <TableCell sx={{ whiteSpace: "nowrap" }}>
                {item.hasCertificate ? (
                  item.certificateRevoked ? (
                    <Tooltip title="Access has been revoked because this product was returned.">
                      <Chip
                        label="Revoked"
                        size="small"
                        color="error"
                        variant="outlined"
                        sx={{ height: 22, fontSize: 10.5, fontWeight: 700, borderRadius: 1 }}
                      />
                    </Tooltip>
                  ) : item.isDelivered && item.isPaid ? (
                    <Button
                      component={RouterLink}
                      to={`/buyer/certificate/${item.itemId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      size="small"
                      variant="outlined"
                      color="success"
                      startIcon={<VerifiedOutlinedIcon sx={{ fontSize: 14 }} />}
                      sx={{
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: "none",
                        py: 0.2,
                        px: 1,
                        borderRadius: 1.5,
                      }}
                    >
                      Certificate
                    </Button>
                  ) : (
                    <Tooltip title="Certificate of Authenticity unlocks upon paid delivery.">
                      <Chip
                        label="Upon Delivery"
                        size="small"
                        sx={{
                          height: 22,
                          fontSize: 10,
                          fontWeight: 600,
                          borderRadius: 1,
                          bgcolor: (t) =>
                            t.palette.mode === "dark" ? "rgba(255,255,255,0.06)" : "#f1f5f9",
                        }}
                      />
                    </Tooltip>
                  )
                ) : (
                  <Typography variant="caption" color="text.disabled">
                    —
                  </Typography>
                )}
              </TableCell>

              {/* Actions */}
              <TableCell sx={{ whiteSpace: "nowrap" }}>
                <Button
                  size="small"
                  variant="text"
                  onClick={() => onSelectOrder(item.rawOrder)}
                  sx={{
                    fontSize: 11.5,
                    fontWeight: 700,
                    textTransform: "none",
                  }}
                >
                  Order Details
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

