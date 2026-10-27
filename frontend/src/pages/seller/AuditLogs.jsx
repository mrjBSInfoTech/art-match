import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  Box,
  Chip,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { fetchSellerAuditLogs } from "../../api/seller/auditLogsAPI";

export default function SellerAuditLogs() {
  const theme = useTheme();
  const [logs, setLogs] = useState([]);
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

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2.5 }, minHeight: "100vh", bgcolor: "background.default" }}>
      <Helmet>
        <title>Audit Logs | Red Nexus Seller</title>
      </Helmet>
      <Typography variant="h4" sx={{ fontWeight: 800 }}>
        My Activity
      </Typography>
      <Typography sx={{ mt: 0.75, color: "text.secondary", fontSize: 13 }}>
        Review only activity associated with your account, including sign-ins,
        account changes, sales, and seller actions.
      </Typography>

      <Paper variant="outlined" sx={{ mt: 2.5, borderRadius: 2, overflow: "hidden" }}>
        <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Typography sx={{ fontSize: 13, fontWeight: 800, textTransform: "uppercase" }}>
            Activity history
          </Typography>
        </Box>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        ) : errorMessage ? (
          <Typography color="error" sx={{ py: 3, textAlign: "center" }}>
            {errorMessage}
          </Typography>
        ) : logs.length === 0 ? (
          <Typography color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
            No activity has been recorded yet.
          </Typography>
        ) : (
          <TableContainer sx={{ overflowX: "auto" }}>
            <Table size="small" sx={{ minWidth: 700 }}>
              <TableHead sx={{ bgcolor: theme.palette.mode === "dark" ? "background.table" : "#f8fafc" }}>
                <TableRow>
                  {["Date and time", "Activity", "Status", "Details"].map((heading) => (
                    <TableCell
                      key={heading}
                      sx={{
                        py: 1.5,
                        color: "text.secondary",
                        fontSize: 10,
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
                {logs.map((log) => (
                  <TableRow key={log.audit_id} sx={{ "&:hover": { bgcolor: "action.hover" } }}>
                    <TableCell sx={{ whiteSpace: "nowrap", fontSize: 11, color: "text.secondary" }}>
                      {new Date(log.datetime).toLocaleString()}
                    </TableCell>
                    <TableCell sx={{ fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>
                      {String(log.action).replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase())}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={String(log.status).charAt(0).toUpperCase() + String(log.status).slice(1).toLowerCase()}
                        size="small"
                        color={String(log.status).toLowerCase() === "success" ? "success" : String(log.status).toLowerCase() === "failed" ? "error" : "default"}
                        sx={{ height: 22, fontSize: 10, fontWeight: 700 }}
                      />
                    </TableCell>
                    <TableCell sx={{ minWidth: 260, fontSize: 11, color: "text.secondary" }}>
                      {log.information || "—"}
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
