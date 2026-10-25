import { Alert, Box, Button, Chip, Grid, Paper, Stack, Typography } from "@mui/material";
import WatermarkedArtworkImage from "../Artwork/WatermarkedArtworkImage";
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
  Packed: "secondary",
  Shipped: "primary",
  Delivered: "success",
  Cancelled: "error",
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(value || 0);

export default function OrderGrid({ orders = [], actionPending = "", onCancel, onReview }) {
  return (
    <Grid container spacing={2}>
      {orders.map((order) => (
        <Grid size={{ xs: 12 }} key={order.orderId}>
          <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 2 }}>
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} gap={1.5}>
              <Box>
                <Typography variant="subtitle1" fontWeight={800}>{order.id}</Typography>
                <Typography variant="caption" color="text.secondary">Placed {new Date(order.date).toLocaleDateString()} · {getPaymentMethodLabel(order)}</Typography>
              </Box>
              <Stack direction="row" alignItems="center" gap={1.5} flexWrap="wrap">
                <Chip label={getPaymentLabel(order)} color={getPaymentColor(order)} size="small" variant="outlined" />
                <Chip label={order.status} color={statusColor[order.status] || "default"} size="small" />
                <Typography fontWeight={800}>{formatCurrency(order.total)}</Typography>
              </Stack>
            </Stack>
            {isPayMongoOrder(order) && getPaymentReference(order) && (
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1, overflowWrap: "anywhere" }}>
                Checkout: {getPaymentReference(order)}
              </Typography>
            )}
            {needsPaymentSupport(order) && <Alert severity="warning" sx={{ mt: 2 }}>Payment received, but this checkout needs support review for a refund.</Alert>}
            {order.status === "Shipped" || order.status === "Delivered" ? (
              <Alert severity={order.status === "Delivered" ? "success" : "info"} sx={{ mt: 2, borderRadius: 2 }}>
                {order.status === "Delivered"
                  ? "Your order has been delivered. Please review the artwork if you’re happy with it."
                  : "Shipping update: your order is on the way and should arrive soon."}
              </Alert>
            ) : null}
            <Box sx={{ borderTop: "1px solid", borderColor: "divider", mt: 2, pt: 2 }}>
              <Stack spacing={1.5}>
                {order.items.map((item) => (
                  <Stack key={item.id} direction={{ xs: "column", sm: "row" }} alignItems={{ sm: "center" }} justifyContent="space-between" gap={1.5}>
                    <Stack direction="row" alignItems="center" gap={1.5} minWidth={0}>
                      <WatermarkedArtworkImage
                        image={item.image}
                        alt={item.title}
                        sx={{
                          width: 56,
                          height: 56,
                          objectFit: "cover",
                          borderRadius: 1,
                          flexShrink: 0,
                        }}
                      />
                      <Box minWidth={0}>
                        <Typography variant="body2" fontWeight={700}>{item.title}</Typography>
                        <Typography variant="caption" color="text.secondary">{item.artist} · Qty {item.qty}</Typography>
                      </Box>
                    </Stack>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1.5}>
                      <Typography variant="body2" fontWeight={700}>{formatCurrency(item.price * item.qty)}</Typography>
                      {item.review ? (
                        <Chip label="Reviewed" size="small" color="success" variant="outlined" />
                      ) : order.status === "Delivered" ? (
                        <Button size="small" variant="outlined" onClick={() => onReview(order, item)} sx={{ borderRadius: 999, textTransform: "none" }}>Review item</Button>
                      ) : null}
                    </Stack>
                  </Stack>
                ))}
              </Stack>
            </Box>
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} gap={1} sx={{ borderTop: "1px solid", borderColor: "divider", mt: 2, pt: 1.5 }}>
              <Typography variant="caption" color="text.secondary">Ship to: {order.address}</Typography>
              <Stack direction="row" flexWrap="wrap" gap={1}>
                {order.status === "Pending" && !isPayMongoOrder(order) && <Button color="error" size="small" disabled={Boolean(actionPending)} onClick={() => onCancel(order)} sx={{ alignSelf: "flex-start", textTransform: "none" }}>Cancel order</Button>}
              </Stack>
            </Stack>
          </Paper>
        </Grid>
      ))}
    </Grid>
  );
}
