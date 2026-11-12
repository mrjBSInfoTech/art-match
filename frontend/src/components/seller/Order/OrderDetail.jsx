import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  MenuItem,
  Paper,
  Select,
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

import { fetchSellerOrders, updateSellerOrderStatus } from "../../../api/seller/orderAPI";
import {
  canFulfillOrder,
  getPaymentColor,
  getPaymentLabel,
  getPaymentMethodLabel,
  isPayMongoOrder,
  isPlacedOrder,
  needsPaymentSupport,
  calculateProcessingFee,
} from "../../../utils/orderPayments.js";
import { formatCurrency, formatOrderDate } from "./orderPresentation.js";
import { getSecureTrackingUrl } from "../../../utils/trackingUrl.js";
import { getShipmentCourier } from "../../../utils/shipmentCouriers.js";
import ArtworkImage from "../../common/ArtworkImage";
import OrderParcelPhoto from "./OrderParcelPhoto";
import OrderTrack from "./OrderTrack";
import OrderReceived from "./OrderReceived";
import OrderConfirm from "./OrderConfirm";
import OrderReceipt from "./OrderReceipt";
import ConnectionErrorPanel from "../ConnectionErrorPanel";
import SellerLoadingPanel from "../SellerLoadingPanel";

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

const fulfillmentHint = (order) => {
  if (!order) return "";
  if (needsPaymentSupport(order)) return "Payment received. Contact support for refund review.";
  if (String(order.paymentStatus).toLowerCase() === "refunded") return "Payment refunded. This order cannot be processed.";
  const isMeetup = order.deliveryMethod === "pickup";
  const hints = {
    Pending: "Confirm this order to start preparing it.",
    Confirmed: "Mark as packed and upload 1–5 parcel photos.",
    Packed: isMeetup
      ? "Mark as ready for meet-up. Coordinate handover in chat."
      : "Mark as shipped; choose a courier and add its tracking information.",
    Shipped: isMeetup
      ? "Meet the buyer and confirm delivery with proof photos."
      : "Mark as delivered after the buyer receives the parcel.",
    Delivered: "Order completed successfully.",
    Cancelled: "Order cancelled.",
  };
  return hints[order.status] || "";
};

