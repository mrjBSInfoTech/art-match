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
import { useTheme } from "@mui/material/styles";
import RefreshIcon from "@mui/icons-material/Refresh";
import { fetchSellerPayouts } from "../../api/seller/payoutAPI";
import ConnectionErrorPanel from "../../components/seller/ConnectionErrorPanel";
import PayoutAccount from "../../components/seller/Payout/PayoutAccount";
import PayoutMetrics from "../../components/seller/Payout/PayoutMetrics";
import PayoutTable from "../../components/seller/Payout/PayoutTable";
import { payoutErrorMessage } from "../../components/seller/Payout/payoutDisplay";

function SlideTransition(props) {
  return <Slide {...props} direction="up" />;
}

export default function SellerPayout() {
  const theme = useTheme();

  const getSeverityColor = (severity) => {
    switch (severity) {
      case "error":
        return theme.palette.error.main;
      case "warning":
        return theme.palette.warning.main;
      case "info":
        return theme.palette.info.main;
      default:
        return theme.palette.success.main;
    }
  };
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

  if (error) {
    return (
      <ConnectionErrorPanel
        title="Payouts Unavailable"
        onRetry={reload}
      />
    );
  }

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
        {loading && (
          <Stack alignItems="center" sx={{ py: 3 }}>
            <CircularProgress aria-label="Loading seller earnings" />
          </Stack>
        )}
        {data && (
          <>
            <PayoutMetrics totals={data.totals} />
            {data.providerCapability?.enabled === false && (
              <Alert severity="warning">
                {data.providerCapability.message}
              </Alert>
            )}
            {data.providerCapability?.enabled === true &&
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
        autoHideDuration={3000}
        onClose={(_, reason) => {
          if (reason !== "clickaway") {
            setSnackbarOpen(false);
          }
        }}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        TransitionComponent={SlideTransition}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity={snackbarSeverity}
          variant="filled"
          sx={{
            width: { xs: 280, sm: 360 },
            minHeight: 48,
            borderRadius: 2,
            boxShadow: "0 10px 28px rgba(15, 23, 42, 0.18)",
            backgroundColor: getSeverityColor(snackbarSeverity),
            color: "#fff",
            alignItems: "center",
            "& .MuiAlert-icon": {
              color: "#fff",
              mr: 1,
            },
            "& .MuiAlert-message": {
              fontWeight: 600,
              fontSize: 14,
              display: "flex",
              alignItems: "center",
            },
            "& .MuiAlert-action": {
              alignItems: "center",
              paddingLeft: 1,
              color: "#fff",
            },
          }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
