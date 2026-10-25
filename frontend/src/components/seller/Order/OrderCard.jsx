import {
  Box, Button, Chip, Divider, FormControl, FormHelperText,
  MenuItem, Paper, Select, Stack, Typography,
} from "@mui/material";
import ArrowForwardOutlinedIcon from "@mui/icons-material/ArrowForwardOutlined";
import ArtworkImage from "../../common/ArtworkImage";
import { getPaymentColor, getPaymentLabel } from "../../../utils/orderPayments.js";
import { formatCurrency, formatOrderDate, statusColorMap } from "./orderPresentation.js";

export default function OrderCard({
  order,
  onViewDetails,
  onStatusChange,
  nextStatuses = [],
  statusHint = "",
  saving = false,
  updating = false,
}) {
  const items = order.items || [];

  return (
    <Paper
      component="article"
      variant="outlined"
      sx={{
        borderRadius: 3,
        overflow: "hidden",
        minWidth: 0,
        transition: "box-shadow 160ms ease",
        "&:hover": { boxShadow: "0 6px 24px rgba(15, 23, 42, 0.06)" },
      }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        gap={1.5}
        sx={{
          px: { xs: 2, sm: 3 },
          py: 2,
          bgcolor: "action.hover",
          justifyContent: "space-between",
          alignItems: { sm: "center" },
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, overflowWrap: "anywhere" }}>
            {order.id}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {formatOrderDate(order.date)}
          </Typography>
        </Box>
        <Stack direction="row" gap={0.75} flexWrap="wrap">
          <Chip label={order.status} color={statusColorMap[order.status] || "default"}
            size="small" sx={{ fontWeight: 700 }} />
          <Chip label={getPaymentLabel(order)} color={getPaymentColor(order)}
            size="small" variant="outlined" />
        </Stack>
      </Stack>

      <Box sx={{ px: { xs: 2, sm: 3 }, py: 2.5 }}>
        <Typography variant="caption" color="text.secondary">Customer</Typography>
        <Typography variant="body2" sx={{ fontWeight: 700, mb: 2, overflowWrap: "anywhere" }}>
          {order.customer || "Customer unavailable"}
        </Typography>
        <Stack spacing={2} divider={<Divider flexItem />}>
          {items.map((item, index) => (
            <Stack key={item.artworkId || `${order.id}-${index}`} direction="row" spacing={2}
              sx={{ alignItems: "center", minWidth: 0 }}>
              <ArtworkImage
                image={item.image}
                alt={item.title || "Purchased artwork"}
                loading="lazy"
                sx={{
                  width: { xs: 72, sm: 88 },
                  height: { xs: 72, sm: 88 },
                  flexShrink: 0,
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "divider",
                  bgcolor: "background.default",
                  objectFit: "contain",
                  display: "block",
                }}
              />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, overflowWrap: "anywhere" }}>
                  {item.title || "Untitled artwork"}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Qty {item.qty} · {formatCurrency(item.price)} each
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5, fontWeight: 700, display: { sm: "none" } }}>
                  {formatCurrency(item.price * item.qty)}
                </Typography>
              </Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, flexShrink: 0, display: { xs: "none", sm: "block" } }}>
                {formatCurrency(item.price * item.qty)}
              </Typography>
            </Stack>
          ))}
        </Stack>
        <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2}
          sx={{ mt: 2.5, pt: 2, borderTop: "1px solid", borderColor: "divider" }}>
          <Typography variant="body2" color="text.secondary">
            {items.length} {items.length === 1 ? "artwork" : "artworks"}
          </Typography>
          <Box sx={{ textAlign: "right" }}>
            <Typography variant="caption" color="text.secondary">Order total</Typography>
            <Typography variant="h6" sx={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
              {formatCurrency(order.total)}
            </Typography>
          </Box>
        </Stack>
      </Box>

      <Stack direction={{ xs: "column", sm: "row" }} gap={2}
        sx={{ px: { xs: 2, sm: 3 }, pb: 2.5, justifyContent: "space-between", alignItems: { sm: "flex-start" } }}>
        <FormControl size="small" sx={{ width: { xs: "100%", sm: 290 }, maxWidth: "100%" }}>
          <Select
            value={order.status}
            disabled={saving || !nextStatuses.length}
            inputProps={{ "aria-label": `Update status for ${order.id}` }}
            onChange={(event) => onStatusChange(order.orderId, event.target.value)}
            sx={{ borderRadius: 2 }}
          >
            {[order.status, ...nextStatuses].map((status) => (
              <MenuItem key={status} value={status} disabled={status === order.status}>{status}</MenuItem>
            ))}
          </Select>
          <FormHelperText sx={{ mx: 0 }}>{updating ? "Saving order status..." : statusHint}</FormHelperText>
        </FormControl>
        <Button variant="outlined" endIcon={<ArrowForwardOutlinedIcon />} onClick={() => onViewDetails(order)}
          sx={{ borderRadius: 2, whiteSpace: "nowrap", minHeight: 40, textTransform: "none" }}>
          View details
        </Button>
      </Stack>
    </Paper>
  );
}
