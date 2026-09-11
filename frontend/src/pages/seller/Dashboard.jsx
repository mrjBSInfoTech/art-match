import { useState, useEffect } from "react";
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
  const soldCount = salesData.reduce(
    (sum, entry) => sum + Math.round(entry.sales / 200),
    0,
  );
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
              flex: "1 1 350px",
              maxWidth: 600,
              minHeight: 142,
              borderRadius: 2.5,
              bgcolor: "background.paper",
              borderColor: "#e5eaf0",
              boxShadow: "0 2px 8px rgba(15, 23, 42, 0.05)",
            }}
          >
            <CardContent sx={{ p: 2.25, "&:last-child": { pb: 2.25 } }}>
              <Box
                sx={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: 94,
                  gap: 2,
                }}
              >
                <Box sx={{ position: "absolute", left: 0, textAlign: "left" }}>
                <Typography
                  sx={{
                    color: "#64748b",
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: 0.7,
                    textTransform: "uppercase",
                  }}
                >
                  Total Artworks
                </Typography>
                <Typography
                  sx={{
                    mt: 0.5,
                    color: "#172033",
                    fontSize: 30,
                    fontWeight: 800,
                    lineHeight: 1.1,
                  }}
                >
                  {loading ? "..." : artworkCount}
                </Typography>
                <Typography variant="caption" sx={{ color: "#94a3b8" }}>
                  Your artwork catalog
                </Typography>
              </Box>
                <Box
                  sx={{
                    position: "absolute",
                    right: 0,
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: 44,
                    height: 44,
                    display: "grid",
                    placeItems: "center",
                    borderRadius: 2,
                    bgcolor: "#fff1f2",
                    color: "#b73636",
                  }}
                >
                  <ColorLensRoundedIcon />
                </Box>
            </Box>
          </CardContent>
        </Card>

        <Card
          variant="outlined"
          sx={{
            flex: "1 1 350px",
            maxWidth: 600,
            minHeight: 142,
            borderRadius: 2.5,
            bgcolor: "background.paper",
            borderColor: "#e5eaf0",
            boxShadow: "0 2px 8px rgba(15, 23, 42, 0.05)",
          }}
        >
          <CardContent sx={{ p: 2.25, "&:last-child": { pb: 2.25 } }}>
            <Box
              sx={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: 94,
                gap: 2,
              }}
            >
              <Box sx={{ position: "absolute", left: 0, textAlign: "left" }}>
                <Typography
                  sx={{
                    color: "#64748b",
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: 0.7,
                    textTransform: "uppercase",
                  }}
                >
                  Orders Sold
                </Typography>
                <Typography
                  sx={{
                    mt: 0.5,
                    color: "#172033",
                    fontSize: 30,
                    fontWeight: 800,
                    lineHeight: 1.1,
                  }}
                >
                  {soldCount}
                </Typography>
                <Typography variant="caption" sx={{ color: "#94a3b8" }}>
                  Completed purchases
                </Typography>
              </Box>
              <Box
                sx={{
                  position: "absolute",
                  right: 0,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 44,
                  height: 44,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: 2,
                  bgcolor: "#fff1f2",
                  color: "#b73636",
                }}
              >
                <SellRoundedIcon />
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Card
          variant="outlined"
          sx={{
            flex: "1 1 350px",
            maxWidth: 600,
            minHeight: 142,
            borderRadius: 2.5,
            bgcolor: "background.paper",
            borderColor: "#e5eaf0",
            boxShadow: "0 2px 8px rgba(15, 23, 42, 0.05)",
          }}
        >
          <CardContent sx={{ p: 2.25, "&:last-child": { pb: 2.25 } }}>
            <Box
              sx={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: 94,
                gap: 2,
              }}
            >
              <Box sx={{ position: "absolute", left: 0, textAlign: "left" }}>
                <Typography
                  sx={{
                    color: "#64748b",
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: 0.7,
                    textTransform: "uppercase",
                  }}
                >
                  Total Sales
                </Typography>
                <Typography
                  sx={{
                    mt: 0.5,
                    color: "#172033",
                    fontSize: 30,
                    fontWeight: 800,
                    lineHeight: 1.1,
                  }}
                >
                  {salesCount}
                </Typography>
                <Typography variant="caption" sx={{ color: "#94a3b8" }}>
                  Total revenue generated
                </Typography>
              </Box>
              <Box
                sx={{
                  position: "absolute",
                  right: 0,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 44,
                  height: 44,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: 2,
                  bgcolor: "#fff1f2",
                  color: "#b73636",
                }}
              >
                <CreditScoreIcon />
              </Box>
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
