import {
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";

export default function SalesTable({ transactions = [], formatCurrency }) {
  const theme = useTheme();
  const format =
    formatCurrency ||
    ((value) =>
      `₱${Number(value).toLocaleString("en-PH", { maximumFractionDigits: 0 })}`);

  if (transactions.length === 0) {
    return (
      <Paper
        variant="outlined"
        sx={{
          py: 4,
          borderRadius: 2,
          textAlign: "center",
          border: "1px dashed",
          borderColor: "divider",
        }}
      >
        <Typography variant="body2" color="text.secondary">
          No transactions match your search.
        </Typography>
      </Paper>
    );
  }

  return (
    <TableContainer
      component={Paper}
      variant="outlined"
      sx={{ borderRadius: 2, overflowX: "auto" }}
    >
      <Table size="small" sx={{ minWidth: 900 }}>
        <TableHead
          sx={{
            backgroundColor:
              theme.palette.mode === "dark" ? "background.table" : "#f8fafc",
          }}
        >
          <TableRow>
            {[
              "Artwork",
              "Artist",
              "Buyer",
              "Date",
              "Gross Amount",
              "Platform Take",
              "Net Student Payout",
              "Status",
            ].map((heading) => (
              <TableCell
                key={heading}
                sx={{
                  py: 1.5,
                  color: "text.secondary",
                  fontSize: 10,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  whiteSpace: "nowrap",
                }}
              >
                {heading}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {transactions.map((transaction) => (
            <TableRow
              key={`${transaction.artwork}-${transaction.date}-${transaction.buyer}`}
              sx={{
                "&:last-child td": { borderBottom: 0 },
                "&:hover": { backgroundColor: "action.hover" },
              }}
            >
              <TableCell
                sx={{ fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}
              >
                {transaction.artwork}
              </TableCell>
              <TableCell sx={{ fontSize: 12, whiteSpace: "nowrap" }}>
                {transaction.artist}
              </TableCell>
              <TableCell sx={{ fontSize: 12, whiteSpace: "nowrap" }}>
                {transaction.buyer}
              </TableCell>
              <TableCell
                sx={{
                  fontSize: 12,
                  color: "text.secondary",
                  whiteSpace: "nowrap",
                }}
              >
                {transaction.date}
              </TableCell>
              <TableCell
                sx={{ fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}
              >
                {format(transaction.amount)}
              </TableCell>
              <TableCell>
                <Chip
                  label="₱0 (0%)"
                  size="small"
                  sx={{
                    height: 22,
                    borderRadius: 1,
                    fontSize: 10,
                    fontWeight: 700,
                    backgroundColor:
                      theme.palette.mode === "dark" ? "#334155" : "#f1f5f9",
                  }}
                />
              </TableCell>
              <TableCell
                sx={{
                  fontSize: 12,
                  color: "success.main",
                  fontWeight: 800,
                  whiteSpace: "nowrap",
                }}
              >
                {format(transaction.amount)}
              </TableCell>
              <TableCell>
                <Chip
                  label={transaction.status}
                  size="small"
                  sx={{
                    height: 22,
                    borderRadius: 1,
                    color: "success.dark",
                    backgroundColor:
                      theme.palette.mode === "dark"
                        ? "rgba(34, 197, 94, 0.16)"
                        : "#dcfce7",
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

