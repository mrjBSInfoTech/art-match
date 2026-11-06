import { useState } from "react";
import {
  Box,
  Button,
  Chip,
  IconButton,
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
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import EventInfo from "./EventInfo";

export default function EventTable({
  events = [],
  onEdit,
  onDelete,
}) {
  const theme = useTheme();
  const [infoEvent, setInfoEvent] = useState(null);

  const formatDate = (value) => {
    if (!value) return "Not provided";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Not provided";

    return date.toLocaleString("en-PH", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getEventStatus = (event) => {
    if (!event.start_at) return { label: "Scheduled", color: "info" };
    const now = new Date();
    const start = new Date(event.start_at);
    const end = event.end_at ? new Date(event.end_at) : null;
    if (end && now > end) return { label: "Concluded", color: "default" };
    if (now >= start) return { label: "Ongoing", color: "success" };
    return { label: "Upcoming", color: "primary" };
  };

  if (events.length === 0) {
    return (
      <Paper
        variant="outlined"
        sx={{
          py: 6,
          px: 3,
          borderRadius: 2.5,
          textAlign: "center",
          border: "1px dashed",
          borderColor: "divider",
        }}
      >
        <EventOutlinedIcon sx={{ fontSize: 44, color: "text.disabled", mb: 1 }} />
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          No exhibitions found
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Try a different search or add a new exhibition to the calendar.
        </Typography>
      </Paper>
    );
  }

  return (
    <>
      <TableContainer
        component={Paper}
        variant="outlined"
        sx={{ borderRadius: 2.5, overflowX: "auto" }}
      >
        <Table size="small" sx={{ minWidth: 850 }}>
          <TableHead
            sx={{
              backgroundColor:
                theme.palette.mode === "dark" ? "background.table" : "#f8fafc",
            }}
          >
            <TableRow>
              <TableCell
                sx={{
                  py: 1.5,
                  color: "text.secondary",
                  fontSize: 10,
                  fontWeight: 800,
                  textTransform: "uppercase",
                }}
              >
                Exhibition
              </TableCell>
              <TableCell
                sx={{
                  py: 1.5,
                  color: "text.secondary",
                  fontSize: 10,
                  fontWeight: 800,
                  textTransform: "uppercase",
                }}
              >
                Location / Venue
              </TableCell>
              <TableCell
                sx={{
                  py: 1.5,
                  color: "text.secondary",
                  fontSize: 10,
                  fontWeight: 800,
                  textTransform: "uppercase",
                }}
              >
                Starts At
              </TableCell>
              <TableCell
                sx={{
                  py: 1.5,
                  color: "text.secondary",
                  fontSize: 10,
                  fontWeight: 800,
                  textTransform: "uppercase",
                }}
              >
                Ends At
              </TableCell>
              <TableCell
                sx={{
                  py: 1.5,
                  color: "text.secondary",
                  fontSize: 10,
                  fontWeight: 800,
                  textTransform: "uppercase",
                }}
              >
                Status
              </TableCell>
              <TableCell
                align="right"
                sx={{
                  py: 1.5,
                  color: "text.secondary",
                  fontSize: 10,
                  fontWeight: 800,
                  textTransform: "uppercase",
                }}
              >
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {events.map((eventItem) => {
              const statusInfo = getEventStatus(eventItem);
              return (
                <TableRow
                  key={eventItem.event_id}
                  hover
                  sx={{
                    "&:last-child td": { borderBottom: 0 },
                    "&:hover": { backgroundColor: "action.hover" },
                  }}
                >
                  {/* Exhibition Title & Description */}
                  <TableCell sx={{ py: 1.75, minWidth: 160, maxWidth: 280 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 700,
                        color: "text.primary",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {eventItem.title || "Untitled exhibition"}
                    </Typography>
                    {eventItem.description && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          display: "block",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {eventItem.description}
                      </Typography>
                    )}
                  </TableCell>

                  {/* Location */}
                  <TableCell sx={{ fontSize: 12, color: "text.secondary" }}>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <LocationOnOutlinedIcon sx={{ fontSize: 15, color: "error.main" }} />
                      <Typography
                        variant="body2"
                        sx={{
                          fontSize: 12,
                          fontWeight: 500,
                          maxWidth: 200,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {eventItem.location || "Location not specified"}
                      </Typography>
                    </Stack>
                  </TableCell>

                  {/* Starts */}
                  <TableCell sx={{ fontSize: 12, color: "text.secondary", whiteSpace: "nowrap" }}>
                    {formatDate(eventItem.start_at)}
                  </TableCell>

                  {/* Ends */}
                  <TableCell sx={{ fontSize: 12, color: "text.secondary", whiteSpace: "nowrap" }}>
                    {formatDate(eventItem.end_at)}
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <Chip
                      size="small"
                      label={statusInfo.label}
                      color={statusInfo.color}
                      sx={{
                        height: 22,
                        fontSize: 10,
                        fontWeight: 700,
                        borderRadius: "16px",
                      }}
                    />
                  </TableCell>

                  {/* Actions */}
                  <TableCell align="right">
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      <Tooltip title="View Details">
                        <IconButton
                          size="small"
                          onClick={() => setInfoEvent(eventItem)}
                          sx={{ color: "text.secondary" }}
                        >
                          <VisibilityOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit Exhibition">
                        <IconButton
                          size="small"
                          onClick={() => onEdit(eventItem)}
                          sx={{ color: "primary.main" }}
                        >
                          <EditOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Exhibition">
                        <IconButton
                          size="small"
                          onClick={() => onDelete(eventItem)}
                          sx={{ color: "error.main" }}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Info Dialog */}
      <EventInfo
        open={Boolean(infoEvent)}
        handleClose={() => setInfoEvent(null)}
        selectedEvent={infoEvent}
      />
    </>
  );
}

