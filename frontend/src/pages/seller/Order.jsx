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
import {
  adminSearchInputSx,
  adminSelectInputSx,
} from "../../components/admin/adminFilterStyles";
import SellerLoadingPanel from "../../components/seller/SellerLoadingPanel";
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

  if (loading && orders.length === 0) {
    return (
      <SellerLoadingPanel
        title="Orders"
        subtitle="Manage paid online orders and cash on delivery orders."
      />
    );
  }

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
            xs: "minmax(0, 1fr)",
            sm: "repeat(2, minmax(0, 1fr))",
            lg: "repeat(4, minmax(0, 1fr))",
          },
          gap: 2,
          mb: 2.5,
          minWidth: 0,
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
              minWidth: 0,
              overflow: "hidden",
              height: "100%",
            }}
          >
            <CardContent sx={{ p: { xs: 2, sm: 2.25 }, "&:last-child": { pb: { xs: 2, sm: 2.25 } }, height: "100%" }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: { xs: 1.5, sm: 2 },
                  minWidth: 0,
                  height: "100%",
                }}
              >
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography
                    sx={{
                      color: theme.palette.text.secondary,
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: 1,
                      overflowWrap: "break-word",
                    }}
                  >
                    {label}
                  </Typography>
                  <Typography
                    sx={{
                      mt: 0.5,
                      color: theme.palette.text.primary,
                      fontSize: { xs: 24, sm: 26, xl: 30 },
                      fontWeight: 800,
                      lineHeight: 1.1,
                      fontVariantNumeric: "tabular-nums",
                      overflowWrap: "anywhere",
                    }}
                  >
                    {value}
                  </Typography>
                  <Typography
                    sx={{
                      mt: 1,
                      color: theme.palette.text.secondary,
                      fontSize: 12,
                      overflowWrap: "break-word",
                    }}
                  >
                    {caption}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: { xs: 44, sm: 50 },
                    height: { xs: 44, sm: 50 },
                    flexShrink: 0,
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
          p: { xs: 1.5, sm: 2, md: 2.5 },
          borderRadius: 2.5,
          backgroundColor: theme.palette.background.paper,
          borderColor: theme.palette.divider,
          minWidth: 0,
          overflow: "hidden",
        }}
        variant="outlined"
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "minmax(0, 1fr)",
              sm: "minmax(0, 1fr) minmax(150px, 190px)",
            },
            alignItems: "center",
            gap: { xs: 1.5, sm: 2 },
            minWidth: 0,
          }}
        >
          <TextField
            variant="outlined"
            placeholder="Search by order, customer, or artwork..."
            inputProps={{ "aria-label": "Search orders" }}
            size="small"
            fullWidth
            sx={adminSearchInputSx(theme, { minWidth: 0 })}
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

          <FormControl size="small" fullWidth sx={{ minWidth: 0 }}>
            <InputLabel
              id="seller-order-status-label"
              sx={{ color: theme.palette.text.secondary, fontSize: 12 }}
            >
              Status
            </InputLabel>
            <Select
              labelId="seller-order-status-label"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              label="Status"
              sx={adminSelectInputSx(theme)}
            >
              {orderStatuses.map((status) => (
                <MenuItem key={status} value={status}>
                  {status}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
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
          mt: 2,
          mb: 1,
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
            <Paper
              component="section"
              variant="outlined"
              aria-label="Seller orders card view"
              sx={{
                p: { xs: 1.5, sm: 2 },
                borderRadius: 3.5,
                borderColor: "divider",
                bgcolor: "background.paper",
              }}
            >
              <Stack spacing={2}>
                {filteredOrders.map((order) => (
                  <OrderCard
                    key={order.orderId}
                    order={order}
                    onClick={() =>
                      navigate(`/seller/orders/manage/${order.orderId}`, {
                        state: { order },
                      })
                    }
                  />
                ))}
              </Stack>
            </Paper>
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