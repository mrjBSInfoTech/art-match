import { Helmet } from "react-helmet-async";
import {
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
import { useTheme } from "@mui/material/styles";
// Icons
import TrendingUpOutlinedIcon from "@mui/icons-material/TrendingUpOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import { createElement } from "react";

const salesData = [
  { month: "Jan", sales: 1600 },
  { month: "Feb", sales: 2100 },
  { month: "Mar", sales: 1850 },
  { month: "Apr", sales: 2800 },
  { month: "May", sales: 3350 },
  { month: "Jun", sales: 4100 },
  { month: "Jul", sales: 4900 },
  { month: "Aug", sales: 5600 },
];

const bestSellers = [
  { title: "Sunset Over Davao", sold: 18, revenue: 33000 },
  { title: "Waves of Mindanao", sold: 14, revenue: 26400 },
  { title: "Night Bloom", sold: 11, revenue: 20800 },
  { title: "Golden Horizon", sold: 9, revenue: 17300 },
];

const recentSales = [
  { id: "ORD-1045", customer: "Maria Dela Cruz", artwork: "Sunset Over Davao", amount: 2450, date: "Aug 22", status: "Paid" },
  { id: "ORD-1048", customer: "Janelle Santos", artwork: "Waves of Mindanao", amount: 3680, date: "Aug 23", status: "Packed" },
  { id: "ORD-1052", customer: "Rafael Tan", artwork: "The Makers' Table", amount: 4200, date: "Aug 24", status: "Shipped" },
  { id: "ORD-1059", customer: "Alice Lim", artwork: "Night Bloom", amount: 2960, date: "Aug 25", status: "Paid" },
];

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(value);

export default function Sales() {
  const totalRevenue = salesData.reduce((sum, entry) => sum + entry.sales, 0);
  const averageOrder = Math.round(totalRevenue / salesData.length / 1.5);

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1200, mx: "auto" }}>
      <Helmet titleTemplate="%s - ArtMatch">
        <title>Sales</title>
      </Helmet>

      <Stack spacing={3}>
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
            value: formatCurrency(totalRevenue),
            caption: "Overall sales earnings",
            icon: TrendingUpOutlinedIcon,
          },
          {
            label: "THIS MONTH",
            value: formatCurrency(salesData[salesData.length - 1].sales),
            caption: "Latest recorded month",
            icon: CalendarMonthOutlinedIcon,
          },
          {
            label: "ORDERS SOLD",
            value: "42",
            caption: "Completed purchases",
            icon: ShoppingBagOutlinedIcon,
          },
          {
            label: "AVG. ORDER",
            value: formatCurrency(averageOrder),
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
              <AreaChart data={salesData}>
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
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{sale.artwork}</Typography>
                        <Typography variant="caption" color="text.secondary">{sale.customer} • {sale.date}</Typography>
                      </Box>
                      <Chip label={sale.status} color={sale.status === "Paid" ? "success" : sale.status === "Packed" ? "info" : "primary"} size="small" />
                    </Stack>
                    <Box sx={{ mt: 1, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Typography variant="caption" color="text.secondary">{sale.id}</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{formatCurrency(sale.amount)}</Typography>
                    </Box>
                  </Box>
                ))}
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      </Stack>
    </Box>
  );
}
