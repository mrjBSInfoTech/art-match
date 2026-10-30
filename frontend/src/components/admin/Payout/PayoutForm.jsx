import React from "react";
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
  payoutApprovalLabel,
  canPayoutAction,
  approvalComment,
  setApprovalComment,
  loading,
  error,
  capability,
  refundId,
  setRefundId,
  returnRequestId,
  setReturnRequestId,
  completedReturns,
  canReleasePayout,
  onApprove,
  onReject,
  onRequestPayout,
  onRelease,
  onRefund,
  onReconcile,
}) {
  const dialogActions = (
    <>
      <Button color="text.secondary" onClick={onClose} disabled={busy}>Close</Button>
      {selected && canPayoutAction(selected, "reconcile") && (
        <Button onClick={onReconcile} disabled={busy || loading || Boolean(error)}>
          Check provider status
        </Button>
      )}
      {selected && canPayoutAction(selected, "request") && (
        <Button
          variant="contained"
          onClick={onRequestPayout}
          disabled={busy || loading || Boolean(error)}
          sx={{ textTransform: "none", fontWeight: 700, color:"#fff" }}
        >
          {busy ? "Submitting…" : "Request Payout"}
        </Button>
      )}
      {selected?.approval?.status === "Approved" && selected.payoutStatus === "Eligible" && (
        <Button
          variant="contained"
          onClick={onRelease}
          disabled={busy || loading || Boolean(error) || !canReleasePayout(selected, capability)}
          sx={{ textTransform: "none", fontWeight: 700, color:"#fff" }}
        >
          {busy ? "Submitting…" : "Release Payout"}
        </Button>
      )}
    </>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
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
          disabled={busy}
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
                sx={{color:"#fff"}}
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
              <Typography variant="caption" color="text.secondary">Payout amount</Typography>
              <Typography variant="h5" fontWeight={800}>
                {formatPayoutCurrency(payoutValue(selected))}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Artwork total {formatPayoutCurrency(selected.gross)} · Refunded {formatPayoutCurrency(selected.refundAmount)}
              </Typography>
              {(Number(selected.commission) > 0 || Number(selected.processingFee) > 0) && (
                <Typography variant="body2" color="text.secondary">
                  Recorded commission {formatPayoutCurrency(selected.commission)} · Recorded processing fee {formatPayoutCurrency(selected.processingFee)}
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

            <Stack spacing={1} sx={{ pt: 1, borderTop: "1px solid", borderColor: "divider" }}>
              <Typography variant="subtitle2" fontWeight={700}>Multi-admin approval</Typography>
              <Typography variant="body2">{payoutApprovalLabel(selected)}</Typography>
              <Typography variant="body2">
                Approvals: {selected.approval?.approvalCount || 0} / {selected.approval?.requiredApprovals || 3}
              </Typography>
              <Typography variant="body2">
                Requester: {selected.approval?.requestedByAdminId
                  ? `${selected.approval.requestedByName || "Admin"} (ID ${selected.approval.requestedByAdminId})`
                  : "Not requested"}
              </Typography>
              {selected.approval?.invalidationReason && (
                <Alert severity="warning">{selected.approval.invalidationReason}</Alert>
              )}
              {selected.approval?.requestedAt && (
                <Typography variant="caption" color="text.secondary">
                  Requested: {formatPayoutDate(selected.approval.requestedAt)}
                </Typography>
              )}

              {(selected.approval?.decisions || []).map((decision, index) => (
                <Box key={`${decision.adminId}-${index}`}>
                  <Typography variant="body2">
                    {decision.adminName || `Admin ${decision.adminId}`} · {decision.decision}
                    {decision.authorized === false ? " (no longer authorized)" : ""}
                  </Typography>
                  {decision.comment && (
                    <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
                      {decision.comment}
                    </Typography>
                  )}
                  <Typography variant="caption" color="text.secondary">
                    {formatPayoutDate(decision.createdAt)}
                  </Typography>
                </Box>
              ))}

              {selected.approval?.status === "Pending Approval" && (
                <Typography variant="body2" color="text.secondary">
                  The requester cannot approve. Each other authorized admin can vote once. Three distinct approvals are required.
                </Typography>
              )}

              {(canPayoutAction(selected, "approve") || canPayoutAction(selected, "reject")) && (
                <>
                  <TextField
                    label="Approval comment"
                    helperText="Required when rejecting. Optional when approving."
                    value={approvalComment}
                    onChange={(event) => setApprovalComment(event.target.value)}
                    disabled={busy}
                    size="small"
                    multiline
                    minRows={2}
                    slotProps={{ htmlInput: { maxLength: 500 } }}
                  />
                  <Stack direction="row" spacing={1}>
                    {canPayoutAction(selected, "approve") && (
                      <Button variant="outlined" onClick={onApprove} disabled={busy || loading || Boolean(error)}>
                        Approve
                      </Button>
                    )}
                    {canPayoutAction(selected, "reject") && (
                      <Button
                        color="error"
                        variant="outlined"
                        onClick={onReject}
                        disabled={busy || loading || Boolean(error) || !approvalComment.trim()}
                      >
                        Reject
                      </Button>
                    )}
                  </Stack>
                </>
              )}

              {selected.approval?.status === "Approved" && selected.payoutStatus === "Eligible" && (
                <Typography variant="body2" color="text.secondary">
                  Three independent approvals are recorded. An authorized admin must explicitly release the payout.
                </Typography>
              )}
            </Stack>

            {capability?.enabled === false && (
              <Alert severity="warning">
                {capability.message || "Sending payouts is currently unavailable."}
              </Alert>
            )}

            {!['Processing', 'Paid'].includes(selected.payoutStatus) && (
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
                  disabled={busy}
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
                    disabled={busy}
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
                  disabled={busy || loading || Boolean(error) || !refundId.trim() || (completedReturns.length > 0 && !returnRequestId)}
                >
                  Verify existing refund
                </Button>
              </Stack>
            )}

            {selected.payoutStatus === "Eligible" && (
              <Typography variant="body2" color="text.secondary">
                Requesting and approving do not release a payout. Release rechecks eligibility, the amount, the destination and all three approvals before the configured provider executes.
              </Typography>
            )}
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>{dialogActions}</DialogActions>
    </Dialog>
  );
}
