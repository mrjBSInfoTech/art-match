import { useEffect, useMemo, useState, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import SearchIcon from "@mui/icons-material/Search";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import TrendingUpOutlinedIcon from "@mui/icons-material/TrendingUpOutlined";
import AttachMoneyOutlinedIcon from "@mui/icons-material/AttachMoneyOutlined";
import LocalOfferOutlinedIcon from "@mui/icons-material/LocalOfferOutlined";
import ViewListIcon from "@mui/icons-material/ViewList";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import ConnectionErrorPanel from "../../components/admin/ConnectionErrorPanel";
import { fetchDashboard } from "../../api/admin/dashboardAPI";
import SalesTable from "../../components/admin/Sales/SalesTable";
import SalesCard from "../../components/admin/Sales/SalesCard";

const transactions = [
  {
    artwork: "Abstract Horizons",
    artist: "Jeremi Johnson",
    buyer: "Maria Santos",
    date: "Aug 28, 2026",
    amount: 12000,
    status: "Completed",
  },
  {
    artwork: "Urban Reflections",
    artist: "John Doe",
    buyer: "Arthur Pendleton",
    date: "Aug 29, 2026",
    amount: 6500,
    status: "Completed",
  },
  {
    artwork: "Brutalist Pavillons",
    artist: "Aaliyah Mendoza",
    buyer: "Carla Espiritu",
    date: "Sep 01, 2026",
    amount: 9200,
    status: "Completed",
  },
];

const formatCurrency = (value) =>
  `₱${Number(value).toLocaleString("en-PH", { maximumFractionDigits: 0 })}`;

export default function Sales() {
  const theme = useTheme();
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState("table");

  const checkConnection = useCallback(async () => {
    try {
      setError("");
      await fetchDashboard();
    } catch (err) {
      setError(err.message || "Failed to load sales.");
    }
  }, []);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);
  const filteredTransactions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return transactions;
    return transactions.filter((transaction) =>
      [
        transaction.artwork,
        transaction.artist,
        transaction.buyer,
        transaction.date,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [search]);
  const grossSales = transactions.reduce(
    (total, transaction) => total + transaction.amount,
    0,
  );

  const exportSales = () => {
    const header = [
      "Artwork",
      "Artist",
      "Buyer",
      "Date",
      "Gross Amount",
      "Platform Take",
      "Net Student Payout",
      "Status",
    ];
    const rows = filteredTransactions.map((transaction) => [
      transaction.artwork,
      transaction.artist,
      transaction.buyer,
      transaction.date,
      transaction.amount,
      0,
      transaction.amount,
      transaction.status,
    ]);
    const csv = [header, ...rows]
      .map((row) =>
        row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    link.download = "artmatch-sales.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const metrics = [
    {
      label: "GROSS SALES",
      value: formatCurrency(grossSales),
      caption: "Total marketplace volume",
      icon: TrendingUpOutlinedIcon,
      color: theme.palette.error.main,
      background:
        theme.palette.mode === "dark" ? "rgba(239, 68, 68, 0.14)" : "#fff1f2",
    },
    {
      label: "NET STUDENT PAYOUTS",
      value: formatCurrency(grossSales),
      caption: "100% directly to student artists",
      icon: AttachMoneyOutlinedIcon,
      color: theme.palette.success.main,
      background:
        theme.palette.mode === "dark" ? "rgba(34, 197, 94, 0.14)" : "#ecfdf5",
    },
    {
      label: "PLATFORM TAKE",
      value: formatCurrency(0),
      caption: "Non-profit student empowerment",
      icon: LocalOfferOutlinedIcon,
      color: theme.palette.text.secondary,
      background: theme.palette.mode === "dark" ? "#1e293b" : "#f1f5f9",
    },
  ];

  if (error) {
    return (
      <Box sx={{ minWidth: 0 }}>
        <Helmet titleTemplate="%s - ArtMatch">
          <title>Sales</title>
        </Helmet>
        <ConnectionErrorPanel
          title="Sales Unavailable"
          message={error}
          onRetry={checkConnection}
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
      }}
    >
      <Helmet titleTemplate="%s - ArtMatch">
        <title>Sales</title>
      </Helmet>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", sm: "center" }}
        gap={2}
        mb={2}
      >
        <Box>
          <Typography
            sx={{
              fontSize: { xs: 28, sm: 38 },
              fontWeight: 800,
              lineHeight: 1.1,
            }}
          >
            Sales
          </Typography>
          <Typography sx={{ mt: 0.75, color: "text.secondary", fontSize: 13 }}>
            Monitor the overall sales of students
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<DownloadOutlinedIcon />}
          onClick={exportSales}
          sx={{
            alignSelf: { xs: "flex-start", sm: "auto" },
            backgroundColor: "error.main",
            boxShadow: "none",
            fontSize: 11,
            fontWeight: 700,
            color:"#fff",
            "&:hover": { backgroundColor: "error.dark", boxShadow: "none" },
          }}
        >
          Export Sales CSV
        </Button>
      </Stack>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
          gap: 2,
          mb: 2.5,
        }}
      >
        {metrics.map((metric) => {
          const MetricIcon = metric.icon;
          return (
            <Card
              key={metric.label}
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
                boxShadow: "none",
              }}
            >
              <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  gap={2}
                >
                  <Box>
                    <Typography
                      sx={{
                        color: "text.secondary",
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: 0.8,
                      }}
                    >
                      {metric.label}
                    </Typography>
                    <Typography
                      sx={{
                        mt: 0.5,
                        fontSize: 24,
                        fontWeight: 800,
                        lineHeight: 1,
                      }}
                    >
                      {metric.value}
                    </Typography>
                    <Typography
                      sx={{ mt: 1, color: "text.secondary", fontSize: 12 }}
                    >
                      {metric.caption}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      display: "grid",
                      placeItems: "center",
                      borderRadius: 1.5,
                      color: metric.color,
                      backgroundColor: metric.background,
                    }}
                  >
                    <MetricIcon />
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          );
        })}
      </Box>

      <Paper
        variant="outlined"
        sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 2, mb: 2 }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", sm: "center" }}
          gap={1.25}
        >
          <TextField
            size="small"
            placeholder="Search artwork, artist, buyer..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            sx={{
              width: { xs: "100%", sm: 280 },
              "& .MuiInputBase-input": { fontSize: 12 },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Stack>
      </Paper>

      {/* View Mode Switcher & Summary Count */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 1.5,
          mt: 0.5,
          mb: 1.5,
        }}
      >
        <Typography
          variant="caption"
          color="text.secondary"
          aria-live="polite"
          sx={{ fontWeight: 600 }}
        >
          Showing {filteredTransactions.length} of {transactions.length} transactions recorded
        </Typography>

        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(e, next) => {
            if (next) setViewMode(next);
          }}
          size="small"
          aria-label="Sales presentation mode"
          sx={{
            backgroundColor: theme.palette.background.paper,
            borderRadius: 2.5,
            border: `1px solid ${theme.palette.divider}`,
            p: 0.3,
            "& .MuiToggleButton-root": {
              border: "none",
              borderRadius: 2,
              px: 1.5,
              py: 0.5,
              fontSize: 12,
              fontWeight: 700,
              textTransform: "none",
              color: theme.palette.text.secondary,
              gap: 0.75,
              transition: "all 150ms ease",
            },
            "& .MuiToggleButton-root.Mui-selected": {
              backgroundColor: theme.palette.error.main,
              color: "#fff",
              "&:hover": {
                backgroundColor: theme.palette.error.dark,
              },
            },
          }}
        >
          <ToggleButton value="card" aria-label="Card view">
            <ViewModuleIcon sx={{ fontSize: 18 }} />
            Cards
          </ToggleButton>
          <ToggleButton value="table" aria-label="Table view">
            <ViewListIcon sx={{ fontSize: 18 }} />
            Table
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {viewMode === "table" ? (
        <SalesTable
          transactions={filteredTransactions}
          formatCurrency={formatCurrency}
        />
      ) : (
        <SalesCard
          transactions={filteredTransactions}
          formatCurrency={formatCurrency}
        />
      )}
    </Box>
  );
}
