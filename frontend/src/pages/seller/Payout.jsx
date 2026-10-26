import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import { fetchSellerPayouts } from "../../api/seller/payoutAPI";

const currency = (value) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(
    Number(value || 0),
  );

const statusColor = {
  Held: "warning",
  Eligible: "info",
  Processing: "primary",
  Paid: "success",
  Reversed: "error",
};

const statusLabel = {
  Held: "Held until delivered",
  Eligible: "Ready to pay out",
  Processing: "Payout in progress",
  Paid: "Paid out",
  Reversed: "Reversed",
};

function Metric({ label, value, hint, emphasis }) {
  return (
    <Card
      elevation={0}
      sx={{
        height: "100%",
        border: "1px solid",
        borderColor: emphasis ? "primary.light" : "divider",
        borderRadius: 3,
      }}
    >
      <CardContent>
        <Typography variant="caption" color="text.secondary" fontWeight={700}>
          {label}
        </Typography>
        <Typography
          variant="h5"
          fontWeight={800}
          sx={{ mt: 0.5, color: emphasis ? "primary.main" : "text.primary" }}
        >
          {value}
        </Typography>
        {hint && (
          <Typography variant="caption" color="text.secondary">
            {hint}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

export default function SellerPayout() {
  const theme = useTheme(); 
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchSellerPayouts()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch(() => {
        if (!cancelled) setError("Unable to load your payouts.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Box
      sx={{
        p: { xs: 1.5, sm: 2.5 },
        minHeight: "100vh",
        backgroundColor: theme.palette.background.default,
        color: theme.palette.text.primary,
      }}
    >
      <Helmet>
        <title>Settlement and Payout | Red Nexus Seller</title>
      </Helmet>
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", md: "center" },
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            Settlement and Payout
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Your share of every buyer payment. A buyer pays once; each
            storefront is settled separately.
          </Typography>
        </Box>
      </Box>

      <Stack spacing={2.5}>
        {loading && (
          <Stack alignItems="center" sx={{ py: 6 }}>
            <CircularProgress />
          </Stack>
        )}

        {error && <Alert severity="error">{error}</Alert>}

        {data && !loading && (
          <>
            <Grid container spacing={2}>
              <Grid size={{ xs: 6, md: 3 }}>
                <Metric
                  label="Available to pay out"
                  value={currency(data.totals.eligible)}
                  hint="Delivered and settled"
                  emphasis
                />
              </Grid>
              <Grid size={{ xs: 6, md: 3 }}>
                <Metric
                  label="Pending"
                  value={currency(data.totals.pending)}
                  hint="Held until delivery"
                />
              </Grid>
              <Grid size={{ xs: 6, md: 3 }}>
                <Metric
                  label="Paid out"
                  value={currency(data.totals.paid)}
                  hint="Already transferred"
                />
              </Grid>
              <Grid size={{ xs: 6, md: 3 }}>
                <Metric
                  label="Held until delivered"
                  value={currency(data.totals.held)}
                  hint="Released on delivery"
                />
              </Grid>
            </Grid>

            <Card
              elevation={0}
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 3,
              }}
            >
              <CardContent sx={{ p: 0 }}>
                <Box sx={{ px: 3, pt: 2.5, pb: 1.5 }}>
                  <Typography variant="h6" fontWeight={700}>
                    Payout history
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    One row per order. You receive the full price of your
                    artworks — ArtMatch takes no commission.
                  </Typography>
                </Box>
                <Divider />

                {data.orders.length === 0 ? (
                  <Box sx={{ p: 4, textAlign: "center" }}>
                    <Typography color="text.secondary">
                      No paid orders yet. Your payouts appear here once a buyer
                      completes payment.
                    </Typography>
                  </Box>
                ) : (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Order</TableCell>
                          <TableCell>Paid</TableCell>
                          <TableCell align="right">Artwork total</TableCell>
                          <TableCell align="right">Shipping</TableCell>
                          <TableCell align="right">Your share</TableCell>
                          <TableCell>Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {data.orders.map((order) => (
                          <TableRow key={order.splitId} hover>
                            <TableCell sx={{ fontWeight: 700 }}>
                              {order.orderNumber}
                            </TableCell>
                            <TableCell>
                              {order.paidAt
                                ? new Date(order.paidAt).toLocaleDateString()
                                : "—"}
                            </TableCell>
                            <TableCell align="right">
                              {currency(order.gross)}
                            </TableCell>
                            <TableCell
                              align="right"
                              sx={{ color: "text.secondary" }}
                            >
                              Courier
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 800 }}>
                              {currency(order.net)}
                            </TableCell>
                            <TableCell>
                              <Chip
                                size="small"
                                color={
                                  statusColor[order.payoutStatus] || "default"
                                }
                                label={
                                  statusLabel[order.payoutStatus] ||
                                  order.payoutStatus
                                }
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </Stack>
    </Box>
  );
}
