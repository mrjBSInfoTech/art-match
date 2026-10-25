import { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import EventOutlinedIcon from "@mui/icons-material/EventOutlined";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import EventInfo from "./EventInfo";

export default function EventCard({
  events = [],
  onEdit,
  onDelete,
}) {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [openInfoDialog, setOpenInfoDialog] = useState(false);
  const menuOpen = Boolean(anchorEl);

  const handleMenuOpen = (clickEvent, eventItem) => {
    setAnchorEl(clickEvent.currentTarget);
    setSelectedEvent(eventItem);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleInfoOpen = (eventItem) => {
    setSelectedEvent(eventItem);
    setOpenInfoDialog(true);
  };

  const handleInfoClose = () => {
    setOpenInfoDialog(false);
  };

  const getStatusColor = (status) => {
    const shade = theme.palette.mode === "dark" ? "light" : "dark";
    const normalizedStatus = String(status || "").trim().toLowerCase();

    if (normalizedStatus === "published") {
      return theme.palette.success[shade];
    }

    if (normalizedStatus === "archived") {
      return theme.palette.text.secondary;
    }

    return theme.palette.warning[shade];
  };

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

  return (
    <>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, minmax(0, 1fr))",
            md: "repeat(3, minmax(0, 1fr))",
            lg: "repeat(5, minmax(0, 1fr))",
          },
          gap: 2,
        }}
      >
        {events.map((eventItem) => (
          <Card
            key={eventItem.event_id}
            sx={{
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2.5,
              boxShadow: "none",
              transition: "border-color 0.2s, box-shadow 0.2s",
              "&:hover": {
                borderColor: "text.secondary",
                boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
              },
            }}
          >
            <Box
              sx={{
                width: "100%",
                aspectRatio: "5 / 4",
                position: "relative",
                backgroundColor: theme.palette.background.default,
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {eventItem.image_url ? (
                <Box
                  component="img"
                  src={eventItem.image_url}
                  alt={eventItem.title || "Event"}
                  sx={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    objectPosition: "center",
                  }}
                />
              ) : (
                <EventOutlinedIcon
                  sx={{ fontSize: 56, color: "text.disabled" }}
                />
              )}
              <Chip
                label={(eventItem.status || "Draft").toUpperCase()}
                size="small"
                sx={{
                  position: "absolute",
                  top: 10,
                  right: 10,
                  height: 22,
                  borderRadius: 2,
                  backgroundColor: theme.palette.background.paper,
                  color: getStatusColor(eventItem.status),
                  fontSize: 10,
                  fontWeight: 700,
                  boxShadow: "0 1px 4px rgba(15, 23, 42, 0.14)",
                }}
              />
            </Box>

            <CardContent
              sx={{
                p: 2,
                "&:last-child": { pb: 2 },
                flex: 1,
                minHeight: 150,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  mb: 1,
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    variant="subtitle2"
                    sx={{
                      color: theme.palette.text.primary,
                      fontWeight: 700,
                      lineHeight: 1.25,
                    }}
                    noWrap
                  >
                    {eventItem.title || "Untitled event"}
                  </Typography>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.75,
                      mt: 1.25,
                    }}
                  >
                    <EventOutlinedIcon
                      sx={{ fontSize: 16, color: "error.main", flexShrink: 0 }}
                    />
                    <Typography
                      variant="caption"
                      sx={{ color: theme.palette.text.secondary }}
                      noWrap
                    >
                      {formatDate(eventItem.start_at)}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.75,
                      mt: 0.5,
                    }}
                  >
                    <LocationOnOutlinedIcon
                      sx={{ fontSize: 16, color: "error.main", flexShrink: 0 }}
                    />
                    <Typography
                      variant="caption"
                      sx={{ color: theme.palette.text.secondary }}
                      noWrap
                    >
                      {eventItem.location || "Location not specified"}
                    </Typography>
                  </Box>
                </Box>
                {(onEdit || onDelete) && (
                  <IconButton
                    size="small"
                    aria-label={`Actions for ${eventItem.title || "event"}`}
                    onClick={(clickEvent) =>
                      handleMenuOpen(clickEvent, eventItem)
                    }
                    sx={{
                      ml: "auto",
                      "&:hover": { backgroundColor: "action.hover" },
                    }}
                  >
                    <MoreVertIcon fontSize="small" />
                  </IconButton>
                )}
              </Box>

              <Button
                variant="contained"
                size="small"
                fullWidth
                startIcon={<VisibilityOutlinedIcon sx={{ fontSize: 15 }} />}
                onClick={() => handleInfoOpen(eventItem)}
                sx={{
                  mt: "auto",
                  py: 0.55,
                  backgroundColor:
                    theme.palette.mode === "dark" ? "#1e293b" : "#f1f5f9",
                  color: theme.palette.text.primary,
                  border: `1px solid ${theme.palette.divider}`,
                  boxShadow: "none",
                  fontSize: 11,
                  "& .MuiButton-startIcon": {
                    color: theme.palette.error.main,
                  },
                  "&:hover": {
                    backgroundColor: theme.palette.action.hover,
                    borderColor: theme.palette.text.secondary,
                    boxShadow: "none",
                  },
                }}
              >
                View Details
              </Button>

              <Menu
                anchorEl={anchorEl}
                open={
                  menuOpen &&
                  selectedEvent?.event_id === eventItem.event_id
                }
                onClose={handleMenuClose}
                anchorOrigin={{
                  vertical: "bottom",
                  horizontal: "right",
                }}
                transformOrigin={{
                  vertical: "top",
                  horizontal: "right",
                }}
              >
                {onEdit && (
                  <MenuItem
                    onClick={() => {
                      onEdit(selectedEvent);
                      handleMenuClose();
                    }}
                    sx={{ color: "success.main" }}
                  >
                    <EditIcon sx={{ mr: 1, fontSize: 20 }} />
                    Edit
                  </MenuItem>
                )}
                {onDelete && (
                  <MenuItem
                    onClick={() => {
                      onDelete(selectedEvent);
                      handleMenuClose();
                    }}
                    sx={{ color: "error.main" }}
                  >
                    <DeleteIcon sx={{ mr: 1, fontSize: 20 }} />
                    Delete
                  </MenuItem>
                )}
              </Menu>
            </CardContent>
          </Card>
        ))}
      </Box>

      <EventInfo
        open={openInfoDialog}
        handleClose={handleInfoClose}
        selectedEvent={selectedEvent}
      />
    </>
  );
}
