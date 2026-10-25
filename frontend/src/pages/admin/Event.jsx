import { useEffect, useMemo, useState, useRef } from "react";
import { Helmet } from "react-helmet-async";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Slide,
  Snackbar,
  TextField,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import EventCard from "../../components/admin/Event/EventCard";
import EventForm from "../../components/admin/Event/EventForm";
import EventDelete from "../../components/admin/Event/EventDelete";
import {
  addEvent,
  deleteEvent,
  fetchEvents,
  updateEvent,
} from "../../api/admin/eventAPI";
//Icons
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";

function SlideTransition(props) {
  return <Slide {...props} direction="up" />;
}

const hasPermission = (permission) => {
  const role = String(localStorage.getItem("admin_role") || "")
    .toLowerCase()
    .trim();

  if (role === "super admin") {
    return true;
  }
  if (role === "admin")
    return ["can_add", "can_edit", "can_delete"].includes(permission);
  if (role === "moderator") return ["can_add", "can_edit"].includes(permission);

  return ["1", "true"].includes(
    String(localStorage.getItem(`admin_${permission}`) || "").toLowerCase(),
  );
};

export default function Event() {
  const theme = useTheme();
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [openEventForm, setOpenEventForm] = useState(false);
  const [openEventDelete, setOpenEventDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const deletingRef = useRef(false);
  const [eventErrorMessage, setEventErrorMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortOption, setSortOption] = useState("soonest");
  const [loading, setLoading] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");
  const canAdd = hasPermission("can_add");
  const canEdit = hasPermission("can_edit");
  const canDelete = hasPermission("can_delete");

  const showSnackbar = (message, severity = "success") => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const loadEvents = async () => {
    try {
      setLoading(true);
      setEventErrorMessage("");

      const response = await fetchEvents();

      setEvents(Array.isArray(response) ? response : []);
    } catch (error) {
      setEvents([]);

      setEventErrorMessage(error.message || "Failed to load events.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const filteredEvents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const filtered = events.filter((event) => {
      const status = String(event.status || "").toLowerCase();

      const matchesStatus =
        statusFilter === "all" || status === statusFilter.toLowerCase();

      const matchesSearch = [
        event.title,
        event.description,
        event.location,
        event.status,
      ].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(query),
      );

      return matchesStatus && (!query || matchesSearch);
    });

    return [...filtered].sort((first, second) => {
      if (sortOption === "az") {
        return String(first.title || "").localeCompare(
          String(second.title || ""),
        );
      }

      if (sortOption === "za") {
        return String(second.title || "").localeCompare(
          String(first.title || ""),
        );
      }

      const firstDate = new Date(first.start_at).getTime();

      const secondDate = new Date(second.start_at).getTime();

      if (sortOption === "latest") {
        return secondDate - firstDate;
      }

      return firstDate - secondDate;
    });
  }, [events, searchQuery, statusFilter, sortOption]);

  const handleOpenAdd = () => {
    setSelectedEvent(null);
    setOpenEventForm(true);
  };

  const handleOpenEdit = (event) => {
    setSelectedEvent(event);
    setOpenEventForm(true);
  };

  const handleOpenDelete = (event) => {
    setDeleteError("");
    setSelectedEvent(event);
    setOpenEventDelete(true);
  };

  const handleCloseForm = () => {
    setOpenEventForm(false);
    setSelectedEvent(null);
  };

  const handleSubmitEvent = async (formData) => {
    try {
      if (selectedEvent) {
        await updateEvent(selectedEvent.event_id, formData);

        showSnackbar("Event updated successfully.");
      } else {
        await addEvent(formData);

        showSnackbar("Event created successfully.");
      }

      await loadEvents();

      setOpenEventForm(false);
      setSelectedEvent(null);
    } catch (error) {
      showSnackbar(error.message || "Unable to save event.", "error");

      throw error;
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (deletingRef.current) return;
    deletingRef.current = true;
    setDeleting(true);
    setDeleteError("");
    try {
      await deleteEvent(eventId);

      await loadEvents();

      showSnackbar("Event deleted successfully.");

      setOpenEventDelete(false);
      setSelectedEvent(null);
    } catch (error) {
      setDeleteError(error.message || "Unable to delete event.");
      showSnackbar(error.message || "Unable to delete event.", "error");
    } finally {
      deletingRef.current = false;
      setDeleting(false);
    }
  };

  const closeSnackbar = (event, reason) => {
    if (reason === "clickaway") {
      return;
    }

    setSnackbarOpen(false);
  };

  return (
    <Box
      sx={{
        p: {
          xs: 1.5,
          sm: 2.5,
        },

        minHeight: "100vh",

        backgroundColor: theme.palette.background.default,

        color: theme.palette.text.primary,
      }}
    >
      <Helmet titleTemplate="%s - ArtMatch">
        <title>Events</title>
      </Helmet>

      <Box
        sx={{
          display: "flex",

          flexDirection: {
            xs: "column",
            sm: "row",
          },

          justifyContent: "space-between",

          alignItems: {
            xs: "stretch",
            sm: "center",
          },

          gap: 2,
          mb: 2,
        }}
      >
        <Box>
          <Typography
            sx={{
              fontSize: {
                xs: 28,
                sm: 34,
              },

              fontWeight: 800,
              lineHeight: 1.1,
            }}
          >
            Events
          </Typography>

          <Typography
            sx={{
              mt: 0.75,
              color: theme.palette.text.secondary,
              fontSize: 13,
            }}
          >
            Create and manage events displayed on ArtMatch.
          </Typography>
        </Box>

        {canAdd && (
          <Button
            variant="contained"
            color="error"
            startIcon={<AddIcon />}
            onClick={handleOpenAdd}
            sx={{
              borderRadius: 1.5,
              textTransform: "none",
              fontWeight: 700,
            }}
          >
            Add Event
          </Button>
        )}
      </Box>

      <Paper
        variant="outlined"
        sx={{
          p: {
            xs: 1.25,
            sm: 1.5,
          },

          mt: 2,
          borderRadius: 2,
        }}
      >
        <Box
          sx={{
            display: "flex",

            flexDirection: {
              xs: "column",
              lg: "row",
            },

            gap: 1.25,
          }}
        >
          <TextField
            size="small"
            placeholder="Search events..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            sx={{
              flex: 1,
              maxWidth: {
                lg: 420,
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />

          <FormControl
            size="small"
            sx={{
              minWidth: 140,
            }}
          >
            <InputLabel>Status</InputLabel>

            <Select
              label="Status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <MenuItem value="all">All</MenuItem>

              <MenuItem value="Draft">Draft</MenuItem>

              <MenuItem value="Published">Published</MenuItem>

              <MenuItem value="Archived">Archived</MenuItem>
            </Select>
          </FormControl>

          <FormControl
            size="small"
            sx={{
              minWidth: 150,
            }}
          >
            <InputLabel>Sort</InputLabel>

            <Select
              label="Sort"
              value={sortOption}
              onChange={(event) => setSortOption(event.target.value)}
            >
              <MenuItem value="soonest">Soonest</MenuItem>

              <MenuItem value="latest">Latest</MenuItem>

              <MenuItem value="az">A to Z</MenuItem>

              <MenuItem value="za">Z to A</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>

      <Paper
        variant="outlined"
        sx={{
          p: {
            xs: 1.5,
            sm: 2,
          },

          mt: 2,
          borderRadius: 2,
        }}
      >
        {loading ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              py: 8,
            }}
          >
            <CircularProgress />
          </Box>
        ) : eventErrorMessage ? (
          <Alert severity="error">{eventErrorMessage}</Alert>
        ) : filteredEvents.length ? (
          <EventCard
            events={filteredEvents}
            onEdit={canEdit ? handleOpenEdit : null}
            onDelete={canDelete ? handleOpenDelete : null}
          />
        ) : (
          <Typography
            color="text.secondary"
            sx={{
              textAlign: "center",
              py: 5,
            }}
          >
            {searchQuery ? "No events match your search." : "No events found."}
          </Typography>
        )}
      </Paper>

      <EventForm
        open={openEventForm}
        handleClose={handleCloseForm}
        onSubmit={handleSubmitEvent}
        selectedEvent={selectedEvent}
      />

      <EventDelete
        open={openEventDelete}
        handleClose={() => {
          if (deletingRef.current) return;
          setOpenEventDelete(false);
          setSelectedEvent(null);
          setDeleteError("");
        }}
        onSubmit={handleDeleteEvent}
        selectedEvent={selectedEvent}
        deleting={deleting}
        error={deleteError}
      />

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={closeSnackbar}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        TransitionComponent={SlideTransition}
      >
        <Alert
          onClose={closeSnackbar}
          severity={snackbarSeverity}
          variant="filled"
          sx={{
            width: "100%", color:"#fff"
          }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
