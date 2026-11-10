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
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import RefreshOutlinedIcon from "@mui/icons-material/Refresh";
import ViewListIcon from "@mui/icons-material/ViewList";

import ViewModuleIcon from "@mui/icons-material/ViewModule";
import { fetchSellerPayouts } from "../../api/seller/payoutAPI";
import ConnectionErrorPanel from "../../components/seller/ConnectionErrorPanel";
import SellerLoadingPanel from "../../components/seller/SellerLoadingPanel";
import PayoutAccount from "../../components/seller/Payout/PayoutAccount";
import PayoutMetrics from "../../components/seller/Payout/PayoutMetrics";
import PayoutTable from "../../components/seller/Payout/PayoutTable";
import PayoutCard from "../../components/seller/Payout/PayoutCard";
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
  const [viewMode, setViewMode] = useState("table");
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

  if (loading && !data) {
    return (
      <SellerLoadingPanel
        title="Settlement and Payout"
        subtitle="Track earnings from online buyer payments and payouts to your nominated account."
        showFilters={false}
      />
    );
  }

  if (error) {
    return (
      <ConnectionErrorPanel title="Payouts Unavailable" onRetry={reload} />
    );
  }

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2.5 }, minWidth: 0 }}>
      <Helmet>
        <title>Settlement and Payout | Red Nexus Seller</title>
      </Helmet>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" },
          gap: 2,
          mb: 2.5,
          flexWrap: "wrap",
        }}
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
        <Button
          variant="outlined"
          startIcon={<RefreshOutlinedIcon />}
          onClick={reload}
          disabled={loading}
          sx={{
            width: { xs: "100%", sm: 150 },
            height: { xs: 38, sm: 44 },
            minWidth: { xs: 45, sm: 50 },
            fontSize: { xs: 12, sm: 16 },
            padding: 0,
            borderRadius: 1.5,
            textTransform: "none",
            fontWeight: 700,
          }}
        >
          Refresh
        </Button>
      </Box>
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
            {/* View Mode Switcher & Summary Count */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 1.5,
                mt: 1,
                mb: 0.5,
              }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                aria-live="polite"
                sx={{ fontWeight: 600 }}
              >
                Showing {data.orders?.length || 0} payout records
              </Typography>

              <ToggleButtonGroup
                value={viewMode}
                exclusive
                onChange={(e, next) => {
                  if (next) setViewMode(next);
                }}
                size="small"
                aria-label="Payout presentation mode"
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
              <PayoutTable orders={data.orders} />
            ) : (
              <PayoutCard orders={data.orders} />
            )}
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
