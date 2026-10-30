import { useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Paper,
  Slide,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import {
  approveSellerPayout,
  fetchAdminPayouts,
  reconcileSellerPayout,
  rejectSellerPayout,
  releaseSellerPayout,
  requestSellerPayout,
  verifySellerPayoutRefund,
} from "../../api/admin/payoutAPI";
import PayoutForm from "../../components/admin/Payout/PayoutForm";
import PayoutMetrics from "../../components/seller/Payout/PayoutMetrics";
import PayoutTable from "../../components/seller/Payout/PayoutTable";
import {
  canPayoutAction,
  canReleasePayout,
  formatPayoutCurrency,
  formatPayoutDate,
  payoutApprovalLabel,
  payoutDisplayStatus,
  payoutErrorMessage,
  payoutIdentifier,
  payoutStatusColor,
  payoutValue,
} from "../../components/seller/Payout/payoutDisplay";
import { useTheme } from "@mui/material/styles";

function SlideTransition(props) {
  return <Slide {...props} direction="up" />;
}
const statuses = [
  "All",
  "Held",
  "Eligible",
  "Processing",
  "Paid",
  "Failed",
  "Cancelled",
];

export default function AdminPayout() {
  const theme = useTheme();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [status, setStatus] = useState("All");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");
  const [refundId, setRefundId] = useState("");
  const [returnRequestId, setReturnRequestId] = useState("");
  const [approvalComment, setApprovalComment] = useState("");
  const actionInFlight = useRef(false);

  const showSnackbar = (message, severity = "success") => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const closeSnackbar = (event, reason) => {
    if (reason === "clickaway") return;
    setSnackbarOpen(false);
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case "success":
        return "success.light";
      case "error":
        return "error.light";
      default:
        return "primary.light";
    }
  };

  useEffect(() => {
    let active = true;
    fetchAdminPayouts()
      .then((result) => {
        if (!active) return;
        setData(result);
        setSelected((current) =>
          current
            ? result.orders.find(
                (item) => payoutIdentifier(item) === payoutIdentifier(current),
              ) || null
            : null,
        );
        setError("");
      })
      .catch((loadError) => {
        if (active)
          setError(
            payoutErrorMessage(loadError, "Unable to load seller payouts."),
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
  const closeReview = () => {
    if (!actionInFlight.current) {
      setSelected(null);
      setActionError("");
    }
  };
  const capability = data?.providerCapability || data?.capability;
  const completedReturns = (selected?.returnRequests || []).filter(
    (item) => item.status === "Completed",
  );
  const filtered = (data?.orders || []).filter(
    (item) =>
      (status === "All" || item.payoutStatus === status) &&
      [item.orderNumber, item.sellerName, item.sellerId]
        .join(" ")
        .toLowerCase()
        .includes(search.trim().toLowerCase()),
  );

  const act = async (action) => {
    if (!selected || actionInFlight.current || loading || error) return;
    if (
      ["request", "approve", "reject", "reconcile"].includes(action) &&
      !canPayoutAction(selected, action)
    )
      return;
    if (action === "release" && !canReleasePayout(selected, capability)) return;
    if (action === "reject" && !approvalComment.trim()) return;
    if (
      action === "refund" &&
      (!refundId.trim() ||
        ["Processing", "Paid"].includes(selected.payoutStatus) ||
        (completedReturns.length > 0 && !returnRequestId))
    )
      return;
    actionInFlight.current = true;
    setBusy(true);
    setActionError("");
    try {
      const id = payoutIdentifier(selected);
      const actions = {
        request: () => requestSellerPayout(id),
        approve: () => approveSellerPayout(id, approvalComment.trim()),
        reject: () => rejectSellerPayout(id, approvalComment.trim()),
        release: () => releaseSellerPayout(id),
        reconcile: () => reconcileSellerPayout(id),
        refund: () =>
          verifySellerPayoutRefund(
            id,
            refundId.trim(),
            returnRequestId || undefined,
          ),
      };
      const result = await actions[action]();
      if (result.payout) setSelected(result.payout);
      const messages = {
        request:
          "Payout requested. Three other admins must approve before release.",
        approve: "Approval recorded. Release remains a separate action.",
        reject: "Payout request rejected. No payout was released.",
        release:
          "Payout released to the provider. Paid status requires provider confirmation.",
        reconcile: "Payout status checked with the configured provider.",
        refund:
          "Refund evidence checked with PayMongo. The backend recalculated the payout.",
      };
      showSnackbar(messages[action], "success");
      setApprovalComment("");
      if (action === "refund") {
        setRefundId("");
        setReturnRequestId("");
      }
      reload();
    } catch (actionFailure) {
      setActionError(
        payoutErrorMessage(
          actionFailure,
          "Unable to process this payout request.",
        ),
      );
      reload();
    } finally {
      actionInFlight.current = false;
      setBusy(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2.5 }, minWidth: 0 }}>
      <Helmet>
        <title>Seller Payouts | Red Nexus Admin</title>
      </Helmet>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        gap={2}
      >
        <Box>
          <Typography variant="h4" fontWeight={800}>
            Seller Payouts
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Review eligible earnings and track outbound seller transfers.
          </Typography>
        </Box>
        <Button
          startIcon={<RefreshIcon />}
          onClick={reload}
          disabled={loading || busy}
        >
          Refresh
        </Button>
      </Stack>
      <Stack spacing={2.5} sx={{ mt: 3 }}>
        {error && <Alert severity="error">{error}</Alert>}
        {loading && (
          <Stack alignItems="center" sx={{ py: 3 }}>
            <CircularProgress aria-label="Loading payout review" />
          </Stack>
        )}
        {data && (
          <>
            {capability?.enabled === false && (
              <Alert severity="warning">
                {capability.message ||
                  "PayMongo outbound payouts are not enabled. You can review earnings, but sending is blocked."}
              </Alert>
            )}
            <PayoutMetrics totals={data.totals} />
            <Paper
              sx={{
                p: { xs: 1.25, sm: 1.5 },
                borderRadius: 2,
                backgroundColor: theme.palette.background.paper,
                borderColor: theme.palette.divider,
              }}
              variant="outlined"
            >
              <Box
                sx={{
                  display: "flex",
                  flexDirection: { xs: "column", lg: "row" },
                  justifyContent: "space-between",
                  alignItems: { xs: "stretch", lg: "center" },
                  gap: 1.25,
                }}
              >
                <TextField
                  label="Search order or seller"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  size="small"
                  sx={{
                    width: { xs: "100%", lg: 255 },
                    "& .MuiOutlinedInput-root": {
                      color: theme.palette.text.primary,
                      backgroundColor: theme.palette.background.default,
                      "& fieldset": { borderColor: theme.palette.divider },
                      "&:hover fieldset": {
                        borderColor: theme.palette.text.secondary,
                      },
                    },
                    "& .MuiInputBase-input::placeholder": {
                      color: theme.palette.text.secondary,
                      opacity: 1,
                    },
                  }}
                />
                <TextField
                  select
                  label="Payout status"
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  size="small"
                  sx={{ minWidth: 180 }}
                >
                  {statuses.map((item) => (
                    <MenuItem value={item} key={item}>
                      {item}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>
            </Paper>

            <PayoutTable
              orders={filtered}
              admin
              onReview={(payout) => {
                setSelected(payout);
                setActionError("");
                setRefundId("");
                setReturnRequestId("");
                setApprovalComment("");
              }}
            />
          </>
        )}
      </Stack>
      <PayoutForm
        open={Boolean(selected)}
        onClose={closeReview}
        busy={busy}
        title="Review seller payout"
        selected={selected}
        actionError={actionError}
        payoutDisplayStatus={payoutDisplayStatus}
        payoutStatusColor={payoutStatusColor}
        payoutValue={payoutValue}
        formatPayoutCurrency={formatPayoutCurrency}
        formatPayoutDate={formatPayoutDate}
        payoutApprovalLabel={payoutApprovalLabel}
        canPayoutAction={canPayoutAction}
        approvalComment={approvalComment}
        setApprovalComment={setApprovalComment}
        loading={loading}
        error={error}
        capability={capability}
        refundId={refundId}
        setRefundId={setRefundId}
        returnRequestId={returnRequestId}
        setReturnRequestId={setReturnRequestId}
        completedReturns={completedReturns}
        canReleasePayout={canReleasePayout}
        onApprove={() => act("approve")}
        onReject={() => act("reject")}
        onRequestPayout={() => act("request")}
        onRelease={() => act("release")}
        onRefund={() => act("refund")}
        onReconcile={() => act("reconcile")}
      />
      <Snackbar
        open={snackbarOpen}
        severity={snackbarSeverity}
        variant="filled"
        autoHideDuration={3000}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        TransitionComponent={SlideTransition}
      >
        <Alert
          onClose={closeSnackbar}
          severity={snackbarSeverity}
          sx={{
            width: "100%",
            backgroundColor: getSeverityColor(snackbarSeverity),
            color: "#fff",
            "& .MuiAlert-icon": { color: "#fff" },
          }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
