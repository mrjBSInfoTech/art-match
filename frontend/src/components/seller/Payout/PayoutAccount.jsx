import { useEffect, useState } from "react";
import { Alert, Box, Button, Chip, CircularProgress, Divider, LinearProgress, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import { fetchPayoutAccount, fetchPayoutInstitutions, savePayoutAccount } from "../../../api/seller/payoutAPI";
import { verifyPassword } from "../../../api/seller/sellerAPI";
import PayoutConfim from "./PayoutConfim";
import { formatPayoutDate, payoutErrorMessage } from "./payoutDisplay";

const institutionKey = (institution) => `${institution.provider}:${institution.code}`;

export default function PayoutAccount({ onSaved }) {
  const [account, setAccount] = useState(null);
  const [pendingRequest, setPendingRequest] = useState(null);
  const [institutions, setInstitutions] = useState([]);
  const [capability, setCapability] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [pendingPayload, setPendingPayload] = useState(null);
  const [institution, setInstitution] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");

  useEffect(() => {
    let active = true;
    Promise.allSettled([fetchPayoutAccount(), fetchPayoutInstitutions()]).then(([saved, supported]) => {
      if (!active) return;
      if (saved.status === "fulfilled") {
        setAccount(saved.value.account);
        setPendingRequest(saved.value.pendingRequest || null);
        setCapability(saved.value.capability);
      }
      if (supported.status === "fulfilled") {
        setInstitutions(supported.value.institutions || []);
        setCapability((current) => supported.value.capability || current);
      }
      if (saved.status === "rejected" || supported.status === "rejected") {
        setError(payoutErrorMessage(saved.status === "rejected" ? saved.reason : supported.reason, "Unable to load payout settings."));
      }
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const openEditor = () => {
    const target = pendingRequest?.status === "Pending" ? pendingRequest : account;
    setInstitution(target ? `${target.institutionProvider || target.provider}:${target.institutionCode}` : "");
    setAccountName(target?.accountName || "");
    setAccountNumber("");
    setSuccess("");
    setEditing(true);
  };
  const closeEditor = () => { setEditing(false); setAccountNumber(""); };
  const selectedInstitution = institutions.find((item) => institutionKey(item) === institution);

  const save = async (event) => {
    event.preventDefault();
    if (saving || !selectedInstitution || !accountName.trim() || !accountNumber.trim()) return;
    setPendingPayload({
      institutionCode: selectedInstitution.code,
      provider: selectedInstitution.provider,
      accountName: accountName.trim(),
      accountNumber: accountNumber.trim(),
    });
    setPasswordDialogOpen(true);
  };

  const handlePasswordConfirm = async (password) => {
    if (!pendingPayload) {
      throw new Error("Payout account details were not provided.");
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await verifyPassword(password);
      const result = await savePayoutAccount(pendingPayload);
      setAccount(result.account);
      setPendingRequest(result.pendingRequest || null);
      if (result.capability) setCapability(result.capability);
      setAccountNumber("");
      setEditing(false);
      setPasswordDialogOpen(false);
      setPendingPayload(null);
      setSuccess("Payout destination change request submitted. It requires 3 administrator approvals before taking effect.");
      window.dispatchEvent(new Event("seller-payout-account-changed"));
      onSaved?.();
    } catch (saveError) {
      setError(payoutErrorMessage(saveError, "Unable to save payout destination."));
      throw saveError;
    } finally {
      setSaving(false);
    }
  };

  const approvalProgress = pendingRequest
    ? Math.min(100, Math.round(((pendingRequest.approvalCount || 0) / (pendingRequest.requiredApprovals || 3)) * 100))
    : 0;

  return <>
  <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3 }}>
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h6" fontWeight={700}>Payout Destination</Typography>
        <Typography variant="body2" color="text.secondary">
          Receive earnings in a supported bank or e-wallet account. For security, changing your payout method requires review and 3 administrator approvals.
        </Typography>
      </Box>

      {loading ? <CircularProgress size={24} aria-label="Loading payout destination" /> : <>
        {error && <Alert severity="error">{error}</Alert>}
        {success && <Alert severity="success">{success}</Alert>}
        {capability?.enabled === false && <Alert severity="info">{capability.message || "Outbound payouts are not enabled for this PayMongo account."}</Alert>}

        {/* Pending Approval Request Banner */}
        {pendingRequest?.status === "Pending" && (
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              borderRadius: 2,
              borderColor: "warning.main",
              backgroundColor: (theme) => theme.palette.mode === "dark" ? "rgba(237, 108, 2, 0.08)" : "rgba(237, 108, 2, 0.04)",
            }}
          >
            <Stack spacing={1.5}>
              <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={1}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <AccessTimeIcon color="warning" fontSize="small" />
                  <Typography variant="subtitle2" fontWeight={700} color="warning.dark">
                    Payout Method Change Pending Approval
                  </Typography>
                </Stack>
                <Chip
                  size="small"
                  color="warning"
                  label={`Approval Progress: ${pendingRequest.approvalCount} / ${pendingRequest.requiredApprovals || 3}`}
                  sx={{ fontWeight: 700 }}
                />
              </Stack>
              <LinearProgress variant="determinate" value={approvalProgress} color="warning" sx={{ height: 6, borderRadius: 3 }} />
              <Box sx={{ pl: 0.5 }}>
                <Typography variant="body2" fontWeight={600}>
                  Requested Destination: {pendingRequest.institutionName} ({pendingRequest.accountName})
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  Account Number: {pendingRequest.maskedAccountNumber} · Requested on {formatPayoutDate(pendingRequest.requestedAt)}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
                  Your active payout destination below remains in use until all 3 administrator approvals are received.
                </Typography>
              </Box>
            </Stack>
          </Paper>
        )}

        {/* Rejection Alert */}
        {pendingRequest?.status === "Rejected" && (
          <Alert severity="warning">
            <Typography variant="subtitle2" fontWeight={700}>Previous Change Request Rejected</Typography>
            <Typography variant="body2">
              {pendingRequest.rejectionReason || "Your recent payout destination change request was rejected by an administrator."}
            </Typography>
          </Alert>
        )}

        {/* Active Payout Account */}
        <Box>
          <Typography variant="subtitle2" color="text.secondary" fontWeight={600} gutterBottom>
            Active Payout Destination
          </Typography>
          {account ? (
            <Box sx={{ p: 2, borderRadius: 2, bgcolor: "action.hover", border: "1px solid", borderColor: "divider" }}>
              <Typography fontWeight={700} variant="body1">{account.institutionName}</Typography>
              <Typography variant="body2">{account.accountName}</Typography>
              <Typography variant="body2" color="text.secondary">{account.maskedAccountNumber}</Typography>
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No active payout destination configured.
            </Typography>
          )}
        </Box>

        {!editing ? (
          <Box>
            <Button variant="outlined" onClick={openEditor} disabled={institutions.length === 0}>
              {pendingRequest?.status === "Pending"
                ? "Update pending change request"
                : account
                ? "Request payout destination change"
                : "Configure payout destination"}
            </Button>
            {institutions.length === 0 && (
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                Supported institutions must be available before account details can be saved.
              </Typography>
            )}
          </Box>
        ) : (
          <Stack component="form" onSubmit={save} spacing={2} autoComplete="off">
            <Divider />
            <Alert severity="info">
              Submitting new details creates a change request that requires 3 administrator approvals before updating your active payout destination.
            </Alert>
            <TextField select required fullWidth label="Bank or e-wallet" value={selectedInstitution ? institution : ""} onChange={(event) => setInstitution(event.target.value)} disabled={saving}>
              {institutions.map((item) => <MenuItem key={institutionKey(item)} value={institutionKey(item)}>{item.name}</MenuItem>)}
            </TextField>
            <TextField required fullWidth label="Account name" value={accountName} onChange={(event) => setAccountName(event.target.value)} disabled={saving} slotProps={{ htmlInput: { maxLength: 180 } }} />
            <TextField required fullWidth label="Account number" value={accountNumber} onChange={(event) => setAccountNumber(event.target.value)} disabled={saving} autoComplete="off" helperText={account ? "Enter the complete replacement account number." : "Use the account number required by your bank or e-wallet."} slotProps={{ htmlInput: { maxLength: 34, inputMode: "numeric", pattern: "[0-9]{6,34}" } }} />
            <Stack direction="row" justifyContent="flex-end" spacing={1}>
              <Button onClick={closeEditor} disabled={saving}>Cancel</Button>
              <Button type="submit" variant="contained" sx={{color:"#fff"}} disabled={saving || !selectedInstitution || !accountName.trim() || !accountNumber.trim()}>
                {saving ? "Submitting…" : "Submit Change Request"}
              </Button>
            </Stack>
          </Stack>
        )}
      </>}
    </Stack>
  </Paper>
  <PayoutConfim
    open={passwordDialogOpen}
    handleClose={() => {
      setPasswordDialogOpen(false);
      setPendingPayload(null);
      setSaving(false);
    }}
    onSubmit={handlePasswordConfirm}
    submitting={saving}
  />
  </>;
}
