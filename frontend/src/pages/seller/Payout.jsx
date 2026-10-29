import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Slide,
  Snackbar,
  Stack,
  Typography,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import { fetchSellerPayouts } from "../../api/seller/payoutAPI";
import PayoutAccount from "../../components/seller/Payout/PayoutAccount";
import PayoutMetrics from "../../components/seller/Payout/PayoutMetrics";
import PayoutTable from "../../components/seller/Payout/PayoutTable";
import { isDemoCapability, payoutErrorMessage } from "../../components/seller/Payout/payoutDisplay";

function SlideTransition(props) {
  return <Slide {...props} direction="up" />;
}

export default function SellerPayout() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");

  useEffect(() => {
    let active = true;
    fetchSellerPayouts()
      .then((result) => {
        if (!active) return;
        setData(result);
        setError("");
      })
      .catch((loadError) => {
        if (active)
          setError(
            payoutErrorMessage(loadError, "Unable to load your payouts."),
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refresh]);

  const reload = () => {
    setLoading(true);
    setRefresh((value) => value + 1);
  };

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2.5 }, minWidth: 0 }}>
      <Helmet>
        <title>Settlement and Payout | Red Nexus Seller</title>
      </Helmet>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        gap={2}
      >
        <Box>
          <Typography variant="h4" fontWeight={800}>
            Settlement and Payout
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Track earnings from online buyer payments and payouts to your
            nominated account.
          </Typography>
        </Box>
        <Button startIcon={<RefreshIcon />} onClick={reload} disabled={loading}>
          Refresh
        </Button>
      </Stack>
      <Stack spacing={2.5} sx={{ mt: 3 }}>
        <PayoutAccount
          onSaved={() => {
            setSnackbarMessage("Payout destination saved.");
            setSnackbarSeverity("success");
            setSnackbarOpen(true);
            reload();
          }}
        />
        {error && <Alert severity="error">{error}</Alert>}
        {loading && (
          <Stack alignItems="center" sx={{ py: 3 }}>
            <CircularProgress aria-label="Loading seller earnings" />
          </Stack>
        )}
        {data && (
          <>
            <PayoutMetrics totals={data.totals} />
            {/*{isDemoCapability(data.providerCapability) && <Alert severity="info">Demo payout mode. Payouts marked Paid (Demo) are simulated; no money is sent to your bank or e-wallet.</Alert>}*/}
            {data.providerCapability?.enabled === false && (
              <Alert severity="warning">
                {data.providerCapability.message}
              </Alert>
            )}
            {data.providerCapability?.enabled === true &&
              !isDemoCapability(data.providerCapability) &&
              data.providerCapability?.mode === "test" && (
                <Alert severity="info">
                  TEST payouts only. No real funds are transferred.
                </Alert>
              )}
            <PayoutTable orders={data.orders} />
            <Typography variant="caption" color="text.secondary">
              Cash on Delivery orders are handled separately and are not paid
              from the ArtMatch PayMongo Wallet.
            </Typography>
          </>
        )}
      </Stack>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={(_, reason) => {
          if (reason !== "clickaway") {
            setSnackbarOpen(false);
          }
        }}
        TransitionComponent={SlideTransition}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity={snackbarSeverity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
