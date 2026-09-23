import { useState, useEffect, createElement } from "react";
import { Helmet } from "react-helmet-async";
import { Box, Card, CardContent, Paper, Typography } from "@mui/material";
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
import { fetchArtworks } from "../../api/seller/artworkAPI";
import ColorLensRoundedIcon from "@mui/icons-material/ColorLensRounded";
import CreditScoreIcon from "@mui/icons-material/CreditScore";
import SellRoundedIcon from "@mui/icons-material/SellRounded";

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

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(value);

export default function Dashboard() {
  const theme = useTheme();
  const [artworks, setArtworks] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadArtworks = async () => {
    try {
      setLoading(true);
      const response = await fetchArtworks();
      if (response && Array.isArray(response)) {
        setArtworks(response);
      } else if (response && response.data && Array.isArray(response.data)) {
        setArtworks(response.data);
      } else {
        setArtworks([]);
      }
    } catch {
      setArtworks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadArtworks();
  }, []);

  const artworkCount = artworks.length;
  const totalRevenue = salesData.reduce((sum, entry) => sum + entry.sales, 0);
  const soldCount = salesData.reduce(
    (sum, entry) => sum + Math.round(entry.sales / 200),
    0,
  );
  const salesCount = formatCurrency(totalRevenue);

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
        <Typography variant="h4" sx={{ fontWeight: 800 }}>
          Dashboard
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Overview of your seller performance and sales activity.
        </Typography>
      </Box>

      <Box
        sx={{
          mt: 3,
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            md: "repeat(3, 1fr)",
          },
          gap: 2,
        }}
      >
        {[
          {
            label: "TOTAL ARTWORKS",
            value: loading ? "..." : artworkCount,
            caption: "Your artwork catalog",
            icon: ColorLensRoundedIcon,
            tint: "rgba(244, 114, 182, 0.15)",
            accent: "primary.main",
          },
          {
            label: "ORDERS SOLD",
            value: soldCount,
            caption: "Completed purchases",
            icon: SellRoundedIcon,
            tint: "rgba(34, 197, 94, 0.18)",
            accent: "success.main",
          },
          {
            label: "TOTAL SALES",
            value: salesCount,
            caption: "Total revenue generated",
            icon: CreditScoreIcon,
            tint: "rgba(59, 130, 246, 0.18)",
            accent: "secondary.main",
          },
        ].map(({ label, value, caption, icon: MetricIcon, tint, accent }) => (
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
                      `1px solid ${theme.palette.mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)"}`,
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25)",
                  }}
                >
                  {createElement(MetricIcon)}
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
      </Paper>
    </Box>
  );
}
