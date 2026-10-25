import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Slide,
  Typography,
  Alert,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
// Icons
import CloseIcon from "@mui/icons-material/Close";
import PaletteOutlinedIcon from "@mui/icons-material/PaletteOutlined";

// Animation transition
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

function EventDelete({ open, handleClose, onSubmit, selectedEvent, deleting = false, error = "" }) {
  const theme = useTheme();
  const closeDialog = () => { if (!deleting) handleClose(); };
  const handleDelete = () => {
    if (!deleting && selectedEvent?.event_id != null) onSubmit(selectedEvent.event_id);
  };

  return (
    <Dialog
      open={open}
      onClose={closeDialog}
      disableEscapeKeyDown={deleting}
      aria-labelledby="event-delete-title"
      aria-describedby="event-delete-description"
      TransitionComponent={Transition}
      keepMounted
      PaperProps={{
        sx: {
          width: "min(100% - 24px, 470px)",
          maxWidth: "470px",
          borderRadius: 3,
          overflow: "hidden",
          backgroundColor: theme.palette.background.paper,
        },
      }}
    >
      <>
        <DialogTitle
          id="event-delete-title"
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
          <PaletteOutlinedIcon sx={{ color: "#ef3340", fontSize: 20 }} />
          Delete Event
          <Button
            aria-label="Close event delete"
            onClick={closeDialog} disabled={deleting}
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
        <DialogContent dividers>
          <Typography id="event-delete-description">
            Are you sure you want to delete this event? This action cannot be
            undone.
          </Typography>
          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={closeDialog} disabled={deleting} sx={{ color: "text.secondary" }}>
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            disabled={deleting || selectedEvent?.event_id == null}
            color="error"
            variant="contained"
            sx={{
              borderRadius: 1.5,
              px: 2.5,
              textTransform: "none",
              fontWeight: 700,
              color: "#fff",
            }}
          >
            {deleting ? "Deleting?" : "Delete"}
          </Button>
        </DialogActions>
      </>
    </Dialog>
  );
}

export default EventDelete;
