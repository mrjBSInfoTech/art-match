import React, { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Slide,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import PayoutConfirm from "./PayoutConfirm";
import { verifyPassword } from "../../../api/admin/adminAuthenticationAPI";

const Transition = React.forwardRef(function Transition(props, ref) {
  return (
    <Slide
      direction="up"
      ref={ref}
      {...props}
      timeout={500}
      easing={{ enter: "cubic-bezier(0.4, 0, 0.2, 1)", exit: "ease-out" }}
    />
  );
});

export default function PayoutForm({
  open,
  onClose,
  busy = false,
  title = "Review seller payout",
  selected,
  actionError,
  payoutDisplayStatus,
  payoutStatusColor,
  payoutValue,
  formatPayoutCurrency,
  formatPayoutDate,
  canPayoutAction,
  loading,
  error,
  capability,
  refundId,
  setRefundId,
  returnRequestId,
  setReturnRequestId,
  completedReturns,
  onRelease,
  onRefund,
  onReconcile,
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const handleConfirmPayout = async (password) => {
    setConfirming(true);
    try {
      await verifyPassword(password);
      if (typeof onRelease === "function") {
        await onRelease(password);
      }
      setConfirmOpen(false);
      onClose();
    } finally {
      setConfirming(false);
    }
  };

  const isEligible = selected?.payoutStatus === "Eligible";
  const hasDestination = Boolean(selected?.destination);
  const providerEnabled = capability?.enabled !== false;

  const dialogActions = (
    <>
      <Button color="inherit" onClick={onClose} disabled={busy || confirming} sx={{ color: "text.secondary" }}>
        Close
      </Button>
      {selected && canPayoutAction(selected, "reconcile") && (
        <Button onClick={onReconcile} disabled={busy || confirming || loading || Boolean(error)}>
          Check provider status
        </Button>
      )}
      {isEligible && (
        <Button
          variant="contained"
          onClick={() => setConfirmOpen(true)}
          disabled={busy || confirming || loading || Boolean(error) || !providerEnabled || !hasDestination}
          sx={{
            borderRadius: 1.5,
            px: 2.5,
            textTransform: "none",
            fontWeight: 700,
            color: "#fff",
            backgroundColor: "#ef3340",
            "&:hover": { backgroundColor: "#d62835" },
          }}
        >
          {busy || confirming ? "Processing…" : "Release Payout"}
        </Button>
      )}
    </>
  );

  return (
    <>
      <Dialog
        open={open && !confirmOpen}
        onClose={confirming ? undefined : onClose}
        TransitionComponent={Transition}
        maxWidth={false}
        aria-labelledby="payout-review-title"
        PaperProps={{
          sx: {
            width: "min(100% - 24px, 470px)",
            maxWidth: 470,
            borderRadius: 3,
            overflow: "hidden",
          },
        }}
      >
        <DialogTitle
          id="payout-review-title"
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.75,
            px: 2.5,
            py: 1.75,
            fontSize: 16,
            fontWeight: 700,
          }}
        >
          <AccountBalanceWalletOutlinedIcon sx={{ color: "error.main", fontSize: 20 }} />
          {title}
          <Button
            aria-label="Close payout review"
            onClick={onClose}
            disabled={busy || confirming}
            sx={{
              minWidth: 28,
              width: 28,
              height: 28,
              ml: "auto",
              p: 0,
              color: "text.secondary",
            }}
          >
            <CloseIcon sx={{ fontSize: 18 }} />
          </Button>
        </DialogTitle>

        <DialogContent dividers>
          {selected && (
            <Stack spacing={2}>
              {actionError && <Alert severity="error">{actionError}</Alert>}

              <Box>
                <Typography fontWeight={800}>{selected.orderNumber}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {selected.sellerName || `Seller ${selected.sellerId}`}
                </Typography>
              </Box>

              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body2">Buyer payment</Typography>
                <Chip size="small" label={selected.paymentStatus || "Paid"} variant="outlined" />
              </Stack>

              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body2">Seller payout</Typography>
                <Chip
                  size="small"
                  label={payoutDisplayStatus(selected)}
                  color={payoutStatusColor[selected.payoutStatus] || "default"}
                  sx={{ color: "#fff" }}
                />
              </Stack>

              {(selected.providerTransferId || selected.providerBatchId) && (
                <Box>
                  {selected.providerBatchId && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      PayMongo Batch ID: {selected.providerBatchId}
                    </Typography>
                  )}
                  {selected.providerTransferId && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      PayMongo Transfer ID: {selected.providerTransferId}
                    </Typography>
                  )}
                </Box>
              )}

              <Box>
                <Typography variant="caption" color="text.secondary">Net student payout</Typography>
                <Typography variant="h5" fontWeight={800} sx={{ color: "success.main" }}>
                  {formatPayoutCurrency(payoutValue(selected))}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Artwork total {formatPayoutCurrency(selected.gross)}
                  {Number(selected.refundAmount) > 0 && ` · Refunded −${formatPayoutCurrency(selected.refundAmount)}`}
                  {Number(selected.processingFee || 0) > 0 && ` · Fee −${formatPayoutCurrency(selected.processingFee)}`}
                </Typography>
                {Number(selected.commission) > 0 && (
                  <Typography variant="caption" color="text.secondary" display="block">
                    Recorded commission {formatPayoutCurrency(selected.commission)}
                  </Typography>
                )}
              </Box>

              <Box>
                <Typography variant="body2">Delivered: {formatPayoutDate(selected.deliveredAt)}</Typography>
                <Typography variant="body2">Payout eligible from: {formatPayoutDate(selected.eligibleAt)}</Typography>
              </Box>

              <Typography variant="body2">
                Returns: {selected.returnStatus || "None"} · Refunds: {selected.refundStatus || "None"}
              </Typography>

              {selected.holdReason && <Alert severity="info">{selected.holdReason}</Alert>}
              {selected.failureReason && <Alert severity="error">{selected.failureReason}</Alert>}

              <Box>
                <Typography variant="subtitle2" fontWeight={700}>Saved destination</Typography>
                {selected.destination ? (
                  <>
                    <Typography variant="body2">{selected.destination.institutionName}</Typography>
                    <Typography variant="body2">{selected.destination.accountName}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {selected.destination.maskedAccountNumber}
                    </Typography>
                  </>
                ) : (
                  <Typography variant="body2" color="error.main">
                    Seller payout destination is not configured.
                  </Typography>
                )}
              </Box>

              {capability?.enabled === false && (
                <Alert severity="warning">
                  {capability.message || "Sending payouts is currently unavailable."}
                </Alert>
              )}

              {!["Processing", "Paid"].includes(selected.payoutStatus) && (
                <Stack spacing={1.5} sx={{ pt: 1, borderTop: "1px solid", borderColor: "divider" }}>
                  <Typography variant="subtitle2" fontWeight={700}>
                    Verify an existing PayMongo refund
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Verify a refund already issued through the PayMongo Dashboard and allocate it to this seller order. For a shared checkout, confirm that it belongs to these returned items. The provider verifies the amount; this action does not send a refund.
                  </Typography>

                  <TextField
                    label="PayMongo refund ID"
                    value={refundId}
                    onChange={(event) => setRefundId(event.target.value)}
                    disabled={busy || confirming}
                    size="small"
                    slotProps={{ htmlInput: { maxLength: 100 } }}
                  />

                  {completedReturns.length > 0 && (
                    <TextField
                      select
                      required
                      label="Completed return request"
                      value={returnRequestId}
                      onChange={(event) => setReturnRequestId(event.target.value)}
                      disabled={busy || confirming}
                      size="small"
                    >
                      {completedReturns.map((item) => (
                        <MenuItem key={item.returnRequestId} value={item.returnRequestId}>
                          Return #{item.returnRequestId} · Returned {formatPayoutCurrency(item.returnedAmount)} · Refunded {formatPayoutCurrency(item.refundedAmount)}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}

                  <Button
                    variant="outlined"
                    onClick={onRefund}
                    disabled={busy || confirming || loading || Boolean(error) || !refundId.trim() || (completedReturns.length > 0 && !returnRequestId)}
                  >
                    Verify existing refund
                  </Button>
                </Stack>
              )}
            </Stack>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>{dialogActions}</DialogActions>
      </Dialog>

      {/* Password Confirmation Dialog to Release Payout to Seller's Wallet */}
      <PayoutConfirm
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        handleClose={() => setConfirmOpen(false)}
        payout={selected}
        submitting={busy || confirming}
        onConfirm={handleConfirmPayout}
        onSubmit={handleConfirmPayout}
      />
    </>
  );
}
