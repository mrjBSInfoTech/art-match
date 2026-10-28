import { forwardRef, useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Slide, Snackbar, Stack, TextField, Typography } from "@mui/material";
import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import CloseIcon from "@mui/icons-material/Close";
import RefreshIcon from "@mui/icons-material/Refresh";
import { fetchAdminPayouts, reconcileSellerPayout, sendSellerPayout, verifySellerPayoutRefund } from "../../api/admin/payoutAPI";
import PayoutMetrics from "../../components/seller/Payout/PayoutMetrics";
import PayoutTable from "../../components/seller/Payout/PayoutTable";
import { canSendPayout, formatPayoutCurrency, formatPayoutDate, payoutErrorMessage, payoutIdentifier, payoutStatusColor, payoutValue } from "../../components/seller/Payout/payoutDisplay";

const Transition = forwardRef(function Transition(props, ref) { return <Slide direction="up" ref={ref} {...props} />; });
function SlideTransition(props) { return <Slide {...props} direction="up" />; }
const statuses = ["All", "Held", "Eligible", "Processing", "Paid", "Failed", "Cancelled"];

export default function AdminPayout() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [status, setStatus] = useState("All");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [refundId, setRefundId] = useState("");
  const [returnRequestId, setReturnRequestId] = useState("");
  const actionInFlight = useRef(false);

  useEffect(() => {
    let active = true;
    fetchAdminPayouts().then((result) => {
      if (!active) return;
      setData(result);
      setSelected((current) => current ? result.orders.find((item) => payoutIdentifier(item) === payoutIdentifier(current)) || null : null);
      setError("");
    }).catch((loadError) => {
      if (active) setError(payoutErrorMessage(loadError, "Unable to load seller payouts."));
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [refresh]);

  const reload = () => { setLoading(true); setRefresh((value) => value + 1); };
  const closeReview = () => { if (!actionInFlight.current) { setSelected(null); setActionError(""); } };
  const capability = data?.providerCapability || data?.capability;
  const completedReturns = (selected?.returnRequests || []).filter((item) => item.status === "Completed");
  const filtered = (data?.orders || []).filter((item) => (status === "All" || item.payoutStatus === status)
    && [item.orderNumber, item.sellerName, item.sellerId].join(" ").toLowerCase().includes(search.trim().toLowerCase()));

  const act = async (action) => {
    if (!selected || actionInFlight.current || loading || error || (action === "send" && !canSendPayout(selected, capability))) return;
    if (action === "refund" && (!refundId.trim() || ["Processing", "Paid"].includes(selected.payoutStatus) || (completedReturns.length > 0 && !returnRequestId))) return;
    actionInFlight.current = true;
    setBusy(true);
    setActionError("");
    try {
      const result = action === "refund"
        ? await verifySellerPayoutRefund(payoutIdentifier(selected), refundId.trim(), returnRequestId || undefined)
        : await (action === "send" ? sendSellerPayout : reconcileSellerPayout)(payoutIdentifier(selected));
      if (result.payout) setSelected(result.payout);
      setSnackbarMessage(action === "send" ? "Payout request submitted. The status will reflect provider confirmation." : action === "refund" ? "Refund evidence checked with PayMongo. The backend recalculated the payout." : "Payout status checked with the provider.");
      if (action === "refund") { setRefundId(""); setReturnRequestId(""); }
      reload();
    } catch (actionFailure) {
      setActionError(payoutErrorMessage(actionFailure, "Unable to process this payout request."));
      // A timeout can follow provider acceptance. Reload persisted state before another action.
      reload();
    } finally { actionInFlight.current = false; setBusy(false); }
  };

  return <Box sx={{ p: { xs: 1.5, sm: 2.5 }, minWidth: 0 }}>
    <Helmet><title>Seller Payouts | Red Nexus Admin</title></Helmet>
    <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} gap={2}>
      <Box><Typography variant="h4" fontWeight={800}>Seller Payouts</Typography>
        <Typography variant="body2" color="text.secondary">Review eligible earnings and track outbound seller transfers.</Typography></Box>
      <Button startIcon={<RefreshIcon />} onClick={reload} disabled={loading || busy}>Refresh</Button>
    </Stack>
    <Stack spacing={2.5} sx={{ mt: 3 }}>
      <Alert severity="info">Buyer payment being Paid does not mean the seller has been paid. Only eligible earnings can be sent, after the backend rechecks delivery, returns, refunds and the saved destination.</Alert>
      {error && <Alert severity="error">{error}</Alert>}
      {loading && <Stack alignItems="center" sx={{ py: 3 }}><CircularProgress aria-label="Loading payout review" /></Stack>}
      {data && <>
        {capability?.enabled === false && <Alert severity="warning">{capability.message || "PayMongo outbound payouts are not enabled. You can review earnings, but sending is blocked."}</Alert>}
        {capability?.enabled === true && capability?.mode === "test" && <Alert severity="info">TEST payouts only. No real funds are transferred.</Alert>}
        <PayoutMetrics totals={data.totals} />
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField label="Search order or seller" value={search} onChange={(event) => setSearch(event.target.value)} size="small" sx={{ flex: 1 }} />
          <TextField select label="Payout status" value={status} onChange={(event) => setStatus(event.target.value)} size="small" sx={{ minWidth: 180 }}>
            {statuses.map((item) => <MenuItem value={item} key={item}>{item}</MenuItem>)}
          </TextField>
        </Stack>
        <PayoutTable orders={filtered} admin onReview={(payout) => { setSelected(payout); setActionError(""); setRefundId(""); setReturnRequestId(""); }} />
      </>}
    </Stack>
    <Dialog open={Boolean(selected)} onClose={closeReview} TransitionComponent={Transition} maxWidth={false}
      aria-labelledby="payout-review-title" PaperProps={{ sx: { width: "min(100% - 24px, 470px)", maxWidth: 470, borderRadius: 3, overflow: "hidden" } }}>
      <DialogTitle id="payout-review-title" sx={{ display: "flex", alignItems: "center", gap: 0.75, px: 2.5, py: 1.75, fontSize: 16, fontWeight: 700 }}>
        <AccountBalanceWalletOutlinedIcon sx={{ color: "error.main", fontSize: 20 }} />Review seller payout
        <Button aria-label="Close payout review" onClick={closeReview} disabled={busy} sx={{ minWidth: 28, width: 28, height: 28, ml: "auto", p: 0, color: "text.secondary" }}><CloseIcon sx={{ fontSize: 18 }} /></Button>
      </DialogTitle>
      <DialogContent dividers>{selected && <Stack spacing={2}>
        {actionError && <Alert severity="error">{actionError}</Alert>}
        <Box><Typography fontWeight={800}>{selected.orderNumber}</Typography><Typography variant="body2" color="text.secondary">{selected.sellerName || `Seller ${selected.sellerId}`}</Typography></Box>
        <Stack direction="row" justifyContent="space-between" alignItems="center"><Typography variant="body2">Buyer payment</Typography><Chip size="small" label={selected.paymentStatus || "Paid"} variant="outlined" /></Stack>
        <Stack direction="row" justifyContent="space-between" alignItems="center"><Typography variant="body2">Seller payout</Typography><Chip size="small" label={selected.payoutStatus} color={payoutStatusColor[selected.payoutStatus] || "default"} /></Stack>
        <Box><Typography variant="caption" color="text.secondary">Payout amount</Typography><Typography variant="h5" fontWeight={800}>{formatPayoutCurrency(payoutValue(selected))}</Typography>
          <Typography variant="body2" color="text.secondary">Artwork total {formatPayoutCurrency(selected.gross)} · Refunded {formatPayoutCurrency(selected.refundAmount)}</Typography>
          {(Number(selected.commission) > 0 || Number(selected.processingFee) > 0) && <Typography variant="body2" color="text.secondary">Recorded commission {formatPayoutCurrency(selected.commission)} · Recorded processing fee {formatPayoutCurrency(selected.processingFee)}</Typography>}</Box>
        <Box><Typography variant="body2">Delivered: {formatPayoutDate(selected.deliveredAt)}</Typography><Typography variant="body2">Return deadline: {formatPayoutDate(selected.eligibleAt)}</Typography></Box>
        <Typography variant="body2">Returns: {selected.returnStatus || "None"} · Refunds: {selected.refundStatus || "None"}</Typography>
        {selected.holdReason && <Alert severity="info">{selected.holdReason}</Alert>}
        {selected.failureReason && <Alert severity="error">{selected.failureReason}</Alert>}
        <Box><Typography variant="subtitle2" fontWeight={700}>Saved destination</Typography>
          {selected.destination ? <><Typography variant="body2">{selected.destination.institutionName}</Typography><Typography variant="body2">{selected.destination.accountName}</Typography><Typography variant="body2" color="text.secondary">{selected.destination.maskedAccountNumber}</Typography></> : <Typography variant="body2" color="error.main">Seller payout destination is not configured.</Typography>}
        </Box>
        {capability?.enabled === false && <Alert severity="warning">{capability.message || "Sending payouts is currently unavailable."}</Alert>}
        {!["Processing", "Paid"].includes(selected.payoutStatus) && <Stack spacing={1.5} sx={{ pt: 1, borderTop: "1px solid", borderColor: "divider" }}>
          <Typography variant="subtitle2" fontWeight={700}>Verify an existing PayMongo refund</Typography>
          <Typography variant="body2" color="text.secondary">Verify a refund already issued through the PayMongo Dashboard and allocate it to this seller order. For a shared checkout, confirm that it belongs to these returned items. The provider verifies the amount; this action does not send a refund.</Typography>
          <TextField label="PayMongo refund ID" value={refundId} onChange={(event) => setRefundId(event.target.value)} disabled={busy} size="small" slotProps={{ htmlInput: { maxLength: 100 } }} />
          {completedReturns.length > 0 && <TextField select required label="Completed return request" value={returnRequestId} onChange={(event) => setReturnRequestId(event.target.value)} disabled={busy} size="small">
            {completedReturns.map((item) => <MenuItem key={item.returnRequestId} value={item.returnRequestId}>Return #{item.returnRequestId} · Returned {formatPayoutCurrency(item.returnedAmount)} · Refunded {formatPayoutCurrency(item.refundedAmount)}</MenuItem>)}
          </TextField>}
          <Button variant="outlined" onClick={() => act("refund")} disabled={busy || loading || Boolean(error) || !refundId.trim() || (completedReturns.length > 0 && !returnRequestId)}>Verify existing refund</Button>
        </Stack>}
        {selected.payoutStatus === "Eligible" && <Typography variant="body2" color="text.secondary">Sending requests a transfer from the ArtMatch PayMongo Wallet. The backend checks the amount and current eligibility again. A payout becomes Paid only after provider confirmation.</Typography>}
      </Stack>}</DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={closeReview} disabled={busy}>Close</Button>
        {selected && ["Processing", "Failed"].includes(selected.payoutStatus) && <Button onClick={() => act("reconcile")} disabled={busy || loading || Boolean(error)}>Check provider status</Button>}
        {selected?.payoutStatus === "Eligible" && <Button variant="contained" onClick={() => act("send")} disabled={busy || loading || Boolean(error) || !canSendPayout(selected, capability) || !selected.destination} sx={{ textTransform: "none", fontWeight: 700 }}>{busy ? "Submitting…" : "Send Payout"}</Button>}
      </DialogActions>
    </Dialog>
    <Snackbar open={Boolean(snackbarMessage)} autoHideDuration={6000} onClose={(_, reason) => { if (reason !== "clickaway") setSnackbarMessage(""); }} TransitionComponent={SlideTransition} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
      <Alert severity="success" variant="filled" onClose={() => setSnackbarMessage("")} sx={{ width: "100%" }}>{snackbarMessage}</Alert>
    </Snackbar>
  </Box>;
}
