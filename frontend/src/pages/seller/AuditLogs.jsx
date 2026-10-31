import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link as RouterLink } from "react-router-dom";
import {
  Box,
  Chip,
  CircularProgress,
  FormControl,
  InputAdornment,
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
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import SearchIcon from "@mui/icons-material/Search";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import { fetchSellerAuditLogs } from "../../api/seller/auditLogsAPI";

const getOrderNumberFromLog = (log) => {
  if (!log?.information) return null;
  const match = log.information.match(/AM-\d+/i);
  return match ? match[0].toUpperCase() : null;
};

const isTransactionActivity = (log) => {
  const action = String(log?.action || "").toUpperCase();
  const info = String(log?.information || "").toUpperCase();
  return (
    action.startsWith("SALE_") ||
    action.startsWith("ORDER_") ||
    action.startsWith("PAYOUT_") ||
    action.startsWith("RETURN_") ||
    action.includes("ORDER") ||
    info.includes("AM-") ||
    info.includes("PAYOUT") ||
    info.includes("PAYMENT") ||
    info.includes("REFUND")
  );
};

export default function SellerAuditLogs() {
  const theme = useTheme();
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState("");
  const [date, setDate] = useState(null);
  const [period, setPeriod] = useState("all");
  const [activityCategory, setActivityCategory] = useState("all");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchSellerAuditLogs()
      .then((entries) => {
        if (active) setLogs(entries);
      })
      .catch((error) => {
        if (active) setErrorMessage(error.message || "Unable to load your audit logs.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const filteredLogs = useMemo(() => {
    const query = search.trim().toLowerCase();

    return logs.filter((log) => {
      if (activityCategory === "transactions" && !isTransactionActivity(log)) {
        return false;
      }
      if (activityCategory === "account" && isTransactionActivity(log)) {
        return false;
      }

      const orderNumber = getOrderNumberFromLog(log);
      const searchableText = [
        log.action,
        log.actor,
        log.role,
        log.status,
        log.information,
        orderNumber,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (query && !searchableText.includes(query)) {
        return false;
      }

      if (date) {
        const targetDate = date.format ? date.format("YYYY-MM-DD") : String(date);
        const logDate = new Date(log.datetime);
        if (Number.isNaN(logDate.getTime())) return false;
        if (logDate.toISOString().slice(0, 10) !== targetDate) {
          return false;
        }
      }

      if (period !== "all") {
        const logDate = new Date(log.datetime);
        if (Number.isNaN(logDate.getTime())) return false;

        const now = new Date();
        const diffHours = (now - logDate) / (1000 * 60 * 60);

        switch (period) {
          case "hour":
            if (diffHours > 24) return false;
            break;
          case "day":
            if (diffHours > 24) return false;
            break;
          case "week":
            if (diffHours > 168) return false;
            break;
          case "month":
            if (diffHours > 720) return false;
            break;
          case "year":
            if (diffHours > 8760) return false;
            break;
          default:
            break;
        }
      }

      return true;
    });
  }, [logs, search, date, period, activityCategory]);

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
        <title>Audit Logs</title>
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
            My Activity
          </Typography>
          <Typography
            sx={{
              mt: 0.75,
              color: theme.palette.text.secondary,
              fontSize: 13,
            }}
          >
            Review all activities associated with your account, including artwork sales,
            order deliveries, payments confirmed, earnings recorded, payouts, and account updates.
          </Typography>
        </Box>
      </Box>

      <Paper
        sx={{
          p: { xs: 1.5, sm: 2 },
          mt: 2,
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
            width: "100%",
          }}
        >
          <TextField
            variant="outlined"
            placeholder="Search activity by order #, action, or details..."
            size="small"
            sx={{
              width: { xs: "100%", lg: 320 },
              maxWidth: { lg: 360 },
              flex: { lg: 1 },
              "& .MuiOutlinedInput-root": {
                color: theme.palette.text.primary,
                backgroundColor: theme.palette.background.default,
                borderRadius: 1.5,
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
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              flexWrap: "wrap",
              justifyContent: { xs: "stretch", lg: "flex-end" },
              width: { xs: "100%", lg: "auto" },
            }}
          >
            <FormControl
              size="small"
              sx={{
                minWidth: { xs: "100%", sm: 180 },
                width: { xs: "100%", sm: "auto" },
              }}
            >
              <Select
                value={activityCategory}
                onChange={(event) => setActivityCategory(event.target.value)}
                sx={{
                  fontSize: 12,
                  color: theme.palette.text.primary,
                  backgroundColor: theme.palette.background.default,
                  borderRadius: 1.5,
                  ".MuiOutlinedInput-notchedOutline": {
                    borderColor: theme.palette.divider,
                  },
                }}
              >
                <MenuItem value="all">All Activity Types</MenuItem>
                <MenuItem value="transactions">Orders, Sales & Payouts</MenuItem>
                <MenuItem value="account">Account & Profile Actions</MenuItem>
              </Select>
            </FormControl>

            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                value={date}
                onChange={(newDate) => setDate(newDate)}
                enableAccessibleFieldDOMStructure={false}
                slots={{ textField: TextField }}
                slotProps={{
                  textField: {
                    size: "small",
                    placeholder: "Select date",
                    sx: {
                      width: { xs: "100%", sm: 170 },
                      minWidth: { xs: "100%", sm: 170 },
                      "& .MuiOutlinedInput-root": {
                        fontSize: 13,
                        color: theme.palette.text.primary,
                        backgroundColor: theme.palette.background.default,
                        borderRadius: 1.5,
                        "& fieldset": { borderColor: theme.palette.divider },
                        "&:hover fieldset": {
                          borderColor: theme.palette.text.secondary,
                        },
                      },
                    },
                  },
                }}
              />
            </LocalizationProvider>

            <FormControl
              size="small"
              sx={{
                minWidth: { xs: "100%", sm: 140 },
                width: { xs: "100%", sm: "auto" },
              }}
            >
              <Select
                value={period}
                onChange={(event) => setPeriod(event.target.value)}
                sx={{
                  fontSize: 12,
                  color: theme.palette.text.primary,
                  backgroundColor: theme.palette.background.default,
                  borderRadius: 1.5,
                  ".MuiOutlinedInput-notchedOutline": {
                    borderColor: theme.palette.divider,
                  },
                }}
              >
                <MenuItem value="hour">Last 1 hour</MenuItem>
                <MenuItem value="day">Last 1 day</MenuItem>
                <MenuItem value="week">Last 1 week</MenuItem>
                <MenuItem value="month">Last 1 month</MenuItem>
                <MenuItem value="year">Last 1 year</MenuItem>
                <MenuItem value="all">All time</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>
      </Paper>

      <Paper
        sx={{
          mt: 2,
          borderRadius: 2,
          overflow: "hidden",
          backgroundColor: theme.palette.background.paper,
          borderColor: theme.palette.divider,
        }}
        variant="outlined"
      >
        <Box
          sx={{
            px: { xs: 1.5, sm: 2 },
            py: 1.5,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 1,
            borderBottom: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <ReceiptLongIcon sx={{ fontSize: 18, color: "#ef3340" }} />
            <Typography
              sx={{ fontSize: 13, fontWeight: 800, textTransform: "uppercase" }}
            >
              Activity & Transaction History
            </Typography>
          </Box>
          {!loading && !errorMessage && (
            <Typography sx={{ color: theme.palette.text.secondary, fontSize: 12 }}>
              Showing {filteredLogs.length} of {logs.length} entries
            </Typography>
          )}
        </Box>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        ) : errorMessage ? (
          <Typography color="error" sx={{ py: 3, textAlign: "center" }}>
            {errorMessage}
          </Typography>
        ) : filteredLogs.length === 0 ? (
          <Typography color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
            No activity has been recorded yet.
          </Typography>
        ) : (
          <TableContainer sx={{ overflowX: "auto" }}>
            <Table size="small" sx={{ minWidth: 800 }}>
              <TableHead
                sx={{
                  backgroundColor:
                    theme.palette.mode === "dark"
                      ? "background.table"
                      : "#f8fafc",
                }}
              >
                <TableRow>
                  {["Date and time", "Activity", "Order #", "Status", "Details"].map(
                    (heading) => (
                      <TableCell
                        key={heading}
                        sx={{
                          py: 1.5,
                          color: theme.palette.text.secondary,
                          fontSize: 10,
                          fontWeight: 800,
                          textTransform: "uppercase",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {heading}
                      </TableCell>
                    ),
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredLogs.map((log) => {
                  const orderNumber = getOrderNumberFromLog(log);
                  return (
                    <TableRow
                      key={log.audit_id}
                      sx={{
                        "&:hover": { backgroundColor: "action.hover" },
                        "&:last-child td": { borderBottom: 0 },
                      }}
                    >
                      <TableCell
                        sx={{
                          whiteSpace: "nowrap",
                          fontSize: 11,
                          color: theme.palette.text.secondary,
                        }}
                      >
                        {new Date(log.datetime).toLocaleString()}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontSize: 12,
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {String(log.action)
                          .replace(/_/g, " ")
                          .toLowerCase()
                          .replace(/\b\w/g, (letter) => letter.toUpperCase())}
                      </TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>
                        {orderNumber ? (
                          <Chip
                            component={RouterLink}
                            to={`/seller/orders/manage?search=${encodeURIComponent(orderNumber)}`}
                            clickable
                            label={orderNumber}
                            size="small"
                            sx={{
                              height: 22,
                              fontWeight: 700,
                              fontSize: 11,
                              borderRadius: 1,
                              cursor: "pointer",
                              textDecoration: "none",
                              color: theme.palette.primary.main,
                              bgcolor: (t) =>
                                t.palette.mode === "dark"
                                  ? "rgba(239,51,64,0.12)"
                                  : "rgba(239,51,64,0.08)",
                              "&:hover": {
                                bgcolor: (t) =>
                                  t.palette.mode === "dark"
                                    ? "rgba(239,51,64,0.2)"
                                    : "rgba(239,51,64,0.16)",
                              },
                            }}
                          />
                        ) : (
                          <Typography variant="caption" color="text.disabled">
                            —
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={
                            String(log.status).charAt(0).toUpperCase() +
                            String(log.status).slice(1).toLowerCase()
                          }
                          size="small"
                          sx={{
                            height: 20,
                            minWidth: 58,
                            borderRadius: 1,
                            fontWeight: 700,
                            fontSize: 9,
                            color: ["success", "logged in", "online"].includes(
                              String(log.status).toLowerCase(),
                            )
                              ? "#15803d"
                              : ["failed", "error"].includes(
                                    String(log.status).toLowerCase(),
                                  )
                                ? theme.palette.error.main
                                : theme.palette.text.secondary,
                            backgroundColor: ["success", "logged in", "online"].includes(
                              String(log.status).toLowerCase(),
                            )
                              ? theme.palette.mode === "dark"
                                ? "rgba(34, 197, 94, 0.16)"
                                : "#dcfce7"
                              : theme.palette.mode === "dark"
                                ? "rgba(148, 163, 184, 0.16)"
                                : "#f1f5f9",
                          }}
                          color={
                            String(log.status).toLowerCase() === "success" ||
                            String(log.status).toLowerCase() === "logged in" ||
                            String(log.status).toLowerCase() === "online"
                              ? "success"
                              : String(log.status).toLowerCase() === "failed" ||
                                  String(log.status).toLowerCase() === "error"
                                ? "error"
                                : "default"
                          }
                        />
                      </TableCell>
                      <TableCell
                        sx={{
                          minWidth: 260,
                          fontSize: 12,
                          color: theme.palette.text.secondary,
                          whiteSpace: "normal",
                        }}
                      >
                        {log.information || "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
}
