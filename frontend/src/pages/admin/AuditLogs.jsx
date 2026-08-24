import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  Box,
  Chip,
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
import SearchIcon from "@mui/icons-material/Search";
import { fetchAuditLogs } from "../../api/admin/auditLogsAPI";

export default function AuditLogs() {
  const [search, setSearch] = useState("");
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLogs = async () => {
      try {
        setLoading(true);
        setLogs(await fetchAuditLogs(search));
        setError("");
      } catch (loadError) {
        setError(loadError.message || "Unable to load audit logs.");
      } finally {
        setLoading(false);
      }
    };
    loadLogs();
  }, [search]);

  return (
    <Box sx={{ p: 3 }}>
      <Helmet titleTemplate="%s - ArtMatch">
        <title>Audit Logs</title>
      </Helmet>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", sm: "center" }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: "bold" }}>
            Audit Logs
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            Review administrative activity and account changes.
          </Typography>
        </Box>
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
      </Stack>

      {loading && (
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Loading audit logs...
        </Typography>
      )}
      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      <TableContainer
        component={Paper}
        variant="outlined"
        sx={{ borderRadius: 2 }}
      >
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Datetime</TableCell>
              <TableCell>Action</TableCell>
              <TableCell>Actor</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Information</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? null : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                  <Typography color="text.secondary">
                    {search
                      ? "No matching audit logs."
                      : "No audit logs recorded yet."}
                  </Typography>
                  <Chip
                    label="Waiting for activity"
                    size="small"
                    sx={{ mt: 1 }}
                  />
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.audit_id}>
                  <TableCell>
                    {new Date(log.datetime).toLocaleString()}
                  </TableCell>
                  <TableCell>{log.action}</TableCell>
                  <TableCell>{log.actor}</TableCell>
                  <TableCell>{log.role}</TableCell>
                  <TableCell>{log.status}</TableCell>
                  <TableCell>{log.information || "-"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
