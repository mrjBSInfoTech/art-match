import { useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Chip,
  Checkbox,
  LinearProgress,
  MenuItem,
  Paper,
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
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import ViewListIcon from "@mui/icons-material/ViewList";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import AccountRequestsInfo from "./AccountRequestsInfo";
import { formatPayoutDate } from "../../seller/Payout/payoutDisplay";
import { adminTableButtonSx } from "../adminTableStyles";

const safeAlpha = (color, opacity) =>
  typeof alpha === "function" ? alpha(color, opacity) : color;

function SingleAccountRequestCard({ req, busy, onReview, getStatusChip }) {
  const theme = useTheme();
  const isDark = theme?.palette?.mode === "dark";

  return (
    <Paper
      component="article"
      role="button"
      tabIndex={0}
      elevation={0}
      onClick={onReview}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onReview();
        }
      }}
      sx={{
        p: { xs: 2, sm: 2.5 },
        borderRadius: 3.5,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        cursor: "pointer",
        transition: "all 180ms cubic-bezier(0.4, 0, 0.2, 1)",
        "&:hover": {
          boxShadow: "0 12px 28px rgba(15, 23, 42, 0.08)",
          borderColor: "primary.light",
          transform: "translateY(-1px)",
        },
        "&:focus-visible": {
          outline: "2px solid",
          outlineColor: "primary.main",
          outlineOffset: "2px",
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
          {/* Avatar thumbnail container */}
          {(() => {
            const rawImg = req.studentAvatar || req.studentImage;
            const fullImg = rawImg
              ? (rawImg.startsWith("http") || rawImg.startsWith("data:")
                  ? rawImg
                  : `http://localhost:5000${rawImg.startsWith("/") ? "" : "/"}${rawImg}`)
              : null;
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
                    alt={req.studentName}
                    sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onError={(e) => {
                      e.target.style.display = "none";
                      if (e.target.nextElementSibling) {
                        e.target.nextElementSibling.style.display = "flex";
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
                    display: fullImg ? "none" : "flex",
                  }}
                >
                  {req.studentName ? req.studentName.charAt(0).toUpperCase() : "S"}
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
                {req.studentName}
              </Typography>
              {getStatusChip(req.status)}
              <Chip
                label={req.institutionName}
                size="small"
                variant="outlined"
                sx={{ height: 22, fontSize: 11, fontWeight: 700, borderRadius: "16px" }}
              />
              {req.userVoted && (
                <Chip
                  size="small"
                  variant="outlined"
                  label="You voted"
                  color="info"
                  sx={{ height: 22, fontSize: 10, fontWeight: 700, borderRadius: "16px" }}
                />
              )}
            </Stack>

            {/* Email & Subtitle */}
            <Typography
              variant="body2"
              sx={{
                color: "text.secondary",
                fontSize: 13,
                fontWeight: 500,
                mb: 0.35,
              }}
            >
              Student Number: <strong style={{ color: "inherit" }}>{req.studentNumber || "N/A"}</strong>
            </Typography>

            <Typography
              variant="body2"
              sx={{
                color: "text.secondary",
                fontSize: 13,
                fontWeight: 500,
                mb: 0.35,
              }}
            >
              Requested: <strong style={{ color: "inherit" }}>{req.institutionName} ({req.accountName} · {req.maskedAccountNumber})</strong>
              {req.currentDestination ? (
                <> · Active: {req.currentDestination.institutionName} ({req.currentDestination.maskedAccountNumber})</>
              ) : (
                <> · No active destination</>
              )}
            </Typography>

            {/* Date */}
            <Stack direction="row" spacing={0.5} alignItems="center">
              <CalendarTodayOutlinedIcon sx={{ fontSize: 13, color: "text.secondary" }} />
              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: 12 }}>
                Requested on: {formatPayoutDate(req.requestedAt)}
              </Typography>
            </Stack>
          </Box>
        </Stack>

        {/* Right Side Stat Boxes */}
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
          {/* Destination */}
          <Box
            sx={{
              bgcolor: "background.default",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2,
              px: { xs: 1.5, sm: 2 },
              py: 1,
              textAlign: "center",
              minWidth: { xs: "auto", sm: 115 },
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
              DESTINATION
            </Typography>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 800,
                color: "text.primary",
                fontSize: 13,
                mt: 0.25,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: 130,
              }}
            >
              {req.institutionName}
            </Typography>
          </Box>

          {/* Approval Progress */}
          <Box
            sx={{
              bgcolor: "background.default",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2,
              px: { xs: 1.5, sm: 2 },
              py: 1,
              textAlign: "center",
              minWidth: { xs: "auto", sm: 120 },
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
              APPROVALS
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
              {req.approvalCount} / {req.requiredApprovals || 1}
            </Typography>
            <LinearProgress
              variant="determinate"
              value={Math.min(100, Math.round((req.approvalCount / (req.requiredApprovals || 1)) * 100))}
              color={req.status === "Approved" ? "success" : req.status === "Rejected" ? "error" : "warning"}
              sx={{ height: 4, borderRadius: 2, mt: 0.5 }}
            />
          </Box>

          {/* Status Box */}
          <Box
            sx={{
              bgcolor: safeAlpha(
                req.status === "Approved"
                  ? theme.palette.success.main
                  : req.status === "Rejected"
                  ? theme.palette.error.main
                  : theme.palette.warning.main,
                isDark ? 0.12 : 0.08
              ),
              border: "1px solid",
              borderColor: safeAlpha(
                req.status === "Approved"
                  ? theme.palette.success.main
                  : req.status === "Rejected"
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
                  req.status === "Approved"
                    ? "success.main"
                    : req.status === "Rejected"
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
                  req.status === "Approved"
                    ? "success.main"
                    : req.status === "Rejected"
                    ? "error.main"
                    : "warning.main",
                fontSize: 13,
                mt: 0.25,
              }}
            >
              {req.status}
            </Typography>
          </Box>

          {/* Review Action Button */}
          <Button
            variant="outlined"
            onClick={(e) => {
              e.stopPropagation();
              onReview();
            }}
            disabled={busy}
            sx={adminTableButtonSx}
          >
            Review
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}

export default function AccountRequestsTable({
  requests = [],
  loading = false,
  onApprove,
  onApproveSelected,
  onReject,
  busy = false,
}) {
  const theme = useTheme();
  const [selected, setSelected] = useState(null);
  const [dialogMode, setDialogMode] = useState("review"); // 'review' | 'reject'
  const [comment, setComment] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState("table");
  const [selectedRequestIds, setSelectedRequestIds] = useState(() => new Set());

  const filtered = requests.filter((r) => {
    const matchesStatus = filterStatus === "All" || r.status === filterStatus;
    const matchesSearch = [r.studentName, r.studentEmail, r.studentNumber, r.institutionName, r.accountName]
      .join(" ")
      .toLowerCase()
      .includes(search.trim().toLowerCase());
    return matchesStatus && matchesSearch;
  });
  const allVisibleSelected = filtered.length > 0
    && filtered.every((request) => selectedRequestIds.has(request.requestId));
  const someVisibleSelected = filtered.some((request) => selectedRequestIds.has(request.requestId));
  const selectedPendingRequests = requests.filter(
    (request) =>
      selectedRequestIds.has(request.requestId) &&
      request.status === "Pending" &&
      !request.userVoted,
  );

  const toggleAllVisibleRequests = (event) => {
    const visibleIds = filtered.map((request) => request.requestId);
    setSelectedRequestIds((current) => {
      const next = new Set(current);
      visibleIds.forEach((requestId) => {
        if (event.target.checked) next.add(requestId);
        else next.delete(requestId);
      });
      return next;
    });
  };

  const toggleRequestSelection = (requestId) => {
    setSelectedRequestIds((current) => {
      const next = new Set(current);
      if (next.has(requestId)) next.delete(requestId);
      else next.add(requestId);
      return next;
    });
  };

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
    return <Chip size="small" color="warning" label="Pending (1 Approval)" sx={{ fontWeight: 700 }} />;
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
          Showing {filtered.length} of {requests.length} requests
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
        <Stack spacing={1.5}>
        {selectedPendingRequests.length > 0 && (
          <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
            <Button
              variant="contained"
              color="success"
              startIcon={<CheckCircleOutlineIcon />}
              disabled={busy || typeof onApproveSelected !== "function"}
              onClick={async () => {
                const approvedIds = await onApproveSelected(selectedPendingRequests);
                if (Array.isArray(approvedIds)) {
                  setSelectedRequestIds((current) => {
                    const next = new Set(current);
                    approvedIds.forEach((requestId) => next.delete(requestId));
                    return next;
                  });
                }
              }}
              sx={{ minHeight: 44, fontWeight: 700 }}
            >
              Approve selected ({selectedPendingRequests.length})
            </Button>
          </Box>
        )}
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, overflowX: "auto" }}>
          <Table size="medium">
            <TableHead sx={{ bgcolor: "action.hover" }}>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={allVisibleSelected}
                    indeterminate={!allVisibleSelected && someVisibleSelected}
                    onChange={toggleAllVisibleRequests}
                    inputProps={{ "aria-label": "Select all visible payout method requests" }}
                  />
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Student</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Requested Destination</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Current Destination</TableCell>
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
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedRequestIds.has(req.requestId)}
                        onChange={() => toggleRequestSelection(req.requestId)}
                        inputProps={{ "aria-label": `Select payout method request from ${req.studentName || "student"}` }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={700}>
                        {req.studentName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Student Number: {req.studentNumber || "N/A"}
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
                    <TableCell>{getStatusChip(req.status)}</TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {formatPayoutDate(req.requestedAt)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        variant="outlined"
                        onClick={() => openReview(req)}
                        disabled={busy}
                        sx={adminTableButtonSx}
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
        </Stack>
      ) : (
        <Stack spacing={2}>
          {filtered.length === 0 ? (
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
                {loading ? "Loading requests…" : "No payout method change requests found."}
              </Typography>
            </Paper>
          ) : (
            <Paper
              component="section"
              variant="outlined"
              aria-label="Payout method requests card view"
              sx={{
                p: { xs: 1.5, sm: 2 },
                borderRadius: 3.5,
                borderColor: "divider",
                bgcolor: "background.paper",
              }}
            >
              <Stack spacing={2}>
                {filtered.map((req) => (
                  <SingleAccountRequestCard
                    key={req.requestId}
                    req={req}
                    busy={busy}
                    onReview={() => openReview(req)}
                    getStatusChip={getStatusChip}
                  />
                ))}
              </Stack>
            </Paper>
          )}
        </Stack>
      )}

      <AccountRequestsInfo
        open={Boolean(selected)}
        request={selected}
        dialogMode={dialogMode}
        setDialogMode={setDialogMode}
        comment={comment}
        setComment={setComment}
        busy={busy}
        onClose={closeDialog}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </Stack>
  );
}
