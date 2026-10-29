import { useEffect, useState } from "react";
import { Alert, Box, Button, CircularProgress, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import { fetchPayoutAccount, fetchPayoutInstitutions, savePayoutAccount } from "../../../api/seller/payoutAPI";
import { isDemoCapability, payoutErrorMessage } from "./payoutDisplay";

const institutionKey = (institution) => `${institution.provider}:${institution.code}`;

export default function PayoutAccount({ onSaved }) {
  const [account, setAccount] = useState(null);
  const [institutions, setInstitutions] = useState([]);
  const [capability, setCapability] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [institution, setInstitution] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");

  useEffect(() => {
    let active = true;
    Promise.allSettled([fetchPayoutAccount(), fetchPayoutInstitutions()]).then(([saved, supported]) => {
      if (!active) return;
      if (saved.status === "fulfilled") {
        setAccount(saved.value.account);
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
    setInstitution(account ? `${account.provider}:${account.institutionCode}` : "");
    setAccountName(account?.accountName || "");
    setAccountNumber(account?.accountNumber || account?.maskedAccountNumber || "");
    setSuccess("");
    setEditing(true);
  };
  const closeEditor = () => { setEditing(false); setAccountNumber(""); };
  const selectedInstitution = institutions.find((item) => institutionKey(item) === institution);

  const save = async (event) => {
    event.preventDefault();
    if (saving || !selectedInstitution || !accountName.trim() || !accountNumber.trim()) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const result = await savePayoutAccount({ institutionCode: selectedInstitution.code, provider: selectedInstitution.provider,
        accountName: accountName.trim(), accountNumber: accountNumber.trim() });
      setAccount(result.account);
      if (result.capability) setCapability(result.capability);
      setAccountNumber("");
      setEditing(false);
      setSuccess("Payout destination saved. Account ownership has not been verified.");
      onSaved?.();
    } catch (saveError) {
      setError(payoutErrorMessage(saveError, "Unable to save payout destination."));
    } finally { setSaving(false); }
  };

  return <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3 }}>
    <Stack spacing={2}>
      <Box><Typography variant="h6" fontWeight={700}>Payout destination</Typography>
        <Typography variant="body2" color="text.secondary">Receive earnings in a supported bank or e-wallet account. You do not need your own PayMongo merchant account.</Typography></Box>
      {loading ? <CircularProgress size={24} aria-label="Loading payout destination" /> : <>
        {error && <Alert severity="error">{error}</Alert>}
        {success && <Alert severity="success">{success}</Alert>}
        {/*{isDemoCapability(capability) && <Alert severity="info">Demo payout mode. Saved destinations are used for simulation only; no bank or e-wallet transfer is sent.</Alert>}*/}
        {capability?.enabled === false && <Alert severity="info">{capability.message || "Outbound payouts are not enabled for this PayMongo account."}</Alert>}
        {account ? <Box>
          <Typography fontWeight={700}>{account.institutionName}</Typography>
          <Typography variant="body2">{account.accountName}</Typography>
          <Typography variant="body2" color="text.secondary">{account.maskedAccountNumber}</Typography>
        </Box> : <Typography variant="body2" color="text.secondary">No payout destination configured.</Typography>}
        {!editing ? <Box><Button variant="outlined" onClick={openEditor} disabled={institutions.length === 0}>
          {account ? "Update Payout Destination" : "Configure Payout Destination"}
        </Button>{institutions.length === 0 && <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>Supported institutions must be available before account details can be saved.</Typography>}</Box> :
          <Stack component="form" onSubmit={save} spacing={2} autoComplete="off">
            <Alert severity="warning">Check the recipient details carefully. Saving them does not verify account ownership. Changes apply to future payout attempts.</Alert>
            <TextField select required fullWidth label="Bank or e-wallet" value={selectedInstitution ? institution : ""} onChange={(event) => setInstitution(event.target.value)} disabled={saving}>
              {institutions.map((item) => <MenuItem key={institutionKey(item)} value={institutionKey(item)}>{item.name}</MenuItem>)}
            </TextField>
            <TextField required fullWidth label="Account name" value={accountName} onChange={(event) => setAccountName(event.target.value)} disabled={saving} slotProps={{ htmlInput: { maxLength: 180 } }} />
            <TextField required fullWidth label="Account number" value={accountNumber} onChange={(event) => setAccountNumber(event.target.value)} disabled={saving} autoComplete="off" helperText={account ? "Enter the complete replacement account number." : "Use the account number required by your bank or e-wallet."} slotProps={{ htmlInput: { maxLength: 34, inputMode: "numeric", pattern: "[0-9]{6,34}" } }} />
            <Stack direction="row" justifyContent="flex-end" spacing={1}><Button onClick={closeEditor} disabled={saving}>Cancel</Button>
              <Button type="submit" variant="contained" sx={{color:"#fff"}} disabled={saving || !selectedInstitution || !accountName.trim() || !accountNumber.trim()}>{saving ? "Saving…" : "Save Payout Destination"}</Button></Stack>
          </Stack>}
      </>}
    </Stack>
  </Paper>;
}
