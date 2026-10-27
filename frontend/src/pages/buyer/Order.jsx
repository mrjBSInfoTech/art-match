import { useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Rating,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { cancelBuyerOrder, fetchBuyerOrders } from "../../api/buyer/orderAPI";
import { submitBuyerReview } from "../../api/buyer/reviewsAPI";
import OrderGrid from "../../components/buyer/Order/OrderGrid";
import ReturnRequestDialog from "../../components/buyer/Message/ReturnRequestDialog.jsx";
import ConnectionErrorPanel from "../../components/buyer/ConnectionErrorPanel";
import {
  getPaymentReference,
  getPaymentReturnNotice,
  isPlacedOrder,
} from "../../utils/orderPayments.js";

export default function Orders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [actionPending, setActionPending] = useState("");
  const paymentAction = useRef(false);
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
          // Sessions created before the checkout return page was introduced can still return here.
          // Authenticate and verify their status in Checkout before exposing a purchase.
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
        ) : (
          <OrderGrid
            orders={orders}
            actionPending={actionPending}
            onCancel={handleCancel}
            onReview={openReview}
            onRequestReturn={setReturnTarget}
            onViewReturn={(request) => navigate(`/buyer/messages?conversation=${request.conversation_id}&return=${request.return_request_id}`)}
          />
        )}
      </Stack>

      {returnTarget && <ReturnRequestDialog key={returnTarget.orderId} order={returnTarget}
        onClose={() => setReturnTarget(null)}
        onSubmitted={(request) => {
          setReturnTarget(null);
          navigate(`/buyer/messages?conversation=${request.conversation_id}&return=${request.return_request_id}`);
        }} />}

      <Dialog open={Boolean(reviewTarget)} onClose={() => setReviewTarget(null)} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 3 } }}>
        {reviewTarget && <>
          <DialogTitle>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="overline" color="error.main" fontWeight={800}>{reviewTarget.order.id}</Typography>
                <Typography variant="h5" fontWeight={800}>{reviewSubmitted ? "Review received" : "Review your artwork"}</Typography>
              </Box>
              <IconButton aria-label="Close review" onClick={() => setReviewTarget(null)}><CloseIcon /></IconButton>
            </Stack>
          </DialogTitle>
          <DialogContent>
            {reviewSubmitted ? <Alert severity="success">Thanks. Your rating and feedback are saved and will appear on the seller profile.</Alert> : (
              <Stack spacing={2}>
                {reviewError && <Alert severity="error">{reviewError}</Alert>}
                <Typography fontWeight={700}>{reviewTarget.item.title} · {reviewTarget.item.artist}</Typography>
                <Box sx={{ textAlign: "center" }}>
                  <Rating value={rating} onChange={(_, value) => setRating(value || 0)} size="large" />
                  <Typography variant="body2" color="text.secondary">{rating ? `${rating} out of 5` : "Select a star rating"}</Typography>
                </Box>
                <TextField label="Share your experience (optional)" multiline minRows={4} value={reviewText} onChange={(event) => setReviewText(event.target.value)} inputProps={{ maxLength: 600 }} helperText={`${reviewText.length}/600 characters`} />
              </Stack>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}>
            {reviewSubmitted ? <Button variant="contained" onClick={() => setReviewTarget(null)}>Done</Button> : <>
              <Button onClick={() => setReviewTarget(null)}>Cancel</Button>
              <Button variant="contained" disabled={!rating || reviewText.length > 600 || reviewSaving} onClick={submitReview}>{reviewSaving ? "Submitting..." : "Submit review"}</Button>
            </>}
          </DialogActions>
        </>}
      </Dialog>
    </Box>
  );
}
