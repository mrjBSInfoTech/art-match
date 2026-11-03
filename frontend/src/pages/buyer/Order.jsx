import { createElement, useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  InputAdornment,
  Paper,
  Stack,
  Tab,
  Tabs,
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
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";

import { fetchBuyerOrders } from "../../api/buyer/orderAPI";
import OrderCard from "../../components/buyer/Order/OrderCard";
import ConnectionErrorPanel from "../../components/buyer/ConnectionErrorPanel";
import {
  STATUS_TABS,
  filterOrdersByStatusTab,
  getTabCounts,
} from "../../utils/orderStatusTabs.js";
import {
  getPaymentReturnNotice,
  isPlacedOrder,
} from "../../utils/orderPayments.js";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

export default function Orders() {
  const navigate = useNavigate();
  const theme = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [refresh, setRefresh] = useState(0);
  const ordersRequest = useRef(null);
  const { search } = useLocation();

  const returnParams = new URLSearchParams(search);
  let returnReference = returnParams.get("reference") || "";
  if (!returnReference) {
    try {
      returnReference = sessionStorage.getItem("paymongo_payment_reference") || "";
    } catch {
      /* Browser storage can be unavailable. */
    }
  }

  const paymentNotice = getPaymentReturnNotice(orders, {
    payment: returnParams.get("payment"),
    reference: returnReference,
    loading,
    error,
  });

  const loadOrders = () => setRefresh((value) => value + 1);

  const initialTab = useMemo(() => {
    const param = searchParams.get("status");
    return STATUS_TABS.find((t) => t.toLowerCase() === (param || "").toLowerCase()) || "All";
  }, [searchParams]);
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    const param = searchParams.get("status");
    const matched = STATUS_TABS.find((t) => t.toLowerCase() === (param || "").toLowerCase()) || "All";
    setActiveTab(matched);
  }, [searchParams]);

  const handleTabChange = (_event, nextTab) => {
    setActiveTab(nextTab);
    const updated = new URLSearchParams(searchParams);
    if (nextTab === "All") {
      updated.delete("status");
    } else {
      updated.set("status", nextTab);
    }
    setSearchParams(updated, { replace: true });
  };

  const tabCounts = useMemo(() => getTabCounts(orders), [orders]);

  const filteredOrders = useMemo(() => {
    const tabFiltered = filterOrdersByStatusTab(orders, activeTab);
    if (!searchTerm.trim()) return tabFiltered;
    const term = searchTerm.trim().toLowerCase();
    return tabFiltered.filter((order) => {
      const items = Array.isArray(order.items) ? order.items : [];
      const searchableText = `${order.id || ""} ${order.orderId || ""} ${order.sellerName || ""} ${items
        .map((item) => `${item?.title || ""} ${item?.artist || ""}`)
        .join(" ")}`.toLowerCase();
      return searchableText.includes(term);
    });
  }, [orders, activeTab, searchTerm]);

  const summary = useMemo(() => {
    const activeOrders = orders.filter((o) => o.status !== "Cancelled");
    const totalSpent = activeOrders.reduce((sum, order) => sum + (Number(order.total) || 0), 0);
    const pending = orders.filter((order) => order.status === "Pending").length;
    const shipped = orders.filter((order) => order.status === "Shipped").length;

    return {
      totalOrders: orders.length,
      totalSpent,
      pending,
      shipped,
    };
  }, [orders]);

  const hasFilters = activeTab !== "All" || searchTerm.trim() !== "";

  useEffect(() => {
    let active = true;
    let controller;
    const announcedPaid = new Set();
    const refreshOrders = async () => {
      controller?.abort();
      const request = new AbortController();
      controller = request;
      ordersRequest.current = request;
      try {
        const response = await fetchBuyerOrders({ signal: request.signal });
        if (!active || request.signal.aborted) return;
        const nextOrders = Array.isArray(response) ? response.filter(isPlacedOrder) : [];
        const params = new URLSearchParams(search);
        const reference = params.get("reference");
        if (["success", "cancelled"].includes(params.get("payment")) && reference) {
          navigate(`/buyer/checkout${search}`, { replace: true });
          return;
        }
        setOrders(nextOrders);
        setError("");
        const onlineOrders = nextOrders.filter(
          (order) =>
            String(order.payment).toLowerCase() === "paymongo" &&
            String(order.status).toLowerCase() !== "cancelled"
        );
        let paidChanged = false;
        for (const order of onlineOrders) {
          const id = String(order.orderId);
          if (String(order.paymentStatus).toLowerCase() === "paid" && !announcedPaid.has(id)) {
            announcedPaid.add(id);
            paidChanged = true;
          }
        }
        if (paidChanged) window.dispatchEvent(new Event("cart-updated"));
      } catch (loadError) {
        if (active && !request.signal.aborted) setError(loadError.message || "Unable to load your orders");
      } finally {
        if (active && !request.signal.aborted) {
          setLoading(false);
        }
      }
    };

    const refreshVisibleOrders = () => {
      if (document.visibilityState === "hidden") {
        controller?.abort();
        return;
      }
      refreshOrders();
    };

    setLoading(true);
    setError("");
    refreshOrders();
    const events = ["focus", "pageshow"];
    events.forEach((event) => window.addEventListener(event, refreshVisibleOrders));
    document.addEventListener("visibilitychange", refreshVisibleOrders);
    return () => {
      active = false;
      controller?.abort();
      events.forEach((event) => window.removeEventListener(event, refreshVisibleOrders));
      document.removeEventListener("visibilitychange", refreshVisibleOrders);
    };
  }, [refresh, search, navigate]);

  if (error && !loading) {
    return <ConnectionErrorPanel title="Orders Unavailable" onRetry={loadOrders} />;
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Helmet titleTemplate="%s - ArtMatch">
        <title>Orders</title>
      </Helmet>

      <Stack spacing={3}>
        {/* Page Header */}
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
              My orders
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Follow each seller's progress from confirmation to delivery.
            </Typography>
          </Box>
        </Box>

        {/* Top 4 Metric Summary Cards */}
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
              caption: "Placed artwork purchases",
              icon: ShoppingCartOutlinedIcon,
            },
            {
              label: "TOTAL SPENT",
              value: formatCurrency(summary.totalSpent),
              caption: "Completed & active orders",
              icon: PaymentsOutlinedIcon,
            },
            {
              label: "PENDING",
              value: summary.pending,
              caption: "Awaiting artist preparation",
              icon: PendingActionsOutlinedIcon,
            },
            {
              label: "IN TRANSIT",
              value: summary.shipped,
              caption: "Out for delivery / meet-up",
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
                    color: (t) => t.palette.error.main,
                  }}
                >
                  {createElement(MetricIcon, { fontSize: "small" })}
                </Box>
              </Box>
            </Paper>
          ))}
        </Box>

        {/* Filter and Search Bar Container */}
        <Paper
          elevation={0}
          variant="outlined"
          sx={{
            p: 2,
            borderRadius: 2,
            backgroundColor: theme.palette.background.paper,
          }}
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", lg: "row" },
              gap: 2,
              alignItems: { xs: "stretch", lg: "center" },
              justifyContent: "space-between",
            }}
          >
            {/* Search Input */}
            <TextField
              size="small"
              placeholder="Search by artwork title, artist, or order ID…"
              sx={{
                width: { xs: "100%", lg: 380 },
                "& .MuiOutlinedInput-root": {
                  fontSize: 13,
                  backgroundColor: theme.palette.background.default,
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: "text.secondary", fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            {/* Quick Actions (Refresh, Reset) */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                flexWrap: "wrap",
              }}
            >
              <Button
                variant="outlined"
                startIcon={<RefreshOutlinedIcon />}
                disabled={loading}
                onClick={loadOrders}
                sx={{
                  minHeight: 40,
                  textTransform: "none",
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                Refresh
              </Button>
              <Button
                variant="text"
                disabled={!hasFilters}
                onClick={() => {
                  handleTabChange(null, "All");
                  setSearchTerm("");
                }}
                sx={{
                  minHeight: 40,
                  textTransform: "none",
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                Reset filters
              </Button>
            </Box>
          </Box>

          {/* Status Tabs */}
          <Box sx={{ mt: 2, borderTop: "1px solid", borderColor: "divider", pt: 1 }}>
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons="auto"
              allowScrollButtonsMobile
              textColor="inherit"
              aria-label="Order status filter tabs"
              sx={{
                minHeight: 48,
                "& .MuiTabs-flexContainer": {
                  gap: { xs: 0.5, sm: 1 },
                },
                "& .MuiTabs-indicator": {
                  backgroundColor: "error.main",
                  height: 3,
                  borderRadius: "999px",
                },
                "& .MuiTab-root": {
                  textTransform: "none",
                  fontWeight: 600,
                  fontSize: { xs: 13, sm: 14 },
                  minWidth: { xs: "auto", sm: 86 },
                  px: { xs: 1.1, sm: 1.5 },
                  py: 1,
                  minHeight: 48,
                  color: "text.secondary",
                  "&.Mui-selected": {
                    color: "error.main",
                    fontWeight: 800,
                  },
                  "&:hover": {
                    color: "text.primary",
                  },
                },
              }}
            >
              {STATUS_TABS.map((tab) => {
                const count = tabCounts[tab] ?? 0;
                const isSelected = activeTab === tab;
                return (
                  <Tab
                    key={tab}
                    value={tab}
                    label={
                      <Stack direction="row" alignItems="center" spacing={0.75}>
                        <span>{tab}</span>
                        {count > 0 && (
                          <Chip
                            label={count}
                            size="small"
                            sx={{
                              height: 20,
                              minWidth: 20,
                              fontSize: "0.72rem",
                              fontWeight: 700,
                              px: 0.5,
                              backgroundColor: isSelected ? "error.main" : "#e5e7eb",
                              color: isSelected ? "#fff" : "text.secondary",
                              border: isSelected ? "none" : "1px solid transparent",
                              "& .MuiChip-label": { px: 0.7 },
                            }}
                          />
                        )}
                      </Stack>
                    }
                  />
                );
              })}
            </Tabs>
          </Box>

          {!loading && (
            <Typography
              variant="caption"
              color="text.secondary"
              aria-live="polite"
              sx={{ display: "block", mt: 1 }}
            >
              Showing {filteredOrders.length} of {orders.length} orders
            </Typography>
          )}
        </Paper>

        {/* Alerts */}
        {error && (
          <Alert severity="error" action={<Button color="inherit" onClick={loadOrders}>Retry</Button>}>
            {error}
          </Alert>
        )}
        {paymentNotice && (
          <Alert severity={paymentNotice.severity} action={<Button color="inherit" onClick={loadOrders}>Refresh</Button>}>
            {paymentNotice.message}
          </Alert>
        )}

        {/* Order Cards List */}
        <Stack spacing={2}>
          {loading ? (
            <Box sx={{ display: "grid", placeItems: "center", minHeight: 240, py: 4 }}>
              <CircularProgress />
            </Box>
          ) : orders.length === 0 && !error ? (
            <Paper variant="outlined" sx={{ p: 5, textAlign: "center", borderRadius: 3 }}>
              <Typography variant="h6" fontWeight={800}>
                No orders yet
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                Your purchased artworks will show up here.
              </Typography>
            </Paper>
          ) : filteredOrders.length === 0 ? (
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
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {orders.length
                  ? `No orders matching "${activeTab}" status or your search keyword.`
                  : "Purchased artworks will appear here once placed."}
              </Typography>
              <Button
                variant="outlined"
                onClick={() => {
                  handleTabChange(null, "All");
                  setSearchTerm("");
                }}
                sx={{ mt: 2, textTransform: "none", fontWeight: 700 }}
              >
                View all orders
              </Button>
            </Paper>
          ) : (
            filteredOrders.map((order) => (
              <OrderCard
                key={order.orderId || order.id}
                order={order}
                onClick={() =>
                  navigate(`/buyer/profile/orders/${order.orderId || order.id}`, {
                    state: { order },
                  })
                }
              />
            ))
          )}
        </Stack>
      </Stack>
    </Box>
  );
}
