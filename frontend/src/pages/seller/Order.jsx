import { useCallback, useMemo, useRef, useState, useEffect, createElement } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
  CircularProgress,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
// Icons
import SearchIcon from "@mui/icons-material/Search";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import PendingActionsOutlinedIcon from "@mui/icons-material/PendingActionsOutlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";

import { fetchSellerOrders } from "../../api/seller/orderAPI";
import { isPlacedOrder, isSellerSale } from "../../utils/orderPayments.js";
import OrderCard from "../../components/seller/Order/OrderCard";
import ConnectionErrorPanel from "../../components/seller/ConnectionErrorPanel";
import { formatCurrency } from "../../components/seller/Order/orderPresentation.js";

const orderStatuses = [
  "All",
  "Pending",
  "Confirmed",
  "Packed",
  "Shipped",
  "Delivered",
  "Cancelled",
];

export default function SellerOrder() {
  const navigate = useNavigate();
  const theme = useTheme();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const loadingOrdersRef = useRef(false);
  const mountedRef = useRef(false);

  const loadOrders = useCallback(async () => {
    if (loadingOrdersRef.current) return;
    loadingOrdersRef.current = true;
    try {
      setError("");
      setLoading(true);
      const response = await fetchSellerOrders();
      if (!mountedRef.current) return;
      if (!Array.isArray(response)) {
        throw new Error("The orders response was not in the expected format.");
      }
      const placedOrders = response.filter(
        (order) => order && isPlacedOrder(order),
      );
      setOrders(placedOrders);
    } catch (loadError) {
      if (mountedRef.current) setError(loadError.message || "Unable to load orders");
    } finally {
      loadingOrdersRef.current = false;
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    loadOrders();
    const refresh = () => {
      if (document.visibilityState === "visible") loadOrders();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      mountedRef.current = false;
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [loadOrders]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesStatus =
        selectedStatus === "All" || order.status === selectedStatus;
      const items = Array.isArray(order.items) ? order.items : [];
      const searchableText = `${order.id || ""} ${order.customer || ""} ${items
        .map((item) => item?.title || "")
        .join(" ")}`.toLowerCase();
      const matchesSearch = searchableText.includes(searchTerm.trim().toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [orders, searchTerm, selectedStatus]);

  const summary = useMemo(() => {
    const activeOrders = orders.filter(isSellerSale);
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
  const hasFilters = selectedStatus !== "All" || searchTerm.trim() !== "";

  if (error) {
    return (
      <Box sx={{ minWidth: 0 }}>
        <Helmet titleTemplate="%s - ArtMatch">
          <title>Orders</title>
        </Helmet>
        <ConnectionErrorPanel
          title="Orders Unavailable"
          message={error}
          onRetry={loadOrders}
        />
      </Box>
    );
  }

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
              Manage paid online orders and cash on delivery orders.
            </Typography>
          </Box>
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
              caption: "Paid online and COD orders",
              icon: ShoppingCartOutlinedIcon,
            },
            {
              label: "GROSS REVENUE",
              value: formatCurrency(summary.revenue),
              caption: "COD and paid online orders",
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
                p: 2.5,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
                backgroundColor: theme.palette.background.paper,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
              variant="outlined"
            >
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      fontWeight: 700,
                      letterSpacing: 0.5,
                      textTransform: "uppercase",
                    }}
                  >
                    {label}
                  </Typography>
                  <Typography
                    variant="h5"
                    sx={{ fontWeight: 800, mt: 0.5, fontVariantNumeric: "tabular-nums" }}
                  >
                    {value}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", mt: 0.5 }}
                  >
                    {caption}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    p: 1,
                    borderRadius: 1.5,
                    backgroundColor:
                      theme.palette.mode === "dark"
                        ? "rgba(239, 68, 68, 0.15)"
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
              inputProps={{ "aria-label": "Search orders" }}
              size="small"
              sx={{
                flex: { xs: "1 1 100%", lg: "1 1 320px" },
                width: { xs: "100%", lg: "auto" },
                minWidth: 0,
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
                width: { xs: "100%", lg: "auto" },
              }}
            >
              <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 160 } }}>
                <InputLabel id="seller-order-status-label">Status</InputLabel>
                <Select
                  labelId="seller-order-status-label"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  label="Status"
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
              <Button
                variant="outlined"
                startIcon={<RefreshOutlinedIcon />}
                disabled={loading}
                onClick={loadOrders}
                sx={{ minHeight: 44, flex: { xs: 1, sm: "0 0 auto" } }}
              >
                Refresh
              </Button>
              <Button
                variant="text"
                sx={{ minHeight: 44, px: 2, flex: { xs: 1, sm: "0 0 auto" } }}
                disabled={!hasFilters}
                onClick={() => { setSelectedStatus("All"); setSearchTerm(""); }}
              >
                Reset filters
              </Button>
            </Box>
          </Box>
          {!loading && (
            <Typography
              variant="caption"
              color="text.secondary"
              aria-live="polite"
              sx={{ display: "block", mt: 1.5 }}
            >
              {filteredOrders.length} of {orders.length} orders
            </Typography>
          )}
        </Paper>

        <Stack spacing={2}>
          {error && <Alert severity="error" action={<Button color="inherit" onClick={loadOrders}>Retry</Button>}>{error}</Alert>}
          {loading && <Box sx={{ display: "grid", placeItems: "center", py: 4 }}><CircularProgress /></Box>}
          {loading ? null : filteredOrders.length > 0 ? (
            filteredOrders.map((order) => (
              <OrderCard
                key={order.orderId}
                order={order}
                onClick={() =>
                  navigate(`/seller/orders/manage/${order.orderId}`, {
                    state: { order },
                  })
                }
              />
            ))
          ) : error ? null : (
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
                {orders.length ? "Try a different search or reset the filters." : "Paid online purchases and COD orders appear here, ready for fulfillment."}
              </Typography>
            </Paper>
          )}
        </Stack>
      </Stack>
    </Box>
  );
}
