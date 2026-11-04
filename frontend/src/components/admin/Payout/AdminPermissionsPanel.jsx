import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Slide,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import React from "react";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import HighlightOffIcon from "@mui/icons-material/HighlightOff";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import SecurityIcon from "@mui/icons-material/Security";
import CloseIcon from "@mui/icons-material/Close";
import { formatPayoutDate } from "../../seller/Payout/payoutDisplay";

const Transition = React.forwardRef(function Transition(props, ref) {
  return (
    <Slide
      direction="up"
      ref={ref}
      {...props}
      timeout={400}
      easing={{ enter: "cubic-bezier(0.4, 0, 0.2, 1)", exit: "ease-out" }}
    />
  );
});

export default function AdminPermissionsPanel({
  permissionStatus,
  isSuperAdmin,
  requests = [],
  loading = false,
  busy = false,
  onRequestPermission,
  onApproveRequest,
  onRejectRequest,
}) {
  const [requestReason, setRequestReason] = useState("");
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const handleSendRequest = async (e) => {
    e.preventDefault();
    setSubmittingRequest(true);
    try {
      await onRequestPermission(requestReason.trim());
      setRequestReason("");
    } finally {
      setSubmittingRequest(false);
    }
  };

  const handleApprove = async (reqId) => {
    await onApproveRequest(reqId);
  };

  const handleRejectConfirm = async () => {
    if (!selectedRequest) return;
    await onRejectRequest(selectedRequest.requestId, rejectionReason.trim());
    setSelectedRequest(null);
    setRejectionReason("");
  };

  // Status for non-Super Admins
  const status = permissionStatus?.permissionStatus || "Not Requested";
  const roleName = permissionStatus?.role || "Admin";

  const getStatusBadge = (st) => {
    if (st === "Approved") return <Chip size="small" color="success" label="Approved" sx={{ color: "#fff", fontWeight: 700 }} />;
    if (st === "Rejected") return <Chip size="small" color="error" label="Rejected" sx={{ color: "#fff", fontWeight: 700 }} />;
    return <Chip size="small" color="warning" label="Pending Super Admin Review" sx={{ fontWeight: 700 }} />;
  };

  return (
    <Stack spacing={3}>
      {/* If current user is Customizable / Moderation Admin, show their own status */}
      {!isSuperAdmin && (
        <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3 }}>
          <Stack spacing={2}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <SecurityIcon color="primary" />
              <Box>
                <Typography variant="h6" fontWeight={700}>
                  Payout Management Permission
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Role: <strong>{roleName}</strong> · As a {roleName} administrator, managing and approving student payouts requires approval from a Super Admin.
                </Typography>
              </Box>
            </Stack>

            {status === "Approved" && (
              <Alert severity="success" icon={<CheckCircleOutlineIcon />}>
                <Typography variant="subtitle2" fontWeight={700}>Permission Granted</Typography>
                <Typography variant="body2">
                  A Super Admin has approved your permission request. You can now review, approve, and manage student payouts.
                </Typography>
              </Alert>
            )}

            {status === "Pending" && (
              <Alert severity="warning" icon={<AccessTimeIcon />}>
                <Typography variant="subtitle2" fontWeight={700}>Permission Request Pending Review</Typography>
                <Typography variant="body2">
                  Your request to handle student payouts has been submitted and is currently awaiting review by a Super Admin. Payout management actions will be enabled once approved.
                </Typography>
                {permissionStatus?.request?.requestedAt && (
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                    Submitted on: {formatPayoutDate(permissionStatus.request.requestedAt)}
                  </Typography>
                )}
              </Alert>
            )}

            {status === "Rejected" && (
              <Alert severity="error" icon={<HighlightOffIcon />}>
                <Typography variant="subtitle2" fontWeight={700}>Permission Request Rejected</Typography>
                <Typography variant="body2">
                  {permissionStatus?.request?.rejectionReason || "Your request to handle student payouts was rejected by a Super Admin."}
                </Typography>
              </Alert>
            )}

            {/* Request form if Not Requested or Rejected */}
            {(status === "Not Requested" || status === "Rejected") && (
              <Box component="form" onSubmit={handleSendRequest} sx={{ mt: 1 }}>
                <Stack spacing={2}>
                  <TextField
                    label="Reason for requesting payout management access (Optional)"
                    value={requestReason}
                    onChange={(e) => setRequestReason(e.target.value)}
                    multiline
                    minRows={2}
                    fullWidth
                    disabled={submittingRequest || busy}
                    placeholder="Briefly state why you need to approve or manage student payouts..."
                  />
                  <Box>
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={submittingRequest || busy}
                      sx={{ color: "#fff", fontWeight: 700 }}
                    >
                      {submittingRequest ? "Submitting…" : status === "Rejected" ? "Resubmit Permission Request" : "Request Payout Permission"}
                    </Button>
                  </Box>
                </Stack>
              </Box>
            )}
          </Stack>
        </Paper>
      )}

      {/* Super Admin Review Section */}
      {isSuperAdmin && (
        <Stack spacing={2}>
          <Box>
            <Typography variant="h6" fontWeight={700}>
              Admin Payout Permission Requests
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Review and authorize Customizable and Moderation administrators who have requested access to manage student payouts.
            </Typography>
          </Box>

          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
            <Table size="medium">
              <TableHead sx={{ bgcolor: "action.hover" }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Admin</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Role</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Reason / Notes</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Requested Date</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                      <CircularProgress size={24} />
                    </TableCell>
                  </TableRow>
                ) : requests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <Typography variant="body2" color="text.secondary">
                        No admin payout permission requests found.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  requests.map((r) => (
                    <TableRow key={r.requestId} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={700}>{r.adminName}</Typography>
                        <Typography variant="caption" color="text.secondary">{r.adminEmail}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip size="small" variant="outlined" label={r.adminRole} />
                      </TableCell>
                      <TableCell>{getStatusBadge(r.status)}</TableCell>
                      <TableCell sx={{ maxWidth: 260 }}>
                        <Typography variant="body2" color={r.reason ? "text.primary" : "text.secondary"} sx={{ overflowWrap: "anywhere" }}>
                          {r.reason || "No notes provided"}
                        </Typography>
                        {r.rejectionReason && (
                          <Typography variant="caption" color="error" display="block">
                            Rejection: {r.rejectionReason}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {formatPayoutDate(r.requestedAt)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        {r.status === "Pending" ? (
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Button
                              size="small"
                              color="error"
                              variant="outlined"
                              onClick={() => {
                                setSelectedRequest(r);
                                setRejectionReason("");
                              }}
                              disabled={busy}
                            >
                              Reject
                            </Button>
                            <Button
                              size="small"
                              variant="contained"
                              onClick={() => handleApprove(r.requestId)}
                              disabled={busy}
                              sx={{ color: "#fff", fontWeight: 700 }}
                            >
                              Approve
                            </Button>
                          </Stack>
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            Reviewed by {r.reviewerName || "Super Admin"}
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Stack>
      )}

      {/* Reject Confirmation Dialog */}
      <Dialog
        open={Boolean(selectedRequest)}
        onClose={() => setSelectedRequest(null)}
        TransitionComponent={Transition}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography variant="subtitle1" fontWeight={700}>Reject Permission Request</Typography>
          <Button onClick={() => setSelectedRequest(null)} sx={{ minWidth: 28, p: 0, color: "text.secondary" }}>
            <CloseIcon fontSize="small" />
          </Button>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Typography variant="body2">
              Rejecting permission request from <strong>{selectedRequest?.adminName}</strong> ({selectedRequest?.adminRole}).
            </Typography>
            <TextField
              label="Rejection Reason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              multiline
              minRows={2}
              fullWidth
              placeholder="State the reason for rejecting this permission request..."
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setSelectedRequest(null)} color="inherit">Cancel</Button>
          <Button color="error" variant="contained" onClick={handleRejectConfirm} sx={{ color: "#fff", fontWeight: 700 }}>
            Confirm Rejection
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

