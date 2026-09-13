import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  Alert,
  Box,
  Chip,
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
import { useTheme } from "@mui/material/styles";
import SearchIcon from "@mui/icons-material/Search";
import { fetchAccountAccess } from "../../api/admin/accountAccessAPI";

export default function AccountAccess() {
  const theme = useTheme();
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
  )
    .trim()
    .toLowerCase();
  const isSuperAdmin = currentRole === "super admin";
  const isAdmin = currentRole === "admin";
  const hasPermission = (key) =>
    ["1", "true"].includes(String(localStorage.getItem(key)).toLowerCase());
  return (
    <Box
      sx={{
        p: { xs: 1.5, sm: 2.5 },
        minHeight: "100vh",
        backgroundColor: theme.palette.background.default,
        color: theme.palette.text.primary,
      }}
    >
      <Helmet titleTemplate="%s - ArtMatch">
        <title>Account List</title>
      </Helmet>
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "stretch", sm: "center" },
          gap: 2,
          mb: 2,
        }}
      >
        <Box>
          <Typography
            sx={{
              fontSize: { xs: 28, sm: 38 },
              fontWeight: 800,
              lineHeight: 1.1,
              color: theme.palette.text.primary,
            }}
          >
            Account List
          </Typography>
          <Typography
            sx={{
              mt: 0.75,
              color: theme.palette.text.secondary,
              fontSize: 13,
            }}
          >
            Monitor and manage the accounts students and customers of the
            platform
          </Typography>
        </Box>
      </Box>
      {/* Filter Section */}
      {/* Filter Section */}
      <Paper
        sx={{
          p: { xs: 2, md: 2.5 },
          mt: 2.5,
          borderRadius: 2.5,
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
            variant="outlined"
            placeholder="Search accounts..."
            size="small"
            sx={{
              width: { xs: "100%", lg: 280 },
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
              alignItems: "center",
              gap: 1,
              flexWrap: "wrap",
            }}
          >
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel
                sx={{ color: theme.palette.text.secondary, fontSize: 12 }}
              >
                Sort
              </InputLabel>
              <Select
                name="sort"
                label="Sort"
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                sx={{
                  fontSize: 12,
                  color: theme.palette.text.primary,
                  backgroundColor: theme.palette.background.default,
                  ".MuiOutlinedInput-notchedOutline": {
                    borderColor: theme.palette.divider,
                  },
                }}
              >
                <MenuItem value="az">A to Z</MenuItem>
                <MenuItem value="za">Z to A</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel
                sx={{ color: theme.palette.text.secondary, fontSize: 12 }}
              >
                Role
              </InputLabel>
              <Select
                name="role"
                label="Role"
                value={roleOption}
                onChange={(e) => setRoleOption(e.target.value)}
                sx={{
                  fontSize: 12,
                  color: theme.palette.text.primary,
                  backgroundColor: theme.palette.background.default,
                  ".MuiOutlinedInput-notchedOutline": {
                    borderColor: theme.palette.divider,
                  },
                }}
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
      <Paper
        sx={{ p: { xs: 1, md: 1.5 }, mt: 2.5, borderRadius: 2.5 }}
        variant="outlined"
      >
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
            <Table size="small">
              <TableHead sx={{ backgroundColor: "#f8fafc" }}>
                <TableRow>
                  {["Role", "Account", "Email", "Strikes", "Status"].map(
                    (heading) => (
                      <TableCell
                        key={heading}
                        sx={{
                          py: 1.5,
                          color: "text.secondary",
                          fontSize: 11,
                          fontWeight: 800,
                          letterSpacing: 0.8,
                          textTransform: "uppercase",
                        }}
                      >
                        {heading}
                      </TableCell>
                    ),
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredAccounts.map((account) => (
                  <TableRow
                    key={`${account.role}-${account.account_id}`}
                    sx={{
                      "&:hover": { backgroundColor: "#f8fafc" },
                      "&:last-child td": { borderBottom: 0 },
                    }}
                  >
                    <TableCell
                      sx={{ textTransform: "capitalize", fontWeight: 700 }}
                    >
                      {account.role}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>
                      {account.username}
                    </TableCell>
                    <TableCell sx={{ color: "text.secondary" }}>
                      {account.email}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={`${account.strikes} / 3`}
                        color={account.strikes > 0 ? "warning" : "default"}
                        sx={{ fontWeight: 700, fontSize: 11 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={account.is_banned ? "Banned" : "Active"}
                        color={account.is_banned ? "error" : "success"}
                        sx={{ fontWeight: 700, fontSize: 11 }}
                      />
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
