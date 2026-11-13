import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  Alert,
  Box,
  Button,
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
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import {
  fetchAccountAccess,
  fetchAccountAccessReport,
} from "../../api/admin/accountAccessAPI";
import ReportFormatDialog from "../../components/admin/ReportFormatDialog";
import ConnectionErrorPanel from "../../components/admin/ConnectionErrorPanel";
import AdminLoadingPanel from "../../components/admin/AdminLoadingPanel";
import {
  adminSearchInputSx,
  adminSelectInputSx,
} from "../../components/admin/adminFilterStyles";
import {
  downloadCsvReport,
  downloadPdfReport,
  getReportDateStamp,
} from "../../utils/csvReport";

const accessReportColumns = [
  { key: "datetime", label: "Date and Time" },
  { key: "action", label: "Action" },
  { key: "role", label: "Account Role" },
  { key: "account_id", label: "Account ID" },
  { key: "account_name", label: "Account Name" },
  { key: "username", label: "Username / Student Number" },
  { key: "email", label: "Email" },
  { key: "strike_number", label: "Strike Number" },
  { key: "reason", label: "Reason" },
  { key: "current_strikes", label: "Current Strikes" },
  { key: "is_banned", label: "Currently Banned" },
  { key: "admin_id", label: "Admin ID" },
  { key: "admin_username", label: "Admin Username" },
];

export default function AccountAccess() {
  const theme = useTheme();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reportError, setReportError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState("az");
  const [roleOption, setRoleOption] = useState("");
  const [reportLoading, setReportLoading] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      setError("");
      setAccounts(await fetchAccountAccess());
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
  const handleDownloadReport = async (format) => {
    setReportDialogOpen(false);
    try {
      setReportLoading(true);
      setReportError("");
      const report = await fetchAccountAccessReport({
        role: roleOption,
        search: searchQuery.trim(),
      });
      if (!report.length) {
        setReportError("No strike or ban records match the selected filters.");
        return;
      }
      const download = format === "pdf" ? downloadPdfReport : downloadCsvReport;
      const extension = format === "pdf" ? "pdf" : "csv";
      await download(
        report,
        accessReportColumns,
        `strike-ban-report-${getReportDateStamp()}.${extension}`,
      );
      setReportDialogOpen(false);
    } catch (reportError) {
      setReportError(
        reportError.message || "Unable to generate strike and ban report.",
      );
    } finally {
      setReportLoading(false);
    }
  };
  if (loading && accounts.length === 0) {
    return (
      <AdminLoadingPanel
        title="Account List"
        subtitle="Monitor and manage the accounts students and customers of the platform"
        showMetrics={false}
      />
    );
  }

  if (error) {
    return (
      <Box sx={{ minWidth: 0 }}>
        <Helmet titleTemplate="%s - ArtMatch">
          <title>Account List</title>
        </Helmet>
        <ConnectionErrorPanel
          title="Account Access Unavailable"
          message={error}
          onRetry={loadAccounts}
        />
      </Box>
    );
  }

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
          mb: 2.5,
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
        <Button
          variant="contained"
          color="error"
          startIcon={<DownloadOutlinedIcon />}
          onClick={() => setReportDialogOpen(true)}
          disabled={reportLoading}
          sx={{
            width: { xs: "100%", sm: "auto" },
            height: { xs: 38, sm: 44 },
            minWidth: { xs: 45, sm: 50 },
            fontSize: { xs: 12, sm: 15 },
            px: 2.5,
            borderRadius: 1.5,
            textTransform: "none",
            fontWeight: 700,
          }}
        >
          {reportLoading ? "Generating..." : "Download Strike/Ban Report"}
        </Button>
      </Box>
      {reportError && (
        <Alert
          severity="error"
          onClose={() => setReportError("")}
          sx={{ mb: 2 }}
        >
          {reportError}
        </Alert>
      )}
      {/* Filter Section */}
      <Paper
        sx={{
          p: { xs: 1.5, sm: 2, md: 2.5 },
          borderRadius: 2.5,
          backgroundColor: theme.palette.background.paper,
          borderColor: theme.palette.divider,
          minWidth: 0,
          overflow: "hidden",
        }}
        variant="outlined"
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "minmax(0, 1fr)",
              lg: "minmax(220px, 1fr) auto",
            },
            alignItems: "center",
            gap: { xs: 1.5, sm: 2 },
            minWidth: 0,
          }}
        >
          <TextField
            variant="outlined"
            placeholder="Search accounts..."
            size="small"
            fullWidth
            sx={adminSearchInputSx(theme, { minWidth: 0 })}
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
              display: "grid",
              gridTemplateColumns: {
                xs: "minmax(0, 1fr)",
                sm: "repeat(2, minmax(0, 1fr))",
                lg: "repeat(2, minmax(145px, 165px))",
              },
              gap: { xs: 1.5, sm: 1.5 },
              minWidth: 0,
            }}
          >
            <FormControl size="small" fullWidth sx={{ minWidth: 0 }}>
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
                sx={adminSelectInputSx(theme)}
              >
                <MenuItem value="az">A to Z</MenuItem>
                <MenuItem value="za">Z to A</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" fullWidth sx={{ minWidth: 0 }}>
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
                sx={adminSelectInputSx(theme)}
              >
                <MenuItem value="">Default</MenuItem>
                <MenuItem value="buyer">Buyer</MenuItem>
                <MenuItem value="seller">Seller</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>
      </Paper>

      {!loading && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 1.5,
            mt: 2,
            mb: 1,
            minHeight: 34,
          }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
            aria-live="polite"
            sx={{ fontWeight: 600 }}
          >
            Showing {filteredAccounts.length} of {accounts.length} accounts
          </Typography>
        </Box>
      )}

      {/* Table Section */}
      <Paper
        component="section"
        variant="outlined"
        aria-label="Account access table"
        sx={{
          borderRadius: 3.5,
          borderColor: "divider",
          overflow: "hidden",
          bgcolor: "background.paper",
        }}
      >
        <Box
          sx={{
            px: { xs: 2, sm: 3 },
            py: 2,
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <Typography variant="h6" fontWeight={800} sx={{ fontSize: 16 }}>
            Account access activity
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontSize: 12 }}
          >
            Review account roles, contact details, and strike status.
          </Typography>
        </Box>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        ) : filteredAccounts.length === 0 ? (
          <Typography color="textSecondary" sx={{ py: 3, textAlign: "center" }}>
            No accounts found
          </Typography>
        ) : (
          <TableContainer
            sx={{ maxHeight: { xs: 580, md: 720 }, overflowX: "auto" }}
          >
            <Table
              size="small"
              stickyHeader
              aria-label="Account access records"
              sx={{ minWidth: 760 }}
            >
              <TableHead
                sx={{
                  "& th": {
                    bgcolor:
                      theme.palette.mode === "dark"
                        ? "background.paper"
                        : "#f8fafc",
                    fontWeight: 800,
                    fontSize: 11,
                    letterSpacing: 0.5,
                    textTransform: "uppercase",
                    color: "text.secondary",
                    py: 1.5,
                    borderBottom: "1px solid",
                    borderColor: "divider",
                    whiteSpace: "nowrap",
                  },
                }}
              >
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
                      "& td": { py: 1.75, verticalAlign: "middle" },
                      "&:hover": {
                        backgroundColor: theme.palette.action.hover,
                      },
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
                        sx={{ fontWeight: 700, fontSize: 11, color: "#fff" }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
      <ReportFormatDialog
        open={reportDialogOpen}
        onClose={() => setReportDialogOpen(false)}
        onSelectFormat={handleDownloadReport}
      />
    </Box>
  );
}
