import { useCallback, useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import { useSearchParams } from "react-router-dom";
import AddIcon from "@mui/icons-material/Add";
import EventOutlinedIcon from "@mui/icons-material/EventOutlined";
import CloseIcon from "@mui/icons-material/Close";
import EventCard from "../../components/admin/Event/EventCard";
import EventDelete from "../../components/admin/Event/EventDelete";
import EventForm from "../../components/admin/Event/EventForm";
import {
  addEvent,
  deleteEvent,
  fetchEvents,
  updateEvent,
} from "../../api/admin/eventAPI";
import PromotionHeader from "./PromotionHeader";
import PromotionSlides from "./PromotionSlides";

function ExhibitionCalendar() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [archivedOpen, setArchivedOpen] = useState(false);
  const [archivedEvents, setArchivedEvents] = useState([]);
  const [archivedLoading, setArchivedLoading] = useState(false);
  const [archivedError, setArchivedError] = useState("");

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError("");
      setEvents(await fetchEvents());
    } catch (error) {
      setLoadError(error.message || "Unable to load exhibition events.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const loadArchivedEvents = useCallback(async () => {
    try {
      setArchivedLoading(true);
      setArchivedError("");
      setArchivedEvents(await fetchEvents({ archived: true }));
    } catch (error) {
      setArchivedError(error.message || "Unable to load archived exhibitions.");
    } finally {
      setArchivedLoading(false);
    }
  }, []);

  const handleArchivedOpen = () => {
    setArchivedOpen(true);
    loadArchivedEvents();
  };

  const handleSave = async (eventData) => {
    setActionError("");
    if (selectedEvent) {
      await updateEvent(selectedEvent.event_id, eventData);
    } else {
      await addEvent(eventData);
    }
    setFormOpen(false);
    setSelectedEvent(null);
    await loadEvents();
    if (archivedOpen) await loadArchivedEvents();
  };

  const handleDelete = async (eventId) => {
    try {
      setDeleting(true);
      setActionError("");
      await deleteEvent(eventId);
      setDeleteOpen(false);
      setSelectedEvent(null);
      await loadEvents();
      if (archivedOpen) await loadArchivedEvents();
    } catch (error) {
      setActionError(error.message || "Unable to delete the event.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Box>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        alignItems={{ xs: "stretch", sm: "center" }}
        justifyContent="space-between"
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Exhibition Calendar
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            Manage upcoming exhibitions shown in the public calendar.
          </Typography>
        </Box>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <Button
            variant="outlined"
            onClick={handleArchivedOpen}
            sx={{ minHeight: 44 }}
          >
            Show archived
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setSelectedEvent(null);
              setFormOpen(true);
            }}
            sx={{ minHeight: 44 }}
          >
            Add exhibition
          </Button>
        </Stack>
      </Stack>

      {actionError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError("")}>
          {actionError}
        </Alert>
      )}
      {loadError && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={loadEvents}>
              Retry
            </Button>
          }
        >
          {loadError}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress aria-label="Loading exhibition calendar" />
        </Box>
      ) : events.length ? (
        <EventCard
          events={events}
          onEdit={(event) => {
            setSelectedEvent(event);
            setFormOpen(true);
          }}
          onDelete={(event) => {
            setSelectedEvent(event);
            setDeleteOpen(true);
          }}
        />
      ) : (
        <Box
          sx={{
            border: "1px dashed",
            borderColor: "divider",
            borderRadius: 2,
            py: 8,
            px: 3,
            textAlign: "center",
          }}
        >
          <EventOutlinedIcon sx={{ fontSize: 44, color: "text.disabled" }} />
          <Typography sx={{ mt: 1, fontWeight: 700 }}>
            No exhibitions scheduled
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            Add the first exhibition to start building the calendar.
          </Typography>
        </Box>
      )}

      <Dialog
        open={archivedOpen}
        onClose={() => setArchivedOpen(false)}
        fullWidth
        maxWidth="lg"
        aria-labelledby="archived-events-title"
      >
        <DialogTitle
          id="archived-events-title"
          sx={{ display: "flex", alignItems: "center", gap: 1 }}
        >
          <Box component="span" sx={{ flex: 1 }}>
            Archived exhibitions
          </Box>
          <IconButton
            aria-label="Close archived exhibitions"
            onClick={() => setArchivedOpen(false)}
            sx={{ width: 44, height: 44 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {archivedLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
              <CircularProgress aria-label="Loading archived exhibitions" />
            </Box>
          ) : archivedError ? (
            <Alert
              severity="error"
              action={
                <Button color="inherit" size="small" onClick={loadArchivedEvents}>
                  Retry
                </Button>
              }
            >
              {archivedError}
            </Alert>
          ) : archivedEvents.length ? (
            <EventCard
              events={archivedEvents}
              onEdit={(event) => {
                setSelectedEvent(event);
                setFormOpen(true);
              }}
              onDelete={(event) => {
                setSelectedEvent(event);
                setDeleteOpen(true);
              }}
            />
          ) : (
            <Box sx={{ py: 8, textAlign: "center" }}>
              <EventOutlinedIcon sx={{ fontSize: 44, color: "text.disabled" }} />
              <Typography sx={{ mt: 1, fontWeight: 700 }}>
                No archived exhibitions
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                Ended exhibitions will appear here automatically.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            variant="outlined"
            onClick={() => setArchivedOpen(false)}
            sx={{ minHeight: 44 }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <EventForm
        open={formOpen}
        handleClose={() => {
          setFormOpen(false);
          setSelectedEvent(null);
        }}
        onSubmit={handleSave}
        selectedEvent={selectedEvent}
      />
      <EventDelete
        open={deleteOpen}
        handleClose={() => {
          if (!deleting) {
            setDeleteOpen(false);
            setSelectedEvent(null);
          }
        }}
        onSubmit={handleDelete}
        selectedEvent={selectedEvent}
        deleting={deleting}
        error={actionError}
      />
    </Box>
  );
}

export default function Event() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const activeTab = ["calendar", "promotions", "header"].includes(requestedTab)
    ? requestedTab
    : "calendar";

  const handleTabChange = (_event, value) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("tab", value);
    setSearchParams(nextParams);
  };

  return (
    <Box sx={{ minWidth: 0 }}>
      <Helmet titleTemplate="%s - ArtMatch">
        <title>
          {activeTab === "calendar"
            ? "Exhibition Calendar"
            : activeTab === "header"
              ? "Promo Header"
              : "Promotion Slides"}
        </title>
      </Helmet>
      <Box sx={{ mb: 3 }}>
        <Typography
          variant="h2"
          sx={{
            fontSize: { xs: 36, md: 52 },
            lineHeight: 1.05,
            fontWeight: 800,
            letterSpacing: "-0.04em",
          }}
        >
          Event
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 1, fontSize: { md: 16 } }}>
          Manage the content displayed in the event area.
        </Typography>
      </Box>
      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        aria-label="Event management"
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 2 }}
      >
        <Tab value="calendar" label="Exhibition Calendar" />
        <Tab value="promotions" label="Promotion Slides" />
        <Tab value="header" label="Promo Header" />
      </Tabs>
      {activeTab === "calendar" ? (
        <ExhibitionCalendar />
      ) : activeTab === "header" ? (
        <PromotionHeader />
      ) : (
        <PromotionSlides />
      )}
    </Box>
  );
}