export default function OrderDetail() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();

  const [order, setOrder] = useState(location.state?.order || null);
  const [loading, setLoading] = useState(!order);
  const [loadError, setLoadError] = useState("");
  const [statusError, setStatusError] = useState("");
  const [statusSuccess, setStatusSuccess] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);
  const [confirmationTarget, setConfirmationTarget] = useState(null);

  // Fulfillment Dialog States
  const [fulfillmentTarget, setFulfillmentTarget] = useState(null);
  const [parcelPhotos, setParcelPhotos] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const [receivedPhotos, setReceivedPhotos] = useState([]);
  const [receivedPreviews, setReceivedPreviews] = useState([]);
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [courier, setCourier] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [handlingInstructions, setHandlingInstructions] = useState([]);
  const [savingFulfillment, setSavingFulfillment] = useState(false);

  const mountedRef = useRef(false);

  // Load Order if not available from state or to sync fresh data
  const loadOrderData = useCallback(async () => {
    try {
      setLoadError("");
      const response = await fetchSellerOrders();
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
        setLoadError(`Order ${id} could not be found.`);
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

  useEffect(() => {
    const previews = parcelPhotos.map((file) => URL.createObjectURL(file));
    setPhotoPreviews(previews);
    return () => previews.forEach((preview) => URL.revokeObjectURL(preview));
  }, [parcelPhotos]);

  useEffect(() => {
    const previews = receivedPhotos.map((file) => URL.createObjectURL(file));
    setReceivedPreviews(previews);
    return () => previews.forEach((preview) => URL.revokeObjectURL(preview));
  }, [receivedPhotos]);

  const items = Array.isArray(order?.items) ? order.items : [];
  const primaryItem = items[0] || {};
  const currentStatus = order?.status || "Pending";

  const nextStatuses = useMemo(() => {
    if (!order || !canFulfillOrder(order)) return [];
    return (nextStatusMap[order.status] || []).filter(
      (status) => status !== "Cancelled" || !isPayMongoOrder(order),
    );
  }, [order]);

  const saveStatusChange = async (targetOrderId, nextStatus, payload = {}) => {
    if (savingStatus) return false;
    if (!order || !canFulfillOrder(order)) {
      setStatusError("This order cannot be processed. Please check its payment and order status.");
      return false;
    }
    setSavingStatus(true);
    setStatusError("");
    setStatusSuccess("");
    try {
      const result = await updateSellerOrderStatus(targetOrderId, nextStatus, payload);
      setOrder((prev) => ({
        ...prev,
        status: nextStatus,
        deliveredAt:
          result.deliveredAt ??
          prev.deliveredAt ??
          (nextStatus === "Delivered" ? new Date().toISOString() : null),
        returnDeadline: result.returnDeadline ?? prev.returnDeadline,
        paymentStatus: result.paymentStatus ?? prev.paymentStatus,
        paidAt: result.paidAt ?? prev.paidAt,
        courier: result.courier ?? prev.courier,
        trackingNumber:
          result.trackingNumber === undefined ? prev.trackingNumber : result.trackingNumber,
        trackingUrl: result.trackingUrl ?? prev.trackingUrl,
        parcelPhotoCount: result.parcelPhotoCount ?? prev.parcelPhotoCount,
        handlingInstructions: result.handlingInstructions ?? prev.handlingInstructions,
      }));
      setStatusSuccess(`Order status successfully updated to "${nextStatus}".`);
      return true;
    } catch (err) {
      setStatusError(err.message || "Unable to update order status");
      return false;
    } finally {
      setSavingStatus(false);
    }
  };

  const handleStatusSelect = async (nextStatus) => {
    if (!order || savingStatus || savingFulfillment) return;
    if (nextStatus === order.status) return;
    if (!nextStatuses.includes(nextStatus)) {
      setStatusError(`Cannot move order from ${order.status} to ${nextStatus}.`);
      return;
    }

    if (nextStatus === "Packed") {
      setStatusError("");
      setParcelPhotos([]);
      setHandlingInstructions(order.handlingInstructions || []);
      setFulfillmentTarget({ orderId: order.orderId, status: nextStatus, order });
      return;
    }

    if (nextStatus === "Shipped") {
      const isMeetup = order.deliveryMethod === "pickup";
      if (isMeetup) {
        setStatusError("");
        setConfirmationTarget({ orderId: order.orderId, status: nextStatus, order });
        return;
      }
      setStatusError("");
      setParcelPhotos([]);
      setCourier(order.courier || "");
      setTrackingNumber(order.trackingNumber || "");
      setTrackingUrl(order.trackingUrl || "");
      setHandlingInstructions(order.handlingInstructions || []);
      setFulfillmentTarget({ orderId: order.orderId, status: nextStatus, order });
      return;
    }

    if (nextStatus === "Delivered") {
      setStatusError("");
      setReceivedPhotos([]);
      setDeliveryNotes("");
      setFulfillmentTarget({ orderId: order.orderId, status: nextStatus, order });
      return;
    }

    setStatusError("");
    setConfirmationTarget({ orderId: order.orderId, status: nextStatus, order });
  };

  const submitFulfillmentUpdate = async () => {
    if (!fulfillmentTarget || !order) return;

    if (fulfillmentTarget.status === "Packed") {
      if (parcelPhotos.length < 1 || parcelPhotos.length > 5) {
        setStatusError("Please choose 1 to 5 parcel photos before continuing.");
        return;
      }
    } else if (fulfillmentTarget.status === "Delivered") {
      if (receivedPhotos.length < 1 || receivedPhotos.length > 5) {
        setStatusError("Please upload at least 1 photo as proof that this order is delivered.");
        return;
      }
    } else if (fulfillmentTarget.status === "Shipped" && fulfillmentTarget.order.deliveryMethod !== "pickup") {
      const submittedCourier = courier.trim();
      if (!submittedCourier || submittedCourier.length > 50) {
        setStatusError("Please enter a valid courier name (up to 50 characters).");
        return;
      }
      const submittedTrackingNumber = trackingNumber.trim();
      if (submittedTrackingNumber.length > 100) {
        setStatusError("Please enter a valid tracking number (up to 100 characters).");
        return;
      }
      const submittedTrackingUrl = getSecureTrackingUrl(trackingUrl.trim());
      if (!submittedTrackingUrl) {
        setStatusError("Please provide a valid HTTPS courier tracking URL.");
        return;
      }
    }

    setStatusError("");
    setConfirmationTarget(fulfillmentTarget);
  };

  const confirmStatusChange = async () => {
    if (!confirmationTarget) return false;
    const { orderId, status, order: targetOrder } = confirmationTarget;

    if (!fulfillmentTarget || fulfillmentTarget.status !== status) {
      const saved = await saveStatusChange(orderId, status);
      if (saved) setConfirmationTarget(null);
      return saved;
    }

    const formData = new FormData();
    if (status === "Packed") {
      parcelPhotos.forEach((file) => formData.append("parcel_photos", file));
      formData.append("handling_instructions", JSON.stringify(handlingInstructions));
    } else if (status === "Delivered") {
      receivedPhotos.forEach((file) => formData.append("parcel_photos", file));
      if (deliveryNotes.trim()) formData.append("delivery_notes", deliveryNotes.trim());
    } else if (status === "Shipped" && targetOrder.deliveryMethod !== "pickup") {
      formData.append("courier", courier.trim());
      formData.append("tracking_number", trackingNumber.trim());
      formData.append("tracking_url", getSecureTrackingUrl(trackingUrl.trim()));
    }

    setSavingFulfillment(true);
    try {
      const saved = await saveStatusChange(orderId, status, formData);
      if (saved) {
        setConfirmationTarget(null);
        setFulfillmentTarget(null);
        setReceivedPhotos([]);
        setParcelPhotos([]);
        setDeliveryNotes("");
      }
      return saved;
    } finally {
      setSavingFulfillment(false);
    }
  };

  if (loading) {
    return (
      <SellerLoadingPanel
        title="Order Details"
        subtitle="Loading order summary, buyer shipping details, and fulfillment status."
        showMetrics={false}
        showFilters={false}
      />
    );
  }

  if (loadError || !order) {
    return (
      <Box sx={{ width: "100%", maxWidth: { xs: "100%", md: 1200, xl: 1360 }, mx: "auto", p: { xs: 2, md: 4 } }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate("/seller/orders/manage")}
          sx={{ textTransform: "none", color: "text.secondary", fontWeight: 700, mb: 2 }}
        >
          Back to manage orders
        </Button>
        <ConnectionErrorPanel
          title="Order Details Unavailable"
          message={loadError}
          onRetry={loadOrder}
        />
      </Box>
    );
  }

  // Presentation Calculations
  const isOnline = isPayMongoOrder(order);
  const grossAmount = order.earning?.gross ?? order.subtotal ?? order.total ?? 0;
  const recordedFee = (order.earning?.commission || 0) + (order.earning?.processingFee || 0);
  const platformTake = recordedFee > 0 ? recordedFee : (isOnline ? calculateProcessingFee(grossAmount) : 0);
  const platformTakePercent =
    grossAmount > 0
      ? Math.round((platformTake / grossAmount) * 100)
      : 0;
  const netPayout = order.earning?.net && recordedFee > 0
    ? order.earning.net
    : Math.max(0, grossAmount - platformTake);

  const isMeetup = order.deliveryMethod === "pickup";
  const artworkTitle = primaryItem.title || "Artwork";
  const studentArtist = order.sellerName || primaryItem.artistName || "Student Artist";
  const buyerName = order.customer || order.buyerName || "Maria Santos";
  const pillStyle = getStatusPillStyle(theme, currentStatus);
  const secureTrackingUrl = getSecureTrackingUrl(order.trackingUrl);
  const courierInfo = getShipmentCourier(order.courier);

  return (
    <Box sx={{ width: "100%", maxWidth: { xs: "100%", md: 1200, xl: 1360 }, mx: "auto", p: { xs: 1.5, sm: 2.5, md: 3 } }}>
      <Helmet titleTemplate="%s - ArtMatch">
        <title>{`Order #${order.id} Details`}</title>
      </Helmet>

      {/* Top Back Navigation */}
      <Box sx={{ mb: 2.5 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate("/seller/orders/manage")}
          sx={{
            textTransform: "none",
            color: "text.secondary",
            fontWeight: 700,
            fontSize: 14,
            p: 0,
            "&:hover": { bgcolor: "transparent", color: "text.primary" },
          }}
        >
          Back to manage orders
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
                  Order #{order.id} · {artworkTitle}
                </Typography>
              </Box>
            </Stack>

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
          </Box>

          {/* Feedback alerts */}
          {statusError && (
            <Alert severity="error" onClose={() => setStatusError("")}>
              {statusError}
            </Alert>
          )}
          {statusSuccess && (
            <Alert severity="success" onClose={() => setStatusSuccess("")}>
              {statusSuccess}
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
                  {formatOrderDate(order.date)}
                </Typography>
              </Box>
            </Stack>
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
                  Artwork Price / Gross
                </Typography>
                <Typography sx={{ color: "text.primary", fontSize: 14, fontWeight: 700 }}>
                  {formatCurrency(grossAmount)}
                </Typography>
              </Box>
              <Divider sx={{ borderColor: "divider" }} />

              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography sx={{ color: "text.secondary", fontSize: 13, fontWeight: 600 }}>
                  Platform Take / Deductions
                </Typography>
                <Typography sx={{ color: "text.primary", fontSize: 14, fontWeight: 700 }}>
                  {formatCurrency(platformTake)} ({platformTakePercent}%)
                </Typography>
              </Box>
              <Divider sx={{ borderColor: "divider" }} />

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
                  Total Net Student Payout
                </Typography>
                <Typography sx={{ color: "success.main", fontSize: 18, fontWeight: 900 }}>
                  {formatCurrency(netPayout)}
                </Typography>
              </Box>
            </Stack>
          </Box>

          {/* D. Delivery and Fulfillment Section (Light Blue Box from Reference Image 1) */}
          <Box
            sx={{
              p: 2.5,
              borderRadius: 3,
              bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.12 : 0.08),
              border: "1px solid",
              borderColor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.32 : 0.2),
            }}
          >
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={1.25} alignItems="center">
                <LocalShippingOutlinedIcon sx={{ color: "primary.main", fontSize: 22 }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "primary.main" }}>
                  Delivery & fulfillment
                </Typography>
              </Stack>

              <Typography variant="body2" sx={{ color: "primary.main", fontWeight: 700, fontSize: 13 }}>
                Status: {fulfillmentHint(order)}
              </Typography>

              <Divider sx={{ borderColor: alpha(theme.palette.primary.main, 0.25) }} />

              <Stack spacing={1}>
                <Box sx={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
                  <Typography sx={{ color: "text.secondary", fontSize: 13, fontWeight: 600 }}>
                    Delivery Method:
                  </Typography>
                  <Typography sx={{ color: "text.primary", fontSize: 13, fontWeight: 700 }}>
                    {isMeetup ? "Meet-up Delivery" : "Door-to-Door Delivery"}
                  </Typography>
                </Box>

                <Box sx={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
                  <Typography sx={{ color: "#475569", fontSize: 13, fontWeight: 600 }}>
                    {isMeetup ? "Meet-up Location:" : "Delivery Address:"}
                  </Typography>
                  <Typography sx={{ color: "#0f172a", fontSize: 13, fontWeight: 600, textAlign: { sm: "right" } }}>
                    {order.address || "Address not provided"}
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

                {order.handlingInstructions?.length > 0 && (
                  <Box sx={{ pt: 0.5 }}>
                    <Typography sx={{ color: "#475569", fontSize: 12, fontWeight: 600, mb: 0.5 }}>
                      Handling Instructions:
                    </Typography>
                    <Stack direction="row" spacing={0.75} flexWrap="wrap">
                      {order.handlingInstructions.map((instruction) => (
                        <Chip
                          key={instruction}
                          label={instruction.replace(/_/g, " ")}
                          size="small"
                          sx={{
                            fontSize: 11,
                            textTransform: "capitalize",
                            bgcolor: "#e0f2fe",
                            color: "#0369a1",
                            fontWeight: 600,
                          }}
                        />
                      ))}
                    </Stack>
                  </Box>
                )}

                {order.note && (
                  <Box sx={{ pt: 0.5 }}>
                    <Typography sx={{ color: "#475569", fontSize: 12, fontWeight: 600 }}>
                      Customer Note:
                    </Typography>
                    <Typography sx={{ color: "#0f172a", fontSize: 13, mt: 0.25 }}>
                      {order.note}
                    </Typography>
                  </Box>
                )}
              </Stack>
            </Stack>
          </Box>

          {/* E. Order Status Management Controls */}
          <Box
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: "1px solid #e2e8f0",
              bgcolor: "#ffffff",
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#0f172a", mb: 1 }}>
              Order Status Management
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
              Update and advance the order workflow through its verified fulfillment milestones.
            </Typography>

            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              alignItems={{ xs: "stretch", sm: "center" }}
            >
              {/* Quick Action Button for next progression */}
              {nextStatuses.length > 0 && (
                <Button
                  variant="contained"
                  disabled={savingStatus || savingFulfillment}
                  onClick={() => handleStatusSelect(nextStatuses[0])}
                  sx={{
                    borderRadius: 2,
                    textTransform: "none",
                    fontWeight: 800,
                    minHeight: 40,
                    bgcolor: "error.main",
                    color:"#fff",
                  }}
                >
                  {savingStatus || savingFulfillment ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : (
                    `Advance to: ${nextStatuses[0]}`
                  )}
                </Button>
              )}
            </Stack>
          </Box>

          {/* F. Payout Guarantee Banner (Light Green Banner from Reference Image 1) */}
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
            <CheckCircleOutlinedIcon sx={{ color: "#16a34a", fontSize: 22, flexShrink: 0 }} />
            <Typography sx={{ color: "#166534", fontSize: 13, fontWeight: 600 }}>
              Net payout (after payment processing fee deduction) disbursed directly to registered student bank account via InstaPay.
            </Typography>
          </Box>

          {/* G. Bottom Action Buttons (Reference Image 1) */}
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            justifyContent="space-between"
            alignItems="center"
          >
            {/* Primary Action Button: Download PDF Receipt / Print Label */}
            <Button
              variant="contained"
              startIcon={<PrintOutlinedIcon />}
              onClick={() => window.print()}
              disabled={!canFulfillOrder(order)}
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
              {order.customerId && (
                <Button
                  component={Link}
                  to={`/seller/messages?buyer=${order.customerId}`}
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
                  Chat with Buyer
                </Button>
              )}

              <Button
                variant="outlined"
                onClick={() => navigate("/seller/orders/manage")}
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

      {/* Hidden Print Receipt Component for window.print() */}
      <OrderReceipt
        selectedOrder={order}
        parcelHandlingOptions={parcelHandlingOptions}
      />

      {/* Fulfillment Modals: Packing Photos */}
      <OrderParcelPhoto
        open={Boolean(fulfillmentTarget && fulfillmentTarget.status === "Packed")}
        fulfillmentTarget={fulfillmentTarget}
        statusError={statusError}
        setStatusError={setStatusError}
        parcelPhotos={parcelPhotos}
        setParcelPhotos={setParcelPhotos}
        photoPreviews={photoPreviews}
        handlingOptions={parcelHandlingOptions}
        handlingInstructions={handlingInstructions}
        setHandlingInstructions={setHandlingInstructions}
        saving={savingFulfillment}
        onClose={() => setFulfillmentTarget(null)}
        onSubmit={submitFulfillmentUpdate}
      />

      {/* Fulfillment Modals: Courier & Tracking */}
      <OrderTrack
        open={Boolean(fulfillmentTarget && fulfillmentTarget.status === "Shipped")}
        fulfillmentTarget={fulfillmentTarget}
        statusError={statusError}
        courier={courier}
        onCourierChange={setCourier}
        trackingNumber={trackingNumber}
        setTrackingNumber={setTrackingNumber}
        trackingUrl={trackingUrl}
        setTrackingUrl={setTrackingUrl}
        saving={savingFulfillment}
        onClose={() => setFulfillmentTarget(null)}
        onSubmit={submitFulfillmentUpdate}
      />

      {/* Fulfillment Modals: Delivered Proof */}
      <OrderReceived
        open={Boolean(fulfillmentTarget && fulfillmentTarget.status === "Delivered")}
        order={fulfillmentTarget?.order}
        statusError={statusError}
        setStatusError={setStatusError}
        receivedPhotos={receivedPhotos}
        setReceivedPhotos={setReceivedPhotos}
        photoPreviews={receivedPreviews}
        deliveryNotes={deliveryNotes}
        setDeliveryNotes={setDeliveryNotes}
        saving={savingFulfillment}
        onClose={() => {
          setFulfillmentTarget(null);
          setReceivedPhotos([]);
          setDeliveryNotes("");
        }}
        onSubmit={submitFulfillmentUpdate}
      />

      <OrderConfirm
        open={Boolean(confirmationTarget)}
        order={confirmationTarget?.order}
        status={confirmationTarget?.status}
        error={statusError}
        saving={savingStatus || savingFulfillment}
        onClose={() => setConfirmationTarget(null)}
        onConfirm={confirmStatusChange}
      />
    </Box>
  );
}
