import { useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  InputAdornment,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
// Icons
import SearchIcon from "@mui/icons-material/Search";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import PendingActionsOutlinedIcon from "@mui/icons-material/PendingActionsOutlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import { createElement } from "react";

const initialOrders = [
  {
    id: "ORD-1045",
    customer: "Maria Dela Cruz",
    date: "2026-08-22",
    status: "Pending",
    payment: "COD",
    total: 2450,
    items: [
      { title: "Sunset Over Davao", qty: 1, price: 1800 },
      { title: "Canvas Miniature", qty: 2, price: 325 },
    ],
    address: "12 Ledesma St., Davao City",
    note: "Please call before delivery.",
  },
  {
    id: "ORD-1048",
    customer: "Janelle Santos",
    date: "2026-08-23",
    status: "Confirmed",
    payment: "GCash",
    total: 3680,
    items: [
      { title: "Waves of Mindanao", qty: 1, price: 2600 },
      { title: "Ink Sketch Set", qty: 1, price: 1080 },
    ],
    address: "8 Hizon Ave., Quezon City",
    note: "Framed version preferred.",
  },
  {
    id: "ORD-1052",
    customer: "Rafael Tan",
    date: "2026-08-24",
    status: "Packed",
    payment: "Bank Transfer",
    total: 4200,
    items: [
      { title: "The Makers' Table", qty: 1, price: 2800 },
      { title: "Poster Bundle", qty: 2, price: 700 },
    ],
    address: "88 Bicol Avenue, Makati",
    note: "Include care instruction card.",
  },
  {
    id: "ORD-1059",
    customer: "Alice Lim",
    date: "2026-08-25",
    status: "Shipped",
    payment: "PayPal",
    total: 2960,
    items: [
      { title: "Night Bloom", qty: 1, price: 1950 },
      { title: "Mini Abstracts", qty: 3, price: 335 },
    ],
    address: "7 Katipunan Rd., Cebu City",
    note: "Courier delivery after 2pm.",
  },
  {
    id: "ORD-1063",
    customer: "Nico Reyes",
    date: "2026-08-25",
    status: "Delivered",
    payment: "Card",
    total: 1795,
    items: [{ title: "Golden Horizon", qty: 1, price: 1795 }],
    address: "24 Calamba St., Iloilo",
    note: "Customer requested gift wrap.",
  },
  {
    id: "ORD-1067",
    customer: "Shane Torres",
    date: "2026-08-24",
    status: "Cancelled",
    payment: "COD",
    total: 0,
    items: [{ title: "Coastal Memory", qty: 1, price: 1500 }],
    address: "Dorm 3, UP Diliman",
    note: "Cancelled by customer.",
  },
];

const orderStatuses = [
  "All",
  "Pending",
  "Confirmed",
  "Packed",
  "Shipped",
  "Delivered",
  "Cancelled",
];

const statusColorMap = {
  Pending: "warning",
  Confirmed: "info",
  Packed: "secondary",
  Shipped: "primary",
  Delivered: "success",
  Cancelled: "error",
};

const nextStatusMap = {
  Pending: "Confirmed",
  Confirmed: "Packed",
  Packed: "Shipped",
  Shipped: "Delivered",
  Delivered: "Delivered",
  Cancelled: "Cancelled",
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(value);

export default function SellerOrder() {
  const theme = useTheme();
  const [orders, setOrders] = useState(initialOrders);
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesStatus =
        selectedStatus === "All" || order.status === selectedStatus;
      const searchableText = `${order.id} ${order.customer} ${order.items
        .map((item) => item.title)
        .join(" ")}`.toLowerCase();
      const matchesSearch = searchableText.includes(searchTerm.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [orders, searchTerm, selectedStatus]);

  const summary = useMemo(() => {
    const activeOrders = orders.filter((order) => order.status !== "Cancelled");
    const revenue = activeOrders.reduce((sum, order) => sum + order.total, 0);
    const pending = orders.filter((order) => order.status === "Pending").length;
    const shipped = orders.filter((order) => order.status === "Shipped").length;

    return {
      totalOrders: orders.length,
      revenue,
      pending,
      shipped,
    };
  }, [orders]);

  const updateOrderStatus = (orderId, nextStatus) => {
    setOrders((currentOrders) =>
      currentOrders.map((order) =>
        order.id === orderId ? { ...order, status: nextStatus } : order,
      ),
    );

    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder((current) => ({ ...current, status: nextStatus }));
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Helmet titleTemplate="%s - ArtMatch">
        <title>Orders</title>
      </Helmet>

      <Stack spacing={3}>
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            justifyContent: "space-between",
            alignItems: { xs: "flex-start", md: "center" },
            gap: 2,
          }}
        >
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>
              Orders
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Track customer orders and update fulfillment status.
            </Typography>
          </Box>

          <Button
            variant="contained"
            color="error"
            sx={{
              width: { xs: "100%", sm: 150 },
              height: { xs: 35, sm: 45 },
              minWidth: { xs: 45, sm: 50 },
              fontSize: { xs: 12, sm: 16 },
              padding: 0,
            }}
            onClick={() => setSelectedStatus("All")}
          >
            Reset filters
          </Button>
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, 1fr)",
              md: "repeat(4, 1fr)",
            },
            gap: 2,
          }}
        >
          {[
            {
              label: "TOTAL ORDERS",
              value: summary.totalOrders,
              caption: "All registered orders",
              icon: ShoppingCartOutlinedIcon,
            },
            {
              label: "GROSS REVENUE",
              value: formatCurrency(summary.revenue),
              caption: "Active orders total",
              icon: PaymentsOutlinedIcon,
            },
            {
              label: "PENDING",
              value: summary.pending,
              caption: "Awaiting fulfillment",
              icon: PendingActionsOutlinedIcon,
            },
            {
              label: "IN TRANSIT",
              value: summary.shipped,
              caption: "Out for delivery",
              icon: LocalShippingOutlinedIcon,
            },
          ].map(({ label, value, caption, icon: MetricIcon }) => (
            <Paper
              key={label}
              elevation={0}
              sx={{
                p: 2,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2.5,
                backgroundColor: (theme) => theme.palette.background.paper,
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 2,
                }}
              >
                <Box>
                  <Typography
                    sx={{
                      color: (theme) => theme.palette.text.secondary,
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: 1,
                    }}
                  >
                    {label}
                  </Typography>
                  <Typography
                    sx={{
                      mt: 0.5,
                      color: (theme) => theme.palette.text.primary,
                      fontSize: 24,
                      fontWeight: 800,
                      lineHeight: 1,
                    }}
                  >
                    {value}
                  </Typography>
                  <Typography
                    sx={{
                      mt: 1,
                      color: (theme) => theme.palette.text.secondary,
                      fontSize: 12,
                    }}
                  >
                    {caption}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: 54,
                    height: 54,
                    display: "grid",
                    placeItems: "center",
                    borderRadius: 2,
                    backgroundColor: (theme) =>
                      theme.palette.mode === "dark"
                        ? "rgba(239, 68, 68, 0.14)"
                        : "#fff5f5",
                    color: (theme) => theme.palette.error.main,
                  }}
                >
                  {createElement(MetricIcon)}
                </Box>
              </Box>
            </Paper>
          ))}
        </Box>

        <Paper
          elevation={0}
          sx={{
            p: 3,
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 2,
            backgroundColor: theme.palette.background.paper,
          }}
          variant="outlined"
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", lg: "row" },
              justifyContent: "space-between",
              alignItems: { xs: "stretch", lg: "center" },
              gap: 1.25,
            }}
          >
            <TextField
              variant="outlined"
              placeholder="Search by order, customer, or artwork..."
              size="small"
              sx={{
                width: { xs: "100%", lg: 320 },
                "& .MuiOutlinedInput-root": {
                  color: theme.palette.text.primary,
                  backgroundColor: theme.palette.background.default,
                  "& fieldset": { borderColor: theme.palette.divider },
                  "&:hover fieldset": {
                    borderColor: theme.palette.text.secondary,
                  },
                },
                "& .MuiInputBase-input::placeholder": {
                  color: theme.palette.text.secondary,
                  opacity: 1,
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                flexWrap: "wrap",
              }}
            >
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <Select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  sx={{
                    fontSize: 12,
                    color: theme.palette.text.primary,
                    backgroundColor: theme.palette.background.default,
                    ".MuiOutlinedInput-notchedOutline": {
                      borderColor: theme.palette.divider,
                    },
                  }}
                >
                  {orderStatuses.map((status) => (
                    <MenuItem key={status} value={status}>
                      {status}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Box>
        </Paper>

        <Stack spacing={2}>
          {filteredOrders.length > 0 ? (
            filteredOrders.map((order) => (
              <Paper
                key={order.id}
                elevation={0}
                sx={{
                  p: 2.5,
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 3,
                }}
              >
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  spacing={2}
                  sx={{
                    justifyContent: "space-between",
                    alignItems: { xs: "flex-start", md: "center" },
                  }}
                >
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                      {order.id}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {order.customer} • {order.date}
                    </Typography>
                  </Box>

                  <Chip
                    label={order.status}
                    color={statusColorMap[order.status] || "default"}
                    size="small"
                    sx={{ fontWeight: 700, px: 1 }}
                  />

                  <Box sx={{ textAlign: { xs: "left", md: "right" } }}>
                    <Typography variant="caption" color="text.secondary">
                      Total
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>
                      {formatCurrency(order.total)}
                    </Typography>
                  </Box>
                </Stack>

                <Divider sx={{ my: 2 }} />

                <Stack
                  direction={{ xs: "column", md: "row" }}
                  spacing={2}
                  sx={{
                    justifyContent: "space-between",
                    alignItems: { xs: "flex-start", md: "center" },
                  }}
                >
                  <Stack spacing={1.25} sx={{ flex: 1 }}>
                    {order.items.slice(0, 2).map((item) => (
                      <Stack
                        key={`${order.id}-${item.title}`}
                        direction="row"
                        spacing={1.5}
                        sx={{ alignItems: "center" }}
                      >
                        <Avatar
                          sx={{
                            width: 32,
                            height: 32,
                            bgcolor: "primary.main",
                            fontSize: 12,
                          }}
                        >
                          {item.title.charAt(0)}
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {item.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Qty {item.qty} • {formatCurrency(item.price)} each
                          </Typography>
                        </Box>
                      </Stack>
                    ))}
                  </Stack>

                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1}
                    sx={{ alignItems: { xs: "flex-start", sm: "center" } }}
                  >
                    <Button
                      variant="outlined"
                      color="primary"
                      sx={{ borderRadius: 999, textTransform: "none" }}
                      onClick={() => setSelectedOrder(order)}
                    >
                      View details
                    </Button>

                    <Select
                      size="small"
                      value={order.status}
                      onChange={(e) =>
                        updateOrderStatus(order.id, e.target.value)
                      }
                      sx={{ minWidth: 150 }}
                    >
                      {orderStatuses
                        .filter((status) => status !== "All")
                        .map((status) => (
                          <MenuItem key={status} value={status}>
                            {status}
                          </MenuItem>
                        ))}
                    </Select>
                  </Stack>
                </Stack>
              </Paper>
            ))
          ) : (
            <Paper
              elevation={0}
              sx={{
                p: 4,
                border: "1px dashed",
                borderColor: "divider",
                borderRadius: 3,
                textAlign: "center",
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                No orders found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Try a different search or reset the filters.
              </Typography>
            </Paper>
          )}
        </Stack>
      </Stack>

      <Dialog
        open={Boolean(selectedOrder)}
        onClose={() => setSelectedOrder(null)}
        fullWidth
        maxWidth="md"
      >
        {selectedOrder && (
          <>
            <DialogTitle>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
                sx={{
                  justifyContent: "space-between",
                  alignItems: { xs: "flex-start", sm: "center" },
                }}
              >
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    {selectedOrder.id}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {selectedOrder.customer}
                  </Typography>
                </Box>

                <Chip
                  label={selectedOrder.status}
                  color={statusColorMap[selectedOrder.status] || "default"}
                  sx={{ fontWeight: 700 }}
                />
              </Stack>
            </DialogTitle>

            <DialogContent dividers>
              <Stack spacing={3}>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      sm: "repeat(2, minmax(0, 1fr))",
                    },
                    gap: 2,
                  }}
                >
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 2,
                    }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      Order date
                    </Typography>
                    <Typography sx={{ fontWeight: 700 }}>
                      {selectedOrder.date}
                    </Typography>
                  </Paper>

                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 2,
                    }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      Payment method
                    </Typography>
                    <Typography sx={{ fontWeight: 700 }}>
                      {selectedOrder.payment}
                    </Typography>
                  </Paper>
                </Box>

                <Box>
                  <Typography
                    variant="subtitle2"
                    sx={{ fontWeight: 800, mb: 1 }}
                  >
                    Shipping address
                  </Typography>
                  <Typography variant="body2">
                    {selectedOrder.address}
                  </Typography>
                  {selectedOrder.note && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 1 }}
                    >
                      Note: {selectedOrder.note}
                    </Typography>
                  )}
                </Box>

                <Box>
                  <Typography
                    variant="subtitle2"
                    sx={{ fontWeight: 800, mb: 1 }}
                  >
                    Items
                  </Typography>
                  <Stack spacing={1.5}>
                    {selectedOrder.items.map((item) => (
                      <Box
                        key={`${selectedOrder.id}-${item.title}`}
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          p: 1.5,
                          borderRadius: 2,
                          border: "1px solid",
                          borderColor: "divider",
                        }}
                      >
                        <Box>
                          <Typography sx={{ fontWeight: 700 }}>
                            {item.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Qty {item.qty}
                          </Typography>
                        </Box>
                        <Typography sx={{ fontWeight: 700 }}>
                          {formatCurrency(item.price * item.qty)}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              </Stack>
            </DialogContent>

            <DialogActions sx={{ p: 2.5, justifyContent: "space-between" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  Update status:
                </Typography>
                <Select
                  size="small"
                  value={selectedOrder.status}
                  onChange={(e) =>
                    updateOrderStatus(selectedOrder.id, e.target.value)
                  }
                >
                  {orderStatuses
                    .filter((status) => status !== "All")
                    .map((status) => (
                      <MenuItem key={status} value={status}>
                        {status}
                      </MenuItem>
                    ))}
                </Select>
              </Box>

              <Button
                variant="contained"
                onClick={() => setSelectedOrder(null)}
                sx={{ borderRadius: 999, textTransform: "none" }}
              >
                Close
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
