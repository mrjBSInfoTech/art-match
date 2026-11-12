import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Paper,
  Slide,
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
import CloseIcon from "@mui/icons-material/Close";
import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

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

export default function PayoutChangeConfirm({
  open,
  onClose,
  onConfirm,
  currentWalletId = "",
  newWalletId = "",
  reason = "",
  isAllSettled = true,
  unsettledCount = 0,
  unsettledTotal = 0,
  unsettledOrders = [],
  mode = "request",
  busy = false,
  error = "",
}) {
  const theme = useTheme();
  const [acknowledged, setAcknowledged] = useState(false);
  const [showOrderList, setShowOrderList] = useState(false);

  useEffect(() => {
    if (open) {
      setAcknowledged(false);
      setShowOrderList(false);
    }
  }, [open]);

  const isApplying = mode === "apply";

  const handleConfirmClick = async () => {
    if (typeof onConfirm === "function") {
      await onConfirm();
    }
  };

  const formattedTotal = Number(unsettledTotal || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onClose}
      disableEscapeKeyDown={busy}
      TransitionComponent={Transition}
      maxWidth={false}
      aria-labelledby="payout-change-confirm-title"
      PaperProps={{
        sx: {
          width: "min(100% - 24px, 540px)",
          maxWidth: 540,
          borderRadius: 3,
          overflow: "hidden",
          backgroundColor: theme.palette.background.paper,
        },
      }}
    >
      <DialogTitle
        id="payout-change-confirm-title"
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          px: 2.5,
          py: 2,
          fontSize: 17,
          fontWeight: 700,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <AccountBalanceWalletOutlinedIcon sx={{ color: "error.main", fontSize: 22 }} />
        {isApplying ? "Apply PayMongo Wallet Change" : "Confirm PayMongo Wallet Change"}
        <Button
          aria-label="Close dialog"
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

      <DialogContent dividers sx={{ px: 2.5, py: 2 }}>
        <Stack spacing={2.25}>
          {error && <Alert severity="error">{error}</Alert>}

          {/* Settlement Status Verification */}
          {isAllSettled ? (
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: theme.palette.mode === "dark" ? "rgba(46, 125, 50, 0.15)" : "#f0fdf4",
                borderColor: theme.palette.mode === "dark" ? "rgba(46, 125, 50, 0.3)" : "#bbf7d0",
              }}
            >
              <Stack direction="row" spacing={1.5} alignItems="flex-start">
                <CheckCircleOutlineIcon color="success" sx={{ fontSize: 22, mt: 0.25 }} />
                <Box>
                  <Typography variant="subtitle2" fontWeight={700} color="success.main">
                    All Payouts Settled
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                    There are 0 active or pending seller payouts in the system (₱0.00 in-flight). All previous payouts have been completely settled.
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          ) : (
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: theme.palette.mode === "dark" ? "rgba(237, 108, 2, 0.15)" : "#fffbeb",
                borderColor: theme.palette.mode === "dark" ? "rgba(237, 108, 2, 0.3)" : "#fde68a",
              }}
            >
              <Stack direction="row" spacing={1.5} alignItems="flex-start">
                <WarningAmberOutlinedIcon color="warning" sx={{ fontSize: 22, mt: 0.25 }} />
                <Box sx={{ width: "100%" }}>
                  <Typography variant="subtitle2" fontWeight={700} color="warning.main">
                    Attention: {unsettledCount} Unsettled Payout{unsettledCount > 1 ? "s" : ""} Detected
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                    There {unsettledCount > 1 ? "are" : "is"} currently <strong>{unsettledCount} payout(s)</strong> totaling <strong>₱{formattedTotal}</strong> in Held, Eligible, or Processing status.
                  </Typography>
                  <Typography variant="caption" color="error.main" display="block" sx={{ mt: 0.5, fontWeight: 600 }}>
                    ⚠️ Changing the wallet while transactions are unsettled may lead to transfer discrepancies or failed settlements.
                  </Typography>

                  {unsettledOrders.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                      <Button
                        size="small"
                        onClick={() => setShowOrderList(!showOrderList)}
                        sx={{ textTransform: "none", fontSize: 12, p: 0, minWidth: "auto" }}
                      >
                        {showOrderList ? "Hide unsettled orders" : `View ${unsettledOrders.length} unsettled order(s)`}
                      </Button>
                      {showOrderList && (
                        <TableContainer component={Paper} variant="outlined" sx={{ mt: 1, maxHeight: 150 }}>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell sx={{ fontSize: 11, fontWeight: 700 }}>Order</TableCell>
                                <TableCell sx={{ fontSize: 11, fontWeight: 700 }}>Seller</TableCell>
                                <TableCell sx={{ fontSize: 11, fontWeight: 700 }}>Status</TableCell>
                                <TableCell align="right" sx={{ fontSize: 11, fontWeight: 700 }}>Amount</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {unsettledOrders.map((uo) => (
                                <TableRow key={uo.splitId}>
                                  <TableCell sx={{ fontSize: 11, fontFamily: "monospace" }}>{uo.orderNumber}</TableCell>
                                  <TableCell sx={{ fontSize: 11 }}>{uo.sellerName || "Seller"}</TableCell>
                                  <TableCell sx={{ fontSize: 11 }}>{uo.status}</TableCell>
                                  <TableCell align="right" sx={{ fontSize: 11, fontWeight: 700 }}>
                                    ₱{Number(uo.amount || 0).toFixed(2)}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      )}
                    </Box>
                  )}
                </Box>
              </Stack>
            </Paper>
          )}

          {/* Wallet Transition Summary Card */}
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: theme.palette.background.default }}>
            <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase" letterSpacing={0.5}>
              Wallet Migration Summary
            </Typography>
            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mt: 1.25, flexWrap: "wrap" }}>
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">Current Wallet</Typography>
                <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 700, wordBreak: "break-all" }}>
                  {currentWalletId || "(None configured)"}
                </Typography>
              </Box>
              <ArrowForwardIcon sx={{ color: "text.secondary", fontSize: 18 }} />
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">New Proposed Wallet</Typography>
                <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 800, color: "primary.main", wordBreak: "break-all" }}>
                  {newWalletId}
                </Typography>
              </Box>
            </Stack>

            {reason && (
              <Box sx={{ mt: 1.5, pt: 1, borderTop: `1px dashed ${theme.palette.divider}` }}>
                <Typography variant="caption" color="text.secondary" display="block">Reason / Justification</Typography>
                <Typography variant="body2" sx={{ fontStyle: "italic", mt: 0.25 }}>
                  "{reason}"
                </Typography>
              </Box>
            )}
          </Paper>

          {/* Approval Governance Notice */}
          <Alert severity="info" sx={{ "& .MuiAlert-message": { fontSize: 13 } }}>
            {isApplying ? (
              <span><strong>3 of 3 Administrator Approvals</strong> have been verified. Applying this action will immediately activate the new PayMongo payout wallet.</span>
            ) : (
              <span>Once submitted, this wallet change request requires <strong>3 separate approvals from administrators with payout permissions</strong> before the Super Admin can apply it.</span>
            )}
          </Alert>

          {/* Explicit Acknowledgment Checkbox */}
          <Box sx={{ pt: 0.5 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={acknowledged}
                  onChange={(e) => setAcknowledged(e.target.checked)}
                  color="error"
                  disabled={busy}
                />
              }
              label={
                <Typography variant="body2" fontWeight={600} sx={{ color: acknowledged ? "text.primary" : "text.secondary" }}>
                  I verify that the payout settlement status has been reviewed and confirm {isApplying ? "applying" : "requesting"} this PayMongo payout wallet change.
                </Typography>
              }
            />
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 2.5, py: 2 }}>
        <Button onClick={onClose} disabled={busy} color="inherit" sx={{ color: "text.secondary" }}>
          Cancel
        </Button>
        <Button
          onClick={handleConfirmClick}
          disabled={busy || !acknowledged}
          variant="contained"
          color="error"
          sx={{
            borderRadius: 1.5,
            px: 2.5,
            textTransform: "none",
            fontWeight: 700,
            color: "#fff",
          }}
        >
          {busy && <CircularProgress size={16} color="inherit" sx={{ mr: 1 }} />}
          {busy
            ? "Processing…"
            : isApplying
            ? "Confirm & Apply Change"
            : "Confirm & Submit Request"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
