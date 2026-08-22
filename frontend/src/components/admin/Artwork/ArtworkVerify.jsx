import React, { useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Slide,
  Typography,
} from "@mui/material";

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

function ArtworkVerify({ open, handleClose, onSubmit, selectedArt }) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Enter" && open) {
        event.preventDefault();
        handleVerify();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Enter" && open) {
        event.preventDefault();
        handleVerify();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const handleVerify = () => {
    onSubmit(selectedArt);
    handleClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} TransitionComponent={Transition} keepMounted>
      <DialogTitle sx={{ fontWeight: "bold" }}>Verify Arts</DialogTitle>
      <DialogContent dividers>
        <Typography>
          Are you sure you want to verify the selected art?
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="secondary">
          Cancel
        </Button>
        <Button onClick={handleVerify} color="primary" variant="contained">
          Verify
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ArtworkVerify;
