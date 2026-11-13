import {
  createElement,
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { Helmet } from "react-helmet-async";
import { useSearchParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  InputAdornment,
  Paper,
  Slide,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";

// Icons
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import SearchIcon from "@mui/icons-material/Search";
import { adminSearchInputSx } from "../../components/admin/adminFilterStyles";
import EventOutlinedIcon from "@mui/icons-material/EventOutlined";
import EventAvailableOutlinedIcon from "@mui/icons-material/EventAvailableOutlined";
import ViewCarouselOutlinedIcon from "@mui/icons-material/ViewCarouselOutlined";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import RateReviewOutlinedIcon from "@mui/icons-material/RateReviewOutlined";
import ViewListIcon from "@mui/icons-material/ViewList";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import CloseIcon from "@mui/icons-material/Close";

// Child Components
import EventCard from "../../components/admin/Event/EventCard";
import EventTable from "../../components/admin/Event/EventTable";
import EventDelete from "../../components/admin/Event/EventDelete";
import EventForm from "../../components/admin/Event/EventForm";
import EventArchives from "../../components/admin/Event/EventArchives";
import PromotionHeader from "./PromotionHeader";
import PromotionSlides from "./PromotionSlides";
import ConnectionErrorPanel from "../../components/admin/ConnectionErrorPanel";
import AdminLoadingPanel from "../../components/admin/AdminLoadingPanel";

// API
import {
  fetchEvents,
  addEvent,
  updateEvent,
  deleteEvent,
} from "../../api/admin/eventAPI";

// Slide Transition for Snackbar
function SlideTransition(props) {
  return <Slide {...props} direction="up" />;
}

export default function Event() {
  const theme = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const activeTab = ["calendar", "promotions", "header"].includes(requestedTab)
    ? requestedTab
    : "calendar";

  // Main Events State
  const [events, setEvents] = useState([]);
  const [archivedCount, setArchivedCount] = useState(0);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Modal Open States
  const [openForm, setOpenForm] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [openArchived, setOpenArchived] = useState(false);
  const [promotionActions, setPromotionActions] = useState({});
  const registerPromotionActions = useCallback(
    (actions) => setPromotionActions({ ...actions, tab: activeTab }),
    [activeTab],
  );
  const actionsForTab =
    promotionActions.tab === activeTab ? promotionActions : {};

  // Search & View Mode States
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("card");

  // Archived Exhibitions States
  const [archivedEvents, setArchivedEvents] = useState([]);
  const [archivedLoading, setArchivedLoading] = useState(false);
  const [archivedError, setArchivedError] = useState("");

  // Snackbar Notification State
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");
  const [snackbarAction, setSnackbarAction] = useState(null);
  const retryActionsRef = useRef({});

  const showSnackbar = useCallback(
    (message, severity = "success", action = null) => {
      setSnackbarMessage(message);
      setSnackbarSeverity(severity);
      setSnackbarAction(action);
      setSnackbarOpen(true);
    },
    [],
  );

  // Load Main Events & Archive Count
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
      setDataLoaded(true);
    } catch (error) {
      setLoadError(error.message || "Unable to load exhibitions.");
      showSnackbar(error.message || "Unable to load exhibitions.", "error", {
        label: "Retry",
        onClick: () => retryActionsRef.current.loadData?.(),
      });
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load Concluded Archived Exhibitions
  const loadArchivedEvents = useCallback(async () => {
    try {
      setArchivedLoading(true);
      setArchivedError("");
      const data = await fetchEvents({ archived: true });
      setArchivedEvents(Array.isArray(data) ? data : []);
    } catch (error) {
      setArchivedError(error.message || "Unable to load archived exhibitions.");
      showSnackbar(
        error.message || "Unable to load archived exhibitions.",
        "error",
        {
          label: "Retry",
          onClick: () => retryActionsRef.current.loadArchivedEvents?.(),
        },
      );
    } finally {
      setArchivedLoading(false);
    }
  }, [showSnackbar]);

  retryActionsRef.current.loadData = loadData;
  retryActionsRef.current.loadArchivedEvents = loadArchivedEvents;

  // Filtered Active Exhibitions
  const filteredEvents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return events;
    return events.filter((e) =>
      [e.title, e.location, e.description]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [events, searchQuery]);

  // Modal Open Handlers
  const handleOpenAdd = () => {
    setSelectedEvent(null);
    setOpenForm(true);
  };

  const handleOpenEdit = (event) => {
    setSelectedEvent(event);
    setOpenForm(true);
  };

  const handleOpenDelete = (event) => {
    setSelectedEvent(event);
    setOpenDelete(true);
  };

  const handleOpenArchived = () => {
    setOpenArchived(true);
    loadArchivedEvents();
  };

  // Submit (Create or Update) Event
  const handleSubmitEvent = async (eventData) => {
    try {
      if (selectedEvent) {
        await updateEvent(selectedEvent.event_id, eventData);
        showSnackbar("Exhibition updated successfully.", "success");
      } else {
        await addEvent(eventData);
        showSnackbar("Exhibition added successfully.", "success");
      }
      setOpenForm(false);
      setSelectedEvent(null);
      await loadData();
      if (openArchived) await loadArchivedEvents();
    } catch (error) {
      showSnackbar(error.message || "Failed to save exhibition.", "error");
    }
  };

  // Delete Event Handler
  const handleDeleteEvent = async (eventId) => {
    try {
      setDeleting(true);
      await deleteEvent(eventId);
      setOpenDelete(false);
      setSelectedEvent(null);
      showSnackbar("Exhibition deleted successfully.", "success");
      await loadData();
      if (openArchived) await loadArchivedEvents();
    } catch (error) {
      showSnackbar(
        error.message || "Unable to delete the exhibition.",
        "error",
      );
    } finally {
      setDeleting(false);
    }
  };

  // Tab Change Handler
  const handleTabChange = (_event, value) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("tab", value);
    setSearchParams(nextParams);
  };

  // Top Summary Metric Cards Configuration
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

  // Initial Page Loading State
  if (loading && !dataLoaded) {
    return (
      <AdminLoadingPanel
        title="Events"
        subtitle="Manage upcoming exhibitions, promotional slides, and announcement banners."
      />
    );
  }

  // Server Connection Failure Fallback
  if (loadError && !loading && (events.length === 0 || !dataLoaded)) {
    return (
      <Box sx={{ minWidth: 0 }}>
        <Helmet titleTemplate="%s - ArtMatch">
          <title>Events Unavailable</title>
        </Helmet>
        <ConnectionErrorPanel
          title="Events Unavailable"
          message={loadError}
          onRetry={loadData}
        />
      </Box>
    );
  }

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

      {/* Top Header Banner matching seller Artwork.jsx */}
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
            Manage upcoming exhibitions, promotional slides, and announcement
            banners.
          </Typography>
        </Box>
        {activeTab === "calendar" ? (
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            sx={{ width: { xs: "100%", sm: "auto" } }}
          >
            <Button
              variant="outlined"
              color="error"
              startIcon={<HistoryOutlinedIcon />}
              onClick={handleOpenArchived}
              sx={{
                width: { xs: "100%", sm: 150 },
                height: { xs: 38, sm: 44 },
                minWidth: { xs: 45, sm: 50 },
                fontSize: { xs: 12, sm: 16 },
                padding: 0,
                borderRadius: 1.5,
                textTransform: "none",
                fontWeight: 700,
              }}
            >
              Archived ({archivedCount})
            </Button>
            <Button
              variant="contained"
              color="error"
              startIcon={<AddIcon />}
              onClick={handleOpenAdd}
              sx={{
                width: { xs: "100%", sm: 150 },
                height: { xs: 38, sm: 44 },
                minWidth: { xs: 45, sm: 50 },
                fontSize: { xs: 12, sm: 16 },
                padding: 0,
                borderRadius: 1.5,
                textTransform: "none",
                fontWeight: 700,
              }}
            >
              Add Exhibition
            </Button>
          </Stack>
        ) : (
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            sx={{ width: { xs: "100%", sm: "auto" } }}
          >
            <Button
              variant="outlined"
              color="error"
              startIcon={<RateReviewOutlinedIcon />}
              onClick={actionsForTab.openReview}
              disabled={!actionsForTab.openReview}
              sx={{
                width: { xs: "100%", sm: 150 },
                height: { xs: 38, sm: 44 },
                minWidth: { xs: 45, sm: 50 },
                fontSize: { xs: 12, sm: 16 },
                padding: 0,
                borderRadius: 1.5,
                textTransform: "none",
                fontWeight: 700,
              }}
            >
              Requests ({actionsForTab.requestsCount || 0})
            </Button>
            {activeTab === "promotions" && actionsForTab.canAdd && (
              <Button
                variant="contained"
                color="error"
                startIcon={<AddIcon />}
                onClick={actionsForTab.openAdd}
                sx={{
                  width: { xs: "100%", sm: 150 },
                  height: { xs: 38, sm: 44 },
                  minWidth: { xs: 45, sm: 50 },
                  fontSize: { xs: 12, sm: 16 },
                  padding: 0,
                  borderRadius: 1.5,
                  textTransform: "none",
                  fontWeight: 700,
                }}
              >
                Add Slide
              </Button>
            )}
            {activeTab === "header" && actionsForTab.canEdit && (
              <Button
                variant="contained"
                color="error"
                startIcon={<EditIcon />}
                onClick={actionsForTab.openEdit}
                sx={{
                  width: { xs: "100%", sm: 150 },
                  height: { xs: 38, sm: 44 },
                  minWidth: { xs: 45, sm: 50 },
                  fontSize: { xs: 12, sm: 16 },
                  padding: 0,
                  borderRadius: 1.5,
                  textTransform: "none",
                  fontWeight: 700,
                }}
              >
                Edit Header
              </Button>
            )}
          </Stack>
        )}
      </Box>

      {/* Top Summary Metric Cards matching seller Artwork.jsx */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "minmax(0, 1fr)",
            sm: "repeat(2, minmax(0, 1fr))",
            lg: "repeat(3, minmax(0, 1fr))",
          },
          gap: 2,
          mb: 2.5,
          minWidth: 0,
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
                minWidth: 0,
                overflow: "hidden",
                height: "100%",
              }}
            >
              <CardContent
                sx={{
                  p: { xs: 1.75, sm: 2 },
                  "&:last-child": { pb: { xs: 1.75, sm: 2 } },
                  height: "100%",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: { xs: 1.25, sm: 2 },
                    minWidth: 0,
                    height: "100%",
                  }}
                >
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography
                      sx={{
                        color: theme.palette.text.secondary,
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: 1,
                        overflowWrap: "break-word",
                      }}
                    >
                      {metric.label}
                    </Typography>
                    <Typography
                      sx={{
                        mt: 0.5,
                        color: theme.palette.text.primary,
                        fontSize: { xs: 24, sm: 26, xl: 28 },
                        fontWeight: 800,
                        lineHeight: 1.1,
                        overflowWrap: "anywhere",
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
                        overflowWrap: "break-word",
                      }}
                    >
                      {metric.caption}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      width: { xs: 44, sm: 50 },
                      height: { xs: 44, sm: 50 },
                      flexShrink: 0,
                      display: "grid",
                      placeItems: "center",
                      borderRadius: 2,
                      backgroundColor: metric.background,
                      color: metric.color,
                    }}
                  >
                    {createElement(MetricIcon, { sx: { fontSize: 24 } })}
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

      {/* Main Tab Content */}
      {activeTab === "calendar" ? (
        <Box>
          {/* Filter & Search Bar */}
          <Paper
            variant="outlined"
            sx={{
              p: { xs: 2, md: 2.5 },
              borderRadius: 2.5,
              backgroundColor: theme.palette.background.paper,
              borderColor: theme.palette.divider,
              containerType: "inline-size",
              containerName: "event-filters",
              minWidth: 0,
            }}
          >
            <Box sx={{ display: "flex", width: "100%", minWidth: 0 }}>
              <TextField
                variant="outlined"
                placeholder="Search exhibitions by title, venue, or description..."
                size="small"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                fullWidth
                sx={adminSearchInputSx(theme, {
                  minWidth: 0,
                  "& .MuiInputBase-input": { fontSize: 13 },
                })}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon
                        fontSize="small"
                        sx={{ color: "text.secondary" }}
                      />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
          </Paper>

          {/* View Mode Switcher & Summary Count (Outside Filter Group) */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 1.5,
              mt: 2,
              mb: 1,
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
              onChange={(_e, next) => {
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

          {/* Exhibition List Presentation */}
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
              <CircularProgress aria-label="Loading exhibition calendar" />
            </Box>
          ) : events.length === 0 ? (
            <Paper
              variant="outlined"
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2.5,
                py: 8,
                px: 3,
                textAlign: "center",
              }}
            >
              <EventOutlinedIcon
                sx={{ fontSize: 48, color: "text.disabled", mb: 1 }}
              />
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
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2.5,
                py: 8,
                px: 3,
                textAlign: "center",
              }}
            >
              <EventOutlinedIcon
                sx={{ fontSize: 48, color: "text.disabled", mb: 1 }}
              />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                No matching exhibitions found
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 0.5, fontSize: 13 }}>
                Try adjusting your search keywords.
              </Typography>
            </Paper>
          ) : viewMode === "card" ? (
            <Paper
              component="section"
              variant="outlined"
              sx={{
                p: { xs: 1.5, sm: 2 },
                borderRadius: 2.5,
                borderColor: theme.palette.divider,
                backgroundColor: theme.palette.background.paper,
              }}
            >
              <EventCard
                events={filteredEvents}
                onEdit={handleOpenEdit}
                onDelete={handleOpenDelete}
              />
            </Paper>
          ) : (
            <EventTable
              events={filteredEvents}
              onEdit={handleOpenEdit}
              onDelete={handleOpenDelete}
            />
          )}
        </Box>
      ) : activeTab === "header" ? (
        <PromotionHeader
          registerActions={registerPromotionActions}
          onNotify={showSnackbar}
        />
      ) : (
        <PromotionSlides
          registerActions={registerPromotionActions}
          onNotify={showSnackbar}
        />
      )}

      {/* Archived Exhibitions Dialog */}
      <EventArchives
        open={openArchived}
        handleClose={() => setOpenArchived(false)}
        events={archivedEvents}
        loading={archivedLoading}
        error={archivedError}
        onRetry={loadArchivedEvents}
        onEdit={handleOpenEdit}
        onDelete={handleOpenDelete}
      />

      {/* Create / Edit Event Form Dialog */}
      <EventForm
        open={openForm}
        handleClose={() => {
          setOpenForm(false);
          setSelectedEvent(null);
        }}
        onSubmit={handleSubmitEvent}
        selectedEvent={selectedEvent}
      />

      {/* Delete Event Confirmation Dialog */}
      <EventDelete
        open={openDelete}
        handleClose={() => {
          if (!deleting) {
            setOpenDelete(false);
            setSelectedEvent(null);
          }
        }}
        onSubmit={handleDeleteEvent}
        selectedEvent={selectedEvent}
        deleting={deleting}
      />

      {/* Floating Snackbar Notifications matching seller Artwork.jsx */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={(_event, reason) => {
          if (reason === "clickaway") return;
          setSnackbarOpen(false);
        }}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        TransitionComponent={SlideTransition}
        sx={{
          "& .MuiSnackbar-root": {
            width: "auto",
          },
        }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity={snackbarSeverity}
          variant="filled"
          action={
            snackbarAction ? (
              <Button
                color="inherit"
                size="small"
                onClick={() => {
                  const action = snackbarAction;
                  setSnackbarOpen(false);
                  action.onClick();
                }}
              >
                {snackbarAction.label}
              </Button>
            ) : undefined
          }
          sx={{
            width: { xs: 280, sm: 360 },
            minHeight: 48,
            borderRadius: 2,
            boxShadow: "0 10px 28px rgba(15, 23, 42, 0.18)",
            backgroundColor:
              snackbarSeverity === "error"
                ? theme.palette.error.main
                : snackbarSeverity === "warning"
                  ? theme.palette.warning.main
                  : snackbarSeverity === "info"
                    ? theme.palette.info.main
                    : theme.palette.success.main,
            color: "#fff",
            alignItems: "center",
            "& .MuiAlert-icon": {
              color: "#fff",
              mr: 1,
            },
            "& .MuiAlert-message": {
              fontWeight: 600,
              fontSize: 14,
              display: "flex",
              alignItems: "center",
            },
            "& .MuiAlert-action": {
              alignItems: "center",
              paddingLeft: 1,
              color: "#fff",
            },
          }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
