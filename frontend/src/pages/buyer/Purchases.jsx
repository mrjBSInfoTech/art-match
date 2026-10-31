import { useEffect, useMemo, useState, createElement } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  IconButton,
  InputAdornment,
  Paper,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
// Icons
import SearchIcon from "@mui/icons-material/Search";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import CloseIcon from "@mui/icons-material/Close";
import RefreshIcon from "@mui/icons-material/Refresh";
import CreditScoreIcon from "@mui/icons-material/CreditScore";

import { fetchBuyerOrders } from "../../api/buyer/orderAPI";
import PurchaseTable from "../../components/buyer/Purhcase/PurchaseTable";
import PurchaseInfo from "../../components/buyer/Purhcase/PurchaseInfo";
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

  const summaryCards = [
    {
      label: "COMPLETED ORDERS",
      value: loading ? "..." : transactions.length,
      caption: "Confirmed purchase orders",
      icon: ReceiptLongOutlinedIcon,
      tint: "rgba(59, 130, 246, 0.18)",
      accent: "primary.main",
    },
    {
      label: "ARTWORKS PURCHASED",
      value: loading ? "..." : purchasedItems.length,
      caption: "Total acquired artworks",
      icon: ShoppingBagOutlinedIcon,
      tint: "rgba(244, 114, 182, 0.15)",
      accent: "secondary.main",
    },
    {
      label: "TOTAL NET SPEND",
      value: loading ? "..." : formatCurrency(totalSpent),
      caption: "Net spent on purchases",
      icon: CreditScoreIcon,
      tint: "rgba(34, 197, 94, 0.18)",
      accent: "success.main",
    },
    {
      label: "TOTAL REFUNDED",
      value: loading ? "..." : formatCurrency(totalRefunded),
      caption: "Returned and refunded",
      icon: RefreshIcon,
      tint: "rgba(246, 59, 84, 0.18)",
      accent: totalRefunded > 0 ? "error.main" : "text.secondary",
    },
  ];

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
      <Box
        sx={{
          mb: 3,
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            md: "repeat(4, 1fr)",
          },
          gap: 2,
        }}
      >
        {summaryCards.map(
          ({ label, value, caption, icon: MetricIcon, tint, accent }) => (
            <Card
              key={label}
              variant="outlined"
              sx={{
                borderRadius: 4,
                background: (theme) =>
                  theme.palette.mode === "dark"
                    ? "linear-gradient(180deg, rgba(15, 23, 42, 0.96), rgba(15, 23, 42, 0.84))"
                    : "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.94))",
                border: "1px solid",
                borderColor: "divider",
                boxShadow: (theme) =>
                  theme.palette.mode === "dark"
                    ? "0 20px 38px rgba(2, 6, 23, 0.28)"
                    : "0 18px 36px rgba(15, 23, 42, 0.08)",
                overflow: "hidden",
                transition: "transform 180ms ease, box-shadow 180ms ease",
                "&:hover": {
                  transform: "translateY(-2px)",
                },
              }}
            >
              <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
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
                        color: "text.secondary",
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: 1.2,
                      }}
                    >
                      {label}
                    </Typography>
                    <Typography
                      sx={{
                        mt: 1,
                        color: "text.primary",
                        fontSize: 30,
                        fontWeight: 800,
                        lineHeight: 1,
                      }}
                    >
                      {value}
                    </Typography>
                    <Typography
                      sx={{
                        mt: 1,
                        color: "text.secondary",
                        fontSize: 12,
                      }}
                    >
                      {caption}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      display: "grid",
                      placeItems: "center",
                      borderRadius: 3,
                      background: (theme) =>
                        theme.palette.mode === "dark"
                          ? `linear-gradient(135deg, ${tint}, rgba(15,23,42,0.3))`
                          : `linear-gradient(135deg, ${tint}, rgba(255,255,255,0.7))`,
                      color: accent,
                      border: (theme) =>
                        `1px solid ${
                          theme.palette.mode === "dark"
                            ? "rgba(255,255,255,0.08)"
                            : "rgba(15,23,42,0.06)"
                        }`,
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25)",
                    }}
                  >
                    {createElement(MetricIcon)}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ),
        )}
      </Box>

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

        {/* Content Panel / Tables */}
        <PurchaseTable
          activeTab={activeTab}
          loading={loading}
          error={error}
          onRetry={loadData}
          search={search}
          filteredTransactions={filteredTransactions}
          filteredPurchasedItems={filteredPurchasedItems}
          onSelectTransaction={(tx) => {
            setSelectedOrder(null);
            setSelectedTransaction(tx);
          }}
          onSelectOrder={(ord) => {
            setSelectedTransaction(null);
            setSelectedOrder(ord);
          }}
          copiedId={copiedId}
          onCopyText={copyText}
        />
      </Paper>

      {/* Purchase / Transaction / Order Details Dialog */}
      <PurchaseInfo
        open={Boolean(selectedTransaction || selectedOrder)}
        handleClose={() => {
          setSelectedTransaction(null);
          setSelectedOrder(null);
        }}
        transaction={selectedTransaction}
        order={selectedOrder}
        onViewOrder={(ord) => {
          setSelectedTransaction(null);
          setSelectedOrder(ord);
        }}
      />
    </Box>
  );
}

