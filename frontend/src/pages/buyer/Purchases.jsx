import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link as RouterLink, useNavigate, useSearchParams } from "react-router-dom";
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
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
// Icons
import SearchIcon from "@mui/icons-material/Search";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import VerifiedOutlinedIcon from "@mui/icons-material/VerifiedOutlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import CloseIcon from "@mui/icons-material/Close";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import RefreshIcon from "@mui/icons-material/Refresh";

import { fetchBuyerOrders } from "../../api/buyer/orderAPI";
import ArtworkImage from "../../components/common/ArtworkImage";
import { getSecureTrackingUrl } from "../../utils/trackingUrl.js";
import { getShipmentCourier } from "../../utils/shipmentCouriers.js";
import {
  DELIVERY_LIFECYCLE_STEPS,
  getDeliveryProgressStepIndex,
} from "../../utils/orderStatusTabs.js";
import {
  getPaymentColor,
  getPaymentLabel,
  getPaymentMethodLabel,
} from "../../utils/orderPayments.js";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const formatDate = (value, options = { dateStyle: "medium", timeStyle: "short" }) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("en-PH", options);
};

const formatShortDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
};

// Exclude unpaid, failed, or cancelled purchases from completed purchases
const isCompletedPurchase = (order) => {
  if (!order) return false;
  // If payment status is Failed, Expired, or Awaiting Payment without completion
  if (["Failed", "Expired", "Awaiting Payment"].includes(order.paymentStatus)) {
    return false;
  }
  // If status is Cancelled, only count if it was previously paid and refunded
  if (order.status === "Cancelled" && order.paymentStatus !== "Refunded") {
    return false;
  }
  // Online orders must be Paid or Refunded
  if (order.payment === "paymongo") {
    return ["Paid", "Refunded"].includes(order.paymentStatus);
  }
  // COD orders count when placed/confirmed/delivered
  if (order.payment === "cod") {
    return order.status !== "Cancelled";
  }
  return order.paymentStatus === "Paid" || order.paymentStatus === "Refunded";
};

