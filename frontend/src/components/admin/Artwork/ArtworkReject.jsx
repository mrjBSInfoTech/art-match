import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Slide,
  Typography,
  TextField,
  MenuItem,
  Alert,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
// Icons
import CloseIcon from "@mui/icons-material/Close";
import PaletteOutlinedIcon from "@mui/icons-material/PaletteOutlined";

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

function ArtworkReject({ open, handleClose, onSubmit, selectedArt }) {
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [error, setError] = useState("");
  const theme = useTheme();

  useEffect(() => {
    if (open) {
      setReason("");
      setCustomReason("");
      setError("");
    }
  }, [open, selectedArt]);

  const handleReject = async () => {
    if (loading) return;
    const rejectionReason = [reason, customReason.trim()].filter(Boolean).join(": ");
    if (!rejectionReason) {
      setError("Select a reason or enter a custom reason.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      await onSubmit(selectedArt, rejectionReason);
      handleClose();
    } catch (err) {
      setError(err.message || "Unable to reject artwork. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      sx={{ zIndex: (theme) => theme.zIndex.modal + 1 }}
      onClose={loading ? undefined : handleClose}
      TransitionComponent={Transition}
      keepMounted
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
        <PaletteOutlinedIcon sx={{ color: "#ef3340", fontSize: 20 }} />
        Reject Artwork
        <Button
          aria-label="Close artwork information"
          disabled={loading}
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
      <DialogContent dividers>
        <Typography>
          Are you sure you want to reject the selected art?
        </Typography>
        <TextField
          select
          fullWidth
          label="Rejection reason"
          slotProps={{
            select: {
              MenuProps: {
                sx: { zIndex: (theme) => theme.zIndex.modal + 2 },
              },
            },
          }}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          disabled={loading}
          sx={{ mt: 2 }}
          helperText="Choose a reason, or enter your own below."
        >
          <MenuItem value="">No preset reason</MenuItem>
          {[
            "Image is unclear or low quality",
            "Artwork details are incomplete or inaccurate",
            "Artwork does not meet marketplace guidelines",
            "Copyright or ownership concerns",
            "Duplicate artwork submission",
            "Inappropriate content",
          ].map((option) => (
            <MenuItem key={option} value={option}>{option}</MenuItem>
          ))}
        </TextField>
        <TextField
          fullWidth
          multiline
          minRows={3}
          label="Custom reason (optional)"
          value={customReason}
          onChange={(event) => setCustomReason(event.target.value)}
          disabled={loading}
          sx={{ mt: 2 }}
          helperText="Add details or provide a custom reason instead of a preset."
        />
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="text.secondary" disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleReject}
          disabled={loading || (!reason && !customReason.trim())}
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
          {loading ? "Rejecting..." : "Reject"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ArtworkReject;
