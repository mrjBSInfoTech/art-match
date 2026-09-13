import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  InputAdornment,
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
import { useTheme } from "@mui/material/styles";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import SearchIcon from "@mui/icons-material/Search";
import { fetchAuditLogs } from "../../api/admin/auditLogsAPI";

export default function AuditLogs() {
  const theme = useTheme(); 
  const [search, setSearch] = useState("");
  const [date, setDate] = useState(null);
  const [period, setPeriod] = useState("all");
  const [logs, setLogs] = useState([]);
  const [visibleCount, setVisibleCount] = useState(50);
  const [logsErrorMessage, setLogsErrorMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLogs = async () => {
      try {
        setLoading(true);
        setLogs(await fetchAuditLogs(search, date, period));
        setVisibleCount(50);
        setLogsErrorMessage("");
      } catch (loadError) {
        setLogsErrorMessage(loadError.message || "Unable to load audit logs.");
      } finally {
        setLoading(false);
      }
    };
    loadLogs();
  }, [search, date, period]);

  const formatAndCapitalize = (data) => {
    if (!data) return "N/A";

    const list = Array.isArray(data)
      ? data
      : typeof data === "string"
        ? data.split(",")
        : [];

    if (list.length === 0) return "N/A";

    const formatted = list
      .map((item) => {
        if (typeof item !== "string") return "";
        const trimmed = item.trim();
        if (!trimmed) return "";

        return trimmed
          .split(" ")
          .map(
            (word) =>
              word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
          )
          .join(" ");
      })
      .filter(Boolean);
    return formatted.length > 0 ? formatted.join(", ") : "N/A";
  };

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
              fontSize: { xs: 28, sm: 34 },
              fontWeight: 800,
              lineHeight: 1.1,
              color: theme.palette.text.primary,
            }}
          >
            Audit Logs
          </Typography>
          <Typography
            sx={{
              mt: 0.75,
              color: theme.palette.text.secondary,
              fontSize: 13,
            }}
          >
            Monitor the actions and activities performed by users on the platform
          </Typography>
        </Box>
      </Box>

      <Paper
        sx={{
          p: { xs: 1.25, sm: 1.5 },
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
            placeholder="Search logs..."
            size="small"
            sx={{
              width: { xs: "100%", lg: 260 },
              maxWidth: { lg: 300 },
              flex: { lg: 1 },
              "& .MuiOutlinedInput-root": {
                color: theme.palette.text.primary,
                backgroundColor: theme.palette.background.default,
                borderRadius: 1.5,
                "& fieldset": { borderColor: theme.palette.divider },
                "&:hover fieldset": { borderColor: theme.palette.text.secondary },
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
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                value={date}
                onChange={(newDate) => setDate(newDate)}
                enableAccessibleFieldDOMStructure={false}
                slots={{ textField: TextField }}
                slotProps={{
                  textField: {
                    size: "small",
                    placeholder: "Select Date",
                    sx: {
                      width: { xs: "100%", sm: 180 },
                      minWidth: { xs: "100%", sm: 180 },
                      "& .MuiOutlinedInput-root": {
                        fontSize: 12,
                        color: theme.palette.text.primary,
                        backgroundColor: theme.palette.background.default,
                        borderRadius: 1.5,
                        "& fieldset": { borderColor: theme.palette.divider },
                        "&:hover fieldset": { borderColor: theme.palette.text.secondary },
                      },
                    },
                  },
                }}
              />
            </LocalizationProvider>

            <FormControl
              size="small"
              sx={{
                minWidth: { xs: "100%", sm: 150 },
                width: { xs: "100%", sm: "auto" },
              }}
            >
              <Select
                value={period}
                onChange={(event) => setPeriod(event.target.value)}
                sx={{
                  fontSize: 11,
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

      {/* Table Section */}
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
            py: 1.25,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 1,
            borderBottom: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Typography sx={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase" }}>
            Audit Log List
          </Typography>
          {!loading && !logsErrorMessage && (
            <Typography sx={{ color: theme.palette.text.secondary, fontSize: 10 }}>
              Showing {Math.min(visibleCount, logs.length)} of {logs.length} entries
            </Typography>
          )}
        </Box>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        ) : logsErrorMessage ? (
          <Typography color="error" sx={{ py: 3, textAlign: "center" }}>
            {logsErrorMessage}
          </Typography>
        ) : logs.length === 0 ? (
          <Typography color="textSecondary" sx={{ py: 3, textAlign: "center" }}>
            No audit logs found
          </Typography>
        ) : (
          <TableContainer sx={{ overflowX: "auto" }}>
            <Table size="small" sx={{ minWidth: 760 }}>
              <TableHead sx={{ backgroundColor: theme.palette.mode === "dark" ? "background.table" : "#f8fafc" }}>
                <TableRow>
                  {[
                    "Datetime",
                    "Action",
                    "Actor",
                    "Role",
                    "Status",
                    "Information",
                  ].map((heading) => (
                    <TableCell
                      key={heading}
                      sx={{
                        py: 1,
                        color: theme.palette.text.secondary,
                        fontSize: 9,
                        fontWeight: 800,
                        textTransform: "uppercase",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {heading}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.slice(0, visibleCount).map((log) => (
                  <TableRow
                    key={log.audit_id}
                    sx={{
                      "&:hover": { backgroundColor: "action.hover" },
                      "&:last-child td": { borderBottom: 0 },
                    }}
                  >
                    <TableCell sx={{ fontSize: 10, whiteSpace: "nowrap", color: theme.palette.text.secondary }}>
                      {new Date(log.datetime).toLocaleString()}
                    </TableCell>
                    <TableCell sx={{ fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}>
                      {String(log.action)
                        .replace(/_/g, " ")
                        .toLowerCase()
                        .replace(/\b\w/g, (letter) => letter.toUpperCase())}
                    </TableCell>
                    <TableCell sx={{ fontSize: 11, whiteSpace: "nowrap" }}>{log.actor}</TableCell>
                    <TableCell>
                      <Chip
                        label={formatAndCapitalize(log.role)}
                        size="small"
                        sx={{
                          height: 20,
                          borderRadius: 1,
                          backgroundColor: theme.palette.mode === "dark" ? "#334155" : "#f1f5f9",
                          color: theme.palette.text.secondary,
                          fontSize: 9,
                          fontWeight: 700,
                        }}
                      />
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
                          color:
                            ["success", "logged in", "online"].includes(String(log.status).toLowerCase())
                              ? "#15803d"
                              : ["failed", "error"].includes(String(log.status).toLowerCase())
                                ? theme.palette.error.main
                                : theme.palette.text.secondary,
                          backgroundColor:
                            ["success", "logged in", "online"].includes(String(log.status).toLowerCase())
                              ? theme.palette.mode === "dark" ? "rgba(34, 197, 94, 0.16)" : "#dcfce7"
                              : theme.palette.mode === "dark" ? "rgba(148, 163, 184, 0.16)" : "#f1f5f9",
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
                    <TableCell sx={{ fontSize: 10, color: theme.palette.text.secondary, whiteSpace: "nowrap" }}>
                      {log.information || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {logs.length > 50 && (
              <Stack
                direction="row"
                justifyContent="center"
                spacing={1}
                sx={{ mt: 2 }}
              >
                {visibleCount < logs.length && (
                  <Button
                    variant="outlined"
                    onClick={() =>
                      setVisibleCount((count) =>
                        Math.min(count + 50, logs.length),
                      )
                    }
                  >
                    More
                  </Button>
                )}
                {visibleCount > 50 && (
                  <Button variant="text" onClick={() => setVisibleCount(50)}>
                    Less
                  </Button>
                )}
              </Stack>
            )}
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
}
