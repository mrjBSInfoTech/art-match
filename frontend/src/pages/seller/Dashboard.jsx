import { useState, useEffect, createElement } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Paper,
  Skeleton,
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
import { alpha, useTheme } from "@mui/material/styles";
import { fetchArtworks } from "../../api/seller/artworkAPI";
import { fetchSellerOrders } from "../../api/seller/orderAPI";
import { getSellerSalesData } from "../../utils/sellerSales";
import ConnectionErrorPanel from "../../components/seller/ConnectionErrorPanel";
import SellerLoadingPanel from "../../components/seller/SellerLoadingPanel";
import ColorLensRoundedIcon from "@mui/icons-material/ColorLensRounded";
import CreditScoreIcon from "@mui/icons-material/CreditScore";
import SellRoundedIcon from "@mui/icons-material/SellRounded";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(value);

export default function Dashboard() {
  const theme = useTheme();
  const navigate = useNavigate();
  const [artworks, setArtworks] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [artworkError, setArtworkError] = useState("");
  const [salesLoading, setSalesLoading] = useState(true);
  const [salesError, setSalesError] = useState("");

  const loadArtworks = async () => {
    try {
      setLoading(true);
      setArtworkError("");
      const response = await fetchArtworks();
      if (response && Array.isArray(response)) {
        setArtworks(response);
      } else if (response && response.data && Array.isArray(response.data)) {
        setArtworks(response.data);
      } else {
        throw new Error("No artwork data was returned.");
      }
    } catch (error) {
      setArtworkError(error.message || "Unable to load your artworks.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadArtworks();
  }, []);

  useEffect(() => {
    fetchSellerOrders()
      .then((response) => setOrders(Array.isArray(response) ? response : []))
      .catch((error) => setSalesError(error.message || "Unable to load sales"))
      .finally(() => setSalesLoading(false));
  }, []);

  const artworkCount = artworks.length;
  const sales = getSellerSalesData(orders);
  const salesData = sales.monthlySales;

  if (
    (loading || salesLoading) &&
    artworks.length === 0 &&
    orders.length === 0 &&
    !artworkError &&
    !salesError
  ) {
    return (
      <SellerLoadingPanel
        title="Dashboard"
        subtitle="Overview of your seller performance and sales activity."
        showFilters={false}
      />
    );
  }

  if (artworkError || salesError) {
    return (
      <Box sx={{ minWidth: 0 }}>
              <Helmet titleTemplate="%s - ArtMatch">
                <title>Dashboard</title>
              </Helmet>
              <ConnectionErrorPanel
                title="Dashboard Unavailable"
                onRetry={artworkError ? loadArtworks : () => window.location.reload()}
              />
            </Box>
    );
  }

  return (
    <Box
      sx={{
        p: { xs: 1.5, sm: 2.5 },
        minHeight: "100vh",
        backgroundColor: theme.palette.background.default,
        color: theme.palette.text.primary,
      }}
    >
      <Helmet titleTemplate="%s - ArtMatch">
        <title>Dashboard</title>
      </Helmet>

      <Box>
        <Typography
          sx={{
            fontSize: { xs: 28, sm: 38 },
            fontWeight: 800,
            lineHeight: 1.1,
            color: theme.palette.text.primary,
          }}
        >
          Dashboard
        </Typography>
        <Typography
          sx={{
            mt: 0.75,
            color: theme.palette.text.secondary,
            fontSize: 13,
          }}
        >
          Overview of your seller performance and sales activity.
        </Typography>
      </Box>

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        sx={{ mt: 2, alignItems: { sm: "center" } }}
      >
        <Button
          variant="contained"
          color="error"
          onClick={() => navigate("/seller/artwork")}
          sx={{ minHeight: 44, color: "#fff" }}
        >
          Manage artwork
        </Button>
        <Button
          variant="outlined"
          color="error"
          onClick={() => navigate("/seller/orders/manage")}
          sx={{ minHeight: 44 }}
        >
          View orders
        </Button>
        <Button
          variant="outlined"
          color="error"
          onClick={() => navigate("/seller/orders/inventory")}
          sx={{ minHeight: 44 }}
        >
          Manage inventory
        </Button>
      </Stack>

      <Box
        sx={{
          mt: 3,
          display: "grid",
          gridTemplateColumns: {
            xs: "minmax(0, 1fr)",
            sm: "repeat(2, minmax(0, 1fr))",
            lg: "repeat(3, minmax(0, 1fr))",
          },
          gap: 2,
          minWidth: 0,
        }}
      >
        {[
          {
            label: "TOTAL ARTWORKS",
            value: loading ? "..." : artworkCount,
            caption: "Your artwork catalog",
            icon: ColorLensRoundedIcon,
            tint: alpha(
              theme.palette.primary.main,
              theme.palette.mode === "dark" ? 0.18 : 0.1,
            ),
            accent: theme.palette.primary.main,
          },
          {
            label: "ACTIVE ORDERS",
            value: salesLoading ? "..." : salesError ? "—" : sales.orderCount,
            caption: "Excludes cancelled orders",
            icon: SellRoundedIcon,
            tint: alpha(
              theme.palette.success.main,
              theme.palette.mode === "dark" ? 0.19 : 0.12,
            ),
            accent: theme.palette.success.main,
          },
          {
            label: "TOTAL SALES",
            value: salesLoading
              ? "..."
              : salesError
                ? "—"
                : formatCurrency(sales.revenue),
            caption: "Total revenue generated",
            icon: CreditScoreIcon,
            tint: alpha(
              theme.palette.secondary.main,
              theme.palette.mode === "dark" ? 0.18 : 0.1,
            ),
            accent: theme.palette.secondary.main,
          },
        ].map(({ label, value, caption, icon: MetricIcon, tint, accent }) => (
          <Card
            key={label}
            sx={{
              borderRadius: 3,
              backgroundColor: theme.palette.background.paper,
              border: `1px solid ${theme.palette.divider}`,
              boxShadow: "none",
              overflow: "hidden",
              minWidth: 0,
              height: "100%",
            }}
          >
            <CardContent sx={{ p: { xs: 2, sm: 2.25 }, "&:last-child": { pb: { xs: 2, sm: 2.25 } }, height: "100%" }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: { xs: 1.5, sm: 2 },
                  minWidth: 0,
                  height: "100%",
                }}
              >
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography
                    sx={{
                      color: theme.palette.text.secondary,
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: 1.2,
                      overflowWrap: "break-word",
                    }}
                  >
                    {label}
                  </Typography>
                  <Typography
                    sx={{
                      mt: 1,
                      color: theme.palette.text.primary,
                      fontSize: { xs: 24, sm: 26, xl: 30 },
                      fontWeight: 800,
                      lineHeight: 1.1,
                      fontVariantNumeric: "tabular-nums",
                      overflowWrap: "anywhere",
                    }}
                  >
                    {loading && label === "TOTAL ARTWORKS" ? (
                      <Skeleton width={72} />
                    ) : salesLoading && label !== "TOTAL ARTWORKS" ? (
                      <Skeleton width={96} />
                    ) : (
                      value
                    )}
                  </Typography>
                  <Typography
                    sx={{
                      mt: 1,
                      color: theme.palette.text.secondary,
                      fontSize: 12,
                      overflowWrap: "break-word",
                    }}
                  >
                    {caption}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: { xs: 46, sm: 52 },
                    height: { xs: 46, sm: 52 },
                    flexShrink: 0,
                    display: "grid",
                    placeItems: "center",
                    borderRadius: 3,
                    backgroundColor: tint,
                    color: accent,
                  }}
                >
                  {createElement(MetricIcon, { sx: { fontSize: { xs: 22, sm: 26 } } })}
                </Box>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Paper
        elevation={0}
        sx={{
          mt: 3,
          p: { xs: 2, md: 3 },
          borderRadius: 4,
          border: "1px solid",
          borderColor: "divider",
          background: (theme) =>
            theme.palette.mode === "dark"
              ? "linear-gradient(180deg, rgba(15, 23, 42, 0.96), rgba(15, 23, 42, 0.86))"
              : "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.94))",
          boxShadow: (theme) =>
            theme.palette.mode === "dark"
              ? "0 22px 48px rgba(2, 6, 23, 0.28)"
              : "0 18px 36px rgba(15, 23, 42, 0.08)",
          width: "100%",
        }}
      >
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
          Monthly sales performance
        </Typography>

        {salesLoading ? (
          <Skeleton variant="rounded" height={320} />
        ) : salesError ? (
          <Typography
            color="text.secondary"
            sx={{ py: 6, textAlign: "center" }}
          >
            Sales data is unavailable. Try refreshing the page.
          </Typography>
        ) : !salesData.some(
          ({ sales: monthSales }) => Number(monthSales) > 0,
        ) ? (
          <Typography
            color="text.secondary"
            sx={{ py: 6, textAlign: "center" }}
          >
            No sales recorded in the last 12 months yet.
          </Typography>
        ) : (
          <Box sx={{ width: "100%", height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesData}>
                <defs>
                  <linearGradient
                    id="dashboardSalesFill"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#b73636" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#b73636" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip
                  formatter={(value) => [formatCurrency(value), "Sales"]}
                />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke="#b73636"
                  strokeWidth={3}
                  fill="url(#dashboardSalesFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
