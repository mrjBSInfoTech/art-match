import {
  useCallback,
  useMemo,
  useRef,
  useState,
  useEffect,
  createElement,
} from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
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
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
// Icons
import SearchIcon from "@mui/icons-material/Search";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import PendingActionsOutlinedIcon from "@mui/icons-material/PendingActionsOutlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import ViewListIcon from "@mui/icons-material/ViewList";

import { fetchSellerOrders } from "../../api/seller/orderAPI";
import { isPlacedOrder, isSellerSale } from "../../utils/orderPayments.js";
import OrderCard from "../../components/seller/Order/OrderCard";
import OrderTable from "../../components/seller/Order/OrderTable";
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
  const [viewMode, setViewMode] = useState("card");
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
      if (mountedRef.current)
        setError(loadError.message || "Unable to load orders");
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
      const matchesSearch = searchableText.includes(
        searchTerm.trim().toLowerCase(),
      );
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
    <Box
      sx={{
        p: { xs: 1.5, sm: 2.5 },
        minHeight: "100vh",
        backgroundColor: theme.palette.background.default,
        color: theme.palette.text.primary,
      }}
    >
      <Helmet titleTemplate="%s - ArtMatch">
        <title>Orders</title>
      </Helmet>

      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" },
          gap: 2,
          mb: 2.5,
          flexWrap: "wrap",
        }}
      >
        <Box>
          <Typography
            sx={{
              fontSize: { xs: 28, sm: 38 },
              fontWeight: 800,
              lineHeight: 1.1,
              color: theme.palette.text.primary,
            }}
          >
            Orders
          </Typography>
          <Typography
            sx={{
              mt: 0.75,
              color: theme.palette.text.secondary,
              fontSize: 13,
            }}
          >
            Manage paid online orders and cash on delivery orders.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshOutlinedIcon />}
          onClick={loadOrders}
          disabled={loading}
          sx={{
            width: { xs: "100%", sm: 150 },
            height: { xs: 38, sm: 44 },
            minWidth: { xs: 45, sm: 50 },
            fontSize: { xs: 12, sm: 16 },
            padding: 0,
            borderRadius: 1.5,
            textTransform: "none",
            fontWeight: 700,
          }}
        >
          Refresh
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
          mb: 2.5,
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
          <Card
            key={label}
            sx={{
              backgroundColor: theme.palette.background.paper,
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 2.5,
              boxShadow: "none",
            }}
          >
            <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
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
                      color: theme.palette.text.secondary,
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
                      color: theme.palette.text.primary,
                      fontSize: 30,
                      fontWeight: 800,
                      lineHeight: 1,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {value}
                  </Typography>
                  <Typography
                    sx={{
                      mt: 1,
                      color: theme.palette.text.secondary,
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
                    backgroundColor:
                      theme.palette.mode === "dark"
                        ? "rgba(239, 68, 68, 0.14)"
                        : "#fff5f5",
                    color: theme.palette.error.main,
                  }}
                >
                  {createElement(MetricIcon)}
                </Box>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Paper
        sx={{
          p: { xs: 2, md: 2.5 },
          borderRadius: 2.5,
          backgroundColor: theme.palette.background.paper,
          borderColor: theme.palette.divider,
          mb: 2.5,
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
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", md: "row" },
              justifyContent: "space-between",
              alignItems: { xs: "stretch", md: "center" },
              gap: 2,
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
          </Box>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              flexWrap: "wrap",
              width: { xs: "100%", lg: "auto" },
            }}
          >
            <FormControl
              size="small"
              sx={{ minWidth: { xs: "100%", sm: 160 } }}
            >
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
          </Box>
        </Box>
      </Paper>

      {/* View Mode Switcher & Summary Count */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 1.5,
          mt: 0.5,
          mb: 0.5,
        }}
      >
        <Typography
          variant="caption"
          color="text.secondary"
          aria-live="polite"
          sx={{ fontWeight: 600 }}
        >
          Showing {filteredOrders.length} of {orders.length} orders
        </Typography>

        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(e, next) => {
            if (next) setViewMode(next);
          }}
          size="small"
          aria-label="Order presentation mode"
          sx={{
            backgroundColor: theme.palette.background.paper,
            borderRadius: 2.5,
            border: `1px solid ${theme.palette.divider}`,
            p: 0.3,
            "& .MuiToggleButton-root": {
              border: "none",
              borderRadius: 2,
              px: 1.5,
              py: 0.5,
              fontSize: 12,
              fontWeight: 700,
              textTransform: "none",
              color: theme.palette.text.secondary,
              gap: 0.75,
              transition: "all 150ms ease",
            },
            "& .MuiToggleButton-root.Mui-selected": {
              backgroundColor: theme.palette.error.main,
              color: "#fff",
              "&:hover": {
                backgroundColor: theme.palette.error.dark,
              },
            },
          }}
        >
          <ToggleButton value="card" aria-label="Card view">
            <ViewModuleIcon sx={{ fontSize: 18 }} />
            Cards
          </ToggleButton>
          <ToggleButton value="table" aria-label="Table view">
            <ViewListIcon sx={{ fontSize: 18 }} />
            Table
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Stack spacing={2}>
        {error && (
          <Alert
            severity="error"
            action={
              <Button color="inherit" onClick={loadOrders}>
                Retry
              </Button>
            }
          >
            {error}
          </Alert>
        )}
        {loading && (
          <Box sx={{ display: "grid", placeItems: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        )}
        {loading ? null : filteredOrders.length > 0 ? (
          viewMode === "table" ? (
            <OrderTable
              orders={filteredOrders}
              onOrderClick={(order) =>
                navigate(`/seller/orders/manage/${order.orderId}`, {
                  state: { order },
                })
              }
            />
          ) : (
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
          )
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
              {orders.length
                ? "Try a different search or reset the filters."
                : "Paid online purchases and COD orders appear here, ready for fulfillment."}
            </Typography>
          </Paper>
        )}
      </Stack>
    </Box>
  );
}