export default function Purchases() {
  const theme = useTheme();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState(null);

  // Selected modals
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const tabParam = searchParams.get("tab");
  const activeTab = tabParam === "items" ? 1 : 0;

  const handleTabChange = (_event, nextIndex) => {
    const updated = new URLSearchParams(searchParams);
    if (nextIndex === 1) {
      updated.set("tab", "items");
    } else {
      updated.set("tab", "transactions");
    }
    setSearchParams(updated, { replace: true });
  };

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetchBuyerOrders();
      setOrders(Array.isArray(response) ? response : []);
    } catch (err) {
      setError(err.message || "Unable to load purchase records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const copyText = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Ignore copy error
    }
  };

  // Only completed purchases
  const completedOrders = useMemo(() => {
    return orders.filter(isCompletedPurchase);
  }, [orders]);

  // Tab A: Transactions
  const transactions = useMemo(() => {
    return completedOrders.map((order) => {
      // Calculate total refund amount from returns
      const orderReturns = Array.isArray(order.returns) ? order.returns : [];
      const refundTotal = orderReturns.reduce((sum, ret) => {
        const amt = Number(ret.refund_amount || 0);
        return sum + (Number.isFinite(amt) ? amt : 0);
      }, 0);
      const isRefunded =
        order.paymentStatus === "Refunded" ||
        orderReturns.some((r) => ["Refunded", "Completed"].includes(r.refund_status || r.status));

      const refundStatus = isRefunded
        ? "Refunded"
        : orderReturns.some((r) => r.status === "Approved" || r.status === "Received")
          ? "Refund Processing"
          : orderReturns.length > 0
            ? "Return Requested"
            : null;

      const productTitles = (order.items || []).map((item) => {
        const qtySuffix = item.qty > 1 ? ` (×${item.qty})` : "";
        return `${item.title}${qtySuffix}`;
      });

      return {
        orderId: order.orderId,
        orderNumber: order.orderNumber,
        transactionId: order.paymentReference || order.orderNumber,
        date: order.paidAt || order.createdAt,
        paidAt: order.paidAt,
        amount: Number(order.total || 0),
        subtotal: Number(order.subtotal || 0),
        shipping: Number(order.shipping || 0),
        discount: Number(order.discount || 0),
        voucherCode: order.voucherCode,
        paymentMethod: getPaymentMethodLabel(order),
        paymentStatus: order.paymentStatus,
        paymentChannel: order.paymentChannel,
        sellerName: order.sellerName || "Student Artist",
        sellerAddress: order.sellerAddress,
        sellerEmail: order.sellerEmail,
        products: productTitles,
        itemsCount: (order.items || []).reduce((sum, i) => sum + Number(i.qty || 1), 0),
        refundAmount: refundTotal > 0 ? refundTotal : isRefunded ? Number(order.total || 0) : 0,
        refundStatus,
        rawOrder: order,
      };
    });
  }, [completedOrders]);

  // Tab B: Individual Purchased Items
  const purchasedItems = useMemo(() => {
    const list = [];
    completedOrders.forEach((order) => {
      const orderReturns = Array.isArray(order.returns) ? order.returns : [];
      (order.items || []).forEach((item) => {
        // Find if this specific item has an active return
        const matchingReturn = orderReturns.find((ret) =>
          (ret.items || []).some((ri) => Number(ri.order_item_id) === Number(item.id)),
        );

        let returnRefundStatus = null;
        if (matchingReturn) {
          returnRefundStatus =
            matchingReturn.refund_status === "Refunded"
              ? "Refunded"
              : `Return ${matchingReturn.status}`;
        } else if (order.paymentStatus === "Refunded") {
          returnRefundStatus = "Refunded";
        }

        list.push({
          itemId: item.id,
          artworkId: item.artworkId,
          title: item.title,
          image: item.image,
          artist: item.artist || order.sellerName || "Student Artist",
          orderId: order.orderId,
          orderNumber: order.orderNumber,
          date: order.paidAt || order.createdAt,
          quantity: Number(item.qty || 1),
          unitPrice: Number(item.price || 0),
          lineTotal: Number(item.lineTotal || (item.price * (item.qty || 1))),
          deliveryStatus: order.status,
          returnRefundStatus,
          hasCertificate: Boolean(item.hasCertificate),
          certificateId: item.certificateId,
          certificateRevoked: Boolean(item.certificateRevoked),
          isDelivered: order.status === "Delivered",
          isPaid: order.paymentStatus === "Paid" || Boolean(order.paidAt),
          rawOrder: order,
          rawItem: item,
        });
      });
    });
    return list;
  }, [completedOrders]);

  // Filtered views by search query
  const filteredTransactions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return transactions;
    return transactions.filter((t) => {
      const searchable = [
        t.orderNumber,
        t.transactionId,
        t.sellerName,
        t.paymentMethod,
        t.paymentStatus,
        ...t.products,
      ]
        .join(" ")
        .toLowerCase();
      return searchable.includes(q);
    });
  }, [transactions, search]);

  const filteredPurchasedItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return purchasedItems;
    return purchasedItems.filter((item) => {
      const searchable = [
        item.title,
        item.artist,
        item.orderNumber,
        item.deliveryStatus,
        item.returnRefundStatus,
      ]
        .join(" ")
        .toLowerCase();
      return searchable.includes(q);
    });
  }, [purchasedItems, search]);

  // Stats calculation
  const totalSpent = useMemo(() => {
    return transactions.reduce((sum, t) => sum + (t.paymentStatus !== "Refunded" ? t.amount : 0), 0);
  }, [transactions]);

  const totalRefunded = useMemo(() => {
    return transactions.reduce((sum, t) => sum + t.refundAmount, 0);
  }, [transactions]);

  return (
    <Box sx={{ width: "100%", pb: 6 }}>
      <Helmet titleTemplate="%s - ArtMatch">
        <title>My Purchases</title>
      </Helmet>

      {/* Header section */}
      <Box sx={{ mb: 3 }}>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 800,
            color: "text.primary",
            fontSize: { xs: 26, sm: 32 },
            letterSpacing: -0.5,
          }}
        >
          My Purchases
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontSize: 13.5 }}>
          View your confirmed financial transactions and your purchased artwork portfolio.
        </Typography>
      </Box>

      {/* Summary KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              borderRadius: 2.5,
              bgcolor: "background.paper",
              borderColor: "divider",
            }}
          >
            <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
              Completed Orders
            </Typography>
            <Typography variant="h5" fontWeight={800} color="text.primary" sx={{ mt: 0.5 }}>
              {transactions.length}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              borderRadius: 2.5,
              bgcolor: "background.paper",
              borderColor: "divider",
            }}
          >
            <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
              Artworks Purchased
            </Typography>
            <Typography variant="h5" fontWeight={800} color="text.primary" sx={{ mt: 0.5 }}>
              {purchasedItems.length}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              borderRadius: 2.5,
              bgcolor: "background.paper",
              borderColor: "divider",
            }}
          >
            <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
              Total Net Spend
            </Typography>
            <Typography variant="h5" fontWeight={800} color="primary.main" sx={{ mt: 0.5 }}>
              {formatCurrency(totalSpent)}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              borderRadius: 2.5,
              bgcolor: "background.paper",
              borderColor: "divider",
            }}
          >
            <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
              Total Refunded
            </Typography>
            <Typography variant="h5" fontWeight={800} color={totalRefunded > 0 ? "error.main" : "text.secondary"} sx={{ mt: 0.5 }}>
              {formatCurrency(totalRefunded)}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Tabs and Search Controls */}
      <Paper
        variant="outlined"
        sx={{
          borderRadius: 2.5,
          overflow: "hidden",
          mb: 3,
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            justifyContent: "space-between",
            alignItems: { xs: "stretch", md: "center" },
            px: { xs: 2, sm: 2.5 },
            py: 1.5,
            gap: 2,
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            sx={{
              "& .MuiTab-root": {
                fontWeight: 700,
                fontSize: 14,
                textTransform: "none",
                minHeight: 44,
                px: 2,
              },
            }}
          >
            <Tab
              icon={<ReceiptLongOutlinedIcon sx={{ fontSize: 18, mr: 0.75 }} />}
              iconPosition="start"
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                  <span>Transaction History</span>
                  <Chip
                    label={transactions.length}
                    size="small"
                    sx={{
                      height: 20,
                      fontWeight: 800,
                      fontSize: 11,
                      bgcolor: activeTab === 0 ? "primary.main" : "action.hover",
                      color: activeTab === 0 ? "#fff" : "text.secondary",
                    }}
                  />
                </Box>
              }
            />
            <Tab
              icon={<ShoppingBagOutlinedIcon sx={{ fontSize: 18, mr: 0.75 }} />}
              iconPosition="start"
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                  <span>Purchased Items</span>
                  <Chip
                    label={purchasedItems.length}
                    size="small"
                    sx={{
                      height: 20,
                      fontWeight: 800,
                      fontSize: 11,
                      bgcolor: activeTab === 1 ? "primary.main" : "action.hover",
                      color: activeTab === 1 ? "#fff" : "text.secondary",
                    }}
                  />
                </Box>
              }
            />
          </Tabs>

          <TextField
            size="small"
            placeholder={activeTab === 0 ? "Search transactions by order, artist..." : "Search items by title, artist, order..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ color: "text.secondary" }} />
                </InputAdornment>
              ),
              endAdornment: search ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearch("")}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : null,
            }}
            sx={{
              width: { xs: "100%", md: 320 },
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
                fontSize: 13,
                bgcolor: (t) => (t.palette.mode === "dark" ? "background.default" : "#fafafa"),
              },
            }}
          />
        </Box>

        {/* Content Panel */}
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 8 }}>
            <CircularProgress size={36} />
          </Box>
        ) : error ? (
          <Box sx={{ p: 3 }}>
            <Alert
              severity="error"
              action={
                <Button color="inherit" size="small" onClick={loadData} startIcon={<RefreshIcon />}>
                  Retry
                </Button>
              }
            >
              {error}
            </Alert>
          </Box>
        ) : activeTab === 0 ? (
          /* ============================================================== */
          /* TAB A: TRANSACTION HISTORY                                     */
          /* ============================================================== */
          filteredTransactions.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 8, px: 3 }}>
              <ReceiptLongOutlinedIcon sx={{ fontSize: 56, color: "text.disabled", mb: 1.5 }} />
              <Typography variant="h6" fontWeight={700} color="text.primary">
                {search ? "No matching transactions found" : "No completed transactions yet"}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 440, mx: "auto" }}>
                {search
                  ? "Try checking your spelling or clear your search query to see all financial transactions."
                  : "When you purchase artworks and your payment is confirmed, your transaction receipts and invoices will be recorded here."}
              </Typography>
              {!search && (
                <Button
                  component={RouterLink}
                  to="/buyer/shop"
                  variant="contained"
                  sx={{ mt: 2.5, textTransform: "none", fontWeight: 700, borderRadius: 2 }}
                >
                  Explore Artwork Gallery
                </Button>
              )}
            </Box>
          ) : (
            <TableContainer sx={{ overflowX: "auto" }}>
              <Table size="small" sx={{ minWidth: 840 }}>
                <TableHead sx={{ bgcolor: (t) => (t.palette.mode === "dark" ? "background.default" : "#f8fafc") }}>
                  <TableRow>
                    {["Order / Txn #", "Purchased Products", "Artist / Seller", "Date", "Amount", "Payment Method", "Status", "Refund", "Action"].map(
                      (heading) => (
                        <TableCell
                          key={heading}
                          sx={{
                            py: 1.5,
                            color: "text.secondary",
                            fontSize: 10.5,
                            fontWeight: 800,
                            textTransform: "uppercase",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {heading}
                        </TableCell>
                      ),
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredTransactions.map((tx) => (
                    <TableRow
                      key={tx.orderId}
                      sx={{
                        "&:hover": { bgcolor: "action.hover" },
                        "&:last-child td": { borderBottom: 0 },
                      }}
                    >
                      <TableCell sx={{ whiteSpace: "nowrap" }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          <Typography fontWeight={700} sx={{ fontSize: 13, color: "text.primary" }}>
                            {tx.orderNumber}
                          </Typography>
                          <Tooltip title={copiedId === tx.orderNumber ? "Copied!" : "Copy order number"}>
                            <IconButton size="small" onClick={() => copyText(tx.orderNumber, tx.orderNumber)}>
                              {copiedId === tx.orderNumber ? (
                                <CheckCircleOutlineIcon sx={{ fontSize: 15, color: "success.main" }} />
                              ) : (
                                <ContentCopyIcon sx={{ fontSize: 13, color: "text.disabled" }} />
                              )}
                            </IconButton>
                          </Tooltip>
                        </Box>
                        {tx.transactionId && tx.transactionId !== tx.orderNumber && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            Ref: {tx.transactionId.slice(0, 14)}…
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ minWidth: 200, maxWidth: 280 }}>
                        <Typography variant="body2" fontWeight={600} noWrap sx={{ fontSize: 13 }}>
                          {tx.products[0] || "Artwork"}
                        </Typography>
                        {tx.products.length > 1 && (
                          <Typography variant="caption" color="text.secondary">
                            +{tx.products.length - 1} other item{tx.products.length > 2 ? "s" : ""}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>
                        <Typography variant="body2" sx={{ fontSize: 13 }}>
                          {tx.sellerName}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>
                        <Typography variant="body2" sx={{ fontSize: 12.5, color: "text.secondary" }}>
                          {formatShortDate(tx.date)}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>
                        <Typography variant="body2" fontWeight={800} color="primary.main" sx={{ fontSize: 13.5 }}>
                          {formatCurrency(tx.amount)}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>
                        <Chip
                          label={tx.paymentMethod}
                          size="small"
                          sx={{
                            height: 22,
                            fontSize: 11,
                            fontWeight: 700,
                            borderRadius: 1,
                            bgcolor: (t) =>
                              t.palette.mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>
                        <Chip
                          label={getPaymentLabel(tx.rawOrder)}
                          size="small"
                          color={getPaymentColor(tx.rawOrder)}
                          sx={{ height: 22, fontSize: 11, fontWeight: 700, borderRadius: 1 }}
                        />
                      </TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>
                        {tx.refundStatus ? (
                          <Box>
                            <Chip
                              label={tx.refundStatus}
                              size="small"
                              color={tx.refundStatus === "Refunded" ? "error" : "warning"}
                              sx={{ height: 20, fontSize: 10, fontWeight: 700, borderRadius: 1 }}
                            />
                            {tx.refundAmount > 0 && (
                              <Typography variant="caption" color="error.main" display="block" fontWeight={700}>
                                -{formatCurrency(tx.refundAmount)}
                              </Typography>
                            )}
                          </Box>
                        ) : (
                          <Typography variant="caption" color="text.disabled">
                            —
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => setSelectedTransaction(tx)}
                          sx={{
                            fontSize: 11.5,
                            textTransform: "none",
                            fontWeight: 700,
                            borderRadius: 1.5,
                            py: 0.3,
                            px: 1.25,
                          }}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )
        ) : (
          /* ============================================================== */
          /* TAB B: PURCHASED ITEMS                                         */
          /* ============================================================== */
          filteredPurchasedItems.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 8, px: 3 }}>
              <ShoppingBagOutlinedIcon sx={{ fontSize: 56, color: "text.disabled", mb: 1.5 }} />
              <Typography variant="h6" fontWeight={700} color="text.primary">
                {search ? "No matching purchased items" : "No purchased artworks yet"}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 440, mx: "auto" }}>
                {search
                  ? "No artworks or products matched your search keyword."
                  : "Once you purchase original artworks or student products, they will appear here with delivery tracking and Certificates of Authenticity."}
              </Typography>
              {!search && (
                <Button
                  component={RouterLink}
                  to="/buyer/shop"
                  variant="contained"
                  sx={{ mt: 2.5, textTransform: "none", fontWeight: 700, borderRadius: 2 }}
                >
                  Browse Shop
                </Button>
              )}
            </Box>
          ) : (
            <TableContainer sx={{ overflowX: "auto" }}>
              <Table size="small" sx={{ minWidth: 920 }}>
                <TableHead sx={{ bgcolor: (t) => (t.palette.mode === "dark" ? "background.default" : "#f8fafc") }}>
                  <TableRow>
                    {["Product", "Artist / Seller", "Order #", "Purchase Date", "Qty", "Price", "Delivery Status", "Return / Refund", "Certificate", "Actions"].map(
                      (heading) => (
                        <TableCell
                          key={heading}
                          sx={{
                            py: 1.5,
                            color: "text.secondary",
                            fontSize: 10.5,
                            fontWeight: 800,
                            textTransform: "uppercase",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {heading}
                        </TableCell>
                      ),
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredPurchasedItems.map((item) => (
                    <TableRow
                      key={`${item.orderId}-${item.itemId}`}
                      sx={{
                        "&:hover": { bgcolor: "action.hover" },
                        "&:last-child td": { borderBottom: 0 },
                      }}
                    >
                      {/* Product Thumbnail & Title */}
                      <TableCell sx={{ minWidth: 220, maxWidth: 280 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                          <ArtworkImage
                            image={item.image}
                            alt={item.title}
                            sx={{
                              width: 52,
                              height: 52,
                              borderRadius: 1.5,
                              objectFit: "cover",
                              flexShrink: 0,
                              border: "1px solid",
                              borderColor: "divider",
                              bgcolor: "action.hover",
                            }}
                          />
                          <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Typography
                              fontWeight={700}
                              sx={{
                                fontSize: 13,
                                color: "text.primary",
                                overflowWrap: "anywhere",
                              }}
                            >
                              {item.title}
                            </Typography>
                            {item.rawItem.selectedProducts && item.rawItem.selectedProducts.length > 0 && (
                              <Typography variant="caption" color="text.secondary" display="block" noWrap>
                                Variant: {item.rawItem.selectedProducts.map((p) => p.name).join(", ")}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </TableCell>

                      {/* Artist */}
                      <TableCell sx={{ whiteSpace: "nowrap" }}>
                        <Typography variant="body2" sx={{ fontSize: 12.5 }}>
                          {item.artist}
                        </Typography>
                      </TableCell>

                      {/* Order # */}
                      <TableCell sx={{ whiteSpace: "nowrap" }}>
                        <Typography
                          fontWeight={700}
                          sx={{
                            fontSize: 12.5,
                            color: "primary.main",
                            cursor: "pointer",
                            "&:hover": { textDecoration: "underline" },
                          }}
                          onClick={() => setSelectedOrder(item.rawOrder)}
                        >
                          {item.orderNumber}
                        </Typography>
                      </TableCell>

                      {/* Date */}
                      <TableCell sx={{ whiteSpace: "nowrap" }}>
                        <Typography variant="body2" sx={{ fontSize: 12, color: "text.secondary" }}>
                          {formatShortDate(item.date)}
                        </Typography>
                      </TableCell>

                      {/* Qty */}
                      <TableCell sx={{ whiteSpace: "nowrap" }}>
                        <Typography variant="body2" fontWeight={600} sx={{ fontSize: 13 }}>
                          {item.quantity}
                        </Typography>
                      </TableCell>

                      {/* Price */}
                      <TableCell sx={{ whiteSpace: "nowrap" }}>
                        <Typography variant="body2" fontWeight={800} color="primary.main" sx={{ fontSize: 13 }}>
                          {formatCurrency(item.lineTotal)}
                        </Typography>
                        {item.quantity > 1 && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            {formatCurrency(item.unitPrice)} ea
                          </Typography>
                        )}
                      </TableCell>

                      {/* Delivery Status */}
                      <TableCell sx={{ whiteSpace: "nowrap" }}>
                        <Chip
                          label={item.deliveryStatus}
                          size="small"
                          color={
                            item.deliveryStatus === "Delivered"
                              ? "success"
                              : item.deliveryStatus === "Shipped"
                                ? "primary"
                                : item.deliveryStatus === "Confirmed"
                                  ? "info"
                                  : "warning"
                          }
                          sx={{ height: 22, fontSize: 10.5, fontWeight: 700, borderRadius: 1 }}
                        />
                      </TableCell>

                      {/* Return / Refund Status */}
                      <TableCell sx={{ whiteSpace: "nowrap" }}>
                        {item.returnRefundStatus ? (
                          <Chip
                            label={item.returnRefundStatus}
                            size="small"
                            color={item.returnRefundStatus.includes("Refunded") ? "error" : "warning"}
                            sx={{ height: 22, fontSize: 10.5, fontWeight: 700, borderRadius: 1 }}
                          />
                        ) : (
                          <Typography variant="caption" color="text.disabled">
                            —
                          </Typography>
                        )}
                      </TableCell>

                      {/* Certificate of Authenticity */}
                      <TableCell sx={{ whiteSpace: "nowrap" }}>
                        {item.hasCertificate ? (
                          item.certificateRevoked ? (
                            <Tooltip title="Access has been revoked because this product was returned.">
                              <Chip
                                label="Revoked"
                                size="small"
                                color="error"
                                variant="outlined"
                                sx={{ height: 22, fontSize: 10.5, fontWeight: 700, borderRadius: 1 }}
                              />
                            </Tooltip>
                          ) : item.isDelivered && item.isPaid ? (
                            <Button
                              component={RouterLink}
                              to={`/buyer/certificate/${item.itemId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              size="small"
                              variant="outlined"
                              color="success"
                              startIcon={<VerifiedOutlinedIcon sx={{ fontSize: 14 }} />}
                              sx={{
                                fontSize: 11,
                                fontWeight: 700,
                                textTransform: "none",
                                py: 0.2,
                                px: 1,
                                borderRadius: 1.5,
                              }}
                            >
                              Certificate
                            </Button>
                          ) : (
                            <Tooltip title="Certificate of Authenticity unlocks upon paid delivery.">
                              <Chip
                                label="Upon Delivery"
                                size="small"
                                sx={{
                                  height: 22,
                                  fontSize: 10,
                                  fontWeight: 600,
                                  borderRadius: 1,
                                  bgcolor: (t) =>
                                    t.palette.mode === "dark" ? "rgba(255,255,255,0.06)" : "#f1f5f9",
                                }}
                              />
                            </Tooltip>
                          )
                        ) : (
                          <Typography variant="caption" color="text.disabled">
                            —
                          </Typography>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell sx={{ whiteSpace: "nowrap" }}>
                        <Button
                          size="small"
                          variant="text"
                          onClick={() => setSelectedOrder(item.rawOrder)}
                          sx={{
                            fontSize: 11.5,
                            fontWeight: 700,
                            textTransform: "none",
                          }}
                        >
                          Order Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )
        )}
      </Paper>

      {/* ============================================================== */}
      {/* MODAL 1: TRANSACTION DETAILS                                   */}
      {/* ============================================================== */}
      <Dialog
        open={Boolean(selectedTransaction)}
        onClose={() => setSelectedTransaction(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            overflow: "hidden",
            bgcolor: "background.paper",
          },
        }}
      >
        {selectedTransaction && (
          <>
            <DialogTitle
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                px: 2.5,
                py: 2,
                borderBottom: 1,
                borderColor: "divider",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <ReceiptLongOutlinedIcon sx={{ color: "primary.main", fontSize: 22 }} />
                <Typography fontWeight={800} fontSize={17}>
                  Transaction Details
                </Typography>
              </Box>
              <IconButton size="small" onClick={() => setSelectedTransaction(null)}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </DialogTitle>

            <DialogContent dividers sx={{ p: { xs: 2, sm: 3 } }}>
              <Stack spacing={2.5}>
                {/* Header Summary */}
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: (t) =>
                      t.palette.mode === "dark" ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                    border: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={700}>
                      ORDER NUMBER
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(selectedTransaction.date)}
                    </Typography>
                  </Box>
                  <Typography variant="h5" fontWeight={900} sx={{ mt: 0.5, letterSpacing: -0.5 }}>
                    {selectedTransaction.orderNumber}
                  </Typography>
                  {selectedTransaction.transactionId && (
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.25 }}>
                      Payment Reference: {selectedTransaction.transactionId}
                    </Typography>
                  )}
                </Box>

                {/* Items Purchased in this Transaction */}
                <Box>
                  <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1.25 }}>
                    Items in this Transaction ({selectedTransaction.rawOrder.items?.length || 0})
                  </Typography>
                  <Stack spacing={1.25}>
                    {(selectedTransaction.rawOrder.items || []).map((item) => (
                      <Box
                        key={item.id}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 1.5,
                          p: 1.25,
                          borderRadius: 2,
                          border: "1px solid",
                          borderColor: "divider",
                        }}
                      >
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0, flex: 1 }}>
                          <ArtworkImage
                            image={item.image}
                            alt={item.title}
                            sx={{ width: 44, height: 44, borderRadius: 1.5, objectFit: "cover" }}
                          />
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="body2" fontWeight={700} noWrap>
                              {item.title}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Qty: {item.qty} · {formatCurrency(item.price)} each
                            </Typography>
                          </Box>
                        </Box>
                        <Typography variant="body2" fontWeight={800} color="primary.main">
                          {formatCurrency(item.lineTotal || (item.price * item.qty))}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </Box>

                {/* Financial Breakdown */}
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: (t) =>
                      t.palette.mode === "dark" ? "rgba(255,255,255,0.02)" : "#f8fafc",
                    border: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1.5 }}>
                    Payment Breakdown
                  </Typography>
                  <Stack spacing={0.75}>
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <Typography variant="body2" color="text.secondary">
                        Subtotal
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {formatCurrency(selectedTransaction.subtotal)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <Typography variant="body2" color="text.secondary">
                        Shipping Fee
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {formatCurrency(selectedTransaction.shipping)}
                      </Typography>
                    </Box>
                    {selectedTransaction.discount > 0 && (
                      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                        <Typography variant="body2" color="success.main">
                          Voucher Discount {selectedTransaction.voucherCode ? `(${selectedTransaction.voucherCode})` : ""}
                        </Typography>
                        <Typography variant="body2" fontWeight={700} color="success.main">
                          -{formatCurrency(selectedTransaction.discount)}
                        </Typography>
                      </Box>
                    )}
                    <Divider sx={{ my: 1 }} />
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <Typography variant="subtitle1" fontWeight={800}>
                        Total Amount Paid
                      </Typography>
                      <Typography variant="h6" fontWeight={900} color="primary.main">
                        {formatCurrency(selectedTransaction.amount)}
                      </Typography>
                    </Box>
                  </Stack>
                </Box>

                {/* Payment Method & Refund Notice */}
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="body2" color="text.secondary">
                      Payment Method
                    </Typography>
                    <Chip
                      label={selectedTransaction.paymentMethod}
                      size="small"
                      sx={{ fontWeight: 700 }}
                    />
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="body2" color="text.secondary">
                      Payment Status
                    </Typography>
                    <Chip
                      label={getPaymentLabel(selectedTransaction.rawOrder)}
                      size="small"
                      color={getPaymentColor(selectedTransaction.rawOrder)}
                      sx={{ fontWeight: 700 }}
                    />
                  </Box>
                  {selectedTransaction.refundAmount > 0 && (
                    <Alert severity="info" sx={{ mt: 1 }}>
                      <strong>Refund Recorded:</strong> {formatCurrency(selectedTransaction.refundAmount)} was processed for returned item(s).
                    </Alert>
                  )}
                </Box>
              </Stack>
            </DialogContent>

            <DialogActions sx={{ px: 2.5, py: 1.5 }}>
              <Button onClick={() => setSelectedTransaction(null)} sx={{ textTransform: "none", fontWeight: 700 }}>
                Close
              </Button>
              <Button
                variant="contained"
                onClick={() => {
                  const ord = selectedTransaction.rawOrder;
                  setSelectedTransaction(null);
                  setSelectedOrder(ord);
                }}
                sx={{ textTransform: "none", fontWeight: 700, borderRadius: 1.5 }}
              >
                View Full Order
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* ============================================================== */}
      {/* MODAL 2: ORDER DETAILS & SHIPMENT TRACKING                     */}
      {/* ============================================================== */}
      <Dialog
        open={Boolean(selectedOrder)}
        onClose={() => setSelectedOrder(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            overflow: "hidden",
            bgcolor: "background.paper",
          },
        }}
      >
        {selectedOrder && (
          <>
            <DialogTitle
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                px: 2.5,
                py: 2,
                borderBottom: 1,
                borderColor: "divider",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <ShoppingBagOutlinedIcon sx={{ color: "primary.main", fontSize: 22 }} />
                <Typography fontWeight={800} fontSize={17}>
                  Order #{selectedOrder.orderNumber}
                </Typography>
                <Chip
                  label={selectedOrder.status}
                  size="small"
                  color={
                    selectedOrder.status === "Delivered"
                      ? "success"
                      : selectedOrder.status === "Shipped"
                        ? "primary"
                        : "warning"
                  }
                  sx={{ ml: 1, fontWeight: 700, height: 22 }}
                />
              </Box>
              <IconButton size="small" onClick={() => setSelectedOrder(null)}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </DialogTitle>

            <DialogContent dividers sx={{ p: { xs: 2, sm: 3 } }}>
              <Stack spacing={3}>
                {/* Stepper Progress */}
                <Box sx={{ width: "100%", pt: 1, pb: 0.5 }}>
                  <Stepper
                    activeStep={getDeliveryProgressStepIndex(selectedOrder.status)}
                    alternativeLabel
                  >
                    {DELIVERY_LIFECYCLE_STEPS.map((label) => (
                      <Step key={label}>
                        <StepLabel>{label}</StepLabel>
                      </Step>
                    ))}
                  </Stepper>
                </Box>

                {/* Courier & Tracking URL */}
                {(selectedOrder.trackingNumber || selectedOrder.trackingUrl) && (
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      bgcolor: (t) =>
                        t.palette.mode === "dark" ? "rgba(255,255,255,0.03)" : "#f8fafc",
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                      <LocalShippingOutlinedIcon color="primary" fontSize="small" />
                      <Typography fontWeight={700} fontSize={14}>
                        Shipment & Tracking Information
                      </Typography>
                    </Box>
                    <Grid container spacing={1.5}>
                      <Grid item xs={12} sm={4}>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Courier
                        </Typography>
                        <Typography variant="body2" fontWeight={700}>
                          {getShipmentCourier(selectedOrder.courier)?.label || selectedOrder.courier || "Assigned Courier"}
                        </Typography>
                      </Grid>
                      {selectedOrder.trackingNumber && (
                        <Grid item xs={12} sm={4}>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Tracking Number
                          </Typography>
                          <Typography variant="body2" fontWeight={700}>
                            {selectedOrder.trackingNumber}
                          </Typography>
                        </Grid>
                      )}
                      {selectedOrder.trackingUrl && (
                        <Grid item xs={12} sm={4}>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Tracking Link
                          </Typography>
                          <Button
                            href={getSecureTrackingUrl(selectedOrder.trackingUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            size="small"
                            variant="outlined"
                            endIcon={<OpenInNewIcon sx={{ fontSize: 13 }} />}
                            sx={{
                              mt: 0.25,
                              fontSize: 11.5,
                              textTransform: "none",
                              fontWeight: 700,
                              py: 0.2,
                            }}
                          >
                            Live Tracking
                          </Button>
                        </Grid>
                      )}
                    </Grid>
                  </Paper>
                )}

                {/* Seller & Recipient Details */}
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ p: 2, border: 1, borderColor: "divider", borderRadius: 2, height: "100%" }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 0.5 }}>
                        <StorefrontOutlinedIcon fontSize="small" sx={{ color: "text.secondary" }} />
                        <Typography variant="subtitle2" fontWeight={800}>
                          Artist / Seller
                        </Typography>
                      </Box>
                      <Typography variant="body2" fontWeight={700}>
                        {selectedOrder.sellerName || "Student Artist"}
                      </Typography>
                      {selectedOrder.sellerAddress && (
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.25 }}>
                          {selectedOrder.sellerAddress}
                        </Typography>
                      )}
                      {selectedOrder.sellerEmail && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          {selectedOrder.sellerEmail}
                        </Typography>
                      )}
                    </Box>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Box sx={{ p: 2, border: 1, borderColor: "divider", borderRadius: 2, height: "100%" }}>
                      <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 0.5 }}>
                        Delivery Address
                      </Typography>
                      <Typography variant="body2" fontWeight={700}>
                        {selectedOrder.customer || "Buyer"}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.25 }}>
                        {selectedOrder.address || "No address provided"}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>

                {/* Items Purchased List */}
                <Box>
                  <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1.5 }}>
                    Purchased Artworks & Items
                  </Typography>
                  <Stack spacing={1.5}>
                    {(selectedOrder.items || []).map((item) => (
                      <Box
                        key={item.id}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          p: 1.5,
                          borderRadius: 2,
                          border: 1,
                          borderColor: "divider",
                        }}
                      >
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0, flex: 1 }}>
                          <ArtworkImage
                            image={item.image}
                            alt={item.title}
                            sx={{ width: 48, height: 48, borderRadius: 1.5, objectFit: "cover" }}
                          />
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="body2" fontWeight={700}>
                              {item.title}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Qty: {item.qty} · {formatCurrency(item.price)} each
                            </Typography>
                          </Box>
                        </Box>
                        <Box sx={{ textAlign: "right", ml: 2 }}>
                          <Typography variant="body2" fontWeight={800} color="primary.main">
                            {formatCurrency(item.lineTotal || (item.price * item.qty))}
                          </Typography>
                          {item.hasCertificate && !item.certificateRevoked && selectedOrder.status === "Delivered" && (
                            <Button
                              component={RouterLink}
                              to={`/buyer/certificate/${item.id}`}
                              target="_blank"
                              size="small"
                              variant="text"
                              sx={{ fontSize: 11, fontWeight: 700, p: 0, mt: 0.5 }}
                            >
                              View Certificate
                            </Button>
                          )}
                        </Box>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              </Stack>
            </DialogContent>

            <DialogActions sx={{ px: 2.5, py: 1.5 }}>
              <Button onClick={() => setSelectedOrder(null)} sx={{ textTransform: "none", fontWeight: 700 }}>
                Close
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}

