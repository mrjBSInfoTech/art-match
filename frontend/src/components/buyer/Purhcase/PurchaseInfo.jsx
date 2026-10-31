import React from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Chip,
  Slide,
  Stack,
  Box,
  Typography,
  Alert,
  Divider,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import VerifiedOutlinedIcon from "@mui/icons-material/VerifiedOutlined";

import ArtworkImage from "../../common/ArtworkImage";
import { getPaymentColor, getPaymentLabel } from "../../../utils/orderPayments.js";
import { getSecureTrackingUrl } from "../../../utils/trackingUrl.js";
import { getShipmentCourier } from "../../../utils/shipmentCouriers.js";

// Animation transition matching ArtworkInfo.jsx
const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const formatDate = (value) => {
  if (!value) return "Not provided";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not provided"
    : date.toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });
};

export default function PurchaseInfo({
  open,
  handleClose,
  transaction = null,
  order = null,
  onViewOrder = null,
}) {
  const theme = useTheme();

  const isTransaction = Boolean(transaction);
  const activeRecord = transaction || order;

  if (!activeRecord) return null;

  // Derive items and primary image
  const rawOrder = transaction?.rawOrder || order;
  const items = Array.isArray(rawOrder?.items) ? rawOrder.items : [];
  const primaryItem = items[0] || null;
  const imageUrl = primaryItem?.image;

  // Status for badge overlay
  const statusLabel = isTransaction
    ? (getPaymentLabel(rawOrder) || "COMPLETED")
    : (rawOrder?.status || "ORDER PLACED");

  const statusColor = isTransaction
    ? getPaymentColor(rawOrder) === "success"
      ? theme.palette.success.main
      : theme.palette.primary.main
    : rawOrder?.status === "Delivered"
      ? theme.palette.success.main
      : rawOrder?.status === "Shipped"
        ? theme.palette.primary.main
        : theme.palette.warning.main;

  const detailLabelSx = {
    display: "block",
    color: theme.palette.text.secondary,
    fontSize: 11,
    lineHeight: 1.2,
    mb: 0.35,
  };

  const detailValueSx = {
    color: theme.palette.text.primary,
    fontSize: 12,
    fontWeight: 600,
    lineHeight: 1.35,
    overflowWrap: "anywhere",
    whiteSpace: "pre-wrap",
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      TransitionComponent={Transition}
      keepMounted
      PaperProps={{
        sx: {
          width: "min(100% - 24px, 470px)",
          maxWidth: "470px",
          borderRadius: 3,
          overflow: "hidden",
          backgroundColor: theme.palette.background.paper,
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
          color: theme.palette.text.primary,
          fontSize: 16,
          fontWeight: 700,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        {isTransaction ? (
          <ReceiptLongOutlinedIcon sx={{ color: "#ef3340", fontSize: 20 }} />
        ) : (
          <ShoppingBagOutlinedIcon sx={{ color: "#ef3340", fontSize: 20 }} />
        )}
        {isTransaction ? "Transaction Information" : `Order #${rawOrder.orderNumber}`}
        <Button
          aria-label="Close dialog"
          onClick={handleClose}
          sx={{
            minWidth: 28,
            width: 28,
            height: 28,
            ml: "auto",
            p: 0,
            color: theme.palette.text.secondary,
          }}
        >
          <CloseIcon sx={{ fontSize: 18 }} />
        </Button>
      </DialogTitle>

      <DialogContent dividers sx={{ p: { xs: 2, sm: 2.5 } }}>
        {/* Aspect-ratio Artwork Preview Card matching ArtworkInfo.jsx */}
        {imageUrl ? (
          <Box
            sx={{
              position: "relative",
              width: "100%",
              aspectRatio: "16 / 7",
              overflow: "hidden",
              borderRadius: 2,
              border: `1px solid ${theme.palette.divider}`,
              backgroundColor: theme.palette.background.default,
              mt: 0.5,
              mb: 1.5,
            }}
          >
            <ArtworkImage
              image={imageUrl}
              alt={primaryItem?.title || "Purchased artwork"}
              sx={{
                width: "100%",
                height: "100%",
                display: "block",
                objectFit: "cover",
              }}
            />
            <Chip
              label={String(statusLabel).toUpperCase()}
              size="small"
              sx={{
                position: "absolute",
                top: 10,
                right: 10,
                height: 22,
                backgroundColor: theme.palette.background.paper,
                color: statusColor,
                fontSize: 10,
                fontWeight: 700,
                boxShadow: "0 1px 4px rgba(15, 23, 42, 0.16)",
              }}
            />
          </Box>
        ) : null}

        {/* Info Grid Container matching ArtworkInfo.jsx */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
            gap: 1.5,
            p: 1.5,
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 2,
            backgroundColor: theme.palette.background.default,
          }}
        >
          <Box>
            <Typography sx={detailLabelSx}>Order Number</Typography>
            <Typography sx={detailValueSx}>
              {rawOrder.orderNumber || "Not provided"}
            </Typography>
          </Box>

          <Box>
            <Typography sx={detailLabelSx}>Date</Typography>
            <Typography sx={detailValueSx}>
              {formatDate(rawOrder.paidAt || rawOrder.createdAt || transaction?.date)}
            </Typography>
          </Box>

          {isTransaction && transaction.transactionId && transaction.transactionId !== rawOrder.orderNumber && (
            <Box sx={{ gridColumn: { xs: "auto", sm: "1 / -1" } }}>
              <Typography sx={detailLabelSx}>Payment Reference</Typography>
              <Typography sx={{ ...detailValueSx, fontFamily: "monospace", fontSize: 11 }}>
                {transaction.transactionId}
              </Typography>
            </Box>
          )}

          <Box>
            <Typography sx={detailLabelSx}>Artist / Seller</Typography>
            <Typography sx={detailValueSx}>
              {rawOrder.sellerName || "Student Artist"}
            </Typography>
          </Box>

          <Box>
            <Typography sx={detailLabelSx}>Payment Method</Typography>
            <Typography sx={detailValueSx}>
              {transaction?.paymentMethod || rawOrder.paymentMethod || (rawOrder.payment === "paymongo" ? "Online Payment" : "Cash on Delivery")}
            </Typography>
          </Box>

          {!isTransaction && (
            <>
              <Box>
                <Typography sx={detailLabelSx}>Delivery Status</Typography>
                <Typography sx={detailValueSx}>
                  {rawOrder.status || "Pending"}
                </Typography>
              </Box>
              <Box>
                <Typography sx={detailLabelSx}>Payment Status</Typography>
                <Typography sx={detailValueSx}>
                  {getPaymentLabel(rawOrder)}
                </Typography>
              </Box>
            </>
          )}

          <Box>
            <Typography sx={detailLabelSx}>Subtotal</Typography>
            <Typography sx={detailValueSx}>
              {formatCurrency(rawOrder.subtotal)}
            </Typography>
          </Box>

          <Box>
            <Typography sx={detailLabelSx}>Shipping Fee</Typography>
            <Typography sx={detailValueSx}>
              {formatCurrency(rawOrder.shipping)}
            </Typography>
          </Box>

          {Number(rawOrder.discount) > 0 && (
            <Box sx={{ gridColumn: { xs: "auto", sm: "1 / -1" } }}>
              <Typography sx={detailLabelSx}>Voucher Discount</Typography>
              <Typography sx={{ ...detailValueSx, color: "success.main" }}>
                -{formatCurrency(rawOrder.discount)} {rawOrder.voucherCode ? `(${rawOrder.voucherCode})` : ""}
              </Typography>
            </Box>
          )}

          <Box sx={{ gridColumn: { xs: "auto", sm: "1 / -1" } }}>
            <Typography sx={detailLabelSx}>Total Amount Paid</Typography>
            <Typography sx={{ ...detailValueSx, color: "#dc2626", fontSize: 15, fontWeight: 800 }}>
              {formatCurrency(rawOrder.total)}
            </Typography>
          </Box>

          {/* Delivery & Tracking Details for Order modal */}
          {!isTransaction && (rawOrder.trackingNumber || rawOrder.trackingUrl) && (
            <Box sx={{ gridColumn: { xs: "auto", sm: "1 / -1" } }}>
              <Typography sx={detailLabelSx}>Shipment & Tracking</Typography>
              <Stack spacing={0.5} sx={{ mt: 0.25 }}>
                <Typography sx={detailValueSx}>
                  Courier: {getShipmentCourier(rawOrder.courier)?.label || rawOrder.courier || "Assigned Courier"}
                </Typography>
                {rawOrder.trackingNumber && (
                  <Typography sx={detailValueSx}>
                    Tracking #: {rawOrder.trackingNumber}
                  </Typography>
                )}
                {rawOrder.trackingUrl && (
                  <Button
                    href={getSecureTrackingUrl(rawOrder.trackingUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    size="small"
                    variant="outlined"
                    endIcon={<OpenInNewIcon sx={{ fontSize: 12 }} />}
                    sx={{
                      alignSelf: "flex-start",
                      fontSize: 11,
                      textTransform: "none",
                      fontWeight: 700,
                      py: 0.2,
                      px: 1,
                      borderRadius: 1,
                      mt: 0.5,
                    }}
                  >
                    Live Tracking
                  </Button>
                )}
              </Stack>
            </Box>
          )}

          {!isTransaction && rawOrder.address && (
            <Box sx={{ gridColumn: { xs: "auto", sm: "1 / -1" } }}>
              <Typography sx={detailLabelSx}>Delivery Address</Typography>
              <Typography sx={detailValueSx}>
                {rawOrder.customer ? `${rawOrder.customer} — ` : ""}{rawOrder.address}
              </Typography>
            </Box>
          )}
        </Box>

        {/* Items in this Purchase */}
        <Box sx={{ mt: 2 }}>
          <Typography
            sx={{
              color: theme.palette.text.secondary,
              fontSize: 11,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              mb: 1,
            }}
          >
            Purchased Artworks ({items.length})
          </Typography>
          <Stack spacing={1}>
            {items.map((item) => (
              <Box
                key={item.id}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  p: 1.25,
                  borderRadius: 2,
                  border: `1px solid ${theme.palette.divider}`,
                  backgroundColor: theme.palette.background.default,
                  gap: 1.5,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, minWidth: 0, flex: 1 }}>
                  <ArtworkImage
                    image={item.image}
                    alt={item.title}
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 1.5,
                      objectFit: "cover",
                      flexShrink: 0,
                    }}
                  />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ ...detailValueSx, fontSize: 12 }} noWrap>
                      {item.title}
                    </Typography>
                    <Typography sx={{ color: theme.palette.text.secondary, fontSize: 11 }}>
                      Qty: {item.qty} · {formatCurrency(item.price)} each
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ textAlign: "right", flexShrink: 0 }}>
                  <Typography sx={{ color: "#dc2626", fontWeight: 800, fontSize: 12.5 }}>
                    {formatCurrency(item.lineTotal || (item.price * item.qty))}
                  </Typography>
                  {item.hasCertificate && !item.certificateRevoked && rawOrder.status === "Delivered" && (
                    <Button
                      component={RouterLink}
                      to={`/buyer/certificate/${item.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      size="small"
                      startIcon={<VerifiedOutlinedIcon sx={{ fontSize: 12 }} />}
                      sx={{
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: "none",
                        p: 0,
                        color: "success.main",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      Certificate
                    </Button>
                  )}
                </Box>
              </Box>
            ))}
          </Stack>
        </Box>

        {/* Refund information alert if applicable */}
        {transaction?.refundAmount > 0 && (
          <Alert severity="info" sx={{ mt: 2, fontSize: 12 }}>
            <strong>Refund Processed:</strong> {formatCurrency(transaction.refundAmount)} was recorded for returned item(s).
          </Alert>
        )}
      </DialogContent>

      <DialogActions
        sx={{
          justifyContent: "flex-end",
          gap: 1,
          px: 2.5,
          py: 1.5,
          borderTop: `1px solid ${theme.palette.divider}`,
        }}
      >
        {isTransaction && onViewOrder && (
          <Button
            onClick={() => {
              const orderData = transaction.rawOrder;
              handleClose();
              onViewOrder(orderData);
            }}
            variant="contained"
            sx={{
              backgroundColor: "#ef3340",
              color: "#fff",
              fontSize: 11,
              fontWeight: 700,
              textTransform: "none",
              borderRadius: 1.5,
              "&:hover": { backgroundColor: "#dc2626" },
            }}
          >
            View Full Order
          </Button>
        )}
        <Button
          onClick={handleClose}
          sx={{
            backgroundColor: theme.palette.action.hover,
            color: theme.palette.text.primary,
            fontSize: 11,
            fontWeight: 600,
            textTransform: "none",
            borderRadius: 1.5,
            "&:hover": { backgroundColor: theme.palette.action.selected },
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

