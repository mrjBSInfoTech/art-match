import React, { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningIcon from "@mui/icons-material/Warning";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import HowToVoteIcon from "@mui/icons-material/HowToVote";
import PayoutChangeConfirm from "./PayoutChangeConfirm";

export default function PayMongoWalletPanel({
  walletData,
  loading = false,
  busy = false,
  isSuperAdmin = false,
  isFinanceAdmin = false,
  onRequestChange,
  onApproveChange,
  onRejectChange,
  onApplyChange,
  onCancelChange,
  onRefresh,
}) {
  const theme = useTheme();
  const [newWalletId, setNewWalletId] = useState("");
  const [reason, setReason] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMode, setConfirmMode] = useState("request"); // "request" | "apply"
  const [voteComment, setVoteComment] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [copied, setCopied] = useState(false);

  const currentWalletId = walletData?.currentWalletId || "";
  const walletSource = walletData?.walletSource || "environment";
  const isAllSettled = walletData?.isAllSettled ?? true;
  const unsettledCount = walletData?.unsettledCount ?? 0;
  const unsettledTotal = walletData?.unsettledTotal ?? 0;
  const unsettledOrders = walletData?.unsettledOrders || [];
  const activeRequest = walletData?.activeRequest || null;
  const history = walletData?.history || [];

  const isValidWalletFormat = /^wallet_[A-Za-z0-9_-]+$/.test(newWalletId.trim());
  const isDifferentFromCurrent = newWalletId.trim() !== currentWalletId.trim();
  const canSubmitRequest = isSuperAdmin && isValidWalletFormat && isDifferentFromCurrent && !activeRequest;

  const handleCopyWallet = () => {
    if (currentWalletId && navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(currentWalletId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleOpenRequestConfirm = () => {
    setConfirmMode("request");
    setConfirmOpen(true);
  };

  const handleOpenApplyConfirm = () => {
    setConfirmMode("apply");
    setConfirmOpen(true);
  };

  const handleExecuteConfirmedAction = async () => {
    if (confirmMode === "request") {
      if (typeof onRequestChange === "function") {
        await onRequestChange(newWalletId.trim(), reason.trim());
        setNewWalletId("");
        setReason("");
      }
    } else if (confirmMode === "apply") {
      if (typeof onApplyChange === "function" && activeRequest?.requestId) {
        await onApplyChange(activeRequest.requestId);
      }
    }
    setConfirmOpen(false);
  };

  const handleVoteApprove = async () => {
    if (typeof onApproveChange === "function" && activeRequest?.requestId) {
      await onApproveChange(activeRequest.requestId, voteComment.trim());
      setVoteComment("");
    }
  };

  const handleVoteReject = async () => {
    if (typeof onRejectChange === "function" && activeRequest?.requestId) {
      if (!voteComment.trim()) {
        setShowRejectInput(true);
        return;
      }
      await onRejectChange(activeRequest.requestId, voteComment.trim());
      setVoteComment("");
      setShowRejectInput(false);
    }
  };

  if (loading) {
    return (
      <Stack alignItems="center" justifyContent="center" sx={{ py: 6 }}>
        <CircularProgress size={32} />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
          Loading PayMongo wallet settings…
        </Typography>
      </Stack>
    );
  }

  const approvalProgress = activeRequest
    ? Math.min(100, (activeRequest.approvalCount / (activeRequest.approvalsRequired || 3)) * 100)
    : 0;

  return (
    <Stack spacing={3}>
      {/* 1. TOP CARDS: CURRENT WALLET & SETTLEMENT HEALTH */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
          alignItems: "stretch",
          gap: 2.5,
        }}
      >
        {/* CURRENT WALLET CARD */}
        <Paper
          variant="outlined"
          sx={{
            p: 2.5,
            height: "100%",
            boxSizing: "border-box",
            borderRadius: 3,
            bgcolor: theme.palette.background.paper,
            border: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <AccountBalanceWalletIcon color="primary" sx={{ fontSize: 22 }} />
              <Typography variant="subtitle1" fontWeight={700}>
                Active PayMongo Wallet
              </Typography>
            </Stack>
            <Chip
              size="small"
              label={`Source: ${walletSource}`}
              variant="outlined"
              sx={{ fontSize: 11, fontWeight: 600, textTransform: "capitalize" }}
            />
          </Stack>

          <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: theme.palette.background.default, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
            <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 700, fontSize: 13, wordBreak: "break-all" }}>
              {currentWalletId || "(None configured in system)"}
            </Typography>
            {currentWalletId && (
              <Tooltip title={copied ? "Copied!" : "Copy Wallet ID"}>
                <IconButton size="small" onClick={handleCopyWallet}>
                  <ContentCopyIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            )}
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
            This wallet receives outbound payout requests to disburse earnings directly to students' registered bank/e-wallet accounts.
          </Typography>
        </Paper>

        {/* SETTLEMENT STATUS CARD */}
        <Paper
          variant="outlined"
          sx={{
            p: 2.5,
            height: "100%",
            boxSizing: "border-box",
            borderRadius: 3,
            bgcolor: theme.palette.background.paper,
            border: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
            <Typography variant="subtitle1" fontWeight={700}>
              Payout Settlement Status
            </Typography>
            {isAllSettled ? (
              <Chip
                icon={<CheckCircleIcon sx={{ fontSize: "16px !important" }} />}
                label="All Settled"
                color="success"
                size="small"
                sx={{ fontWeight: 700, fontSize: 11, color:"#fff" }}
              />
            ) : (
              <Chip
                icon={<WarningIcon sx={{ fontSize: "16px !important" }} />}
                label={`${unsettledCount} Unsettled`}
                color="warning"
                size="small"
                sx={{ fontWeight: 700, fontSize: 11 }}
              />
            )}
          </Stack>

          <Typography variant="h5" fontWeight={800} color={isAllSettled ? "success.main" : "warning.main"}>
            ₱{Number(unsettledTotal || 0).toFixed(2)}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
            {isAllSettled
              ? "All seller payouts are completely settled. The payout wallet can be safely reconfigured."
              : `${unsettledCount} transaction(s) currently held, eligible, or processing. Complete or settle payouts before switching.`}
          </Typography>
        </Paper>
      </Box>

      {/* 2. ACTIVE WALLET CHANGE REQUEST & APPROVAL GOVERNANCE */}
      {activeRequest && (
        <Paper
          variant="outlined"
          sx={{
            p: 2.5,
            borderRadius: 3,
            bgcolor: theme.palette.mode === "dark" ? "rgba(30, 41, 59, 0.5)" : "#f8fafc",
            borderColor: activeRequest.status === "Approved" ? "success.main" : "primary.main",
            borderWidth: 2,
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1} sx={{ mb: 2 }}>
            <Stack direction="row" spacing={1.25} alignItems="center">
              <HowToVoteIcon color="primary" />
              <Box>
                <Typography variant="subtitle1" fontWeight={800}>
                  Active Wallet Change Request #{activeRequest.requestId}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Requested by {activeRequest.superAdminName || "Super Admin"} on {new Date(activeRequest.createdAt).toLocaleString()}
                </Typography>
              </Box>
            </Stack>

            <Chip
              label={`${activeRequest.status}: ${activeRequest.approvalCount} / ${activeRequest.approvalsRequired} Approvals`}
              color={activeRequest.status === "Approved" ? "success" : "warning"}
              sx={{ fontWeight: 700, fontSize: 12, px: 0.5 }}
            />
          </Stack>

          <Box sx={{ mb: 2 }}>
            <LinearProgress
              variant="determinate"
              value={approvalProgress}
              color={activeRequest.status === "Approved" ? "success" : "primary"}
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={6}>
              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary">Current Active Wallet</Typography>
                <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 700 }}>
                  {activeRequest.currentWalletId || "(none)"}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, borderColor: "primary.main" }}>
                <Typography variant="caption" color="primary.main" fontWeight={700}>Proposed New Wallet</Typography>
                <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 800, color: "primary.main" }}>
                  {activeRequest.newWalletId}
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          {activeRequest.reason && (
            <Alert severity="info" sx={{ mb: 2, "& .MuiAlert-message": { fontSize: 13 } }}>
              <strong>Super Admin Reason:</strong> "{activeRequest.reason}"
            </Alert>
          )}

          {/* RECORDED APPROVALS / DECISIONS */}
          {activeRequest.decisions && activeRequest.decisions.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase" sx={{ mb: 1, display: "block" }}>
                Recorded Administrator Approvals ({activeRequest.decisions.length})
              </Typography>
              <Stack spacing={1}>
                {activeRequest.decisions.map((dec) => (
                  <Paper
                    key={dec.approvalId}
                    variant="outlined"
                    sx={{ p: 1.25, borderRadius: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip
                        size="small"
                        label={dec.decision}
                        color={dec.decision === "Approved" ? "success" : "error"}
                        sx={{ fontWeight: 700, fontSize: 10, height: 20 }}
                      />
                      <Typography variant="body2" fontWeight={700}>
                        {dec.adminName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        ({dec.role})
                      </Typography>
                    </Stack>
                    {dec.comment && (
                      <Typography variant="caption" sx={{ fontStyle: "italic", color: "text.secondary" }}>
                        "{dec.comment}"
                      </Typography>
                    )}
                    <Typography variant="caption" color="text.secondary">
                      {new Date(dec.createdAt).toLocaleDateString()}
                    </Typography>
                  </Paper>
                ))}
              </Stack>
            </Box>
          )}

          {/* VOTING SECTION FOR AUTHORIZED PAYOUT ADMINS */}
          {activeRequest.canCurrentUserApprove && (
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: theme.palette.background.paper, mb: 2 }}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                Cast Your Payout Admin Approval
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
                As an authorized payout administrator, your vote is required to authorize the Super Admin to switch the PayMongo wallet.
              </Typography>

              <TextField
                size="small"
                fullWidth
                label="Approval / Rejection Comment (optional for approve, required for reject)"
                value={voteComment}
                onChange={(e) => setVoteComment(e.target.value)}
                disabled={busy}
                sx={{ mb: 1.5 }}
              />

              <Stack direction="row" spacing={1.5}>
                <Button
                  variant="contained"
                  color="success"
                  onClick={handleVoteApprove}
                  disabled={busy}
                  sx={{ textTransform: "none", fontWeight: 700 }}
                >
                  {busy ? "Submitting…" : "Approve Wallet Change"}
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={handleVoteReject}
                  disabled={busy}
                  sx={{ textTransform: "none", fontWeight: 700 }}
                >
                  Reject Request
                </Button>
              </Stack>
            </Paper>
          )}

          {/* SUPER ADMIN ACTIONS ON ACTIVE REQUEST */}
          {isSuperAdmin && (
            <Stack direction="row" spacing={1.5} justifyContent="flex-end" sx={{ pt: 1, borderTop: `1px solid ${theme.palette.divider}` }}>
              <Button
                variant="outlined"
                color="inherit"
                onClick={() => onCancelChange(activeRequest.requestId)}
                disabled={busy}
                sx={{ textTransform: "none", color: "text.secondary" }}
              >
                Cancel Request
              </Button>

              {activeRequest.status === "Approved" && (
                <Button
                  variant="contained"
                  color="error"
                  onClick={handleOpenApplyConfirm}
                  disabled={busy}
                  sx={{ textTransform: "none", fontWeight: 800, px: 3, color: "#fff" }}
                >
                  Apply Wallet Change Now
                </Button>
              )}
            </Stack>
          )}
        </Paper>
      )}

      {/* 3. REQUEST FORM (SUPER ADMIN EXCLUSIVE, WHEN NO REQUEST ACTIVE) */}
      {isSuperAdmin && !activeRequest && (
        <Paper
          variant="outlined"
          sx={{
            p: 2.5,
            borderRadius: 3,
            bgcolor: theme.palette.background.paper,
            border: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 0.5 }}>
            Change PayMongo Payout Wallet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Initiate a change of the active PayMongo Wallet ID. This request will require <strong>3 approvals from payout administrators</strong> before it can be applied.
          </Typography>

          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <TextField
              label="New PayMongo Wallet ID"
              placeholder="e.g. wallet_prod_a9821bcd7e"
              fullWidth
              value={newWalletId}
              onChange={(e) => setNewWalletId(e.target.value)}
              disabled={busy}
              size="small"
              error={Boolean(newWalletId && !isValidWalletFormat)}
              helperText={
                newWalletId && !isValidWalletFormat
                  ? "Wallet ID must start with wallet_ followed by letters, numbers, or dashes"
                  : "Enter the verified PayMongo payout wallet identifier"
              }
            />

            <TextField
              label="Reason for changing wallet"
              placeholder="e.g. Migration to primary institutional CAFA disbursement wallet"
              fullWidth
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={busy}
              multiline
              rows={2}
              size="small"
            />

            <Box>
              <Button
                variant="contained"
                color="error"
                onClick={handleOpenRequestConfirm}
                disabled={busy || !canSubmitRequest}
                sx={{
                  borderRadius: 1.5,
                  px: 3,
                  py: 1,
                  textTransform: "none",
                  fontWeight: 700,
                  color: "#fff",
                }}
              >
                Verify Settlement & Request Change
              </Button>
            </Box>
          </Box>
        </Paper>
      )}

      {/* 4. PAST WALLET CHANGE HISTORY */}
      {history.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
          <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1.5 }}>
            Wallet Change History
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Requested By</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>From Wallet</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>To Wallet</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Applied By</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {history.map((h) => (
                  <TableRow key={h.requestId}>
                    <TableCell sx={{ fontSize: 11 }}>{new Date(h.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell sx={{ fontSize: 11 }}>{h.superAdminName || "Super Admin"}</TableCell>
                    <TableCell sx={{ fontSize: 11, fontFamily: "monospace" }}>{h.currentWalletId}</TableCell>
                    <TableCell sx={{ fontSize: 11, fontFamily: "monospace", fontWeight: 700 }}>{h.newWalletId}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={h.status}
                        color={h.status === "Applied" ? "success" : h.status === "Rejected" ? "error" : "default"}
                        sx={{ fontSize: 10, height: 20, fontWeight: 700 }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: 11 }}>{h.appliedByName || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* 5. CONFIRMATION DIALOG (PayoutChangeConfirm.jsx) */}
      <PayoutChangeConfirm
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleExecuteConfirmedAction}
        currentWalletId={confirmMode === "request" ? currentWalletId : activeRequest?.currentWalletId}
        newWalletId={confirmMode === "request" ? newWalletId : activeRequest?.newWalletId}
        reason={confirmMode === "request" ? reason : activeRequest?.reason}
        isAllSettled={isAllSettled}
        unsettledCount={unsettledCount}
        unsettledTotal={unsettledTotal}
        unsettledOrders={unsettledOrders}
        mode={confirmMode}
        busy={busy}
      />
    </Stack>
  );
}
