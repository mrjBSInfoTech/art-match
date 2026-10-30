import { useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import { cancelBuyerOrder, fetchBuyerOrders } from "../../api/buyer/orderAPI";
import { submitBuyerReview } from "../../api/buyer/reviewsAPI";
import OrderGrid from "../../components/buyer/Order/OrderGrid";
import OrderTrack from "../../components/buyer/Order/OrderTrack";
import OrderReviewDialog from "../../components/buyer/Order/OrderReviewDialog";
import ReturnRequestDialog from "../../components/buyer/Message/ReturnRequestDialog.jsx";
import ConnectionErrorPanel from "../../components/buyer/ConnectionErrorPanel";
import {
  STATUS_TABS,
  filterOrdersByStatusTab,
  getTabCounts,
} from "../../utils/orderStatusTabs.js";
import {
  getPaymentReference,
  getPaymentReturnNotice,
  isPlacedOrder,
} from "../../utils/orderPayments.js";

export default function Orders() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [actionPending, setActionPending] = useState("");
  const paymentAction = useRef(false);
  const [trackTarget, setTrackTarget] = useState(null);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [returnTarget, setReturnTarget] = useState(null);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [reviewSaving, setReviewSaving] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const ordersRequest = useRef(null);
  const { search } = useLocation();
  const returnParams = new URLSearchParams(search);
  let returnReference = returnParams.get("reference") || "";
  if (!returnReference) {
    try { returnReference = sessionStorage.getItem("paymongo_payment_reference") || ""; } catch { /* Browser storage can be unavailable. */ }
  }
  const paymentNotice = getPaymentReturnNotice(orders, {
    payment: returnParams.get("payment"), reference: returnReference, loading, error,
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
  const filteredOrders = useMemo(
    () => filterOrdersByStatusTab(orders, activeTab),
    [orders, activeTab]
  );

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
        const onlineOrders = nextOrders.filter((order) =>
          String(order.payment).toLowerCase() === "paymongo" && String(order.status).toLowerCase() !== "cancelled");
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

  const handleCancel = async (order) => {
    if (paymentAction.current) return;
    paymentAction.current = true;
    setActionPending(getPaymentReference(order) || String(order.orderId));
    try {
      setActionError("");
      setActionMessage("");
      const result = await cancelBuyerOrder(order.orderId);
      ordersRequest.current?.abort();
      setActionMessage(result.message || "Order cancelled.");
    } catch (cancelError) {
      setActionError(cancelError.message || "Unable to cancel this order");
    } finally {
      paymentAction.current = false;
      setActionPending("");
      loadOrders();
    }
  };

  const openReview = (order, item) => {
    setReviewTarget({ order, item });
    setRating(0);
    setReviewText("");
    setReviewSubmitted(false);
    setReviewError("");
  };

  const submitReview = async () => {
    if (!reviewTarget || !rating || reviewSaving || reviewText.length > 600) return;
    const { order, item } = reviewTarget;
    try {
      setReviewSaving(true);
      setReviewError("");
      const response = await submitBuyerReview({
        orderItemId: item.id,
        rating,
        comment: reviewText.trim(),
      });
      setOrders((current) => current.map((currentOrder) =>
        currentOrder.orderId === order.orderId
          ? {
              ...currentOrder,
              items: currentOrder.items.map((currentItem) =>
                currentItem.id === item.id
                  ? { ...currentItem, review: response.review }
                  : currentItem,
              ),
            }
          : currentOrder,
      ));
      setReviewSubmitted(true);
    } catch (submitError) {
      setReviewError(submitError.message || "Unable to submit review");
    } finally {
      setReviewSaving(false);
    }
  };

  if (error && !loading) {
    return <ConnectionErrorPanel title="Orders Unavailable" onRetry={loadOrders} />;
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Helmet titleTemplate="%s - ArtMatch"><title>Orders</title></Helmet>
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h4" fontWeight={800}>My orders</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Follow each seller's progress from confirmation to delivery.
          </Typography>
        </Box>

        <Paper
          elevation={0}
          sx={{
            borderBottom: "1px solid",
            borderColor: "divider",
            backgroundColor: "transparent",
          }}
        >
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
              "& .MuiTabs-indicator": {
                backgroundColor: "error.main",
                height: 3,
                borderRadius: "3px 3px 0 0",
              },
              "& .MuiTab-root": {
                textTransform: "none",
                fontWeight: 600,
                fontSize: { xs: 13, sm: 14 },
                minWidth: { xs: "auto", sm: 90 },
                px: { xs: 1.5, sm: 2 },
                py: 1,
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
                            backgroundColor: isSelected ? "error.main" : "action.selected",
                            color: isSelected ? "#fff" : "text.secondary",
                            "& .MuiChip-label": { px: 0.6 },
                          }}
                        />
                      )}
                    </Stack>
                  }
                />
              );
            })}
          </Tabs>
        </Paper>

        {error && <Alert severity="error" action={<Button color="inherit" onClick={loadOrders}>Retry</Button>}>{error}</Alert>}
        {paymentNotice && <Alert severity={paymentNotice.severity} action={<Button color="inherit" onClick={loadOrders}>Refresh</Button>}>{paymentNotice.message}</Alert>}
        {actionError && <Alert severity="error" onClose={() => setActionError("")}>{actionError}</Alert>}
        {actionMessage && <Alert severity="info" onClose={() => setActionMessage("")}>{actionMessage}</Alert>}

        {loading ? (
          <Box sx={{ display: "grid", placeItems: "center", minHeight: 240 }}><CircularProgress /></Box>
        ) : orders.length === 0 && !error ? (
          <Paper variant="outlined" sx={{ p: 5, textAlign: "center", borderRadius: 2 }}>
            <Typography variant="h6" fontWeight={700}>No orders yet</Typography>
            <Typography color="text.secondary" sx={{ mt: 0.5 }}>Paid purchases and cash-on-delivery orders will show up here.</Typography>
          </Paper>
        ) : filteredOrders.length === 0 ? (
          <Paper variant="outlined" sx={{ p: 5, textAlign: "center", borderRadius: 2 }}>
            <Typography variant="h6" fontWeight={700}>
              No {activeTab.toLowerCase()} orders
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 0.5 }}>
              You don't have any orders with status "{activeTab}" at the moment.
            </Typography>
            <Button
              variant="outlined"
              onClick={() => handleTabChange(null, "All")}
              sx={{ mt: 2, textTransform: "none", fontWeight: 700 }}
            >
              View all orders
            </Button>
          </Paper>
        ) : (
          <OrderGrid
            orders={filteredOrders}
            actionPending={actionPending}
            onCancel={handleCancel}
            onReview={openReview}
            onRequestReturn={setReturnTarget}
            onTrackOrder={setTrackTarget}
            onViewReturn={(request) => navigate(`/buyer/messages?conversation=${request.conversation_id}&return=${request.return_request_id}`)}
          />
        )}
      </Stack>

      <OrderTrack
        open={Boolean(trackTarget)}
        order={trackTarget}
        onClose={() => setTrackTarget(null)}
      />

      {returnTarget && (
        <ReturnRequestDialog
          key={returnTarget.orderId}
          order={returnTarget}
          onClose={() => setReturnTarget(null)}
          onSubmitted={(request) => {
            setReturnTarget(null);
            navigate(`/buyer/messages?conversation=${request.conversation_id}&return=${request.return_request_id}`);
          }}
        />
      )}

      <OrderReviewDialog
        open={Boolean(reviewTarget)}
        reviewTarget={reviewTarget}
        rating={rating}
        setRating={setRating}
        reviewText={reviewText}
        setReviewText={setReviewText}
        reviewSubmitted={reviewSubmitted}
        reviewSaving={reviewSaving}
        reviewError={reviewError}
        onClose={() => setReviewTarget(null)}
        onSubmit={submitReview}
      />
    </Box>
  );
}
