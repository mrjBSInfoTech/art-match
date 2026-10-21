import React, { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Slide,
  Typography,
  Alert,
  CircularProgress,
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

function ArtworkConfirm({ open, handleClose, onSubmit, formData, isEditing = false }) {
  const theme = useTheme();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);

  useEffect(() => {
    if (open) setError("");
  }, [open, formData]);

  const handleConfirm = async () => {
    if (submitting.current || !formData) return;
    submitting.current = true;
    setIsSubmitting(true);
    setError("");
    try {
      await onSubmit(formData);
    } catch (submitError) {
      setError(submitError.message || "Unable to save artwork. Please try again.");
    } finally {
      submitting.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={isSubmitting ? undefined : handleClose}
      disableEscapeKeyDown={isSubmitting}
      aria-labelledby="artwork-confirm-title"
      sx={{ zIndex: (theme) => theme.zIndex.modal + 1 }}
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
          id="artwork-confirm-title"
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
          {isEditing ? "Confirm artwork changes" : "Confirm artwork submission"}
          <Button
            aria-label="Return to artwork form"
            onClick={handleClose}
            disabled={isSubmitting}
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
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Typography>
            {isEditing
              ? `Save your changes to "${formData?.title || "this artwork"}"?`
              : `Create "${formData?.title || "this artwork"}"? It will be saved as Unverified. Use Verify Artwork when you are ready to request admin review.`}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleClose} disabled={isSubmitting} color="text.secondary">
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isSubmitting || !formData}
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
            {isSubmitting && <CircularProgress size={16} color="inherit" sx={{ mr: 1 }} />}
            {isSubmitting ? "Saving..." : isEditing ? "Confirm changes" : "Confirm submission"}
          </Button>
        </DialogActions>
      </>
    </Dialog>
  );
}

export default ArtworkConfirm;
