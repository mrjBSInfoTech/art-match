import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  MenuItem,
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

export default function AccountRequestsTable({
  requests = [],
  loading = false,
  onApprove,
  onReject,
  busy = false,
}) {
  const [selected, setSelected] = useState(null);
  const [dialogMode, setDialogMode] = useState("review"); // 'review' | 'reject'
  const [comment, setComment] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [search, setSearch] = useState("");

  const filtered = requests.filter((r) => {
    const matchesStatus = filterStatus === "All" || r.status === filterStatus;
    const matchesSearch = [r.studentName, r.studentEmail, r.institutionName, r.accountName]
      .join(" ")
      .toLowerCase()
      .includes(search.trim().toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const openReview = (req) => {
    setSelected(req);
    setDialogMode("review");
    setComment("");
  };

  const closeDialog = () => {
    if (!busy) {
      setSelected(null);
      setComment("");
    }
  };

  const handleApprove = async () => {
    if (!selected || busy) return;
    await onApprove(selected.requestId, comment);
    closeDialog();
  };

  const handleReject = async () => {
    if (!selected || busy || !comment.trim()) return;
    await onReject(selected.requestId, comment.trim());
    closeDialog();
  };

  const getStatusChip = (status) => {
    if (status === "Approved") return <Chip size="small" color="success" label="Approved" sx={{ color: "#fff", fontWeight: 700 }} />;
    if (status === "Rejected") return <Chip size="small" color="error" label="Rejected" sx={{ color: "#fff", fontWeight: 700 }} />;
    return <Chip size="small" color="warning" label="Pending (3 Approvals)" sx={{ fontWeight: 700 }} />;
  };

  return (
    <Stack spacing={2.5}>
      <Paper sx={{ p: 1.5, borderRadius: 2 }} variant="outlined">
        <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 1.5, justifyContent: "space-between" }}>
          <TextField
            label="Search student or destination"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="small"
            sx={{ width: { xs: "100%", sm: 300 } }}
          />
          <TextField
            select
            label="Filter status"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            size="small"
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="All">All Requests</MenuItem>
            <MenuItem value="Pending">Pending</MenuItem>
            <MenuItem value="Approved">Approved</MenuItem>
            <MenuItem value="Rejected">Rejected</MenuItem>
          </TextField>
        </Box>
      </Paper>

      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, overflowX: "auto" }}>
        <Table size="medium">
          <TableHead sx={{ bgcolor: "action.hover" }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Student</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Requested Destination</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Current Destination</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Approval Progress</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Requested Date</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    {loading ? "Loading requests…" : "No payout method change requests found."}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((req) => (
                <TableRow key={req.requestId} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={700}>
                      {req.studentName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {req.studentEmail}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {req.institutionName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {req.accountName} · {req.maskedAccountNumber}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {req.currentDestination ? (
                      <>
                        <Typography variant="body2">
                          {req.currentDestination.institutionName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {req.currentDestination.accountName} · {req.currentDestination.maskedAccountNumber}
                        </Typography>
                      </>
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        None configured
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell sx={{ minWidth: 150 }}>
                    <Stack spacing={0.5}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="caption" fontWeight={700}>
                          {req.approvalCount} / {req.requiredApprovals || 3} Approvals
                        </Typography>
                        {req.userVoted && (
                          <Chip size="small" variant="outlined" label="You voted" color="info" sx={{ height: 20, fontSize: 10 }} />
                        )}
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(100, Math.round((req.approvalCount / (req.requiredApprovals || 3)) * 100))}
                        color={req.status === "Approved" ? "success" : req.status === "Rejected" ? "error" : "warning"}
                        sx={{ height: 6, borderRadius: 3 }}
                      />
                    </Stack>
                  </TableCell>
                  <TableCell>{getStatusChip(req.status)}</TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {formatPayoutDate(req.requestedAt)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => openReview(req)}
                      disabled={busy}
                    >
                      Review
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Review Dialog */}
      <Dialog
        open={Boolean(selected)}
        onClose={closeDialog}
        TransitionComponent={Transition}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: 2 }}>
          <Typography variant="h6" fontWeight={700}>
            {dialogMode === "reject" ? "Reject Payout Method Change" : "Review Payout Method Change"}
          </Typography>
          <Button onClick={closeDialog} disabled={busy} sx={{ minWidth: 28, p: 0, color: "text.secondary" }}>
            <CloseIcon fontSize="small" />
          </Button>
        </DialogTitle>

        <DialogContent dividers>
          {selected && (
            <Stack spacing={2.5}>
              {/* Student info */}
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Student Details</Typography>
                <Typography variant="body1" fontWeight={700}>{selected.studentName}</Typography>
                <Typography variant="body2" color="text.secondary">{selected.studentEmail} · Student ID #{selected.studentId}</Typography>
              </Box>

              {/* Side-by-Side Comparison */}
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <Paper variant="outlined" sx={{ flex: 1, p: 1.5, borderRadius: 2, bgcolor: "action.hover" }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>CURRENT ACTIVE DESTINATION</Typography>
                  {selected.currentDestination ? (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body2" fontWeight={700}>{selected.currentDestination.institutionName}</Typography>
                      <Typography variant="body2">{selected.currentDestination.accountName}</Typography>
                      <Typography variant="caption" color="text.secondary">{selected.currentDestination.maskedAccountNumber}</Typography>
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>No active destination</Typography>
                  )}
                </Paper>

                <Paper variant="outlined" sx={{ flex: 1, p: 1.5, borderRadius: 2, borderColor: "primary.light" }}>
                  <Typography variant="caption" color="primary.main" fontWeight={700}>REQUESTED NEW DESTINATION</Typography>
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="body2" fontWeight={700}>{selected.institutionName}</Typography>
                    <Typography variant="body2">{selected.accountName}</Typography>
                    <Typography variant="caption" color="text.secondary">{selected.maskedAccountNumber}</Typography>
                  </Box>
                </Paper>
              </Stack>

              {/* Approval Progress Card */}
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Stack spacing={1}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="subtitle2" fontWeight={700}>Approval Progress</Typography>
                    <Chip
                      size="small"
                      color={selected.status === "Approved" ? "success" : "warning"}
                      label={`${selected.approvalCount} / ${selected.requiredApprovals || 3} Approvals`}
                      sx={{ fontWeight: 700 }}
                    />
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    Requires 3 separate administrator approvals before the student&apos;s payout information is updated.
                  </Typography>

                  {/* Decision history */}
                  {selected.decisions && selected.decisions.length > 0 && (
                    <Stack spacing={1} sx={{ mt: 1.5, pt: 1, borderTop: "1px solid", borderColor: "divider" }}>
                      <Typography variant="caption" fontWeight={700} color="text.secondary">Recorded Admin Decisions</Typography>
                      {selected.decisions.map((d, i) => (
                        <Box key={i} sx={{ pl: 1, borderLeft: "2px solid", borderColor: d.decision === "Approved" ? "success.main" : "error.main" }}>
                          <Stack direction="row" justifyContent="space-between">
                            <Typography variant="body2" fontWeight={600}>
                              {d.adminName} ({d.decision})
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatPayoutDate(d.createdAt)}
                            </Typography>
                          </Stack>
                          {d.comment && (
                            <Typography variant="caption" color="text.secondary" display="block">
                              {d.comment}
                            </Typography>
                          )}
                        </Box>
                      ))}
                    </Stack>
                  )}
                </Stack>
              </Paper>

              {/* Status information */}
              {selected.status === "Approved" && (
                <Alert severity="success" icon={<CheckCircleOutlineIcon />}>
                  This change request has been fully approved by 3 administrators and applied to the student&apos;s active payout account.
                </Alert>
              )}

              {selected.status === "Rejected" && (
                <Alert severity="error" icon={<HighlightOffIcon />}>
                  <Typography variant="subtitle2" fontWeight={700}>Request Rejected</Typography>
                  <Typography variant="body2">{selected.rejectionReason || "No reason specified."}</Typography>
                </Alert>
              )}

              {selected.status === "Pending" && selected.userVoted && (
                <Alert severity="info">
                  You have already submitted your decision for this request. Two other distinct administrators must approve to reach 3/3.
                </Alert>
              )}

              {/* Comment / Reason input */}
              {selected.status === "Pending" && !selected.userVoted && (
                <TextField
                  label={dialogMode === "reject" ? "Rejection Reason (Required)" : "Approval Note (Optional)"}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  multiline
                  minRows={2}
                  required={dialogMode === "reject"}
                  error={dialogMode === "reject" && !comment.trim()}
                  helperText={dialogMode === "reject" ? "Explain to the student why this change is rejected." : "Optional audit note."}
                  fullWidth
                />
              )}
            </Stack>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={closeDialog} disabled={busy} color="inherit">
            Cancel
          </Button>

          {selected?.status === "Pending" && !selected.userVoted && (
            <>
              {dialogMode === "review" ? (
                <>
                  <Button
                    color="error"
                    variant="outlined"
                    onClick={() => setDialogMode("reject")}
                    disabled={busy}
                  >
                    Reject
                  </Button>
                  <Button
                    color="primary"
                    variant="contained"
                    onClick={handleApprove}
                    disabled={busy}
                    sx={{ color: "#fff", fontWeight: 700 }}
                  >
                    {busy ? "Submitting…" : `Approve (${selected.approvalCount + 1}/${selected.requiredApprovals || 3})`}
                  </Button>
                </>
              ) : (
                <>
                  <Button onClick={() => setDialogMode("review")} disabled={busy}>
                    Back
                  </Button>
                  <Button
                    color="error"
                    variant="contained"
                    onClick={handleReject}
                    disabled={busy || !comment.trim()}
                    sx={{ color: "#fff", fontWeight: 700 }}
                  >
                    {busy ? "Rejecting…" : "Confirm Rejection"}
                  </Button>
                </>
              )}
            </>
          )}
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

