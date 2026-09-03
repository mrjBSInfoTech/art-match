import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  Alert,
  Box,
  CircularProgress,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
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
import { fetchAccountAccess } from "../../api/admin/accountAccessAPI";

export default function AccountAccess() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
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
  return (
    <Box sx={{ p: 3 }}>
      <Helmet titleTemplate="%s - ArtMatch">
        <title>Account List</title>
      </Helmet>
      <Typography variant="h4" sx={{ fontWeight: "bold", mb: 1 }}>
        Account List
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
}
