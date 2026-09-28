import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
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

const statusColor = {
  Pending: "warning",
  Confirmed: "info",
  Packed: "secondary",
  Shipped: "primary",
  Delivered: "success",
  Cancelled: "error",
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(value || 0);

const getArtworkImage = (image) =>
  image?.startsWith("http")
    ? image
    : `http://localhost:5000/uploads/seller/uploadArtwork/${encodeURIComponent(image || "")}`;

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [reviewTarget, setReviewTarget] = useState(null);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [reviewSaving, setReviewSaving] = useState(false);
  const [reviewError, setReviewError] = useState("");

  const loadOrders = async () => {
    try {
      setError("");
      setLoading(true);
      const response = await fetchBuyerOrders();
      setOrders(Array.isArray(response) ? response : []);
    } catch (loadError) {
      setError(loadError.message || "Unable to load your orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleCancel = async (order) => {
    try {
      setActionError("");
      await cancelBuyerOrder(order.orderId);
      setOrders((current) =>
        current.map((item) =>
          item.orderId === order.orderId ? { ...item, status: "Cancelled" } : item,
        ),
      );
    } catch (cancelError) {
      setActionError(cancelError.message || "Unable to cancel this order");
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
    if (!reviewTarget || !rating || !reviewText.trim()) return;
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
        {actionError && <Alert severity="error" onClose={() => setActionError("")}>{actionError}</Alert>}
        {loading ? (
          <Box sx={{ display: "grid", placeItems: "center", minHeight: 240 }}><CircularProgress /></Box>
        ) : orders.length === 0 && !error ? (
          <Paper variant="outlined" sx={{ p: 5, textAlign: "center", borderRadius: 2 }}>
            <Typography variant="h6" fontWeight={700}>No orders yet</Typography>
            <Typography color="text.secondary" sx={{ mt: 0.5 }}>Your placed orders will show up here.</Typography>
          </Paper>
        ) : (
          <Grid container spacing={2}>
            {orders.map((order) => (
              <Grid item xs={12} key={order.orderId}>
                <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 2 }}>
                  <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} gap={1.5}>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={800}>{order.id}</Typography>
                      <Typography variant="caption" color="text.secondary">Placed {new Date(order.date).toLocaleDateString()} · {order.payment?.toUpperCase()}</Typography>
                    </Box>
                    <Stack direction="row" alignItems="center" gap={1.5}>
                      <Chip label={order.status} color={statusColor[order.status] || "default"} size="small" />
                      <Typography fontWeight={800}>{formatCurrency(order.total)}</Typography>
                    </Stack>
                  </Stack>
                  <Box sx={{ borderTop: "1px solid", borderColor: "divider", mt: 2, pt: 2 }}>
                    <Stack spacing={1.5}>
                      {order.items.map((item) => (
                        <Stack key={item.id} direction={{ xs: "column", sm: "row" }} alignItems={{ sm: "center" }} justifyContent="space-between" gap={1.5}>
                          <Stack direction="row" alignItems="center" gap={1.5} minWidth={0}>
                            <Box component="img" src={getArtworkImage(item.image)} alt={item.title} sx={{ width: 56, height: 56, objectFit: "cover", borderRadius: 1, flexShrink: 0 }} />
                            <Box minWidth={0}>
                              <Typography variant="body2" fontWeight={700}>{item.title}</Typography>
                              <Typography variant="caption" color="text.secondary">{item.artist} · Qty {item.qty}</Typography>
                            </Box>
                          </Stack>
                          <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1.5}>
                            <Typography variant="body2" fontWeight={700}>{formatCurrency(item.price * item.qty)}</Typography>
                            {item.review ? (
                              <Chip label="Reviewed" size="small" color="success" variant="outlined" />
                            ) : order.status === "Delivered" ? (
                              <Button size="small" variant="outlined" onClick={() => openReview(order, item)} sx={{ borderRadius: 999, textTransform: "none" }}>Review item</Button>
                            ) : null}
                          </Stack>
                        </Stack>
                      ))}
                    </Stack>
                  </Box>
                  <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} gap={1} sx={{ borderTop: "1px solid", borderColor: "divider", mt: 2, pt: 1.5 }}>
                    <Typography variant="caption" color="text.secondary">Ship to: {order.address}</Typography>
                    {order.status === "Pending" && <Button color="error" size="small" onClick={() => handleCancel(order)} sx={{ alignSelf: "flex-start", textTransform: "none" }}>Cancel order</Button>}
                  </Stack>
                </Paper>
              </Grid>
            ))}
          </Grid>
        )}
      </Stack>

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
                <TextField label="Share your experience" multiline minRows={4} value={reviewText} onChange={(event) => setReviewText(event.target.value)} inputProps={{ maxLength: 600 }} helperText={`${reviewText.length}/600 characters`} />
              </Stack>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}>
            {reviewSubmitted ? <Button variant="contained" onClick={() => setReviewTarget(null)}>Done</Button> : <>
              <Button onClick={() => setReviewTarget(null)}>Cancel</Button>
              <Button variant="contained" disabled={!rating || !reviewText.trim() || reviewSaving} onClick={submitReview}>{reviewSaving ? "Submitting..." : "Submit review"}</Button>
            </>}
          </DialogActions>
        </>}
      </Dialog>
    </Box>
  );
}
