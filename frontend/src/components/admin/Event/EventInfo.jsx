import React from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Slide,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import EventOutlinedIcon from "@mui/icons-material/EventOutlined";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export default function EventInfo({
  open,
  handleClose,
  selectedEvent,
}) {
  const theme = useTheme();
  const event = selectedEvent;
  const status = String(event?.status || "Draft").trim();
  const statusShade = theme.palette.mode === "dark" ? "light" : "dark";
  const normalizedStatus = status.toLowerCase();
  const statusColor =
    normalizedStatus === "published"
      ? theme.palette.success[statusShade]
      : normalizedStatus === "archived"
        ? theme.palette.text.secondary
        : theme.palette.warning[statusShade];

  const formatDateTime = (value) => {
    if (!value) return "Not provided";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Not provided";

    return date.toLocaleString("en-PH", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const formatFileSize = (value) => {
    const bytes = Number(value);
    if (!Number.isFinite(bytes) || bytes <= 0) return "Not provided";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const detailLabelSx = {
    display: "block",
    color: theme.palette.text.secondary,
    fontSize: 11,
    lineHeight: 1.2,
    mb: 0.35,
  };

  const detailValueSx = {
    color: theme.palette.text.primary,
    fontSize: 12,
    fontWeight: 600,
    lineHeight: 1.4,
    overflowWrap: "anywhere",
    whiteSpace: "pre-wrap",
  };

  const details = event
    ? [
        ["Location", event.location],
        ["Starts", formatDateTime(event.start_at)],
        ["Ends", formatDateTime(event.end_at)],
        ["Created", formatDateTime(event.created_at)],
        ["Last updated", formatDateTime(event.updated_at)],
      ]
    : [];

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      TransitionComponent={Transition}
      keepMounted
      PaperProps={{
        sx: {
          width: "min(100% - 24px, 520px)",
          maxWidth: 520,
          borderRadius: 3,
          overflow: "hidden",
          backgroundColor: theme.palette.background.paper,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.75,
          px: 2.5,
          py: 1.75,
          color: theme.palette.text.primary,
          fontSize: 16,
          fontWeight: 700,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <EventOutlinedIcon sx={{ color: theme.palette.error.main, fontSize: 20 }} />
        Event Information
        <Button
          aria-label="Close event information"
          onClick={handleClose}
          sx={{
            minWidth: 28,
            width: 28,
            height: 28,
            ml: "auto",
            p: 0,
            color: theme.palette.text.secondary,
          }}
        >
          <CloseIcon sx={{ fontSize: 18 }} />
        </Button>
      </DialogTitle>

      <DialogContent
        sx={{ p: 2.5, backgroundColor: theme.palette.background.paper }}
      >
        {event ? (
          <Box>
            <Box
              sx={{
                position: "relative",
                width: "100%",
                aspectRatio: "16 / 7",
                overflow: "hidden",
                borderRadius: 2,
                border: `1px solid ${theme.palette.divider}`,
                backgroundColor: theme.palette.background.default,
                mt: 1.5,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {event.image_url ? (
                <Box
                  component="img"
                  src={event.image_url}
                  alt={event.title || "Event preview"}
                  sx={{
                    width: "100%",
                    height: "100%",
                    display: "block",
                    objectFit: "cover",
                  }}
                />
              ) : (
                <EventOutlinedIcon
                  sx={{ fontSize: 56, color: "text.disabled" }}
                />
              )}
              <Chip
                label={status.toUpperCase()}
                size="small"
                sx={{
                  position: "absolute",
                  top: 10,
                  right: 10,
                  height: 22,
                  backgroundColor: theme.palette.background.paper,
                  color: statusColor,
                  fontSize: 10,
                  fontWeight: 700,
                  boxShadow: "0 1px 4px rgba(15, 23, 42, 0.16)",
                }}
              />
            </Box>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                gap: 1.5,
                mt: 1.75,
                p: 1.5,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2,
                backgroundColor: theme.palette.background.default,
              }}
            >
              <Box sx={{ gridColumn: { xs: "auto", sm: "1 / -1" } }}>
                <Typography sx={detailLabelSx}>Title</Typography>
                <Typography sx={detailValueSx}>
                  {event.title || "Not provided"}
                </Typography>
              </Box>

              <Box sx={{ gridColumn: { xs: "auto", sm: "1 / -1" } }}>
                <Typography sx={detailLabelSx}>Description</Typography>
                <Typography sx={detailValueSx}>
                  {event.description || "Not provided"}
                </Typography>
              </Box>

              {details.map(([label, value]) => (
                <Box key={label}>
                  <Typography sx={detailLabelSx}>{label}</Typography>
                  <Typography sx={detailValueSx}>
                    {value || "Not provided"}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        ) : (
          <Typography sx={{ color: theme.palette.text.secondary }}>
            No event selected.
          </Typography>
        )}
      </DialogContent>

      <DialogActions
        sx={{
          justifyContent: "flex-end",
          px: 2.5,
          py: 1.5,
          borderTop: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Button
          onClick={handleClose}
          sx={{
            backgroundColor: theme.palette.action.hover,
            color: theme.palette.text.primary,
            fontSize: 11,
            fontWeight: 600,
            "&:hover": { backgroundColor: theme.palette.action.selected },
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
