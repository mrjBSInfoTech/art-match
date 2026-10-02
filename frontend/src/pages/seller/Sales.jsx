import { Helmet } from "react-helmet-async";
import {
  Alert,
  Avatar,
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  Paper,
  Stack,
  Typography,
  CircularProgress,
} from "@mui/material";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
// Icons
import TrendingUpOutlinedIcon from "@mui/icons-material/TrendingUpOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import { createElement, useEffect, useState } from "react";
import { fetchSellerOrders } from "../../api/seller/orderAPI";
import { getSellerSalesData } from "../../utils/sellerSales";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(value);

export default function Sales() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchSellerOrders()
      .then((response) => setOrders(Array.isArray(response) ? response : []))
      .catch((loadError) => setError(loadError.message || "Unable to load sales"))
      .finally(() => setLoading(false));
  }, []);

  const sales = getSellerSalesData(orders);
  const { monthlySales, bestSellers, recentSales } = sales;

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1200, mx: "auto" }}>
      <Helmet titleTemplate="%s - ArtMatch">
        <title>Sales</title>
      </Helmet>

      <Stack spacing={3}>
        {error && <Alert severity="error">{error}</Alert>}
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            Sales Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Your shop performance and recent transactions.
          </Typography>
        </Box>

        <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(4, 1fr)" },
          gap: 2,
          mb: 2.5,
        }}
      >
        {[
          {
            label: "TOTAL REVENUE",
            value: loading ? "..." : error ? "—" : formatCurrency(sales.revenue),
            caption: "Overall sales earnings",
            icon: TrendingUpOutlinedIcon,
          },
          {
            label: "THIS MONTH",
            value: loading ? "..." : error ? "—" : formatCurrency(sales.currentMonthSales),
            caption: "Sales this calendar month",
            icon: CalendarMonthOutlinedIcon,
          },
          {
            label: "ORDERS",
            value: loading ? "..." : error ? "—" : sales.orderCount,
            caption: "Excludes cancelled orders",
            icon: ShoppingBagOutlinedIcon,
          },
          {
            label: "AVG. ORDER",
            value: loading ? "..." : error ? "—" : formatCurrency(sales.averageOrder),
            caption: "Average order value",
            icon: ReceiptLongOutlinedIcon,
          },
        ].map(({ label, value, caption, icon: MetricIcon }) => (
          <Card
            key={label}
            sx={{
              backgroundColor: (theme) => theme.palette.background.paper,
              border: (theme) => `1px solid ${theme.palette.divider}`,
              borderRadius: 2.5,
              boxShadow: "none",
            }}
          >
            <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
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
            </CardContent>
          </Card>
        ))}
      </Box>

        <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Revenue trend</Typography>
          <Box sx={{ width: "100%", height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlySales}>
                <defs>
                  <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#b73636" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#b73636" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => [formatCurrency(value), "Sales"]} />
                <Area type="monotone" dataKey="sales" stroke="#b73636" strokeWidth={3} fill="url(#salesFill)" />
              </AreaChart>
            </ResponsiveContainer>
            {!loading && !error && sales.orderCount === 0 && (
              <Typography color="text.secondary" align="center" sx={{ mt: 1 }}>
                No sales recorded in the past 12 months.
              </Typography>
            )}
          </Box>
        </Paper>

        <Grid container spacing={2}>
          <Grid item xs={12} md={6} sx={{ width: { md: "calc(50% - 8px)" } }}>
            <Paper elevation={0} sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Best sellers</Typography>
              <Stack spacing={2}>
                {bestSellers.map((item, index) => (
                  <Box key={item.title}>
                    <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar sx={{ bgcolor: "primary.main", width: 32, height: 32, fontSize: 12 }}>{index + 1}</Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>{item.title}</Typography>
                          <Typography variant="caption" color="text.secondary">{item.sold} sold</Typography>
                        </Box>
                      </Stack>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{formatCurrency(item.revenue)}</Typography>
                    </Stack>
                    {index < bestSellers.length - 1 && <Divider sx={{ my: 1.5 }} />}
                  </Box>
                ))}
                {!loading && bestSellers.length === 0 && (
                  <Typography color="text.secondary">No sold artworks yet.</Typography>
                )}
              </Stack>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6} sx={{ width: { md: "calc(50% - 8px)" } }}>
            <Paper elevation={0} sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Recent sales</Typography>
              <Stack spacing={2}>
                {recentSales.map((sale) => (
                  <Box key={sale.id} sx={{ p: 1.5, borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{sale.items.map((item) => item.title).join(", ")}</Typography>
                        <Typography variant="caption" color="text.secondary">{sale.customer} • {new Date(sale.date).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}</Typography>
                      </Box>
                      <Chip label={sale.status} color={sale.status === "Delivered" ? "success" : sale.status === "Pending" ? "warning" : sale.status === "Cancelled" ? "error" : "primary"} size="small" />
                    </Stack>
                    <Box sx={{ mt: 1, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Typography variant="caption" color="text.secondary">{sale.id}</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{formatCurrency(sale.subtotal)}</Typography>
                    </Box>
                  </Box>
                ))}
                {loading && <CircularProgress size={24} sx={{ alignSelf: "center" }} />}
                {!loading && !error && recentSales.length === 0 && (
                  <Typography color="text.secondary">No recent sales.</Typography>
                )}
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      </Stack>
    </Box>
  );
}
