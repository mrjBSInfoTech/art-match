import {
  Box, Button, Chip, Divider, FormControl, FormHelperText,
  MenuItem, Paper, Select, Stack, Typography,
} from "@mui/material";
import { Link } from "react-router-dom";
import ArrowForwardOutlinedIcon from "@mui/icons-material/ArrowForwardOutlined";
import ArtworkImage from "../../common/ArtworkImage";
import { getPaymentColor, getPaymentLabel } from "../../../utils/orderPayments.js";
import { formatCurrency, formatOrderDate, statusColorMap } from "./orderPresentation.js";

export default function OrderCard({
  order,
  onViewDetails,
  onViewReturn,
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
      elevation={0}
      sx={{
        borderRadius: 4,
        overflow: "hidden",
        minWidth: 0,
        border: "1px solid",
        borderColor: "divider",
        background: "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(248,250,252,0.98) 100%)",
        boxShadow: "0 18px 40px rgba(15, 23, 42, 0.08)",
        transition: "box-shadow 180ms ease, transform 180ms ease",
        "&:hover": {
          boxShadow: "0 22px 48px rgba(15, 23, 42, 0.12)",
          transform: "translateY(-1px)",
        },
      }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        gap={1.5}
        sx={{
          px: { xs: 2, sm: 3 },
          py: 2,
          background: "linear-gradient(90deg, rgba(15, 23, 42, 0.02), rgba(239, 68, 68, 0.03), rgba(15, 23, 42, 0.02))",
          justifyContent: "space-between",
          alignItems: { sm: "center" },
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: 0.12, textTransform: "uppercase", fontWeight: 700 }}>
            Order
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 800, mt: 0.35, overflowWrap: "anywhere", lineHeight: 1.2 }}>
            {order.id}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.35 }}>
            {formatOrderDate(order.date)}
          </Typography>
        </Box>

        <Stack direction="row" gap={0.75} flexWrap="wrap" justifyContent={{ xs: "flex-start", sm: "flex-end" }}>
          <Chip
            label={order.status}
            color={statusColorMap[order.status] || "default"}
            size="small"
            sx={{
              fontWeight: 800,
              borderRadius: 1.5,
              px: 0.5,
              color: "#fff",
            }}
          />
          <Chip
            label={order.deliveryMethod === "pickup" ? "Meet-up" : "Door-to-door"}
            size="small"
            variant="outlined"
            color={order.deliveryMethod === "pickup" ? "info" : "default"}
            sx={{ borderRadius: 1.5, fontWeight: 700 }}
          />
          {order.activeReturn && (
            <Chip
              label={`Return: ${order.activeReturn.status}`}
              size="small"
              color="warning"
              variant="outlined"
              sx={{ borderRadius: 1.5, fontWeight: 700 }}
            />
          )}
          <Chip
            label={getPaymentLabel(order)}
            color={getPaymentColor(order)}
            size="small"
            variant="outlined"
            sx={{ borderRadius: 1.5, fontWeight: 700 }}
          />
        </Stack>
      </Stack>

      <Box sx={{ px: { xs: 2, sm: 3 }, py: 2.5 }}>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={1.5} sx={{ mb: 2 }}>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.12, fontWeight: 700 }}>
              Customer
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, mt: 0.4, overflowWrap: "anywhere" }}>
              {order.customer || "Customer unavailable"}
            </Typography>
          </Box>

          <Box sx={{ textAlign: { xs: "left", sm: "right" } }}>
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.12, fontWeight: 700 }}>
              Total
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 900, lineHeight: 1.2, fontVariantNumeric: "tabular-nums" }}>
              {formatCurrency(order.total)}
            </Typography>
          </Box>
        </Stack>

        <Stack spacing={2} divider={<Divider flexItem />}>
          {items.map((item, index) => (
            <Stack
              key={item.artworkId || `${order.id}-${index}`}
              direction="row"
              spacing={2}
              sx={{ alignItems: "center", minWidth: 0, py: 0.25 }}
            >
              <ArtworkImage
                image={item.image}
                alt={item.title || "Purchased artwork"}
                loading="lazy"
                sx={{
                  width: { xs: 76, sm: 92 },
                  height: { xs: 76, sm: 92 },
                  flexShrink: 0,
                  borderRadius: 3,
                  border: "1px solid",
                  borderColor: "divider",
                  bgcolor: "background.default",
                  objectFit: "cover",
                  display: "block",
                  boxShadow: "0 8px 20px rgba(15,23,42,0.08)",
                }}
              />

              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, overflowWrap: "anywhere", lineHeight: 1.3 }}>
                  {item.title || "Untitled artwork"}
                </Typography>

                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Qty {item.qty} · {formatCurrency(item.price)} each
                </Typography>

                {item.productOptionName && (
                  <Typography variant="caption" color="primary.main" display="block" sx={{ fontWeight: 700, mt: 0.5 }}>
                    Option: {item.productOptionName}
                  </Typography>
                )}

                {(!item.productOptionName || item.selectedProducts?.length > 1) && item.selectedProducts?.map((product) => (
                  <Typography key={product.id} variant="caption" color="text.secondary" display="block" sx={{ mt: 0.3 }}>
                    {product.name} × {product.quantity}
                  </Typography>
                ))}

                {item.orderNote && (
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ whiteSpace: "pre-wrap", mt: 0.4 }}>
                    Request: {item.orderNote}
                  </Typography>
                )}
              </Box>

              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 800,
                  flexShrink: 0,
                  display: { xs: "none", sm: "block" },
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {formatCurrency(item.lineTotal ?? item.price * item.qty)}
              </Typography>
            </Stack>
          ))}
        </Stack>

        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          gap={2}
          sx={{ mt: 2.5, pt: 2, borderTop: "1px solid", borderColor: "divider" }}
        >
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
            {items.length} {items.length === 1 ? "artwork" : "artworks"}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 0.06 }}>
            Ready for fulfillment
          </Typography>
        </Stack>
      </Box>

      <Stack
        direction={{ xs: "column", sm: "row" }}
        gap={1.5}
        sx={{
          px: { xs: 2, sm: 3 },
          p: 2.5,
          justifyContent: "space-between",
          alignItems: { sm: "center" },
          background: "rgba(15, 23, 42, 0.015)",
          borderTop: "1px solid",
          borderColor: "divider",
        }}
      >
        <FormControl size="small" sx={{ width: { xs: "100%", sm: 290 }, maxWidth: "100%" }}>
          <Select
            value={order.status}
            disabled={saving || !nextStatuses.length}
            inputProps={{ "aria-label": `Update status for ${order.id}` }}
            onChange={(event) => onStatusChange(order.orderId, event.target.value)}
            sx={{
              borderRadius: 2,
              backgroundColor: "background.paper",
              ".MuiOutlinedInput-notchedOutline": { borderColor: "divider" },
            }}
          >
            {[order.status, ...nextStatuses].map((status) => (
              <MenuItem key={status} value={status} disabled={status === order.status}>{status}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <Stack direction={{ xs: "column", sm: "row" }} gap={1} sx={{ width: { xs: "100%", sm: "auto" } }}>
          {order.activeReturn && (
            <Button
              variant="outlined"
              onClick={() => onViewReturn(order.activeReturn)}
              sx={{ borderRadius: 2, minHeight: 42, textTransform: "none", fontWeight: 700 }}
            >
              View return
            </Button>
          )}
          {order.customerId && (
            <Button
              variant="outlined"
              component={Link}
              to={`/seller/messages?buyer=${order.customerId}`}
              sx={{ borderRadius: 2, whiteSpace: "nowrap", minHeight: 42, textTransform: "none", fontWeight: 700 }}
            >
              Contact buyer
            </Button>
          )}
          <Button
            variant="contained"
            endIcon={<ArrowForwardOutlinedIcon />}
            onClick={() => onViewDetails(order)}
            sx={{
              borderRadius: 2,
              whiteSpace: "nowrap",
              minHeight: 42,
              textTransform: "none",
              fontWeight: 800,
              boxShadow: "none",
              px: 2,
            }}
          >
            View details
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}
