import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
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
import SearchIcon from "@mui/icons-material/Search";
import AccessReason from "../../components/admin/Access/AccessReason";
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
  const [action, setAction] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState("az");
  const [roleOption, setRoleOption] = useState("");

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
  };

  const closeAction = () => {
    setSelectedAccount(null);
    setAction("");
  };

  const submitAction = async (reasonText = "") => {
    try {
      if (action === "strike") {
        await addAccountStrike(
          selectedAccount.role,
          selectedAccount.account_id,
          reasonText,
        );
      } else {
        await setAccountBan(
          selectedAccount.role,
          selectedAccount.account_id,
          action === "ban",
          reasonText,
        );
      }
      closeAction();
      await loadAccounts();
    } catch (actionError) {
      setError(actionError.message || "Unable to update account access.");
    }
  };

  const filteredAccounts = useMemo(() => {
    let list = [...accounts];

    if (roleOption) {
      list = list.filter((account) => account.role === roleOption);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      list = list.filter((account) =>
        [account.username, account.email, account.role]
          .join(" ")
          .toLowerCase()
          .includes(query),
      );
    }

    list.sort((a, b) => {
      const nameA = (a.username || "").toLowerCase();
      const nameB = (b.username || "").toLowerCase();

      if (sortOption === "za") {
        return nameB.localeCompare(nameA);
      }

      return nameA.localeCompare(nameB);
    });

    return list;
  }, [accounts, roleOption, searchQuery, sortOption]);

  const currentRole = (
    localStorage.getItem("admin_role") ||
    localStorage.getItem("admin_account_type") ||
    ""
  ).trim().toLowerCase();
  const isSuperAdmin = currentRole === "super admin";
  const isAdmin = currentRole === "admin";
  const hasPermission = (key) =>
    ["1", "true"].includes(String(localStorage.getItem(key)).toLowerCase());
  const canAdd =
    isSuperAdmin || (isAdmin && hasPermission("admin_can_add"));
  const canEdit =
    isSuperAdmin || (isAdmin && hasPermission("admin_can_edit"));
  const canDelete =
    isSuperAdmin || (isAdmin && hasPermission("admin_can_delete"));
  const canManageAccess = canAdd || canEdit || canDelete;

  return (
    <Box sx={{ p: 3 }}>
      <Helmet titleTemplate="%s - ArtMatch">
        <title>Strikes and Bans</title>
      </Helmet>
      <Typography variant="h4" sx={{ fontWeight: "bold", mb: 1 }}>
        Strikes & Bans
      </Typography>
      {/* Filter Section */}
      <Paper sx={{ p: 3, mt: 3, borderRadius: 2 }} variant="outlined">
        <Typography variant="h6">Filter</Typography>
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            justifyContent: "space-between",
            alignItems: { xs: "stretch", md: "center" },
            gap: 2,
            mb: 2,
            mt: 2,
          }}
        >
          <TextField
            variant="outlined"
            placeholder="Search accounts..."
            size="small"
            sx={{
              width: { xs: "100%", sm: 300 },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              gap: 2,
              width: { xs: "100%", md: "auto" },
            }}
          >
            <FormControl size="small" sx={{ width: { xs: "100%", md: 180 } }}>
              <InputLabel>Sort</InputLabel>
              <Select
                name="sort"
                label="Sort"
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
              >
                <MenuItem value="az">A to Z</MenuItem>
                <MenuItem value="za">Z to A</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ width: { xs: "100%", md: 180 } }}>
              <InputLabel>Role</InputLabel>
              <Select
                name="role"
                label="Role"
                value={roleOption}
                onChange={(e) => setRoleOption(e.target.value)}
              >
                <MenuItem value="">Default</MenuItem>
                <MenuItem value="buyer">Buyer</MenuItem>
                <MenuItem value="seller">Seller</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>
      </Paper>
      {/* Table Section */}
      <Paper sx={{ p: 3, mt: 3, borderRadius: 2 }} variant="outlined">
        <Typography variant="h6" sx={{ mb: 2 }}>
          Account List
        </Typography>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Typography color="error" sx={{ py: 3, textAlign: "center" }}>
            {error}
          </Typography>
        ) : filteredAccounts.length === 0 ? (
          <Typography color="textSecondary" sx={{ py: 3, textAlign: "center" }}>
            No accounts found
          </Typography>
        ) : (
          <TableContainer>
            <Table>
              <TableHead sx={{ backgroundColor: "background.table" }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: "bold" }}>Role</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>Account</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>Strikes</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>Status</TableCell>
                  {canManageAccess && (
                    <TableCell
                    sx={{
                      fontWeight: "bold",
                      width: 260,
                      textAlign: "center",
                    }}
                  >
                    Actions
                  </TableCell>
                  )}
                  
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredAccounts.map((account) => (
                  <TableRow
                    key={`${account.role}-${account.account_id}`}
                    sx={{ "&:hover": { backgroundColor: "background.table" } }}
                  >
                    <TableCell sx={{ textTransform: "capitalize" }}>
                      {account.role}
                    </TableCell>
                    <TableCell>{account.username}</TableCell>
                    <TableCell>{account.email}</TableCell>
                    <TableCell>{account.strikes} / 3</TableCell>
                    <TableCell>
                      {account.is_banned ? "Banned" : "Active"}
                    </TableCell>
                    {canManageAccess && (
                      <TableCell sx={{ width: 260 }}>
                        <Stack
                          direction="row"
                          spacing={1}
                          justifyContent="center"
                          alignItems="center"
                          sx={{ width: "100%" }}
                        >
                          {!account.is_banned && (
                            <Button
                              size="small"
                              color="warning"
                              variant="outlined"
                              onClick={() => openAction(account, "strike")}
                              sx={{
                                minWidth: 110,
                                textTransform: "none",
                                fontWeight: 600,
                                whiteSpace: "nowrap",
                              }}
                            >
                              Add strike
                            </Button>
                          )}
                          <Button
                            size="small"
                            color={account.is_banned ? "success" : "error"}
                            variant={
                              account.is_banned ? "outlined" : "contained"
                            }
                            onClick={() =>
                              openAction(
                                account,
                                account.is_banned ? "unban" : "ban",
                              )
                            }
                            sx={{
                              minWidth: 100,
                              textTransform: "none",
                              fontWeight: 700,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {account.is_banned ? "Unban" : "Ban"}
                          </Button>
                        </Stack>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
      <AccessReason
        open={Boolean(selectedAccount)}
        handleClose={closeAction}
        selectedAccount={selectedAccount}
        action={action}
        submitAction={submitAction}
      />
    </Box>
  );
}
