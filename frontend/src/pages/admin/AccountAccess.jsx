import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import {
  addAccountStrike,
  fetchAccountAccess,
  setAccountBan,
} from "../../api/admin/accountAccessAPI";

export default function AccountAccess() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [reason, setReason] = useState("");
  const [action, setAction] = useState("");

  const loadAccounts = async () => {
    try {
      setLoading(true);
      setAccounts(await fetchAccountAccess());
      setError("");
    } catch (loadError) {
      setError(loadError.message || "Unable to load account access data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const openAction = (account, nextAction) => {
    setSelectedAccount(account);
    setAction(nextAction);
    setReason("");
  };

  const closeAction = () => {
    setSelectedAccount(null);
    setAction("");
  };

  const submitAction = async () => {
    try {
      if (action === "strike") {
        await addAccountStrike(selectedAccount.role, selectedAccount.account_id, reason);
      } else {
        await setAccountBan(
          selectedAccount.role,
          selectedAccount.account_id,
          action === "ban",
          reason,
        );
      }
      closeAction();
      await loadAccounts();
    } catch (actionError) {
      setError(actionError.message || "Unable to update account access.");
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Helmet titleTemplate="%s - ArtMatch">
        <title>Strikes and Bans</title>
      </Helmet>
      <Typography variant="h4" sx={{ fontWeight: "bold", mb: 1 }}>
        Strikes & Bans
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Three strikes automatically ban an account.
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Paper variant="outlined" sx={{ overflow: "auto" }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Role</TableCell>
                <TableCell>Account</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Strikes</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {accounts.map((account) => (
                <TableRow key={`${account.role}-${account.account_id}`}>
                  <TableCell sx={{ textTransform: "capitalize" }}>{account.role}</TableCell>
                  <TableCell>{account.username}</TableCell>
                  <TableCell>{account.email}</TableCell>
                  <TableCell>{account.strikes} / 3</TableCell>
                  <TableCell>{account.is_banned ? "Banned" : "Active"}</TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      {!account.is_banned && (
                        <Button size="small" color="warning" onClick={() => openAction(account, "strike")}>
                          Add strike
                        </Button>
                      )}
                      <Button
                        size="small"
                        color={account.is_banned ? "success" : "error"}
                        onClick={() => openAction(account, account.is_banned ? "unban" : "ban")}
                      >
                        {account.is_banned ? "Unban" : "Ban"}
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>
      <Dialog open={Boolean(selectedAccount)} onClose={closeAction} fullWidth maxWidth="sm">
        <DialogTitle>
          {action === "strike" ? "Add strike" : action === "ban" ? "Ban account" : "Unban account"}
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            {selectedAccount?.role} account: {selectedAccount?.username}
          </Typography>
          <TextField
            autoFocus
            fullWidth
            label="Reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeAction}>Cancel</Button>
          <Button variant="contained" onClick={submitAction}>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
