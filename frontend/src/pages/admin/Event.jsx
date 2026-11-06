import { useCallback, useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useSearchParams } from "react-router-dom";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import EventOutlinedIcon from "@mui/icons-material/EventOutlined";
import EventAvailableOutlinedIcon from "@mui/icons-material/EventAvailableOutlined";
import ViewCarouselOutlinedIcon from "@mui/icons-material/ViewCarouselOutlined";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import ViewListIcon from "@mui/icons-material/ViewList";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import CloseIcon from "@mui/icons-material/Close";

import EventCard from "../../components/admin/Event/EventCard";
import EventTable from "../../components/admin/Event/EventTable";
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

function ExhibitionCalendar({
  events = [],
  loading = false,
  loadError = "",
  archivedCount = 0,
  onRefresh,
}) {
  const theme = useTheme();
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState("card");
  const [actionError, setActionError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [archivedOpen, setArchivedOpen] = useState(false);
  const [archivedEvents, setArchivedEvents] = useState([]);
  const [archivedLoading, setArchivedLoading] = useState(false);
  const [archivedError, setArchivedError] = useState("");
  const [archivedSearch, setArchivedSearch] = useState("");
  const [archivedViewMode, setArchivedViewMode] = useState("table");

  const filteredEvents = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return events;
    return events.filter((e) =>
      [e.title, e.location, e.description]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [events, search]);

  const loadArchivedEvents = useCallback(async () => {
    try {
      setArchivedLoading(true);
      setArchivedError("");
      const data = await fetchEvents({ archived: true });
      setArchivedEvents(Array.isArray(data) ? data : []);
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
    if (onRefresh) await onRefresh();
    if (archivedOpen) await loadArchivedEvents();
  };

  const handleDelete = async (eventId) => {
    try {
      setDeleting(true);
      setActionError("");
      await deleteEvent(eventId);
      setDeleteOpen(false);
      setSelectedEvent(null);
      if (onRefresh) await onRefresh();
      if (archivedOpen) await loadArchivedEvents();
    } catch (error) {
      setActionError(error.message || "Unable to delete the event.");
    } finally {
      setDeleting(false);
    }
  };

  const filteredArchived = useMemo(() => {
    const query = archivedSearch.trim().toLowerCase();
    if (!query) return archivedEvents;
    return archivedEvents.filter((e) =>
      [e.title, e.location, e.description]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [archivedEvents, archivedSearch]);

  return (
    <Box>
      {/* Search & Actions Bar matching other admin pages */}
      <Paper
        variant="outlined"
        sx={{
          p: { xs: 1.5, sm: 2 },
          borderRadius: 2.5,
          backgroundColor: theme.palette.background.paper,
          borderColor: theme.palette.divider,
          mb: 2,
        }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", sm: "center" }}
          gap={1.5}
        >
          <TextField
            size="small"
            placeholder="Search exhibitions by title, venue, or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{
              width: { xs: "100%", sm: 360 },
              "& .MuiInputBase-input": { fontSize: 13 },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ color: "text.secondary" }} />
                </InputAdornment>
              ),
            }}
          />
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Button
              variant="outlined"
              startIcon={<HistoryOutlinedIcon />}
              onClick={handleArchivedOpen}
              sx={{
                borderRadius: 2,
                textTransform: "none",
                fontWeight: 700,
                fontSize: 13,
                height: 40,
                borderColor: theme.palette.divider,
                color: theme.palette.text.primary,
                "&:hover": {
                  borderColor: theme.palette.text.secondary,
                },
              }}
            >
              Archived ({archivedCount})
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setSelectedEvent(null);
                setFormOpen(true);
              }}
              sx={{
                borderRadius: 2,
                textTransform: "none",
                fontWeight: 700,
                fontSize: 13,
                height: 40,
                backgroundColor: "error.main",
                color: "#fff",
                boxShadow: "none",
                "&:hover": {
                  backgroundColor: "error.dark",
                  boxShadow: "none",
                },
              }}
            >
              Add Exhibition
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {/* View Mode Switcher & Summary Count */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 1.5,
          mt: 0.5,
          mb: 1.5,
        }}
      >
        <Typography
          variant="caption"
          color="text.secondary"
          aria-live="polite"
          sx={{ fontWeight: 600 }}
        >
          Showing {filteredEvents.length} of {events.length} exhibitions
        </Typography>

        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(e, next) => {
            if (next) setViewMode(next);
          }}
          size="small"
          aria-label="Exhibition presentation mode"
          sx={{
            backgroundColor: theme.palette.background.paper,
            borderRadius: 2.5,
            border: `1px solid ${theme.palette.divider}`,
            p: 0.3,
            "& .MuiToggleButton-root": {
              border: "none",
              borderRadius: 2,
              px: 1.5,
              py: 0.5,
              fontSize: 12,
              fontWeight: 700,
              textTransform: "none",
              color: theme.palette.text.secondary,
              gap: 0.75,
              transition: "all 150ms ease",
            },
            "& .MuiToggleButton-root.Mui-selected": {
              backgroundColor: theme.palette.error.main,
              color: "#fff",
              "&:hover": {
                backgroundColor: theme.palette.error.dark,
              },
            },
          }}
        >
          <ToggleButton value="card" aria-label="Card view">
            <ViewModuleIcon sx={{ fontSize: 18 }} />
            Cards
          </ToggleButton>
          <ToggleButton value="table" aria-label="Table view">
            <ViewListIcon sx={{ fontSize: 18 }} />
            Table
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

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
            <Button color="inherit" size="small" onClick={onRefresh}>
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
      ) : events.length === 0 ? (
        <Paper
          variant="outlined"
          sx={{
            border: "1px dashed",
            borderColor: "divider",
            borderRadius: 2.5,
            py: 8,
            px: 3,
            textAlign: "center",
          }}
        >
          <EventOutlinedIcon sx={{ fontSize: 48, color: "text.disabled", mb: 1 }} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            No exhibitions scheduled
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5, fontSize: 13 }}>
            Add the first exhibition to start building the public calendar.
          </Typography>
        </Paper>
      ) : filteredEvents.length === 0 ? (
        <Paper
          variant="outlined"
          sx={{
            border: "1px dashed",
            borderColor: "divider",
            borderRadius: 2.5,
            py: 8,
            px: 3,
            textAlign: "center",
          }}
        >
          <EventOutlinedIcon sx={{ fontSize: 48, color: "text.disabled", mb: 1 }} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            No matching exhibitions found
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5, fontSize: 13 }}>
            Try adjusting your search keywords.
          </Typography>
        </Paper>
      ) : viewMode === "card" ? (
        <EventCard
          events={filteredEvents}
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
        <EventTable
          events={filteredEvents}
          onEdit={(event) => {
            setSelectedEvent(event);
            setFormOpen(true);
          }}
          onDelete={(event) => {
            setSelectedEvent(event);
            setDeleteOpen(true);
          }}
        />
      )}

      {/* Archived Exhibitions Dialog */}
      <Dialog
        open={archivedOpen}
        onClose={() => setArchivedOpen(false)}
        fullWidth
        maxWidth="lg"
        PaperProps={{
          sx: {
            borderRadius: 3,
            backgroundColor: theme.palette.background.paper,
          },
        }}
        aria-labelledby="archived-events-title"
      >
        <DialogTitle
          id="archived-events-title"
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            py: 2,
            px: 3,
            borderBottom: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <HistoryOutlinedIcon sx={{ color: "info.main" }} />
            <Typography variant="h6" fontWeight={700}>
              Archived Exhibitions
            </Typography>
          </Stack>
          <IconButton
            aria-label="Close archived exhibitions"
            onClick={() => setArchivedOpen(false)}
            size="small"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Stack spacing={2}>
            {/* Search & Switcher inside Archived dialog */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 1.5,
              }}
            >
              <TextField
                size="small"
                placeholder="Search archived exhibitions..."
                value={archivedSearch}
                onChange={(e) => setArchivedSearch(e.target.value)}
                sx={{ width: { xs: "100%", sm: 300 } }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" sx={{ color: "text.secondary" }} />
                    </InputAdornment>
                  ),
                }}
              />

              <ToggleButtonGroup
                value={archivedViewMode}
                exclusive
                onChange={(e, next) => {
                  if (next) setArchivedViewMode(next);
                }}
                size="small"
                sx={{
                  backgroundColor: theme.palette.background.default,
                  borderRadius: 2,
                  border: `1px solid ${theme.palette.divider}`,
                  p: 0.3,
                  "& .MuiToggleButton-root": {
                    border: "none",
                    borderRadius: 1.5,
                    px: 1.25,
                    py: 0.4,
                    fontSize: 12,
                    fontWeight: 700,
                    textTransform: "none",
                  },
                }}
              >
                <ToggleButton value="card">Cards</ToggleButton>
                <ToggleButton value="table">Table</ToggleButton>
              </ToggleButtonGroup>
            </Box>

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
            ) : filteredArchived.length === 0 ? (
              <Box sx={{ py: 8, textAlign: "center" }}>
                <EventOutlinedIcon sx={{ fontSize: 44, color: "text.disabled", mb: 1 }} />
                <Typography sx={{ fontWeight: 700 }}>
                  {archivedSearch ? "No matching archived exhibitions" : "No archived exhibitions"}
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 0.5, fontSize: 13 }}>
                  Concluded exhibitions appear here automatically.
                </Typography>
              </Box>
            ) : archivedViewMode === "card" ? (
              <EventCard
                events={filteredArchived}
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
              <EventTable
                events={filteredArchived}
                onEdit={(event) => {
                  setSelectedEvent(event);
                  setFormOpen(true);
                }}
                onDelete={(event) => {
                  setSelectedEvent(event);
                  setDeleteOpen(true);
                }}
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
          <Button
            variant="outlined"
            onClick={() => setArchivedOpen(false)}
            sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700 }}
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
  const theme = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const activeTab = ["calendar", "promotions", "header"].includes(requestedTab)
    ? requestedTab
    : "calendar";

  const [events, setEvents] = useState([]);
  const [archivedCount, setArchivedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError("");
      const [activeEvents, archived] = await Promise.all([
        fetchEvents(),
        fetchEvents({ archived: true }).catch(() => []),
      ]);
      setEvents(Array.isArray(activeEvents) ? activeEvents : []);
      setArchivedCount(Array.isArray(archived) ? archived.length : 0);
    } catch (error) {
      setLoadError(error.message || "Unable to load exhibitions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleTabChange = (_event, value) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("tab", value);
    setSearchParams(nextParams);
  };

  const metrics = [
    {
      label: "SCHEDULED EXHIBITIONS",
      value: events.length,
      caption: "Active upcoming calendar events",
      icon: EventOutlinedIcon,
      color: theme.palette.error.main,
      background:
        theme.palette.mode === "dark" ? "rgba(239, 68, 68, 0.14)" : "#fff5f5",
    },
    {
      label: "ARCHIVED EXHIBITIONS",
      value: archivedCount,
      caption: "Historical concluded exhibitions",
      icon: EventAvailableOutlinedIcon,
      color: theme.palette.info.main,
      background:
        theme.palette.mode === "dark" ? "rgba(2, 136, 209, 0.14)" : "#f0f9ff",
    },
    {
      label: "ACTIVE SECTION",
      value:
        activeTab === "calendar"
          ? "Calendar"
          : activeTab === "promotions"
          ? "Slides"
          : "Header",
      caption: "Current event management area",
      icon: ViewCarouselOutlinedIcon,
      color: theme.palette.success.main,
      background:
        theme.palette.mode === "dark" ? "rgba(34, 197, 94, 0.14)" : "#f0fdf4",
    },
  ];

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
        <title>
          {activeTab === "calendar"
            ? "Exhibition Calendar"
            : activeTab === "header"
            ? "Promo Header"
            : "Promotion Slides"}
        </title>
      </Helmet>

      {/* Standard Admin Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" },
          gap: 2,
          mb: 2.5,
          flexWrap: "wrap",
        }}
      >
        <Box>
          <Typography
            sx={{
              fontSize: { xs: 28, sm: 38 },
              fontWeight: 800,
              lineHeight: 1.1,
              color: theme.palette.text.primary,
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
            Manage upcoming exhibitions, promotional slides, and announcement banners.
          </Typography>
        </Box>
      </Box>

      {/* Top Summary Metric Cards matching Sales & Artwork */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            md: "repeat(3, 1fr)",
          },
          gap: 2,
          mb: 2.5,
        }}
      >
        {metrics.map((metric) => {
          const MetricIcon = metric.icon;
          return (
            <Card
              key={metric.label}
              sx={{
                backgroundColor: theme.palette.background.paper,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2.5,
                boxShadow: "none",
              }}
            >
              <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 2,
                  }}
                >
                  <Box>
                    <Typography
                      sx={{
                        color: theme.palette.text.secondary,
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: 1,
                      }}
                    >
                      {metric.label}
                    </Typography>
                    <Typography
                      sx={{
                        mt: 0.5,
                        color: theme.palette.text.primary,
                        fontSize: 28,
                        fontWeight: 800,
                        lineHeight: 1,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {metric.value}
                    </Typography>
                    <Typography
                      sx={{
                        mt: 1,
                        color: theme.palette.text.secondary,
                        fontSize: 12,
                      }}
                    >
                      {metric.caption}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      width: 50,
                      height: 50,
                      display: "grid",
                      placeItems: "center",
                      borderRadius: 2,
                      backgroundColor: metric.background,
                      color: metric.color,
                    }}
                  >
                    <MetricIcon sx={{ fontSize: 24 }} />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          );
        })}
      </Box>

      {/* Navigation Tabs */}
      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        aria-label="Event management"
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          borderBottom: 1,
          borderColor: "divider",
          mb: 2.5,
          "& .MuiTab-root": {
            textTransform: "none",
            fontWeight: 700,
            fontSize: 14,
            minHeight: 48,
          },
        }}
      >
        <Tab value="calendar" label="Exhibition Calendar" />
        <Tab value="promotions" label="Promotion Slides" />
        <Tab value="header" label="Promo Header" />
      </Tabs>

      {activeTab === "calendar" ? (
        <ExhibitionCalendar
          events={events}
          loading={loading}
          loadError={loadError}
          archivedCount={archivedCount}
          onRefresh={loadData}
        />
      ) : activeTab === "header" ? (
        <PromotionHeader />
      ) : (
        <PromotionSlides />
      )}
    </Box>
  );
}
