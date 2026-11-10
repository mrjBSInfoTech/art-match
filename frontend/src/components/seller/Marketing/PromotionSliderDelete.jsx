import React from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Slide,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export default function PromotionSliderDelete({
  open,
  handleClose,
  onSubmit,
  selectedSlide,
  deleting = false,
}) {
  const theme = useTheme();
  const closeDialog = () => {
    if (!deleting) handleClose();
  };

  return (
    <Dialog
      open={open}
      onClose={closeDialog}
      TransitionComponent={Transition}
      keepMounted
      fullWidth
      maxWidth={false}
      aria-labelledby="promotion-slide-delete-title"
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
      <DialogTitle
        id="promotion-slide-delete-title"
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
        <DeleteOutlineIcon sx={{ color: theme.palette.error.main, fontSize: 20 }} />
        Delete Promotion Slide
        <Button
          aria-label="Close delete promotion slide dialog"
          onClick={closeDialog}
          disabled={deleting}
          sx={{
            minWidth: 44,
            width: 44,
            height: 44,
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
          Are you sure you want to delete{" "}
          <strong>{selectedSlide?.title || "this promotion slide"}</strong>?
          This action cannot be undone.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={closeDialog} disabled={deleting} color="inherit">
          Cancel
        </Button>
        <Button
          onClick={() => onSubmit(selectedSlide)}
          disabled={deleting || !selectedSlide}
          color="error"
          variant="contained"
          sx={{
            minHeight: 44,
            borderRadius: 1.5,
            px: 2.5,
            textTransform: "none",
            fontWeight: 700,
            color: "#fff",
          }}
        >
          {deleting ? "Deleting..." : "Delete"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
