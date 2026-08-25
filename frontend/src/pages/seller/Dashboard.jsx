import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import {
  Box,
  Card,
  CardContent,
  Paper,
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
  const soldCount = salesData.reduce((sum, entry) => sum + Math.round(entry.sales / 200), 0);
  const salesCount = formatCurrency(totalRevenue);

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
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
          display: "flex",
          gap: 3,
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        <Card
          variant="outlined"
          sx={{
            flex: "1 1 240px",
            maxWidth: 320,
            minHeight: 150,
            borderRadius: 3,
          }}
        >
          <CardContent>
            <Typography gutterBottom variant="h6" sx={{ fontWeight: 700, color: "#b73636" }}>
              Total Artworks
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mt: 2 }}>
              <ColorLensRoundedIcon color="error" sx={{ fontSize: 28 }} />
              <Typography sx={{ fontWeight: 800, fontSize: 30, color: "#b73636" }}>
                {loading ? "..." : artworkCount}
              </Typography>
            </Box>
          </CardContent>
        </Card>

        <Card
          variant="outlined"
          sx={{
            flex: "1 1 240px",
            maxWidth: 320,
            minHeight: 150,
            borderRadius: 3,
          }}
        >
          <CardContent>
            <Typography gutterBottom variant="h6" sx={{ fontWeight: 700, color: "#b73636" }}>
              Orders Sold
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mt: 2 }}>
              <SellRoundedIcon color="error" sx={{ fontSize: 28 }} />
              <Typography variant="h4" sx={{ fontWeight: 800, color: "#b73636" }}>
                {soldCount}
              </Typography>
            </Box>
          </CardContent>
        </Card>

        <Card
          variant="outlined"
          sx={{
            flex: "1 1 240px",
            maxWidth: 320,
            minHeight: 150,
            borderRadius: 3,
          }}
        >
          <CardContent>
            <Typography gutterBottom variant="h6" sx={{ fontWeight: 700, color: "#b73636" }}>
              Total Sales
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mt: 2 }}>
              <CreditScoreIcon color="error" sx={{ fontSize: 28 }} />
              <Typography variant="h4" sx={{ fontWeight: 800, color: "#b73636" }}>
                {salesCount}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>

      <Paper
        elevation={0}
        sx={{
          mt: 3,
          p: { xs: 2, md: 3 },
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
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
                <linearGradient id="dashboardSalesFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#b73636" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#b73636" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => [formatCurrency(value), "Sales"]} />
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
