import React, { useState, useEffect } from "react";
import { Box, Button, Typography, IconButton, Stack, Slide, CircularProgress } from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { fetchEvents } from "../../../api/buyer/eventAPI";
import EventInfo from "./EventInfo";

export default function UpcomingEventsSlider() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState("left");
  const [openInfoDialog, setOpenInfoDialog] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  useEffect(() => {
    let active = true;

    fetchEvents()
      .then((loadedEvents) => {
        if (active) {
          setEvents(loadedEvents);
          setLoading(false);
        }
      })
      .catch((error) => {
        if (active) {
          console.error("Unable to load upcoming events:", error);
          setLoadError(error.message || "Unable to load upcoming events.");
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  // Auto-slide effect every 6 seconds (slides left naturally)
  useEffect(() => {
    if (events.length < 2) return undefined;

    const timer = setInterval(() => {
      setSlideDirection("left");
      setCurrentIndex((prevIndex) => (prevIndex + 1) % events.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [events.length]);

  const formatEventDate = (value) => {
    if (!value) return "Date to be announced";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Date to be announced";

    return date.toLocaleString("en-PH", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const handlePrev = () => {
    if (events.length < 2) return;
    setSlideDirection("right"); // slide in from right when going back
    setCurrentIndex((prev) => (prev === 0 ? events.length - 1 : prev - 1));
  };

  const handleNext = () => {
    if (events.length < 2) return;
    setSlideDirection("left"); // slide in from left when going next
    setCurrentIndex((prev) => (prev + 1) % events.length);
  };

  const handleInfoOpen = () => {
    setSelectedEvent(currentEvent);
    setOpenInfoDialog(true);
  };

  const handleInfoClose = () => {
    setOpenInfoDialog(false);
  };

  if (loading || !events.length) {
    return (
      <Box
        sx={{
          position: "relative",
          width: "100%",
          height: { xs: 400, sm: 500, md: 560 },
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          px: 3,
          color: "#fff",
          textAlign: "center",
          background: "linear-gradient(135deg, #1f2937, #111827)",
        }}
      >
        {loading ? (
          <CircularProgress color="inherit" />
        ) : (
          <Typography>
            {loadError || "No upcoming events at this time."}
          </Typography>
        )}
      </Box>
    );
  }

  const currentEvent = events[currentIndex];

  return (
    <Box
      sx={{
        position: "relative",
        width: "100%",
        height: { xs: 400, sm: 500, md: 560 },
        overflow: "hidden",
        backgroundImage: currentEvent.image_url
          ? `url("${currentEvent.image_url}")`
          : "linear-gradient(135deg, #334155, #111827)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        transition: "background-image 0.5s ease-in-out",
      }}
    >
      {/* Cinematic Gradient Overlays */}
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(90deg, rgba(11,15,25,0.95) 0%, rgba(11,15,25,0.7) 50%, rgba(11,15,25,0.2) 100%)",
        }}
      />
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(0deg, rgba(11,15,25,0.9) 0%, transparent 50%)",
        }}
      />

      {/* Animated Content Wrapper using MUI Slide */}
      <Slide direction={slideDirection} in={true} timeout={400} key={currentIndex}>
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            zIndex: 2,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            p: { xs: 3, sm: 6 },
            maxWidth: 700,
            width: "100%",
          }}
        >
          {/* Badges / Metadata */}
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
            <Typography variant="caption" sx={{ color: "#fff", fontWeight: 700, letterSpacing: 1 }}>
              {String(currentEvent.status || "Published").toUpperCase()}
            </Typography>
            <Typography variant="caption" sx={{ color: "grey.400", fontWeight: 700 }}>
              {formatEventDate(currentEvent.start_at)}
            </Typography>
          </Stack>

          {/* Title */}
          <Typography
            variant="h2"
            sx={{
              color: "#fff",
              fontWeight: 900,
              fontSize: { xs: "2rem", sm: "3rem", md: "3.5rem" },
              lineHeight: 1.1,
              textTransform: "uppercase",
              mb: 1.5,
              letterSpacing: "-0.02em",
            }}
          >
            {currentEvent.title}
          </Typography>

          {/* Description */}
          <Typography
            variant="body1"
            sx={{
              color: "grey.300",
              fontSize: { xs: 14, sm: 16 },
              mb: 3,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {currentEvent.description}
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: "grey.300", fontSize: 13, mb: 2 }}
          >
            {currentEvent.location || "Location to be announced"}
          </Typography>
          <Button
            color="error"
            variant="contained"
            onClick={handleInfoOpen}
            sx={{
              alignSelf: "flex-start",
              width: { xs: "100%", sm: "auto" },
              minWidth: { sm: 140 },
              py: 1,
              px: 2.5,
              fontWeight: 700,
              textTransform: "none",
              borderRadius: 1.5,
            }}
          >
            View Info
          </Button>
        </Box>
      </Slide>

      {/* Navigation Arrows (Top Right) */}
      <Stack
        direction="row"
        spacing={1}
        sx={{
          position: "absolute",
          top: 24,
          right: 24,
          zIndex: 3,
          display: { xs: "none", sm: events.length > 1 ? "flex" : "none" },
        }}
      >
        <IconButton
          onClick={handlePrev}
          sx={{
            backgroundColor: "rgba(0,0,0,0.5)",
            color: "#fff",
            "&:hover": { backgroundColor: "rgba(0,0,0,0.8)" },
          }}
        >
          <ChevronLeftIcon />
        </IconButton>
        <IconButton
          onClick={handleNext}
          sx={{
            backgroundColor: "rgba(0,0,0,0.5)",
            color: "#fff",
            "&:hover": { backgroundColor: "rgba(0,0,0,0.8)" },
          }}
        >
          <ChevronRightIcon />
        </IconButton>
      </Stack>

      {/* Pagination Dash/Dots (Bottom Right) */}
      <Stack
        direction="row"
        spacing={1}
        sx={{
          position: "absolute",
          bottom: 24,
          right: 32,
          zIndex: 3,
          alignItems: "center",
        }}
      >
        {events.length > 1 && events.map((event, index) => (
          <Box
            key={event.event_id}
            onClick={() => {
              setSlideDirection(index > currentIndex ? "left" : "right");
              setCurrentIndex(index);
            }}
            sx={{
              width: currentIndex === index ? 24 : 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: currentIndex === index ? "error.main" : "rgba(255,255,255,0.4)",
              cursor: "pointer",
              transition: "all 0.3s ease-in-out",
            }}
          />
        ))}
      </Stack>
      <EventInfo
        open={openInfoDialog}
        handleClose={handleInfoClose}
        selectedEvent={selectedEvent}
      />
    </Box>
  );
}