import { useCallback, useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Rating,
  Stack,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import AssignmentTurnedInOutlinedIcon from "@mui/icons-material/AssignmentTurnedInOutlined";
import HourglassEmptyOutlinedIcon from "@mui/icons-material/HourglassEmptyOutlined";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import PrintOutlinedIcon from "@mui/icons-material/PrintOutlined";
import ChatOutlinedIcon from "@mui/icons-material/ChatOutlined";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import StarOutlineIcon from "@mui/icons-material/StarOutline";
import AssignmentReturnOutlinedIcon from "@mui/icons-material/AssignmentReturnOutlined";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";

import { cancelBuyerOrder, fetchBuyerOrders } from "../../../api/buyer/orderAPI";
import { submitBuyerReview } from "../../../api/buyer/reviewsAPI";
import {
  getPaymentColor,
  getPaymentLabel,
  getPaymentMethodLabel,
  isPayMongoOrder,
  isPlacedOrder,
  needsPaymentSupport,
} from "../../../utils/orderPayments.js";
import { getSecureTrackingUrl } from "../../../utils/trackingUrl.js";
import { getShipmentCourier } from "../../../utils/shipmentCouriers.js";
import WatermarkedArtworkImage from "../Artwork/WatermarkedArtworkImage";
import OrderTrack from "./OrderTrack";
import ConnectionErrorPanel from "../ConnectionErrorPanel";
import OrderReviewDialog from "./OrderReviewDialog";
import ReturnRequestDialog from "../Message/ReturnRequestDialog.jsx";

const getStatusPillStyle = (theme, status) => {
  const styles = {
    Pending: {
      bgcolor: alpha(theme.palette.warning.main, theme.palette.mode === "dark" ? 0.18 : 0.12),
      color: theme.palette.warning.main,
      borderColor: alpha(theme.palette.warning.main, 0.4),
    },
    Confirmed: {
      bgcolor: alpha(theme.palette.info.main, theme.palette.mode === "dark" ? 0.18 : 0.12),
      color: theme.palette.info.main,
      borderColor: alpha(theme.palette.info.main, 0.4),
    },
    Packed: {
      bgcolor: alpha(theme.palette.secondary.main, theme.palette.mode === "dark" ? 0.18 : 0.12),
      color: theme.palette.secondary.main,
      borderColor: alpha(theme.palette.secondary.main, 0.4),
    },
    Shipped: {
      bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.18 : 0.12),
      color: theme.palette.primary.main,
      borderColor: alpha(theme.palette.primary.main, 0.4),
    },
    Delivered: {
      bgcolor: alpha(theme.palette.success.main, theme.palette.mode === "dark" ? 0.18 : 0.12),
      color: theme.palette.success.main,
      borderColor: alpha(theme.palette.success.main, 0.4),
    },
    Cancelled: {
      bgcolor: alpha(theme.palette.error.main, theme.palette.mode === "dark" ? 0.22 : 0.12),
      color: theme.palette.error.main,
      borderColor: alpha(theme.palette.error.main, 0.4),
    },
  };

  return styles[status] || {
    bgcolor: alpha(theme.palette.grey[500], theme.palette.mode === "dark" ? 0.18 : 0.12),
    color: theme.palette.text.secondary,
    borderColor: alpha(theme.palette.grey[500], 0.4),
  };
};

