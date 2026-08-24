import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  Box,
  Chip,
  CircularProgress,
  InputAdornment,
  Paper,
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
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import SearchIcon from "@mui/icons-material/Search";
import { fetchAuditLogs } from "../../api/admin/auditLogsAPI";

export default function AuditLogs() {
  const [search, setSearch] = useState("");
  const [date, setDate] = useState(null);
  const [logs, setLogs] = useState([]);
  const [logsErrorMessage, setLogsErrorMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLogs = async () => {
      try {
        setLoading(true);
        setLogs(await fetchAuditLogs(search, date));
        setLogsErrorMessage("");
      } catch (loadError) {
        setLogsErrorMessage(loadError.message || "Unable to load audit logs.");
      } finally {
        setLoading(false);
      }
    };
    loadLogs();
  }, [search, date]);

  return (
    <Box sx={{ p: 3 }}>
      <Helmet titleTemplate="%s - ArtMatch">
        <title>Audit Logs</title>
      </Helmet>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          flexDirection: { xs: "column", sm: "row" },
          mb: 2,
        }}
      >
        <Typography
          variant="h4"
          gutterBottom
          sx={{ fontWeight: "bold", fontSize: { xs: 24, sm: 32 } }}
        >
          Audit Logs
        </Typography>
      </Box>

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
            size="small"
            label="Search logs"
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

          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              label="Select Date"
              value={date}
              onChange={(newDate) => setDate(newDate)}
              enableAccessibleFieldDOMStructure={false}
              slots={{ textField: TextField }}
              slotProps={{
                textField: {
                  size: "small",
                  fullWidth: true,
                },
              }}
              sx={{
                width: { xs: "100%", sm: 200 },
              }}
            />
          </LocalizationProvider>
        </Box>
      </Paper>

      {/* Table Section */}
      <Paper sx={{ p: 3, mt: 3, borderRadius: 2 }} variant="outlined">
        <Typography variant="h6" sx={{ mb: 2 }}>
          Audit Log List
        </Typography>
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
          <TableContainer>
            <Table>
              <TableHead sx={{ backgroundColor: "background.table" }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: "bold" }}>Datetime</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>Action</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>Actor</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>Role</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>Information</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.map((log) => (
                  <TableRow
                    key={log.audit_id}
                    sx={{ "&:hover": { backgroundColor: "background.table" } }}
                  >
                    <TableCell>
                      {new Date(log.datetime).toLocaleString()}
                    </TableCell>
                    <TableCell>{log.action.charAt(0).toUpperCase() + log.action.slice(1).toLowerCase()}</TableCell>
                    <TableCell>{log.actor}</TableCell>
                    <TableCell>{log.role}</TableCell>
                    <TableCell>
                      <Chip
                        label={String(log.status).charAt(0).toUpperCase() + String(log.status).slice(1).toLowerCase()}
                        size="small" sx={{ fontWeight: 600, color: "white", width: 75 }}
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
                    <TableCell>{log.information || "-"}</TableCell>
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
