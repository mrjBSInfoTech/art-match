import { useMemo, useState } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import SearchIcon from "@mui/icons-material/Search";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import TrendingUpOutlinedIcon from "@mui/icons-material/TrendingUpOutlined";
import AttachMoneyOutlinedIcon from "@mui/icons-material/AttachMoneyOutlined";
import LocalOfferOutlinedIcon from "@mui/icons-material/LocalOfferOutlined";

const transactions = [
  { artwork: "Abstract Horizons", artist: "Jeremi Johnson", buyer: "Maria Santos", date: "Aug 28, 2026", amount: 12000, status: "Completed" },
  { artwork: "Urban Reflections", artist: "John Doe", buyer: "Arthur Pendleton", date: "Aug 29, 2026", amount: 6500, status: "Completed" },
  { artwork: "Brutalist Pavillons", artist: "Aaliyah Mendoza", buyer: "Carla Espiritu", date: "Sep 01, 2026", amount: 9200, status: "Completed" },
];

const formatCurrency = (value) => `₱${Number(value).toLocaleString("en-PH", { maximumFractionDigits: 0 })}`;

export default function Sales() {
  const theme = useTheme();
  const [search, setSearch] = useState("");
  const filteredTransactions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return transactions;
    return transactions.filter((transaction) => [transaction.artwork, transaction.artist, transaction.buyer, transaction.date].join(" ").toLowerCase().includes(query));
  }, [search]);
  const grossSales = transactions.reduce((total, transaction) => total + transaction.amount, 0);

  const exportSales = () => {
    const header = ["Artwork", "Artist", "Buyer", "Date", "Gross Amount", "Platform Take", "Net Student Payout", "Status"];
    const rows = filteredTransactions.map((transaction) => [transaction.artwork, transaction.artist, transaction.buyer, transaction.date, transaction.amount, 0, transaction.amount, transaction.status]);
    const csv = [header, ...rows].map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    link.download = "artmatch-sales.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const metrics = [
    { label: "GROSS SALES", value: formatCurrency(grossSales), caption: "Total marketplace volume", icon: TrendingUpOutlinedIcon, color: theme.palette.error.main, background: theme.palette.mode === "dark" ? "rgba(239, 68, 68, 0.14)" : "#fff1f2" },
    { label: "NET STUDENT PAYOUTS", value: formatCurrency(grossSales), caption: "100% directly to student artists", icon: AttachMoneyOutlinedIcon, color: theme.palette.success.main, background: theme.palette.mode === "dark" ? "rgba(34, 197, 94, 0.14)" : "#ecfdf5" },
    { label: "PLATFORM TAKE", value: formatCurrency(0), caption: "Non-profit student empowerment", icon: LocalOfferOutlinedIcon, color: theme.palette.text.secondary, background: theme.palette.mode === "dark" ? "#1e293b" : "#f1f5f9" },
  ];

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2.5 }, minHeight: "100vh", backgroundColor: theme.palette.background.default }}>
      <Helmet titleTemplate="%s - ArtMatch"><title>Sales</title></Helmet>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", sm: "center" }} gap={2} mb={3}>
        <Box>
          <Typography sx={{ fontSize: { xs: 28, sm: 34 }, fontWeight: 800, lineHeight: 1.1 }}>Sales</Typography>
          <Typography sx={{ mt: 0.75, color: "text.secondary", fontSize: 13 }}>Monitor the overall sales of students</Typography>
        </Box>
        <Button variant="contained" startIcon={<DownloadOutlinedIcon />} onClick={exportSales} sx={{ alignSelf: { xs: "flex-start", sm: "auto" }, backgroundColor: "error.main", boxShadow: "none", fontSize: 11, fontWeight: 700, "&:hover": { backgroundColor: "error.dark", boxShadow: "none" } }}>Export Sales CSV</Button>
      </Stack>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" }, gap: 1.5, mb: 2.5 }}>
        {metrics.map((metric) => {
          const MetricIcon = metric.icon;
          return <Card key={metric.label} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, boxShadow: "none" }}><CardContent sx={{ p: 1.75, "&:last-child": { pb: 1.75 } }}><Stack direction="row" justifyContent="space-between" alignItems="center" gap={2}><Box><Typography sx={{ color: "text.secondary", fontSize: 9, fontWeight: 800, letterSpacing: 0.8 }}>{metric.label}</Typography><Typography sx={{ mt: 0.5, fontSize: 21, fontWeight: 800, lineHeight: 1 }}>{metric.value}</Typography><Typography sx={{ mt: 1, color: "text.secondary", fontSize: 10 }}>{metric.caption}</Typography></Box><Box sx={{ width: 42, height: 42, display: "grid", placeItems: "center", borderRadius: 1.5, color: metric.color, backgroundColor: metric.background }}><MetricIcon fontSize="small" /></Box></Stack></CardContent></Card>;
        })}
      </Box>

      <Paper variant="outlined" sx={{ p: { xs: 1.25, sm: 1.5 }, borderRadius: 2, overflow: "hidden" }}>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", sm: "center" }} gap={1.25} mb={1.5}>
          <TextField size="small" placeholder="Search artwork, artist, buyer..." value={search} onChange={(event) => setSearch(event.target.value)} sx={{ width: { xs: "100%", sm: 205 }, "& .MuiInputBase-input": { fontSize: 11 } }} InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 16 }} /></InputAdornment> }} />
          <Typography sx={{ color: "text.secondary", fontSize: 10 }}>{filteredTransactions.length} transactions recorded</Typography>
        </Stack>
        <TableContainer sx={{ overflowX: "auto" }}><Table size="small" sx={{ minWidth: 900 }}><TableHead sx={{ backgroundColor: theme.palette.mode === "dark" ? "background.table" : "#f8fafc" }}><TableRow>{["Artwork", "Artist", "Buyer", "Date", "Gross Amount", "Platform Take", "Net Student Payout", "Status"].map((heading) => <TableCell key={heading} sx={{ py: 1, color: "text.secondary", fontSize: 8, fontWeight: 800, textTransform: "uppercase", whiteSpace: "nowrap" }}>{heading}</TableCell>)}</TableRow></TableHead><TableBody>{filteredTransactions.map((transaction) => <TableRow key={`${transaction.artwork}-${transaction.date}`} sx={{ "&:last-child td": { borderBottom: 0 }, "&:hover": { backgroundColor: "action.hover" } }}><TableCell sx={{ fontSize: 10, fontWeight: 700, whiteSpace: "nowrap" }}>{transaction.artwork}</TableCell><TableCell sx={{ fontSize: 10, whiteSpace: "nowrap" }}>{transaction.artist}</TableCell><TableCell sx={{ fontSize: 10, whiteSpace: "nowrap" }}>{transaction.buyer}</TableCell><TableCell sx={{ fontSize: 10, color: "text.secondary", whiteSpace: "nowrap" }}>{transaction.date}</TableCell><TableCell sx={{ fontSize: 10, fontWeight: 700, whiteSpace: "nowrap" }}>{formatCurrency(transaction.amount)}</TableCell><TableCell><Chip label="₱0 (0%)" size="small" sx={{ height: 18, borderRadius: 1, fontSize: 8, fontWeight: 700, backgroundColor: theme.palette.mode === "dark" ? "#334155" : "#f1f5f9" }} /></TableCell><TableCell sx={{ fontSize: 10, color: "success.main", fontWeight: 800, whiteSpace: "nowrap" }}>{formatCurrency(transaction.amount)}</TableCell><TableCell><Chip label={transaction.status} size="small" sx={{ height: 18, borderRadius: 1, color: "success.dark", backgroundColor: theme.palette.mode === "dark" ? "rgba(34, 197, 94, 0.16)" : "#dcfce7", fontSize: 8, fontWeight: 700 }} /></TableCell></TableRow>)}</TableBody></Table></TableContainer>
        {filteredTransactions.length === 0 && <Typography sx={{ py: 4, textAlign: "center", color: "text.secondary", fontSize: 12 }}>No transactions match your search.</Typography>}
      </Paper>
    </Box>
  );
}
