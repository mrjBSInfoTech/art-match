import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import ReplayOutlinedIcon from "@mui/icons-material/ReplayOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import FavoriteBorderOutlinedIcon from "@mui/icons-material/FavoriteBorderOutlined";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { useNavigate } from "react-router-dom";
import { fetchBuyerOrders } from "../../api/buyer/orderAPI";

const currency = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
});

const getArtworkImage = (image) =>
  image?.startsWith("http")
    ? image
    : `http://localhost:5000/uploads/seller/uploadArtwork/${encodeURIComponent(image || "")}`;

const getStatusLabel = (status) => {
  if (status === "Packed" || status === "Shipped") return "In transit";
  if (status === "Delivered") return "Completed";
  return status;
};

export default function AccountOverview() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("All orders");

  const loadOrders = async () => {
    try {
      setError("");
      setLoading(true);
      const response = await fetchBuyerOrders();
      setOrders(Array.isArray(response) ? response : []);
    } catch (loadError) {
      setError(loadError.message || "Unable to load your recent orders.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const inTransitCount = orders.filter((order) =>
    ["Packed", "Shipped"].includes(order.status),
  ).length;
  const completedCount = orders.filter(
    (order) => order.status === "Delivered",
  ).length;

  const recentItems = useMemo(
    () =>
      orders
        .flatMap((order) =>
          (order.items || []).map((item) => ({
            ...item,
            orderNumber: order.id || order.orderId,
            orderDate: order.date,
            orderStatus: order.status,
          })),
        )
        .sort(
          (first, second) =>
            new Date(second.orderDate) - new Date(first.orderDate),
        ),
    [orders],
  );

  const visibleItems = recentItems
    .filter((item) => {
      if (filter === "In progress") {
        return ["Pending", "Confirmed", "Packed", "Shipped"].includes(
          item.orderStatus,
        );
      }
      if (filter === "Returns") return false;
      if (filter === "Completed") return item.orderStatus === "Delivered";
      return true;
    })
    .slice(0, 4);

  const stats = [
    {
      label: "In transit",
      value: inTransitCount,
      action: "Track order",
      icon: <Inventory2OutlinedIcon />,
      onClick: () => navigate("/buyer/profile/orders"),
    },
    {
      label: "Return window",
      value: "—",
      action: "View orders",
      icon: <ReplayOutlinedIcon />,
      onClick: () => navigate("/buyer/profile/orders"),
    },
    {
      label: "Completed",
      value: completedCount,
      action: "View history",
      icon: <CheckCircleOutlineIcon />,
      onClick: () => navigate("/buyer/profile/orders"),
    },
    {
      label: "Saved artworks",
      value: 0,
      action: "Browse artworks",
      icon: <FavoriteBorderOutlinedIcon />,
      onClick: () => navigate("/buyer/shop"),
    },
  ];

  return (
    <Box sx={{ width: "100%" }}>
      <Helmet titleTemplate="%s - ArtMatch">
        <title>Account Center</title>
      </Helmet>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "repeat(2, minmax(0, 1fr))",
            md: "repeat(4, minmax(0, 1fr))",
          },
          gap: 1.5,
          mb: 2,
        }}
      >
        {stats.map((stat) => (
          <Paper
            key={stat.label}
            variant="outlined"
            sx={{
              p: 2,
              minWidth: 0,
              borderColor: "#ead4b3",
              borderRadius: 2,
              boxShadow: "none",
            }}
          >
            <Box sx={{ color: "error.main", display: "flex", mb: 0.5 }}>
              {stat.icon}
            </Box>
            <Typography sx={{ fontSize: 22, lineHeight: 1.1, fontWeight: 800 }}>
              {stat.value}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {stat.label}
            </Typography>
            <Button
              size="small"
              onClick={stat.onClick}
              endIcon={
                <ArrowForwardIcon sx={{ fontSize: "14px !important" }} />
              }
              sx={{
                display: "flex",
                mt: 0.25,
                px: 0,
                minWidth: 0,
                justifyContent: "flex-start",
                color: "error.main",
                fontSize: 11,
                textTransform: "none",
              }}
            >
              {stat.action}
            </Button>
          </Paper>
        ))}
      </Box>

      <Paper
        variant="outlined"
        sx={{
          p: { xs: 2, sm: 2.5 },
          borderColor: "#ead4b3",
          borderRadius: 2,
          boxShadow: "none",
        }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          alignItems={{ sm: "center" }}
          justifyContent="space-between"
          gap={1}
          sx={{ borderBottom: "1px solid", borderColor: "#f0e4d5", mb: 1.5 }}
        >
          <Typography variant="h6" sx={{ fontSize: 18, fontWeight: 800 }}>
            Recent orders
          </Typography>
          <Button
            size="small"
            onClick={() => navigate("/buyer/profile/orders")}
            sx={{ textTransform: "none", fontWeight: 700 }}
          >
            View all
          </Button>
        </Stack>

        <Stack direction="row" spacing={2} sx={{ mb: 1.5, overflowX: "auto" }}>
          {["All orders", "In progress", "Returns", "Completed"].map((tab) => (
            <Button
              key={tab}
              onClick={() => setFilter(tab)}
              sx={{
                flexShrink: 0,
                minWidth: 0,
                px: 0,
                py: 0.5,
                color: filter === tab ? "error.main" : "text.secondary",
                borderRadius: 0,
                borderBottom: "2px solid",
                borderColor: filter === tab ? "error.main" : "transparent",
                fontSize: 12,
                fontWeight: filter === tab ? 700 : 500,
                textTransform: "none",
              }}
            >
              {tab}
            </Button>
          ))}
        </Stack>

        {error && (
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={loadOrders}>
                Retry
              </Button>
            }
            sx={{ mb: 1.5 }}
          >
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: "grid", placeItems: "center", py: 8 }}>
            <CircularProgress size={28} />
          </Box>
        ) : visibleItems.length ? (
          <Stack divider={<Box sx={{ borderBottom: "1px solid #ead4b3" }} />}>
            {visibleItems.map((item, index) => (
              <Stack
                key={`${item.orderNumber}-${item.id || item.title}-${index}`}
                direction={{ xs: "column", sm: "row" }}
                alignItems={{ sm: "center" }}
                justifyContent="space-between"
                gap={1.5}
                sx={{ py: 1.5 }}
              >
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={1.5}
                  minWidth={0}
                >
                  <Box
                    component="img"
                    src={getArtworkImage(item.image)}
                    alt={item.title}
                    sx={{
                      width: 56,
                      height: 56,
                      flexShrink: 0,
                      objectFit: "cover",
                      borderRadius: 1,
                      bgcolor: "action.hover",
                    }}
                  />
                  <Box minWidth={0}>
                    <Stack
                      direction="row"
                      alignItems="center"
                      gap={1}
                      flexWrap="wrap"
                    >
                      <Typography variant="body2" fontWeight={700} noWrap>
                        {item.title}
                      </Typography>
                      <Chip
                        size="small"
                        label={getStatusLabel(item.orderStatus)}
                        color={
                          item.orderStatus === "Delivered" ? "success" : "info"
                        }
                        sx={{ height: 22, fontSize: 10, fontWeight: 700 }}
                      />
                    </Stack>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      display="block"
                    >
                      {item.artist || "ArtMatch artist"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Order {item.orderNumber} ·{" "}
                      {new Date(item.orderDate).toLocaleDateString()}
                    </Typography>
                  </Box>
                </Stack>
                <Typography
                  variant="body2"
                  fontWeight={800}
                  color="error.main"
                  sx={{ pl: { xs: 8.5, sm: 0 }, whiteSpace: "nowrap" }}
                >
                  {currency.format(
                    (Number(item.price) || 0) * (Number(item.qty) || 1),
                  )}
                </Typography>
              </Stack>
            ))}
          </Stack>
        ) : (
          <Box sx={{ py: 5, textAlign: "center" }}>
            <Typography fontWeight={700}>
              {filter === "Returns"
                ? "Return requests are not available here yet."
                : filter === "All orders"
                  ? "No orders yet"
                  : "No orders in this section"}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {filter === "Returns"
                ? "Contact support if you need help with a recent delivery."
                : "Your recent purchases will appear here."}
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
