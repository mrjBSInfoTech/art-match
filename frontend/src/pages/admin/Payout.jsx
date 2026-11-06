import { useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  Alert,
  Badge,
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Paper,
  Slide,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import ViewListIcon from "@mui/icons-material/ViewList";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import {
  approveAccountChangeRequest,
  approveAdminPermissionRequest,
  approveSellerPayout,
  fetchAccountChangeRequests,
  fetchAdminPayouts,
  fetchAdminPermissionRequests,
  fetchAdminPermissionStatus,
  reconcileSellerPayout,
  rejectAccountChangeRequest,
  rejectAdminPermissionRequest,
  rejectSellerPayout,
  releaseSellerPayout,
  requestAdminPayoutPermission,
  requestSellerPayout,
  verifySellerPayoutRefund,
} from "../../api/admin/payoutAPI";
import PayoutForm from "../../components/admin/Payout/PayoutForm";
import AccountRequestsTable from "../../components/admin/Payout/AccountRequestsTable";
import AdminPermissionsPanel from "../../components/admin/Payout/AdminPermissionsPanel";
import ConnectionErrorPanel from "../../components/admin/ConnectionErrorPanel";
import PayoutMetrics from "../../components/seller/Payout/PayoutMetrics";
import PayoutTable from "../../components/seller/Payout/PayoutTable";
import PayoutCard from "../../components/seller/Payout/PayoutCard";
import {
  canPayoutAction,
  canReleasePayout,
  formatPayoutCurrency,
  formatPayoutDate,
  payoutApprovalLabel,
  payoutDisplayStatus,
  payoutErrorMessage,
  payoutIdentifier,
  payoutStatusColor,
  payoutValue,
} from "../../components/seller/Payout/payoutDisplay";
import { useTheme } from "@mui/material/styles";

function SlideTransition(props) {
  return <Slide {...props} direction="up" />;
}
const statuses = [
  "All",
  "Held",
  "Eligible",
  "Processing",
  "Paid",
  "Failed",
  "Cancelled",
];

export default function AdminPayout() {
  const theme = useTheme();
  const [currentTab, setCurrentTab] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [status, setStatus] = useState("All");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState("table");
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");
  const [refundId, setRefundId] = useState("");
  const [returnRequestId, setReturnRequestId] = useState("");
  const [approvalComment, setApprovalComment] = useState("");
  const [accountRequests, setAccountRequests] = useState([]);
  const [permissionStatus, setPermissionStatus] = useState(null);
  const [permissionRequests, setPermissionRequests] = useState([]);
  const actionInFlight = useRef(false);

  const adminRole = String(localStorage.getItem("admin_role") || "").toLowerCase();
  const isSuperAdmin = adminRole === "super admin";

  const showSnackbar = (message, severity = "success") => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const closeSnackbar = (event, reason) => {
    if (reason === "clickaway") return;
    setSnackbarOpen(false);
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case "success":
        return "success.light";
      case "error":
        return "error.light";
      default:
        return "primary.light";
    }
  };

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      setLoading(true);
      setError("");

      try {
        // Fetch permission status for current admin
        const permResult = await fetchAdminPermissionStatus().catch(() => null);
        if (!active) return;
        setPermissionStatus(permResult);

        // If authorized (or admin/super admin), load transactions and account change requests
        const isAuthorized = permResult?.isAuthorized ?? (adminRole === "admin" || adminRole === "super admin");

        if (isAuthorized) {
          const [payoutsRes, requestsRes] = await Promise.all([
            fetchAdminPayouts(),
            fetchAccountChangeRequests().catch(() => ({ requests: [] })),
          ]);

          if (!active) return;
          setData(payoutsRes);
          setAccountRequests(requestsRes.requests || []);
          setSelected((current) =>
            current
              ? payoutsRes.orders.find(
                  (item) => payoutIdentifier(item) === payoutIdentifier(current),
                ) || null
              : null,
          );
        } else {
          setAccountRequests([]);
          setData(null);
        }

        // If super admin, fetch admin permission requests
        if (isSuperAdmin) {
          const permReqs = await fetchAdminPermissionRequests().catch(() => ({ requests: [] }));
          if (!active) return;
          setPermissionRequests(permReqs.requests || []);
        }
      } catch (loadError) {
        if (active) {
          setError(
            payoutErrorMessage(loadError, "Unable to load seller payouts."),
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadData();

    return () => {
      active = false;
    };
  }, [refresh, isSuperAdmin, adminRole]);

  const reload = () => {
    setRefresh((value) => value + 1);
  };

  if (error) {
    return (
      <ConnectionErrorPanel
        title="Seller Payouts Unavailable"
        onRetry={reload}
      />
    );
  }

  const closeReview = () => {
    if (!actionInFlight.current) {
      setSelected(null);
      setActionError("");
    }
  };

  const capability = data?.providerCapability || data?.capability;
  const completedReturns = (selected?.returnRequests || []).filter(
    (item) => item.status === "Completed",
  );

  const filtered = (data?.orders || []).filter(
    (item) =>
      (status === "All" || item.payoutStatus === status) &&
      [item.orderNumber, item.sellerName, item.sellerId]
        .join(" ")
        .toLowerCase()
        .includes(search.trim().toLowerCase()),
  );

  const act = async (action) => {
    if (!selected || actionInFlight.current || loading || error) return;
    if (
      ["request", "approve", "reject", "reconcile"].includes(action) &&
      !canPayoutAction(selected, action)
    )
      return;
    if (action === "release" && !canReleasePayout(selected, capability)) return;
    if (action === "reject" && !approvalComment.trim()) return;
    if (
      action === "refund" &&
      (!refundId.trim() ||
        ["Processing", "Paid"].includes(selected.payoutStatus) ||
        (completedReturns.length > 0 && !returnRequestId))
    )
      return;
    actionInFlight.current = true;
    setBusy(true);
    setActionError("");
    try {
      const id = payoutIdentifier(selected);
      const actions = {
        request: () => requestSellerPayout(id),
        approve: () => approveSellerPayout(id, approvalComment.trim()),
        reject: () => rejectSellerPayout(id, approvalComment.trim()),
        release: () => releaseSellerPayout(id),
        reconcile: () => reconcileSellerPayout(id),
        refund: () =>
          verifySellerPayoutRefund(
            id,
            refundId.trim(),
            returnRequestId || undefined,
          ),
      };
      const result = await actions[action]();
      if (result.payout) setSelected(result.payout);
      const messages = {
        request:
          "Payout approval initiated. One authorized admin approval is required before release.",
        approve: "Payout approved. Release remains a separate action.",
        reject: "Payout request rejected. No payout was released.",
        release:
          "Payout released to the provider. Paid status requires provider confirmation.",
        reconcile: "Payout status checked with the configured provider.",
        refund:
          "Refund evidence checked with PayMongo. The backend recalculated the payout.",
      };
      showSnackbar(messages[action], "success");
      setApprovalComment("");
      if (action === "refund") {
        setRefundId("");
        setReturnRequestId("");
      }
      reload();
    } catch (actionFailure) {
      setActionError(
        payoutErrorMessage(
          actionFailure,
          "Unable to process this payout request.",
        ),
      );
      reload();
    } finally {
      actionInFlight.current = false;
      setBusy(false);
    }
  };

  // Student payout method change request handlers
  const handleApproveAccountRequest = async (requestId, comment) => {
    setBusy(true);
    try {
      await approveAccountChangeRequest(requestId, comment);
      showSnackbar("Payout method change approval recorded.", "success");
      reload();
    } catch (err) {
      showSnackbar(payoutErrorMessage(err, "Failed to approve payout method change."), "error");
    } finally {
      setBusy(false);
    }
  };

  const handleRejectAccountRequest = async (requestId, reason) => {
    setBusy(true);
    try {
      await rejectAccountChangeRequest(requestId, reason);
      showSnackbar("Payout method change request rejected.", "success");
      reload();
    } catch (err) {
      showSnackbar(payoutErrorMessage(err, "Failed to reject payout method change."), "error");
    } finally {
      setBusy(false);
    }
  };

  // Admin permission request handlers
  const handleRequestPermission = async (reason) => {
    setBusy(true);
    try {
      await requestAdminPayoutPermission(reason);
      showSnackbar("Permission request submitted to Super Admins.", "success");
      reload();
    } catch (err) {
      showSnackbar(payoutErrorMessage(err, "Failed to submit permission request."), "error");
    } finally {
      setBusy(false);
    }
  };

  const handleApprovePermissionRequest = async (requestId) => {
    setBusy(true);
    try {
      await approveAdminPermissionRequest(requestId);
      showSnackbar("Admin payout permission approved.", "success");
      reload();
    } catch (err) {
      showSnackbar(payoutErrorMessage(err, "Failed to approve admin permission."), "error");
    } finally {
      setBusy(false);
    }
  };

  const handleRejectPermissionRequest = async (requestId, reason) => {
    setBusy(true);
    try {
      await rejectAdminPermissionRequest(requestId, reason);
      showSnackbar("Admin payout permission rejected.", "success");
      reload();
    } catch (err) {
      showSnackbar(payoutErrorMessage(err, "Failed to reject admin permission."), "error");
    } finally {
      setBusy(false);
    }
  };

  const pendingAccountRequestsCount = accountRequests.filter((r) => r.status === "Pending").length;
  const pendingPermissionsCount = permissionRequests.filter((r) => r.status === "Pending").length;
  const isAuthorizedAdmin = permissionStatus?.isAuthorized ?? (adminRole === "admin" || adminRole === "super admin");

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2.5 }, minWidth: 0 }}>
      <Helmet>
        <title>Seller Payouts | ArtMatch</title>
      </Helmet>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        gap={2}
      >
        <Box>
          <Typography variant="h4" fontWeight={800}>
            Seller Payouts
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Review eligible earnings, approve payout method changes, and manage transfer authorizations.
          </Typography>
        </Box>
        <Button
          startIcon={<RefreshIcon />}
          onClick={reload}
          disabled={loading || busy}
        >
          Refresh
        </Button>
      </Stack>

      {/* Permission Warning for Customizable / Moderation Admins */}
      {permissionStatus && !isAuthorizedAdmin && !isSuperAdmin && (
        <Alert
          severity={permissionStatus.permissionStatus === "Pending" ? "warning" : "info"}
          action={
            <Button color="inherit" size="small" onClick={() => setCurrentTab(2)}>
              {permissionStatus.permissionStatus === "Pending" ? "View Status" : "Request Permission"}
            </Button>
          }
          sx={{ mt: 2.5 }}
        >
          {permissionStatus.permissionStatus === "Pending"
            ? "Your request for payout management permission is pending Super Admin review. Direct approval actions remain restricted until approved."
            : permissionStatus.permissionStatus === "Rejected"
            ? `Your payout permission request was rejected: ${permissionStatus.request?.rejectionReason || "Denied by Super Admin"}.`
            : "Permission Required: Customizable and Moderation administrators must obtain Super Admin approval before approving or releasing student payouts."}
        </Alert>
      )}

      {/* Tabs */}
      <Tabs
        value={currentTab}
        onChange={(e, val) => setCurrentTab(val)}
        sx={{ borderBottom: 1, borderColor: "divider", mt: 3, mb: 2.5 }}
      >
        <Tab label="Payout Transactions" />
        <Tab
          label={
            <Badge
              badgeContent={pendingAccountRequestsCount}
              color="warning"
              sx={{ "& .MuiBadge-badge": { right: -10, top: 4 } }}
            >
              Payout Method Requests
            </Badge>
          }
        />
        <Tab
          label={
            isSuperAdmin ? (
              <Badge
                badgeContent={pendingPermissionsCount}
                color="error"
                sx={{ "& .MuiBadge-badge": { right: -10, top: 4 } }}
              >
                Admin Permissions
              </Badge>
            ) : (
              "Permission Status"
            )
          }
        />
      </Tabs>

      {/* TAB 0: PAYOUT TRANSACTIONS */}
      {currentTab === 0 && (
        <Stack spacing={2.5}>
          {loading && (
            <Stack alignItems="center" sx={{ py: 3 }}>
              <CircularProgress aria-label="Loading payout review" />
            </Stack>
          )}

          {!isAuthorizedAdmin && !isSuperAdmin && !loading && (
            <Alert severity="warning">
              You do not currently have authorized access to approve or process payout transactions. Obtain permission from a Super Admin in the <strong>Permission Status</strong> tab.
            </Alert>
          )}

          {data && (
            <>
              {capability?.enabled === false && (
                <Alert severity="warning">
                  {capability.message ||
                    "PayMongo outbound payouts are not enabled. You can review earnings, but sending is blocked."}
                </Alert>
              )}
              <PayoutMetrics totals={data.totals} />
              <Paper
                sx={{
                  p: { xs: 1.25, sm: 1.5 },
                  borderRadius: 2,
                  backgroundColor: theme.palette.background.paper,
                  borderColor: theme.palette.divider,
                }}
                variant="outlined"
              >
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: { xs: "column", lg: "row" },
                    justifyContent: "space-between",
                    alignItems: { xs: "stretch", lg: "center" },
                    gap: 1.25,
                  }}
                >
                  <TextField
                    label="Search order or seller"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    size="small"
                    sx={{
                      width: { xs: "100%", lg: 255 },
                      "& .MuiOutlinedInput-root": {
                        color: theme.palette.text.primary,
                        backgroundColor: theme.palette.background.default,
                        "& fieldset": { borderColor: theme.palette.divider },
                        "&:hover fieldset": {
                          borderColor: theme.palette.text.secondary,
                        },
                      },
                      "& .MuiInputBase-input::placeholder": {
                        color: theme.palette.text.secondary,
                        opacity: 1,
                      },
                    }}
                  />
                  <TextField
                    select
                    label="Payout status"
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                    size="small"
                    sx={{ minWidth: 180 }}
                  >
                    {statuses.map((item) => (
                      <MenuItem value={item} key={item}>
                        {item}
                      </MenuItem>
                    ))}
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
                  Showing {filtered.length} of {data?.orders?.length || 0} payout records
                </Typography>

                <ToggleButtonGroup
                  value={viewMode}
                  exclusive
                  onChange={(e, next) => {
                    if (next) setViewMode(next);
                  }}
                  size="small"
                  aria-label="Payout presentation mode"
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
                <PayoutTable
                  orders={filtered}
                  admin
                  onReview={(payout) => {
                    setSelected(payout);
                    setActionError("");
                    setRefundId("");
                    setReturnRequestId("");
                    setApprovalComment("");
                  }}
                />
              ) : (
                <PayoutCard
                  orders={filtered}
                  admin
                  onReview={(payout) => {
                    setSelected(payout);
                    setActionError("");
                    setRefundId("");
                    setReturnRequestId("");
                    setApprovalComment("");
                  }}
                />
              )}
            </>
          )}
        </Stack>
      )}

      {/* TAB 1: PAYOUT METHOD REQUESTS */}
      {currentTab === 1 && (
        <AccountRequestsTable
          requests={accountRequests}
          loading={loading}
          busy={busy}
          onApprove={handleApproveAccountRequest}
          onReject={handleRejectAccountRequest}
        />
      )}

      {/* TAB 2: ADMIN PERMISSIONS */}
      {currentTab === 2 && (
        <AdminPermissionsPanel
          permissionStatus={permissionStatus}
          isSuperAdmin={isSuperAdmin}
          requests={permissionRequests}
          loading={loading}
          busy={busy}
          onRequestPermission={handleRequestPermission}
          onApproveRequest={handleApprovePermissionRequest}
          onRejectRequest={handleRejectPermissionRequest}
        />
      )}

      {/* Payout Transaction Modal */}
      <PayoutForm
        open={Boolean(selected)}
        onClose={closeReview}
        busy={busy}
        title="Review seller payout"
        selected={selected}
        actionError={actionError}
        payoutDisplayStatus={payoutDisplayStatus}
        payoutStatusColor={payoutStatusColor}
        payoutValue={payoutValue}
        formatPayoutCurrency={formatPayoutCurrency}
        formatPayoutDate={formatPayoutDate}
        payoutApprovalLabel={payoutApprovalLabel}
        canPayoutAction={canPayoutAction}
        approvalComment={approvalComment}
        setApprovalComment={setApprovalComment}
        loading={loading}
        error={error}
        capability={capability}
        refundId={refundId}
        setRefundId={setRefundId}
        returnRequestId={returnRequestId}
        setReturnRequestId={setReturnRequestId}
        completedReturns={completedReturns}
        canReleasePayout={canReleasePayout}
        onApprove={() => act("approve")}
        onReject={() => act("reject")}
        onRequestPayout={() => act("request")}
        onRelease={() => act("release")}
        onRefund={() => act("refund")}
        onReconcile={() => act("reconcile")}
      />

      {/* Snackbar notification */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        TransitionComponent={SlideTransition}
      >
        <Alert
          onClose={closeSnackbar}
          severity={snackbarSeverity}
          variant="filled"
          sx={{
            width: { xs: 280, sm: 360 },
            minHeight: 48,
            borderRadius: 2,
            boxShadow: "0 10px 28px rgba(15, 23, 42, 0.18)",
            backgroundColor: getSeverityColor(snackbarSeverity),
            color: "#fff",
            alignItems: "center",
            "& .MuiAlert-icon": {
              color: "#fff",
              mr: 1,
            },
            "& .MuiAlert-message": {
              fontWeight: 600,
              fontSize: 14,
              display: "flex",
              alignItems: "center",
            },
            "& .MuiAlert-action": {
              alignItems: "center",
              paddingLeft: 1,
              color: "#fff",
            },
          }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
