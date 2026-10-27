import { useCallback, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  FormControl,
  InputAdornment,
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
import { createElement, useEffect } from "react";
import { fetchSellerOrders, updateSellerOrderStatus } from "../../api/seller/orderAPI";
import { canFulfillOrder, isPayMongoOrder, isPlacedOrder, isSellerSale, needsPaymentSupport } from "../../utils/orderPayments.js";
import OrderCard from "../../components/seller/Order/OrderCard";
import OrderInfo from "../../components/seller/Order/OrderInfo";
import OrderParcelPhoto from "../../components/seller/Order/OrderParcelPhoto";
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

const parcelHandlingOptions = [
  { value: "fragile", label: "Fragile — artwork or breakable items" },
  { value: "do_not_bend", label: "Do not bend — prints or flat artwork" },
  { value: "keep_dry", label: "Keep dry — protect from moisture" },
  { value: "handle_with_care", label: "Handle with care" },
  { value: "small_items", label: "Small trinkets or loose items inside" },
  { value: "this_side_up", label: "This side up" },
];

const nextStatusMap = {
  Pending: ["Confirmed", "Cancelled"],
  Confirmed: ["Packed"],
  Packed: ["Shipped"],
  Shipped: ["Delivered"],
  Delivered: [],
  Cancelled: [],
};

const availableNextStatuses = (order) => canFulfillOrder(order)
  ? (nextStatusMap[order.status] || []).filter((status) =>
      status !== "Cancelled" || !isPayMongoOrder(order))
  : [];

const fulfillmentHint = (order) => {
  if (needsPaymentSupport(order)) return "Payment received. Contact support for refund review.";
  if (String(order.paymentStatus).toLowerCase() === "refunded") return "Payment refunded. This order cannot be processed.";
  const hints = {
    Pending: "Confirm this order to start preparing it.",
    Confirmed: "Mark as packed and upload 1–5 parcel photos.",
    Packed: "Mark as shipped; add a tracking link if available.",
    Shipped: "Mark as delivered after the buyer receives the parcel.",
    Delivered: "Order completed.",
    Cancelled: "Order cancelled.",
  };
  return hints[order.status] || "";
};

export default function SellerOrder() {
  const navigate = useNavigate();
  const theme = useTheme();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusError, setStatusError] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [fulfillmentTarget, setFulfillmentTarget] = useState(null);
  const [parcelPhotos, setParcelPhotos] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const [trackingUrl, setTrackingUrl] = useState("");
  const [handlingInstructions, setHandlingInstructions] = useState([]);
  const [savingFulfillment, setSavingFulfillment] = useState(false);
  const [savingOrderId, setSavingOrderId] = useState(null);
  const savingOrderRef = useRef(false);
  const loadingOrdersRef = useRef(false);
  const mountedRef = useRef(false);

  const loadOrders = useCallback(async () => {
    if (loadingOrdersRef.current || savingOrderRef.current) return;
    loadingOrdersRef.current = true;
    try {
      setError("");
      setLoading(true);
      const response = await fetchSellerOrders();
      if (!mountedRef.current) return;
      const placedOrders = Array.isArray(response) ? response.filter(isPlacedOrder) : [];
      setOrders(placedOrders);
      setSelectedOrder((current) => current
        ? placedOrders.find((order) => order.orderId === current.orderId) || null
        : null);
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

  useEffect(() => {
    const previews = parcelPhotos.map((file) => URL.createObjectURL(file));
    setPhotoPreviews(previews);
    return () => previews.forEach((preview) => URL.revokeObjectURL(preview));
  }, [parcelPhotos]);

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

  const saveOrderStatus = async (orderId, nextStatus, payload = {}) => {
    if (savingOrderRef.current) return false;
    const order = orders.find((item) => item.orderId === orderId);
    if (!order || !canFulfillOrder(order)) {
      setStatusError("This order cannot be processed. Refresh to check its payment and order status.");
      return false;
    }
    if (!availableNextStatuses(order).includes(nextStatus)) {
      setStatusError(`Cannot move an order from ${order.status} to ${nextStatus}.`);
      return false;
    }
    savingOrderRef.current = true;
    setSavingOrderId(orderId);
    try {
      setStatusError("");
      const result = await updateSellerOrderStatus(orderId, nextStatus, payload);
      setOrders((currentOrders) =>
        currentOrders.map((order) =>
          order.orderId === orderId
            ? {
                ...order,
                status: nextStatus,
                paymentStatus: result.paymentStatus ?? order.paymentStatus,
                paidAt: result.paidAt ?? order.paidAt,
                trackingUrl: result.trackingUrl,
                parcelPhotoCount: result.parcelPhotoCount,
                handlingInstructions: result.handlingInstructions ?? order.handlingInstructions,
              }
            : order,
        ),
      );
      setSelectedOrder((current) =>
        current?.orderId === orderId
          ? {
              ...current,
              status: nextStatus,
              paymentStatus: result.paymentStatus ?? current.paymentStatus,
              paidAt: result.paidAt ?? current.paidAt,
              trackingUrl: result.trackingUrl,
              parcelPhotoCount: result.parcelPhotoCount,
              handlingInstructions: result.handlingInstructions ?? current.handlingInstructions,
            }
          : current,
      );
      return true;
    } catch (updateError) {
      setStatusError(updateError.message || "Unable to update order status");
      return false;
    } finally {
      savingOrderRef.current = false;
      setSavingOrderId(null);
    }
  };

  const updateOrderStatus = async (orderId, nextStatus) => {
    if (savingOrderRef.current || savingFulfillment) return;
    const currentOrder = orders.find((order) => order.orderId === orderId);
    if (nextStatus === currentOrder?.status) return;
    if (!currentOrder || !availableNextStatuses(currentOrder).includes(nextStatus)) {
      setStatusError("Choose the next available order status. Refresh if the order has changed.");
      return;
    }
    if (nextStatus === "Packed" || nextStatus === "Shipped") {
      const order = orders.find((item) => item.orderId === orderId);
      setStatusError("");
      setParcelPhotos([]);
      setTrackingUrl(nextStatus === "Shipped" ? order?.trackingUrl || "" : "");
      setHandlingInstructions(order?.handlingInstructions || []);
      setFulfillmentTarget({ orderId, status: nextStatus, order });
      return;
    }
    await saveOrderStatus(orderId, nextStatus);
  };

  const submitFulfillmentUpdate = async () => {
    if (!fulfillmentTarget) return;
    const formData = new FormData();
    if (fulfillmentTarget.status === "Packed") {
      if (parcelPhotos.length < 1 || parcelPhotos.length > 5) {
        setStatusError("Choose 1 to 5 parcel photos before continuing.");
        return;
      }
      parcelPhotos.forEach((file) => formData.append("parcel_photos", file));
      formData.append("handling_instructions", JSON.stringify(handlingInstructions));
    } else {
      const submittedTrackingUrl = trackingUrl.trim();
      if (!submittedTrackingUrl) {
        setStatusError("Add a courier tracking link before marking this order as shipped.");
        return;
      }
      formData.append("tracking_url", submittedTrackingUrl);
    }

    setSavingFulfillment(true);
    try {
      const saved = await saveOrderStatus(
        fulfillmentTarget.orderId,
        fulfillmentTarget.status,
        formData,
      );
      if (saved) setFulfillmentTarget(null);
    } finally {
      setSavingFulfillment(false);
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
              Manage paid online orders and cash on delivery orders.
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} sx={{ width: { xs: "100%", md: "auto" } }}>
          <Button
            variant="outlined"
            startIcon={<RefreshOutlinedIcon />}
            disabled={loading || savingOrderId !== null || savingFulfillment}
            onClick={loadOrders}
          >
            Refresh
          </Button>
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
            onClick={() => { setSelectedStatus("All"); setSearchTerm(""); }}
          >
            Reset filters
          </Button>
          </Stack>
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
                <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 160 } }}>
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
          {error && <Alert severity="error" action={<Button color="inherit" onClick={loadOrders}>Retry</Button>}>{error}</Alert>}
          {statusError && <Alert severity="error" onClose={() => setStatusError("")}>{statusError}</Alert>}
          {loading && <Box sx={{ display: "grid", placeItems: "center", py: 4 }}><CircularProgress /></Box>}
          {loading ? null : filteredOrders.length > 0 ? (
            filteredOrders.map((order) => (
              <OrderCard
                key={order.orderId}
                order={order}
                onViewDetails={setSelectedOrder}
                onViewReturn={(request) => navigate(`/seller/messages?conversation=${request.conversation_id}&return=${request.return_request_id}`)}
                onStatusChange={updateOrderStatus}
                nextStatuses={availableNextStatuses(order)}
                statusHint={fulfillmentHint(order)}
                saving={savingOrderId !== null || savingFulfillment}
                updating={savingOrderId === order.orderId}
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

      <OrderInfo
        open={Boolean(selectedOrder)}
        handleClose={() => setSelectedOrder(null)}
        order={selectedOrder}
        onStatusChange={updateOrderStatus}
        nextStatuses={selectedOrder ? availableNextStatuses(selectedOrder) : []}
        statusHint={selectedOrder ? fulfillmentHint(selectedOrder) : ""}
        saving={savingOrderId !== null || savingFulfillment}
        updating={selectedOrder !== null && savingOrderId === selectedOrder.orderId}
        statusError={statusError}
        onPrint={() => window.print()}
      />

      {selectedOrder && (
        <>
          <style>{`
            @media screen {
              .seller-parcel-label {
                display: none !important;
              }
            }
            @media print {
              @page {
                size: 4in 6in;
                margin: 0.2in;
              }
              body * {
                visibility: hidden !important;
              }
              .seller-parcel-label,
              .seller-parcel-label * {
                visibility: visible !important;
              }
              .seller-parcel-label {
                display: block !important;
                position: fixed !important;
                inset: 0 auto auto 0 !important;
                box-sizing: border-box !important;
                width: 3.6in !important;
                min-height: 5.6in !important;
                padding: 0.12in !important;
                background: #fff !important;
                color: #111 !important;
                font: 12px/1.4 Arial, sans-serif !important;
                z-index: 999999 !important;
              }
              .seller-parcel-label * {
                color: #111 !important;
              }
            }
          `}</style>
          <Box component="section" className="seller-parcel-label" aria-label="Printable parcel label">
            <Box sx={{ borderBottom: "2px solid #111", pb: 1, mb: 1.5 }}>
              <Typography component="p" sx={{ fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>
                ARTMATCH · PARCEL LABEL
              </Typography>
              <Typography component="p" sx={{ mt: 0.5, fontSize: 21, fontWeight: 800 }}>
                {selectedOrder.id}
              </Typography>
            </Box>
            <Typography component="p" sx={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8 }}>
              SHIP TO
            </Typography>
            <Typography component="p" sx={{ mt: 0.3, fontSize: 17, fontWeight: 800, overflowWrap: "anywhere" }}>
              {selectedOrder.customer}
            </Typography>
            <Typography component="p" sx={{ mt: 0.5, fontSize: 13, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
              {selectedOrder.address}
            </Typography>
            {selectedOrder.phone && (
              <Typography component="p" sx={{ mt: 0.5, fontSize: 13, fontWeight: 700 }}>
                Phone: {selectedOrder.phone}
              </Typography>
            )}
            <Box sx={{ borderTop: "1px solid #777", mt: 1.5, pt: 1 }}>
              <Typography component="p" sx={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8 }}>
                FROM
              </Typography>
              <Typography component="p" sx={{ fontSize: 13, fontWeight: 700 }}>
                {selectedOrder.items[0]?.artist || "ArtMatch Seller"}
              </Typography>
            </Box>
            <Box sx={{ borderTop: "1px solid #777", mt: 1.5, pt: 1 }}>
              <Typography component="p" sx={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8 }}>
                PARCEL CONTENTS
              </Typography>
              {selectedOrder.items.map((item) => (
                <Typography key={`${selectedOrder.id}-${item.id}`} component="p" sx={{ mt: 0.4, fontSize: 12 }}>
                  {item.title} · Qty {item.qty}
                </Typography>
              ))}
            </Box>
            {selectedOrder.handlingInstructions?.length > 0 && (
              <Box sx={{ border: "2px solid #111", mt: 1.5, p: 1 }}>
                <Typography component="p" sx={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.8 }}>
                  HANDLE WITH CARE
                </Typography>
                {selectedOrder.handlingInstructions.map((instruction) => (
                  <Typography key={instruction} component="p" sx={{ mt: 0.3, fontSize: 12, fontWeight: 700 }}>
                    • {parcelHandlingOptions.find((option) => option.value === instruction)?.label || instruction}
                  </Typography>
                ))}
              </Box>
            )}
            <Box sx={{ border: "2px solid #111", mt: 1.5, p: 1, textAlign: "center" }}>
              <Typography component="p" sx={{ fontSize: 10, fontWeight: 700 }}>
                {String(selectedOrder.payment).toLowerCase() === "cod" ? "CASH ON DELIVERY" : "ONLINE PAYMENT"}
              </Typography>
              {String(selectedOrder.payment).toLowerCase() === "cod" && (
                <Typography component="p" sx={{ mt: 0.3, fontSize: 18, fontWeight: 800 }}>
                  COLLECT {formatCurrency(selectedOrder.total)}
                </Typography>
              )}
            </Box>
          </Box>
        </>
      )}

      <OrderParcelPhoto
        open={Boolean(fulfillmentTarget)}
        fulfillmentTarget={fulfillmentTarget}
        statusError={statusError}
        setStatusError={setStatusError}
        parcelPhotos={parcelPhotos}
        setParcelPhotos={setParcelPhotos}
        photoPreviews={photoPreviews}
        handlingOptions={parcelHandlingOptions}
        trackingUrl={trackingUrl}
        setTrackingUrl={setTrackingUrl}
        handlingInstructions={handlingInstructions}
        setHandlingInstructions={setHandlingInstructions}
        saving={savingFulfillment}
        onClose={() => setFulfillmentTarget(null)}
        onSubmit={submitFulfillmentUpdate}
      />
    </Box>
  );
}