const getStatusHeaderIcon = (status, theme) => {
  switch (status) {
    case "Delivered":
      return <CheckCircleOutlinedIcon sx={{ fontSize: 32, color: theme.palette.success.main }} />;
    case "Shipped":
      return <LocalShippingOutlinedIcon sx={{ fontSize: 32, color: theme.palette.primary.main }} />;
    case "Packed":
      return <Inventory2OutlinedIcon sx={{ fontSize: 32, color: theme.palette.secondary.main }} />;
    case "Confirmed":
      return <AssignmentTurnedInOutlinedIcon sx={{ fontSize: 32, color: theme.palette.info.main }} />;
    case "Cancelled":
      return <CancelOutlinedIcon sx={{ fontSize: 32, color: theme.palette.error.main }} />;
    case "Pending":
    default:
      return <HourglassEmptyOutlinedIcon sx={{ fontSize: 32, color: theme.palette.warning.main }} />;
  }
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const formatOrderDateTime = (value) => {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : new Intl.DateTimeFormat("en-PH", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
};

const buyerDeliveryHint = (order) => {
  if (!order) return "";
  if (needsPaymentSupport(order)) return "Payment under review by ArtMatch support.";
  if (String(order.paymentStatus).toLowerCase() === "refunded") return "Order payment has been refunded.";
  const isMeetup = order.deliveryMethod === "pickup";
  const hints = {
    Pending: isMeetup
      ? "Awaiting seller confirmation for meet-up arrangement."
      : "Awaiting seller confirmation for door-to-door delivery.",
    Confirmed: "Seller has confirmed your order and is preparing the artwork.",
    Packed: isMeetup
      ? "Artwork is safely packed and ready for meet-up handover."
      : "Artwork is packaged and waiting for courier pickup.",
    Shipped: isMeetup
      ? "Ready for meet-up handover. Coordinate meeting details in chat."
      : "Parcel is in transit with the courier to your delivery address.",
    Delivered: "Artwork has been delivered and received successfully.",
    Cancelled: "This order was cancelled.",
  };
  return hints[order.status] || "Awaiting seller update";
};

export default function BuyerOrderDetail() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();

  const [order, setOrder] = useState(location.state?.order || null);
  const [loading, setLoading] = useState(!order);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [cancelling, setCancelling] = useState(false);

  // Dialog states
  const [trackOpen, setTrackOpen] = useState(false);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [reviewSaving, setReviewSaving] = useState(false);
  const [reviewError, setReviewError] = useState("");

  const mountedRef = useRef(false);

  const loadOrderData = useCallback(async () => {
    try {
      setLoadError("");
      const response = await fetchBuyerOrders();
      if (!mountedRef.current) return;
      if (!Array.isArray(response)) {
        throw new Error("Unable to retrieve orders list.");
      }
      const matched = response.find(
        (item) =>
          item &&
          (String(item.orderId) === String(id) || String(item.id) === String(id)),
      );
      if (matched && isPlacedOrder(matched)) {
        setOrder(matched);
      } else if (!order) {
        setLoadError(`Order #${id} could not be found.`);
      }
    } catch (err) {
      if (mountedRef.current && !order) {
        setLoadError(err.message || "Unable to load order details.");
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [id, order]);

  useEffect(() => {
    mountedRef.current = true;
    if (!order) {
      loadOrderData();
    } else {
      setLoading(false);
    }
    return () => {
      mountedRef.current = false;
    };
  }, [id, loadOrderData, order]);

  const items = Array.isArray(order?.items) ? order.items : [];
  const primaryItem = items[0] || {};
  const currentStatus = order?.status || "Pending";
  const pillStyle = getStatusPillStyle(theme, currentStatus);

  const isMeetup = order?.deliveryMethod === "pickup";
  const artworkTitle = primaryItem.title
    ? `${primaryItem.title}${items.length > 1 ? ` (+${items.length - 1} more)` : ""}`
    : "Purchased Artwork";
  const studentArtist = order?.sellerName || primaryItem.artist || "Student Artist";
  const buyerName = order?.customer || order?.buyerName || "You (Buyer)";
  const sellerId = order?.sellerId || primaryItem.sellerId;

  const courierInfo = getShipmentCourier(order?.courier);
  const secureTrackingUrl = getSecureTrackingUrl(order?.trackingUrl || courierInfo?.trackingUrl);

  const hasActiveReturnTracking = Boolean(
    order?.activeReturn && (
      order.activeReturn.status === "Return Shipped" ||
      order.activeReturn.return_tracking_url ||
      order.activeReturn.return_tracking_number ||
      order.activeReturn.return_courier
    )
  );
  const returnCourier = getShipmentCourier(order?.activeReturn?.return_courier);
  const returnTrackingUrl = getSecureTrackingUrl(
    order?.activeReturn?.return_tracking_url || returnCourier?.trackingUrl
  );

  // Cancellation handler for buyer
  const handleCancelOrder = async () => {
    if (cancelling || !order) return;
    setCancelling(true);
    setActionError("");
    setActionSuccess("");
    try {
      const result = await cancelBuyerOrder(order.orderId);
      setOrder((prev) => ({
        ...prev,
        status: "Cancelled",
      }));
      setActionSuccess(result.message || "Your order has been cancelled successfully.");
    } catch (err) {
      setActionError(err.message || "Unable to cancel this order.");
    } finally {
      setCancelling(false);
    }
  };

  // Review dialog opener
  const handleOpenReview = (item) => {
    setReviewTarget({ order, item });
    setRating(0);
    setReviewText("");
    setReviewSubmitted(false);
    setReviewError("");
  };

  // Review submission
  const handleSubmitReview = async () => {
    if (!reviewTarget || !rating || reviewSaving || reviewText.length > 600) return;
    const { item } = reviewTarget;
    try {
      setReviewSaving(true);
      setReviewError("");
      const response = await submitBuyerReview({
        orderItemId: item.id,
        rating,
        comment: reviewText.trim(),
      });
      setOrder((prev) => ({
        ...prev,
        items: prev.items.map((currentItem) =>
          currentItem.id === item.id
            ? { ...currentItem, review: response.review }
            : currentItem
        ),
      }));
      setReviewSubmitted(true);
    } catch (err) {
      setReviewError(err.message || "Unable to submit review");
    } finally {
      setReviewSaving(false);
    }
  };

  const handleBackToOrders = () => {
    navigate("/buyer/profile/orders");
  };

  if (loading) {
    return (
      <Box sx={{ display: "grid", placeItems: "center", minHeight: 360, p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (loadError && !order) {
    return (
      <ConnectionErrorPanel
        title="Order Details Unavailable"
        onRetry={loadOrderData}
      />
    );
  }

  if (!order) {
    return (
      <Box sx={{ width: "100%", maxWidth: 1200, mx: "auto", p: { xs: 2, md: 3 } }}>
        <Paper elevation={0} sx={{ p: 4, borderRadius: 3, border: "1px solid", borderColor: "divider", textAlign: "center" }}>
          <Typography variant="h6" fontWeight={800} gutterBottom>
            Order Not Found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
            We could not locate this order. It may have been removed or you may have followed an expired link.
          </Typography>
          <Button variant="contained" onClick={handleBackToOrders} sx={{ textTransform: "none", fontWeight: 700 }}>
            Return to My Orders
          </Button>
        </Paper>
      </Box>
    );
  }

  const subtotal = Number(order.subtotal ?? order.total) || 0;
  const totalAmount = Number(order.total) || 0;

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: { xs: "100%", md: 1200, xl: 1360 },
        mx: "auto",
        p: { xs: 1.5, sm: 2.5, md: 3 },
      }}
    >
      <Helmet titleTemplate="%s - ArtMatch">
        <title>{`Order #${order.id || order.orderId} Details`}</title>
      </Helmet>

      {/* Top Back Navigation */}
      <Box sx={{ mb: 2.5 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleBackToOrders}
          sx={{
            textTransform: "none",
            color: "text.secondary",
            fontWeight: 700,
            fontSize: 14,
            p: 0,
            "&:hover": { bgcolor: "transparent", color: "text.primary" },
          }}
        >
          Back to my orders
        </Button>
      </Box>

      {/* Main Order Detail Card Container */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, sm: 3.5, md: 4.5 },
          borderRadius: 4,
          border: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
          boxShadow: "0 4px 24px rgba(15, 23, 42, 0.04)",
        }}
      >
        <Stack spacing={3.5}>
          {/* A. Page Header (Icon + Title + Order Number + Status Pill) */}
          <Box
            sx={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 2,
              flexWrap: "wrap",
            }}
          >
            <Stack direction="row" spacing={2} alignItems="center">
              <Box
                sx={{
                  width: 52,
                  height: 52,
                  borderRadius: "50%",
                  bgcolor: pillStyle.bgcolor,
                  border: `1px solid ${pillStyle.borderColor}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {getStatusHeaderIcon(currentStatus, theme)}
              </Box>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 800, color: "text.primary", lineHeight: 1.2 }}>
                  Fulfillment & delivery
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.35 }}>
                  Order #{order.id || order.orderId} · {artworkTitle}
                </Typography>
              </Box>
            </Stack>

            <Stack direction="row" spacing={1} alignItems="center">
              <Chip
                label={currentStatus}
                sx={{
                  height: 28,
                  fontSize: 12,
                  fontWeight: 700,
                  borderRadius: "16px",
                  bgcolor: pillStyle.bgcolor,
                  color: pillStyle.color,
                  border: `1px solid ${pillStyle.borderColor}`,
                  px: 1,
                }}
              />
              {order.activeReturn && (
                <Chip
                  label={`Return: ${order.activeReturn.status}`}
                  sx={{
                    height: 28,
                    fontSize: 11,
                    fontWeight: 700,
                    borderRadius: "16px",
                    bgcolor: alpha(theme.palette.warning.main, theme.palette.mode === "dark" ? 0.18 : 0.12),
                    color: theme.palette.warning.main,
                    border: `1px solid ${alpha(theme.palette.warning.main, 0.4)}`,
                    px: 1,
                  }}
                />
              )}
            </Stack>
          </Box>

          {/* Feedback alerts */}
          {actionError && (
            <Alert severity="error" onClose={() => setActionError("")}>
              {actionError}
            </Alert>
          )}
          {actionSuccess && (
            <Alert severity="success" onClose={() => setActionSuccess("")}>
              {actionSuccess}
            </Alert>
          )}
          {needsPaymentSupport(order) && (
            <Alert severity="warning">
              Payment received. This order requires support review before further actions can be taken.
            </Alert>
          )}

          {/* B. Artwork and Order Information (Clean 2-Column Table / Rows) */}
          <Box
            sx={{
              p: 2.5,
              borderRadius: 2.5,
              bgcolor: "background.default",
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <Stack spacing={1.5}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography sx={{ color: "text.secondary", fontSize: 13, fontWeight: 600 }}>
                  Artwork Title
                </Typography>
                <Typography sx={{ color: "text.primary", fontSize: 14, fontWeight: 700 }}>
                  {artworkTitle}
                </Typography>
              </Box>
              <Divider sx={{ borderColor: "divider" }} />

              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography sx={{ color: "text.secondary", fontSize: 13, fontWeight: 600 }}>
                  Student Artist
                </Typography>
                <Typography sx={{ color: "text.primary", fontSize: 14, fontWeight: 700 }}>
                  {studentArtist}
                </Typography>
              </Box>
              <Divider sx={{ borderColor: "divider" }} />

              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography sx={{ color: "text.secondary", fontSize: 13, fontWeight: 600 }}>
                  Collector / Buyer
                </Typography>
                <Typography sx={{ color: "text.primary", fontSize: 14, fontWeight: 700 }}>
                  {buyerName}
                </Typography>
              </Box>
              <Divider sx={{ borderColor: "divider" }} />

              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography sx={{ color: "text.secondary", fontSize: 13, fontWeight: 600 }}>
                  Order Date
                </Typography>
                <Typography sx={{ color: "text.primary", fontSize: 13, fontWeight: 600 }}>
                  {formatOrderDateTime(order.date)}
                </Typography>
              </Box>
            </Stack>

            {/* Individual Item Cards Preview if multiple artworks or product customization */}
            {items.length > 0 && (
              <Box sx={{ mt: 2, pt: 2, borderTop: "1px solid", borderColor: "divider" }}>
                <Typography
                  variant="caption"
                  sx={{
                    color: "text.secondary",
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    display: "block",
                    mb: 1.5,
                  }}
                >
                  Purchased Artworks ({items.length})
                </Typography>
                <Stack spacing={1.5}>
                  {items.map((item, idx) => (
                    <Box
                      key={item.id || idx}
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: "background.paper",
                        border: "1px solid",
                        borderColor: "divider",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: 1.5,
                      }}
                    >
                      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0, flex: 1 }}>
                        <Box
                          sx={{
                            width: 52,
                            height: 52,
                            borderRadius: 1.5,
                            overflow: "hidden",
                            bgcolor: "background.default",
                            flexShrink: 0,
                          }}
                        >
                          {item.image ? (
                            <WatermarkedArtworkImage
                              image={item.image}
                              alt={item.title || "Artwork"}
                              sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                          ) : (
                            <Box sx={{ width: "100%", height: "100%", display: "grid", placeItems: "center" }}>
                              <Inventory2OutlinedIcon sx={{ color: "text.secondary", fontSize: 24 }} />
                            </Box>
                          )}
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: "text.primary" }} noWrap>
                            {item.title || "Artwork"}
                          </Typography>
                          <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                            {[item.artist, item.qty != null ? `Qty: ${item.qty}` : ""].filter(Boolean).join(" · ")}
                          </Typography>
                          {item.selectedProducts?.map((product) => (
                            <Typography key={product.id} variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                              Option: {product.name} × {product.quantity}
                            </Typography>
                          ))}
                        </Box>
                      </Stack>

                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Typography sx={{ fontWeight: 800, color: "text.primary", fontSize: 14 }}>
                          {formatCurrency(item.lineTotal ?? (Number(item.price) * Number(item.qty || 1)))}
                        </Typography>

                        {/* Review Status or Action */}
                        {currentStatus === "Delivered" && (
                          item.review ? (
                            <Chip
                              icon={<CheckCircleOutlinedIcon sx={{ fontSize: "14px !important" }} />}
                              label="Reviewed"
                              size="small"
                              variant="outlined"
                              color="success"
                              sx={{ height: 24, fontSize: 11, fontWeight: 700 }}
                            />
                          ) : (
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<StarOutlineIcon sx={{ fontSize: 14 }} />}
                              onClick={() => handleOpenReview(item)}
                              sx={{
                                textTransform: "none",
                                fontSize: 12,
                                fontWeight: 700,
                                borderRadius: 1.5,
                                borderColor: "divider",
                                color: "text.primary",
                                "&:hover": { borderColor: "error.main", color: "error.main" },
                              }}
                            >
                              Review
                            </Button>
                          )
                        )}
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              </Box>
            )}
          </Box>

          {/* C. Order Payment Summary */}
          <Box
            sx={{
              p: 2.5,
              borderRadius: 2.5,
              bgcolor: "background.default",
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <Stack spacing={1.5}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography sx={{ color: "text.secondary", fontSize: 13, fontWeight: 600 }}>
                  Artwork Price / Subtotal
                </Typography>
                <Typography sx={{ color: "text.primary", fontSize: 14, fontWeight: 700 }}>
                  {formatCurrency(subtotal)}
                </Typography>
              </Box>
              <Divider sx={{ borderColor: "divider" }} />

              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography sx={{ color: "text.secondary", fontSize: 13, fontWeight: 600 }}>
                  Delivery / Shipping Fee
                </Typography>
                <Typography sx={{ color: "text.primary", fontSize: 14, fontWeight: 700 }}>
                  {isMeetup ? "₱0 (Meet-up Delivery)" : "₱0 (Paid to courier)"}
                </Typography>
              </Box>
              <Divider sx={{ borderColor: "divider" }} />

              {Number(order.processingFee || 0) > 0 && (
                <>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography sx={{ color: "text.secondary", fontSize: 13, fontWeight: 600 }}>
                      Payment Processing Fee (2% + ₱15.00)
                    </Typography>
                    <Typography sx={{ color: "text.primary", fontSize: 14, fontWeight: 700 }}>
                      {formatCurrency(order.processingFee)}
                    </Typography>
                  </Box>
                  <Divider sx={{ borderColor: "divider" }} />
                </>
              )}

              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography sx={{ color: "text.secondary", fontSize: 13, fontWeight: 600 }}>
                  Payment Method & Status
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography sx={{ color: "text.primary", fontSize: 13, fontWeight: 600 }}>
                    {getPaymentMethodLabel(order)}
                  </Typography>
                  <Chip
                    label={getPaymentLabel(order)}
                    color={getPaymentColor(order)}
                    size="small"
                    variant="outlined"
                    sx={{ height: 20, fontSize: 10, fontWeight: 700 }}
                  />
                </Stack>
              </Box>
              <Divider sx={{ borderColor: "divider" }} />

              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pt: 0.5 }}>
                <Typography sx={{ color: "text.primary", fontSize: 15, fontWeight: 800 }}>
                  Total Paid
                </Typography>
                <Typography sx={{ color: "success.main", fontSize: 18, fontWeight: 900 }}>
                  {formatCurrency(totalAmount)}
                </Typography>
              </Box>
            </Stack>
          </Box>

          {/* D. Delivery and Fulfillment Section (Light Blue Box from Reference Image 1) */}
          <Box
            sx={{
              p: 2.5,
              borderRadius: 3,
              bgcolor: "#f0f7ff",
              border: "1px solid #c7dffd",
            }}
          >
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={1.25} alignItems="center">
                {isMeetup ? (
                  <StorefrontOutlinedIcon sx={{ color: "#2563eb", fontSize: 22 }} />
                ) : (
                  <LocalShippingOutlinedIcon sx={{ color: "#2563eb", fontSize: 22 }} />
                )}
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#1e3a8a" }}>
                  Delivery & fulfillment
                </Typography>
              </Stack>

              <Typography variant="body2" sx={{ color: "#2563eb", fontWeight: 700, fontSize: 13 }}>
                Status: {buyerDeliveryHint(order)}
              </Typography>

              <Divider sx={{ borderColor: "#bfdbfe" }} />

              <Stack spacing={1}>
                <Box sx={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
                  <Typography sx={{ color: "#475569", fontSize: 13, fontWeight: 600 }}>
                    Delivery Method:
                  </Typography>
                  <Typography sx={{ color: "#0f172a", fontSize: 13, fontWeight: 700 }}>
                    {isMeetup ? "Meet-up Delivery" : "Door-to-Door Delivery"}
                  </Typography>
                </Box>

                <Box sx={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
                  <Typography sx={{ color: "#475569", fontSize: 13, fontWeight: 600 }}>
                    {isMeetup ? "Meet-up Location / Coordination:" : "Delivery Address:"}
                  </Typography>
                  <Typography sx={{ color: "#0f172a", fontSize: 13, fontWeight: 600, textAlign: { sm: "right" } }}>
                    {order.address || (isMeetup ? "Coordinated directly with student artist in Messages" : "Address not provided")}
                  </Typography>
                </Box>

                {!isMeetup && (
                  <>
                    <Box sx={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
                      <Typography sx={{ color: "#475569", fontSize: 13, fontWeight: 600 }}>
                        Courier:
                      </Typography>
                      <Typography sx={{ color: "#0f172a", fontSize: 13, fontWeight: 600 }}>
                        {courierInfo?.label || order.courier || "Awaiting courier assignment"}
                      </Typography>
                    </Box>

                    <Box sx={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
                      <Typography sx={{ color: "#475569", fontSize: 13, fontWeight: 600 }}>
                        Tracking Number:
                      </Typography>
                      <Typography sx={{ color: "#0f172a", fontSize: 13, fontWeight: 600 }}>
                        {order.trackingNumber || "Awaiting tracking details"}
                      </Typography>
                    </Box>

                    {secureTrackingUrl && (
                      <Box sx={{ display: "flex", justifyContent: "flex-end", pt: 0.5 }}>
                        <Button
                          component="a"
                          href={secureTrackingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          size="small"
                          endIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
                          sx={{ textTransform: "none", fontWeight: 700, p: 0, color: "#2563eb" }}
                        >
                          Open courier tracking
                        </Button>
                      </Box>
                    )}
                  </>
                )}

                {order.deliveredAt && (
                  <Box sx={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
                    <Typography sx={{ color: "#475569", fontSize: 13, fontWeight: 600 }}>
                      Delivered Date:
                    </Typography>
                    <Typography sx={{ color: "#16a34a", fontSize: 13, fontWeight: 700 }}>
                      {formatOrderDateTime(order.deliveredAt)}
                    </Typography>
                  </Box>
                )}

                {order.deliveryProof && (
                  <Box sx={{ pt: 1, borderTop: "1px dashed #bfdbfe" }}>
                    <Typography sx={{ color: "#475569", fontSize: 12, fontWeight: 600 }}>
                      Seller Delivery Proof / Notes:
                    </Typography>
                    {order.deliveryProof.notes && (
                      <Typography sx={{ color: "#0f172a", fontSize: 13, fontStyle: "italic", mt: 0.25 }}>
                        &ldquo;{order.deliveryProof.notes}&rdquo;
                      </Typography>
                    )}
                    {order.deliveryProof.submittedAt && (
                      <Typography sx={{ color: "#64748b", fontSize: 12, mt: 0.25 }}>
                        Confirmed on {formatOrderDateTime(order.deliveryProof.submittedAt)}
                      </Typography>
                    )}
                  </Box>
                )}

                {order.note && (
                  <Box sx={{ pt: 0.5 }}>
                    <Typography sx={{ color: "#475569", fontSize: 12, fontWeight: 600 }}>
                      Your Note to Artist:
                    </Typography>
                    <Typography sx={{ color: "#0f172a", fontSize: 13, mt: 0.25 }}>
                      {order.note}
                    </Typography>
                  </Box>
                )}
              </Stack>
            </Stack>
          </Box>

          {/* E. Order Actions & Status Management Controls */}
          <Box
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: "1px solid #e2e8f0",
              bgcolor: "#ffffff",
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#0f172a", mb: 0.5 }}>
              Order Actions & Status Management
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
              Track shipment milestones, review your purchased artworks, or request returns if eligible.
            </Typography>

            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1.5}
              alignItems={{ xs: "stretch", sm: "center" }}
              flexWrap="wrap"
            >
              {/* Track Delivery Action Button */}
              {currentStatus !== "Cancelled" && (
                <Button
                  variant="outlined"
                  startIcon={<LocalShippingOutlinedIcon />}
                  onClick={() => setTrackOpen(true)}
                  sx={{
                    borderRadius: 2,
                    textTransform: "none",
                    fontWeight: 700,
                    fontSize: 13,
                    borderColor: "#2563eb",
                    color: "#2563eb",
                    "&:hover": { bgcolor: "#eff6ff", borderColor: "#1d4ed8" },
                  }}
                >
                  {isMeetup ? "Meet-up Progress" : "Track Delivery Progress"}
                </Button>
              )}

              {/* Request Return Button if Delivered */}
              {currentStatus === "Delivered" && (
                <Button
                  variant="contained"
                  color="error"
                  disabled={!order.returnEligible}
                  startIcon={<AssignmentReturnOutlinedIcon />}
                  onClick={() => setReturnDialogOpen(true)}
                  sx={{
                    borderRadius: 2,
                    textTransform: "none",
                    fontWeight: 700,
                    fontSize: 13,
                  }}
                >
                  Request Return
                </Button>
              )}

              {/* Cancel Order Action if Pending & COD */}
              {currentStatus === "Pending" && !isPayMongoOrder(order) && (
                <Button
                  variant="outlined"
                  color="error"
                  disabled={cancelling}
                  startIcon={<CancelOutlinedIcon />}
                  onClick={handleCancelOrder}
                  sx={{
                    borderRadius: 2,
                    textTransform: "none",
                    fontWeight: 700,
                    fontSize: 13,
                  }}
                >
                  {cancelling ? <CircularProgress size={18} color="inherit" /> : "Cancel Order"}
                </Button>
              )}

              {/* Active Return Status Details Button */}
              {order.activeReturn && (
                <Button
                  variant="outlined"
                  color="warning"
                  onClick={() =>
                    navigate(
                      `/buyer/messages?conversation=${order.activeReturn.conversation_id}&return=${order.activeReturn.return_request_id}`
                    )
                  }
                  sx={{
                    borderRadius: 2,
                    textTransform: "none",
                    fontWeight: 700,
                    fontSize: 13,
                  }}
                >
                  View Return Details
                </Button>
              )}
            </Stack>
          </Box>

          {/* F. Buyer Protection & Authenticity Guarantee Banner (Light Green Banner from Reference Image 1) */}
          <Box
            sx={{
              p: 1.75,
              borderRadius: 2.5,
              bgcolor: "#f0fdf4",
              border: "1px solid #bbf7d0",
              display: "flex",
              alignItems: "center",
              gap: 1.5,
            }}
          >
            <ShieldOutlinedIcon sx={{ color: "#16a34a", fontSize: 24, flexShrink: 0 }} />
            <Box>
              <Typography sx={{ color: "#166534", fontSize: 13, fontWeight: 700 }}>
                100% Buyer Protection & Authenticity Guaranteed.
              </Typography>
              <Typography sx={{ color: "#15803d", fontSize: 12 }}>
                Every purchase supports verified student artists and is backed by ArtMatch return & dispute protection.
              </Typography>
            </Box>
          </Box>

          {/* G. Bottom Action Buttons (Reference Image 1) */}
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            justifyContent="space-between"
            alignItems="center"
          >
            {/* Download PDF Receipt */}
            <Button
              variant="contained"
              startIcon={<PrintOutlinedIcon />}
              onClick={() => window.print()}
              sx={{
                width: { xs: "100%", sm: "auto" },
                bgcolor: "#18181b",
                color: "#ffffff",
                borderRadius: 2,
                px: 3,
                py: 1.25,
                fontWeight: 700,
                fontSize: 14,
                textTransform: "none",
                "&:hover": { bgcolor: "#27272a" },
              }}
            >
              Download PDF Receipt
            </Button>

            <Stack direction="row" spacing={1.5} sx={{ width: { xs: "100%", sm: "auto" } }}>
              {sellerId && (
                <Button
                  component={Link}
                  to={`/buyer/messages?seller=${encodeURIComponent(sellerId)}`}
                  variant="outlined"
                  startIcon={<ChatOutlinedIcon />}
                  sx={{
                    flex: { xs: 1, sm: "initial" },
                    borderRadius: 2,
                    px: 2.5,
                    py: 1.25,
                    fontWeight: 700,
                    fontSize: 13,
                    textTransform: "none",
                    borderColor: "#cbd5e1",
                    color: "#334155",
                    "&:hover": { borderColor: "#94a3b8", bgcolor: "#f8fafc" },
                  }}
                >
                  Chat with Artist
                </Button>
              )}

              <Button
                variant="outlined"
                onClick={handleBackToOrders}
                sx={{
                  flex: { xs: 1, sm: "initial" },
                  borderRadius: 2,
                  px: 2.5,
                  py: 1.25,
                  fontWeight: 700,
                  fontSize: 13,
                  textTransform: "none",
                  borderColor: "#cbd5e1",
                  color: "#334155",
                  "&:hover": { borderColor: "#94a3b8", bgcolor: "#f8fafc" },
                }}
              >
                Back to orders
              </Button>
            </Stack>
          </Stack>
        </Stack>
      </Paper>

      {/* Mounted Dialogs */}
      {/* 1. Track Order Dialog */}
      <OrderTrack
        open={trackOpen}
        order={
          hasActiveReturnTracking
            ? {
                ...order,
                isReturn: true,
                courier: order.activeReturn?.return_courier,
                trackingNumber: order.activeReturn?.return_tracking_number,
                trackingUrl: returnTrackingUrl,
                activeReturn: order.activeReturn,
              }
            : order
        }
        onClose={() => setTrackOpen(false)}
      />

      {/* 2. Return Request Dialog */}
      {returnDialogOpen && (
        <ReturnRequestDialog
          key={order.orderId}
          order={order}
          onClose={() => setReturnDialogOpen(false)}
          onSubmitted={(request) => {
            setReturnDialogOpen(false);
            navigate(`/buyer/messages?conversation=${request.conversation_id}&return=${request.return_request_id}`);
          }}
        />
      )}

      {/* 3. Review Dialog */}
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
        onSubmit={handleSubmitReview}
      />
    </Box>
  );
}
