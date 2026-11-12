import { useState } from "react";
import {
  Alert,
  Avatar,
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
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import React from "react";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import HighlightOffIcon from "@mui/icons-material/HighlightOff";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import SecurityIcon from "@mui/icons-material/Security";
import CloseIcon from "@mui/icons-material/Close";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import ViewListIcon from "@mui/icons-material/ViewList";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import { formatPayoutDate } from "../../seller/Payout/payoutDisplay";

const safeAlpha = (color, opacity) =>
  typeof alpha === "function" ? alpha(color, opacity) : color;

const formatRoleName = (role) =>
  String(role || "Admin")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

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

function SingleAdminPermissionCard({
  request,
  busy,
  onApprove,
  onReject,
  getStatusBadge,
}) {
  const theme = useTheme();
  const isDark = theme?.palette?.mode === "dark";

  return (
    <Paper
      component="article"
      elevation={0}
      sx={{
        p: { xs: 2, sm: 2.5 },
        borderRadius: 3.5,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        transition: "all 180ms cubic-bezier(0.4, 0, 0.2, 1)",
        "&:hover": {
          boxShadow: "0 12px 28px rgba(15, 23, 42, 0.08)",
          borderColor: "primary.light",
          transform: "translateY(-1px)",
        },
      }}
    >
      <Stack
        direction={{ xs: "column", md: "row" }}
        alignItems={{ xs: "flex-start", md: "center" }}
        justifyContent="space-between"
        spacing={2}
      >
        {/* Left Side: Icon Box + Details */}
        <Stack direction="row" spacing={2} alignItems="center" sx={{ minWidth: 0, flex: 1 }}>
          {/* Admin Avatar container */}
          {(() => {
            const rawImg = request.adminAvatar || request.adminImage;
            const defaultImage = "http://localhost:5000/uploads/profile.jpg";
            const fullImg = rawImg
              ? (rawImg.startsWith("http") || rawImg.startsWith("data:")
                  ? rawImg
                  : `http://localhost:5000${rawImg.startsWith("/") ? "" : "/"}${rawImg}`)
              : defaultImage;
            return (
              <Box
                sx={{
                  width: 58,
                  height: 58,
                  borderRadius: 2.5,
                  bgcolor: "background.default",
                  border: "1px solid",
                  borderColor: "divider",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  overflow: "hidden",
                }}
              >
                {fullImg ? (
                  <Box
                    component="img"
                    src={fullImg}
                    alt={request.adminName}
                    sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onError={(e) => {
                      if (e.currentTarget.src !== defaultImage) {
                        e.currentTarget.src = defaultImage;
                      } else {
                        e.currentTarget.style.display = "none";
                        if (e.currentTarget.nextElementSibling) {
                          e.currentTarget.nextElementSibling.style.display = "flex";
                        }
                      }
                    }}
                  />
                ) : null}
                <Avatar
                  sx={{
                    width: "100%",
                    height: "100%",
                    borderRadius: 2,
                    bgcolor: safeAlpha(theme.palette.error.main, 0.12),
                    color: "error.main",
                    fontWeight: 800,
                    fontSize: 20,
                    display: "none",
                  }}
                >
                  {request.adminName ? request.adminName.charAt(0).toUpperCase() : "A"}
                </Avatar>
              </Box>
            );
          })()}

          <Box sx={{ minWidth: 0 }}>
            {/* Title & Status */}
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mb: 0.35 }}>
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 800,
                  color: "text.primary",
                  lineHeight: 1.3,
                  overflowWrap: "anywhere",
                }}
              >
                {request.adminName}
              </Typography>
              {getStatusBadge(request.status)}
              <Chip
                label={formatRoleName(request.adminRole)}
                size="small"
                variant="outlined"
                sx={{ height: 22, fontSize: 11, fontWeight: 700, borderRadius: "16px" }}
              />
            </Stack>

            {/* Email & Role Subtitle */}
            <Typography
              variant="body2"
              sx={{
                color: "text.secondary",
                fontSize: 13,
                fontWeight: 500,
                mb: 0.35,
              }}
            >
              Email: <strong style={{ color: "inherit" }}>{request.adminEmail}</strong> · Role: <strong style={{ color: "inherit" }}>{formatRoleName(request.adminRole)}</strong>
            </Typography>

            {/* Reason */}
            <Typography
              variant="body2"
              sx={{
                color: request.reason ? "text.primary" : "text.secondary",
                fontSize: 13,
                mb: 0.35,
                overflowWrap: "anywhere",
              }}
            >
              Reason: {request.reason || "No notes provided"}
            </Typography>
            {request.rejectionReason && (
              <Typography variant="caption" color="error" display="block" sx={{ mb: 0.35 }}>
                Rejection: {request.rejectionReason}
              </Typography>
            )}

            {/* Date */}
            <Stack direction="row" spacing={0.5} alignItems="center">
              <CalendarTodayOutlinedIcon sx={{ fontSize: 13, color: "text.secondary" }} />
              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: 12 }}>
                Requested on: {formatPayoutDate(request.requestedAt)}
              </Typography>
            </Stack>
          </Box>
        </Stack>

        {/* Right Side Stat Boxes & Actions */}
        <Stack
          direction="row"
          spacing={1.25}
          alignItems="center"
          sx={{
            width: { xs: "100%", md: "auto" },
            justifyContent: { xs: "space-between", md: "flex-end" },
            pt: { xs: 1, md: 0 },
            borderTop: { xs: "1px solid", md: "none" },
            borderColor: { xs: "divider", md: "transparent" },
          }}
        >
          {/* Role Box */}
          <Box
            sx={{
              bgcolor: "background.default",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2,
              px: { xs: 1.5, sm: 2 },
              py: 1,
              textAlign: "center",
              minWidth: { xs: "auto", sm: 110 },
              flex: { xs: 1, md: "initial" },
            }}
          >
            <Typography
              variant="caption"
              sx={{
                display: "block",
                fontSize: 10,
                fontWeight: 700,
                color: "text.secondary",
                letterSpacing: 0.5,
                textTransform: "uppercase",
              }}
            >
              ROLE
            </Typography>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 800,
                color: "text.primary",
                fontSize: 13,
                mt: 0.25,
              }}
            >
              {formatRoleName(request.adminRole)}
            </Typography>
          </Box>

          {/* Status Box */}
          <Box
            sx={{
              bgcolor: safeAlpha(
                request.status === "Approved"
                  ? theme.palette.success.main
                  : request.status === "Rejected"
                  ? theme.palette.error.main
                  : theme.palette.warning.main,
                isDark ? 0.12 : 0.08
              ),
              border: "1px solid",
              borderColor: safeAlpha(
                request.status === "Approved"
                  ? theme.palette.success.main
                  : request.status === "Rejected"
                  ? theme.palette.error.main
                  : theme.palette.warning.main,
                0.35
              ),
              borderRadius: 2,
              px: { xs: 1.5, sm: 2 },
              py: 1,
              textAlign: "center",
              minWidth: { xs: "auto", sm: 100 },
              flex: { xs: 1, md: "initial" },
            }}
          >
            <Typography
              variant="caption"
              sx={{
                display: "block",
                fontSize: 10,
                fontWeight: 700,
                color:
                  request.status === "Approved"
                    ? "success.main"
                    : request.status === "Rejected"
                    ? "error.main"
                    : "warning.main",
                letterSpacing: 0.5,
                textTransform: "uppercase",
              }}
            >
              STATUS
            </Typography>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 800,
                color:
                  request.status === "Approved"
                    ? "success.main"
                    : request.status === "Rejected"
                    ? "error.main"
                    : "warning.main",
                fontSize: 13,
                mt: 0.25,
              }}
            >
              {request.status}
            </Typography>
          </Box>

          {/* Actions */}
          {request.status === "Pending" ? (
            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                color="error"
                variant="outlined"
                onClick={onReject}
                disabled={busy}
                sx={{
                  borderRadius: 2,
                  textTransform: "none",
                  fontWeight: 700,
                  height: 42,
                  px: 2,
                }}
              >
                Reject
              </Button>
              <Button
                size="small"
                variant="contained"
                onClick={onApprove}
                disabled={busy}
                sx={{
                  borderRadius: 2,
                  textTransform: "none",
                  fontWeight: 700,
                  height: 42,
                  px: 2,
                  color: "#fff",
                }}
              >
                Approve
              </Button>
            </Stack>
          ) : (
            <Typography variant="caption" color="text.secondary" sx={{ minWidth: 100, textAlign: "right" }}>
              Reviewed by {request.reviewerName || "Super Admin"}
            </Typography>
          )}
        </Stack>
      </Stack>
    </Paper>
  );
}

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
  const theme = useTheme();
  const [viewMode, setViewMode] = useState("table");
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
  const roleName = formatRoleName(permissionStatus?.role);

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

          {/* View Mode Switcher & Summary Count */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 1.5,
              mt: 0.5,
              mb: 0.5,
            }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              aria-live="polite"
              sx={{ fontWeight: 600 }}
            >
              Showing {requests.length} permission requests
            </Typography>

            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(e, next) => {
                if (next) setViewMode(next);
              }}
              size="small"
              aria-label="Presentation mode"
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
                          <Chip size="small" variant="outlined" label={formatRoleName(r.adminRole)} />
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
          ) : (
            <Stack spacing={2}>
              {loading ? (
                <Box sx={{ display: "grid", placeItems: "center", py: 4 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : requests.length === 0 ? (
                <Paper
                  variant="outlined"
                  sx={{
                    p: 4,
                    borderRadius: 3,
                    textAlign: "center",
                    border: "1px dashed",
                    borderColor: "divider",
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    No admin payout permission requests found.
                  </Typography>
                </Paper>
              ) : (
                <Paper
                  component="section"
                  variant="outlined"
                  aria-label="Admin permission requests card view"
                  sx={{
                    p: { xs: 1.5, sm: 2 },
                    borderRadius: 3.5,
                    borderColor: "divider",
                    bgcolor: "background.paper",
                  }}
                >
                  <Stack spacing={2}>
                    {requests.map((r) => (
                      <SingleAdminPermissionCard
                        key={r.requestId}
                        request={r}
                        busy={busy}
                        onApprove={() => handleApprove(r.requestId)}
                        onReject={() => {
                          setSelectedRequest(r);
                          setRejectionReason("");
                        }}
                        getStatusBadge={getStatusBadge}
                      />
                    ))}
                  </Stack>
                </Paper>
              )}
            </Stack>
          )}
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
              Rejecting permission request from <strong>{selectedRequest?.adminName}</strong> ({formatRoleName(selectedRequest?.adminRole)}).
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
