import React from "react";
import {
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import LinkOutlinedIcon from "@mui/icons-material/LinkOutlined";
import { adminTableButtonSx } from "../adminTableStyles";

export default function PromotionHeaderTable({
  header = { message: "", button_label: "", button_url: "" },
  requests = [],
  canEdit = true,
  onEdit,
  onReviewRequest,
  reviewingRequestId = null,
}) {
  const theme = useTheme();
  const isDark = theme?.palette?.mode === "dark";

  return (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: 3.5,
        borderColor: "divider",
        overflow: "hidden",
        bgcolor: "background.paper",
      }}
    >
      <TableContainer sx={{ overflowX: "auto" }}>
        <Table size="small" aria-label="Promo header and requests table" sx={{ minWidth: 850 }}>
          <TableHead>
            <TableRow
              sx={{
                "& th": {
                  bgcolor: isDark ? "background.paper" : "#f8fafc",
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
              <TableCell>Scope / Source</TableCell>
              <TableCell>Announcement Message</TableCell>
              <TableCell>Button Label</TableCell>
              <TableCell>Destination</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {/* Active Header Row */}
            <TableRow
              sx={{
                bgcolor: isDark ? "rgba(239, 51, 64, 0.04)" : "#fffcfc",
                "&:hover": {
                  bgcolor: isDark ? "rgba(239, 51, 64, 0.08)" : "#fff5f5",
                },
              }}
            >
              <TableCell sx={{ py: 2 }}>
                <Stack spacing={0.25}>
                  <Typography variant="body2" fontWeight={800} color="#ef3340">
                    Active Banner
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    System / Admin
                  </Typography>
                </Stack>
              </TableCell>

              <TableCell sx={{ py: 2, maxWidth: 300 }}>
                <Typography
                  variant="body2"
                  fontWeight={600}
                  sx={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {header.message || "No announcement text configured"}
                </Typography>
              </TableCell>

              <TableCell sx={{ py: 2 }}>
                <Chip
                  size="small"
                  label={header.button_label || "—"}
                  sx={{
                    fontWeight: 700,
                    fontSize: 11,
                    bgcolor: isDark ? "background.default" : "#f1f5f9",
                  }}
                />
              </TableCell>

              <TableCell sx={{ py: 2 }}>
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <LinkOutlinedIcon sx={{ fontSize: 15, color: "text.secondary" }} />
                  <Typography variant="caption" fontWeight={600} color="text.secondary">
                    {header.button_url || "—"}
                  </Typography>
                </Stack>
              </TableCell>

              <TableCell sx={{ py: 2 }}>
                <Chip
                  size="small"
                  label="Currently Live"
                  sx={{
                    fontWeight: 800,
                    fontSize: 11,
                    bgcolor: isDark ? "rgba(34, 197, 94, 0.16)" : "#f0fdf4",
                    color: "success.main",
                    border: "1px solid",
                    borderColor: "success.light",
                  }}
                />
              </TableCell>

              <TableCell align="right" sx={{ py: 2 }}>
                {canEdit && (
                  <Button
                    variant="outlined"
                    startIcon={<EditOutlinedIcon fontSize="small" />}
                    onClick={onEdit}
                    sx={adminTableButtonSx}
                  >
                    Edit
                  </Button>
                )}
              </TableCell>
            </TableRow>

            {/* Student Requests Rows */}
            {requests.map((request) => {
              const isReviewing = reviewingRequestId === request.request_id;

              return (
                <TableRow
                  key={request.request_id}
                  hover
                  sx={{
                    "&:last-child td, &:last-child th": { border: 0 },
                  }}
                >
                  <TableCell sx={{ py: 1.75 }}>
                    <Stack spacing={0.25}>
                      <Typography variant="body2" fontWeight={700}>
                        {request.first_name} {request.last_name}
                      </Typography>
                      {request.student_number && (
                        <Typography variant="caption" color="text.secondary">
                          ID: {request.student_number}
                        </Typography>
                      )}
                    </Stack>
                  </TableCell>

                  <TableCell sx={{ py: 1.75, maxWidth: 300 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {request.message}
                    </Typography>
                  </TableCell>

                  <TableCell sx={{ py: 1.75 }}>
                    <Chip
                      size="small"
                      label={request.button_label}
                      sx={{
                        fontWeight: 600,
                        fontSize: 11,
                        bgcolor: isDark ? "background.default" : "#f1f5f9",
                      }}
                    />
                  </TableCell>

                  <TableCell sx={{ py: 1.75 }}>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <LinkOutlinedIcon sx={{ fontSize: 15, color: "text.secondary" }} />
                      <Typography variant="caption" color="text.secondary">
                        {request.button_url}
                      </Typography>
                    </Stack>
                  </TableCell>

                  <TableCell sx={{ py: 1.75 }}>
                    <Chip
                      size="small"
                      label="Pending Review"
                      sx={{
                        fontWeight: 700,
                        fontSize: 11,
                        bgcolor: isDark ? "rgba(245, 158, 11, 0.16)" : "#fffbeb",
                        color: "#d97706",
                        border: "1px solid #fde68a",
                      }}
                    />
                  </TableCell>

                  <TableCell align="right" sx={{ py: 1.75 }}>
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Button
                        color="error"
                        variant="outlined"
                        onClick={() => onReviewRequest && onReviewRequest(request, "reject")}
                        disabled={!canEdit || isReviewing}
                        sx={adminTableButtonSx}
                      >
                        Reject
                      </Button>
                      <Button
                        color="success"
                        variant="outlined"
                        onClick={() => onReviewRequest && onReviewRequest(request, "accept")}
                        disabled={!canEdit || isReviewing}
                        sx={adminTableButtonSx}
                      >
                        Approve
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}

