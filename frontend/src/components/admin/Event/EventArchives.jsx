import React, { useState, useMemo, useEffect } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Slide,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";

// Icons
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import EventOutlinedIcon from "@mui/icons-material/EventOutlined";
import ViewListIcon from "@mui/icons-material/ViewList";
import ViewModuleIcon from "@mui/icons-material/ViewModule";

// Child Components
import EventCard from "./EventCard";
import EventTable from "./EventTable";

// Transition matching ArtworkForm.jsx
const Transition = React.forwardRef(function Transition(props, ref) {
  return (
    <Slide
      direction="up"
      ref={ref}
      {...props}
      timeout={500}
      easing={{
        enter: "cubic-bezier(0.4, 0, 0.2, 1)",
        exit: "ease-out",
      }}
    />
  );
});

export default function EventArchives({
  open,
  handleClose,
  events = [],
  loading = false,
  error = "",
  onRetry,
  onEdit,
  onDelete,
}) {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("table");

  useEffect(() => {
    if (!open) {
      setSearchQuery("");
    }
  }, [open]);

  const filteredArchivedEvents = useMemo(() => {
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

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      TransitionComponent={Transition}
      keepMounted
      fullWidth
      maxWidth="lg"
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: "hidden",
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
          gap: 1,
          px: { xs: 2, sm: 3 },
          py: 2,
          color: theme.palette.text.primary,
          fontSize: 18,
          fontWeight: 700,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <HistoryOutlinedIcon sx={{ color: "#ef3340", fontSize: 22 }} />
        Archived Exhibitions
        <IconButton
          aria-label="Close archived exhibitions"
          onClick={handleClose}
          size="small"
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
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack spacing={2.5}>
          {/* Search & Presentation Switcher */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 1.5,
              pt: 0.5,
            }}
          >
            <TextField
              size="small"
              placeholder="Search archived exhibitions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{ width: { xs: "100%", sm: 320 } }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" sx={{ color: "text.secondary" }} />
                  </InputAdornment>
                ),
              }}
            />

            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(_e, next) => {
                if (next) setViewMode(next);
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
                  px: 1.5,
                  py: 0.5,
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: "none",
                  gap: 0.75,
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

          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
              <CircularProgress aria-label="Loading archived exhibitions" />
            </Box>
          ) : error ? (
            <Stack
              direction={{ xs: "column", sm: "row" }}
              alignItems={{ xs: "stretch", sm: "center" }}
              justifyContent="space-between"
              spacing={1}
              sx={{
                p: 2,
                borderRadius: 2,
                color: "error.main",
                bgcolor: "error.light",
              }}
            >
              <Typography role="status">{error}</Typography>
              {onRetry && (
                <Button color="error" size="small" onClick={onRetry}>
                  Retry
                </Button>
              )}
            </Stack>
          ) : filteredArchivedEvents.length === 0 ? (
            <Box sx={{ py: 8, textAlign: "center" }}>
              <EventOutlinedIcon sx={{ fontSize: 44, color: "text.disabled", mb: 1 }} />
              <Typography sx={{ fontWeight: 700 }}>
                {searchQuery
                  ? "No matching archived exhibitions"
                  : "No archived exhibitions"}
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 0.5, fontSize: 13 }}>
                Concluded exhibitions appear here automatically.
              </Typography>
            </Box>
          ) : viewMode === "card" ? (
            <EventCard
              events={filteredArchivedEvents}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ) : (
            <EventTable
              events={filteredArchivedEvents}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
        <Button
          variant="outlined"
          onClick={handleClose}
          sx={{
            borderRadius: 1.5,
            px: 2.5,
            textTransform: "none",
            fontWeight: 700,
            borderColor: theme.palette.divider,
            color: theme.palette.text.secondary,
            "&:hover": { borderColor: theme.palette.text.primary },
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
