import React from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Slide,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import AccountBalanceOutlinedIcon from "@mui/icons-material/AccountBalanceOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CloseIcon from "@mui/icons-material/Close";
import HighlightOffIcon from "@mui/icons-material/HighlightOff";
import { formatPayoutDate } from "../../seller/Payout/payoutDisplay";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export default function AccountRequestsInfo({
  open,
  request,
  dialogMode,
  setDialogMode,
  comment,
  setComment,
  busy,
  onClose,
  onApprove,
  onReject,
}) {
  const theme = useTheme();
  const isPending = request?.status === "Pending";
  const canDecide = isPending && !request?.userVoted;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      TransitionComponent={Transition}
      keepMounted
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          width: "min(100% - 24px, 470px)",
          maxWidth: "470px",
          borderRadius: 3,
          overflow: "hidden",
          backgroundColor: theme.palette.background.paper,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.75,
          px: 2.5,
          py: 1.75,
          color: theme.palette.text.primary,
          fontSize: 16,
          fontWeight: 700,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <AccountBalanceOutlinedIcon sx={{ color: "#ef3340", fontSize: 20 }} />
        {dialogMode === "reject" ? "Reject payout method change" : "Review payout method change"}
        <Button
          aria-label="Close payout method request"
          onClick={onClose}
          disabled={busy}
          sx={{
            minWidth: 28,
            width: 28,
            height: 28,
            ml: "auto",
            p: 0,
            color: theme.palette.text.secondary,
          }}
        >
          <CloseIcon sx={{ fontSize: 18 }} />
        </Button>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 2.5 }}>
        {request && (
          <Stack spacing={2.5}>
            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Student details
              </Typography>
              <Typography variant="body1" fontWeight={700}>{request.studentName}</Typography>
              <Typography variant="body2" color="text.secondary">
                Student Number: {request.studentNumber || "N/A"}
              </Typography>
            </Box>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <Paper variant="outlined" sx={{ flex: 1, p: 1.5, borderRadius: 2, bgcolor: "action.hover" }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>
                  CURRENT ACTIVE DESTINATION
                </Typography>
                {request.currentDestination ? (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="body2" fontWeight={700}>{request.currentDestination.institutionName}</Typography>
                    <Typography variant="body2">{request.currentDestination.accountName}</Typography>
                    <Typography variant="caption" color="text.secondary">{request.currentDestination.maskedAccountNumber}</Typography>
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    No active destination
                  </Typography>
                )}
              </Paper>

              <Paper variant="outlined" sx={{ flex: 1, p: 1.5, borderRadius: 2, borderColor: "primary.light" }}>
                <Typography variant="caption" color="primary.main" fontWeight={700}>
                  REQUESTED NEW DESTINATION
                </Typography>
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body2" fontWeight={700}>{request.institutionName}</Typography>
                  <Typography variant="body2">{request.accountName}</Typography>
                  <Typography variant="caption" color="text.secondary">{request.maskedAccountNumber}</Typography>
                </Box>
              </Paper>
            </Stack>

            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Stack spacing={1}>
                <Typography variant="subtitle2" fontWeight={700}>
                  Approved by
                </Typography>
                {request.decisions?.filter((decision) => decision.decision === "Approved").length > 0 ? (
                  request.decisions
                    .filter((decision) => decision.decision === "Approved")
                    .map((decision, index) => (
                      <Box
                        key={`${decision.adminName}-${decision.createdAt}-${index}`}
                        sx={{
                          pl: 1,
                          borderLeft: "2px solid",
                          borderColor: "success.main",
                        }}
                      >
                        <Stack direction="row" justifyContent="space-between" gap={1} flexWrap="wrap">
                          <Typography variant="body2" fontWeight={600}>
                            {decision.adminName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatPayoutDate(decision.createdAt)}
                          </Typography>
                        </Stack>
                        {decision.comment && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            {decision.comment}
                          </Typography>
                        )}
                      </Box>
                    ))
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No approvals recorded yet.
                  </Typography>
                )}
              </Stack>
            </Paper>

            {request.status === "Approved" && (
              <Alert severity="success" icon={<CheckCircleOutlineIcon />}>
                This change request has been fully approved by an administrator and applied to the student&apos;s active payout account.
              </Alert>
            )}
            {request.status === "Rejected" && (
              <Alert severity="error" icon={<HighlightOffIcon />}>
                <Typography variant="subtitle2" fontWeight={700}>Request rejected</Typography>
                <Typography variant="body2">{request.rejectionReason || "No reason specified."}</Typography>
              </Alert>
            )}
            {isPending && request.userVoted && (
              <Alert severity="info">
                You have already submitted your decision for this request.
              </Alert>
            )}

            {canDecide && (
              <TextField
                label={dialogMode === "reject" ? "Rejection reason (required)" : "Approval note (optional)"}
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                multiline
                minRows={2}
                required={dialogMode === "reject"}
                error={dialogMode === "reject" && !comment.trim()}
                helperText={dialogMode === "reject" ? "Explain to the student why this change is rejected." : "Optional audit note."}
                disabled={busy}
                fullWidth
              />
            )}
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={busy} color="inherit" sx={{ minHeight: 44 }}>
          Cancel
        </Button>
        {canDecide && (dialogMode === "review" ? (
          <>
            <Button
              color="error"
              variant="outlined"
              onClick={() => setDialogMode("reject")}
              disabled={busy}
              sx={{ minHeight: 44 }}
            >
              Reject
            </Button>
            <Button
              color="primary"
              variant="contained"
              onClick={onApprove}
              disabled={busy}
              sx={{ minHeight: 44, color: "#fff", fontWeight: 700 }}
            >
              {busy ? "Submitting…" : "Approve"}
            </Button>
          </>
        ) : (
          <>
            <Button onClick={() => setDialogMode("review")} disabled={busy} sx={{ minHeight: 44 }}>
              Back
            </Button>
            <Button
              color="error"
              variant="contained"
              onClick={onReject}
              disabled={busy || !comment.trim()}
              sx={{ minHeight: 44, color: "#fff", fontWeight: 700 }}
            >
              {busy ? "Rejecting…" : "Confirm rejection"}
            </Button>
          </>
        ))}
      </DialogActions>
    </Dialog>
  );
}