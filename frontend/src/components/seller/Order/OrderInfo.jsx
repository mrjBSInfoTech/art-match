import { forwardRef } from "react";
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  Divider, FormControl, FormHelperText, MenuItem, Select, Slide, Stack, Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import PrintOutlinedIcon from "@mui/icons-material/PrintOutlined";
import ArtworkImage from "../../common/ArtworkImage";
import {
  canFulfillOrder, getPaymentColor, getPaymentLabel,
  getPaymentMethodLabel, needsPaymentSupport,
} from "../../../utils/orderPayments.js";
import { formatCurrency, statusColorMap } from "./orderPresentation.js";
import { getSecureTrackingUrl } from "../../../utils/trackingUrl.js";
import { getShipmentCourier } from "../../../utils/shipmentCouriers.js";

const Transition = forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const formatReceiptDateTime = (value) => {
  if (!value) return "Pending";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Pending";
  return new Intl.DateTimeFormat("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
};

const formatReceiptDate = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return new Intl.DateTimeFormat("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  }).format(date);
};

const formatReceiptAmount = (value) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const getReturnDeadlineDisplay = (returnDeadline, deliveredAt) => {
  if (returnDeadline) {
    const formatted = formatReceiptDate(returnDeadline);
    if (formatted !== "N/A") return formatted;
  }
  if (deliveredAt) {
    const base = new Date(deliveredAt);
    if (!Number.isNaN(base.getTime())) {
      const deadline = new Date(base.getTime() + 7 * 24 * 60 * 60 * 1000);
      return formatReceiptDate(deadline);
    }
  }
  return "Pending delivery";
};

export default function OrderInfo({
  open,
  handleClose,
  order,
  onStatusChange,
  nextStatuses = [],
  statusHint = "",
  saving = false,
  updating = false,
  statusError = "",
  onPrint,
}) {
  const theme = useTheme();
  const items = order?.items || [];
  const trackingUrl = getSecureTrackingUrl(order?.trackingUrl);
  const shipmentCourier = getShipmentCourier(order?.courier);
  const receiptPhotos = Array.isArray(order?.receivedPhotos)
    ? order.receivedPhotos
    : Array.isArray(order?.deliveryPhotos)
      ? order.deliveryPhotos
      : Array.isArray(order?.receiptPhotos)
        ? order.receiptPhotos
        : [];
  const detailLabelSx = {
    display: "block", color: "text.secondary", fontSize: 11,
    lineHeight: 1.2, mb: 0.35,
  };
  const detailValueSx = {
    color: "text.primary", fontSize: 12, fontWeight: 600,
    lineHeight: 1.35, overflowWrap: "anywhere", whiteSpace: "pre-wrap",
  };

  const itemTitles = items.length
    ? items.map((item) => item.title || "Untitled artwork").join(", ")
    : "N/A";
  const totalQty = items.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  const courierDisplay = shipmentCourier?.label || order?.courier || "N/A";
  const receivedByDisplay =
    order?.receivedBy ||
    (order?.deliveredAt || order?.status === "Delivered"
      ? order?.customer || "Not provided"
      : "Pending");

  const receiptRows = order
    ? [
        { label: "Receipt No.:", value: order.id || order.orderNumber || "N/A" },
        { label: "Date Received:", value: formatReceiptDateTime(order.deliveredAt || order.receivedAt) },
        { label: "Buyer:", value: order.customer || "Not provided" },
        { label: "Order Date:", value: formatReceiptDate(order.date) },
        { label: "Item:", value: itemTitles },
        { label: "Qty:", value: String(totalQty) },
        { label: "Amount:", value: formatReceiptAmount(order.total), highlight: true },
        { label: "Payment:", value: getPaymentMethodLabel(order), isPayment: true },
        { label: "Courier:", value: courierDisplay },
        { label: "Tracking No.:", value: order.trackingNumber || "N/A" },
        { label: "Received by:", value: receivedByDisplay },
        { label: "Delivery Address:", value: order.address || "Not provided" },
        { label: "Return deadline:", value: getReturnDeadlineDisplay(order.returnDeadline, order.deliveredAt) },
      ]
    : [];

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      aria-labelledby="order-info-title"
      TransitionComponent={Transition}
      keepMounted
      PaperProps={{ sx: {
        width: "min(100% - 24px, 470px)", maxWidth: "470px", m: 1.5,
        borderRadius: 3, overflow: "hidden", bgcolor: "background.paper",
      } }}
    >
      <DialogTitle id="order-info-title" sx={{
        display: "flex", alignItems: "center", gap: 0.75,
        px: 2.5, py: 1.75, color: "text.primary", fontSize: 16, fontWeight: 700,
        borderBottom: `1px solid ${theme.palette.divider}`,
      }}>
        <ShoppingBagOutlinedIcon sx={{ color: "#ef3340", fontSize: 20 }} />
        Order Information
        <Button aria-label="Close order information" onClick={handleClose}
          sx={{ minWidth: 28, width: 28, height: 28, ml: "auto", p: 0, color: "text.secondary" }}>
          <CloseIcon sx={{ fontSize: 18 }} />
        </Button>
      </DialogTitle>

      <DialogContent dividers>
        {order ? (
          <Box>
            {statusError && <Alert severity="error" sx={{ mt: 1 }}>{statusError}</Alert>}
            {needsPaymentSupport(order) && (
              <Alert severity="warning" sx={{ mt: 1 }}>
                Payment received. This cancelled order needs support review for a refund.
              </Alert>
            )}
            <Box sx={{
              position: "relative", width: "100%", aspectRatio: "16 / 7",
              overflow: "hidden", borderRadius: 2, border: "1px solid",
              borderColor: "divider", bgcolor: "background.default", mt: 1.5,
            }}>
              <ArtworkImage image={items[0]?.image} alt={items[0]?.title || "Purchased artwork"}
                sx={{ width: "100%", height: "100%", display: "block", objectFit: "contain" }} />
              <Chip label={order.status} color={statusColorMap[order.status] || "default"} size="small"
                sx={{ position: "absolute", top: 10, right: 10, height: 22, fontSize: 10,
                  fontWeight: 700, boxShadow: "0 1px 4px rgba(15, 23, 42, 0.16)" }} />
            </Box>

            <Box sx={{
              mt: 1.75, p: 2, border: "1px solid",
              borderColor: "divider", borderRadius: 2, bgcolor: "background.default",
            }}>
              <Stack spacing={0.85}>
                {receiptRows.map((row) => (
                  <Box
                    key={row.label}
                    sx={{
                      display: "flex",
                      alignItems: "baseline",
                      justifyContent: "space-between",
                      gap: 1.5,
                    }}
                  >
                    <Typography
                      component="span"
                      sx={{
                        color: "text.secondary",
                        fontSize: 12,
                        fontWeight: 600,
                        flexShrink: 0,
                      }}
                    >
                      {row.label}
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap", justifyContent: "flex-end", textAlign: "right" }}>
                      <Typography
                        component="span"
                        sx={{
                          ...detailValueSx,
                          color: row.highlight ? "error.main" : "text.primary",
                          fontWeight: row.highlight ? 700 : 600,
                        }}
                      >
                        {row.value}
                      </Typography>
                      {row.isPayment && (
                        <Chip
                          label={getPaymentLabel(order)}
                          color={getPaymentColor(order)}
                          size="small"
                          variant="outlined"
                          sx={{ height: 20, fontSize: 10 }}
                        />
                      )}
                    </Box>
                  </Box>
                ))}
              </Stack>

              {order.note && (
                <>
                  <Divider sx={{ my: 1.25 }} />
                  <Box>
                    <Typography sx={detailLabelSx}>Customer note</Typography>
                    <Typography sx={detailValueSx}>{order.note}</Typography>
                  </Box>
                </>
              )}

              {trackingUrl && (
                <>
                  <Divider sx={{ my: 1.25 }} />
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Typography sx={{ color: "text.secondary", fontSize: 12, fontWeight: 600 }}>
                      Courier tracking
                    </Typography>
                    <Button
                      component="a"
                      href={trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      size="small"
                      sx={{ px: 0, minWidth: 0, fontSize: 12, textTransform: "none" }}
                    >
                      Open tracking
                    </Button>
                  </Box>
                </>
              )}
            </Box>

            {receiptPhotos.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontSize: 12, fontWeight: 700 }}>
                  Delivery / receipt proof
                </Typography>
                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(72px, 1fr))", gap: 1 }}>
                  {receiptPhotos.map((photo, index) => (
                    <Box
                      key={photo?.url || photo || `${order.id}-receipt-${index}`}
                      component="img"
                      src={photo?.url || photo}
                      alt={`Receipt proof ${index + 1}`}
                      sx={{
                        width: "100%",
                        height: 80,
                        objectFit: "cover",
                        borderRadius: 1.5,
                        border: "1px solid",
                        borderColor: "divider",
                        bgcolor: "background.default",
                      }}
                    />
                  ))}
                </Box>
              </Box>
            )}

            <Typography variant="subtitle2" sx={{ mt: 2, mb: 1, fontSize: 12, fontWeight: 700 }}>
              Purchased artworks
            </Typography>
            <Stack spacing={1}>
              {items.map((item, index) => (
                <Stack key={item.artworkId || `${order.id}-${index}`} direction="row" spacing={1.25}
                  sx={{ alignItems: "center", p: 1, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                  <ArtworkImage image={item.image} alt={item.title || "Purchased artwork"}
                    sx={{ width: 52, height: 52, flexShrink: 0, borderRadius: 1,
                      bgcolor: "background.default", objectFit: "contain", display: "block" }} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={detailValueSx}>{item.title || "Untitled artwork"}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                      Qty {item.qty} · {formatCurrency(item.price)} each
                    </Typography>
                    <Typography sx={{ ...detailValueSx, mt: 0.25 }}>
                      {formatCurrency(item.price * item.qty)}
                    </Typography>
                  </Box>
                </Stack>
              ))}
            </Stack>

            <FormControl fullWidth size="small" sx={{ mt: 2, mb: 0.5 }}>
              <Typography component="label" htmlFor="order-info-status" sx={{ ...detailLabelSx, mb: 0.75 }}>
                Update status
              </Typography>
              <Select
                id="order-info-status"
                value={order.status}
                disabled={saving || !nextStatuses.length}
                inputProps={{ "aria-label": `Update status for ${order.id} in details` }}
                onChange={(event) => onStatusChange(order.orderId, event.target.value)}
                sx={{ fontSize: 12, borderRadius: 2 }}
              >
                {[order.status, ...nextStatuses].map((status) => (
                  <MenuItem key={status} value={status} disabled={status === order.status}>{status}</MenuItem>
                ))}
              </Select>
              <FormHelperText sx={{ mx: 0, fontSize: 11 }}>
                {updating ? "Saving order status..." : statusHint}
              </FormHelperText>
            </FormControl>
          </Box>
        ) : (
          <Typography color="text.secondary">No order selected.</Typography>
        )}
      </DialogContent>

      <DialogActions sx={{ justifyContent: "flex-end", flexWrap: "wrap", gap: 1,
        px: 2.5, py: 1.5, borderTop: `1px solid ${theme.palette.divider}` }}>
        <Button variant="contained" startIcon={<PrintOutlinedIcon />} disabled={!order || !canFulfillOrder(order)}
          onClick={onPrint} sx={{ fontSize: 11, fontWeight: 700, color:"#fff" }}>
          Print Parcel Label
        </Button>
        <Button onClick={handleClose} sx={{ bgcolor: "action.hover", color: "text.primary",
          fontSize: 11, fontWeight: 600, "&:hover": { bgcolor: "action.selected" } }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
