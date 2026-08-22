import React, { useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Button,
  Slide,
  Typography,
} from "@mui/material";

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

function ArtworkErrorAdd({ open, handleClose }) {
  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        handleClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      TransitionComponent={Transition}
      keepMounted
      PaperProps={{
        sx: {
          minWidth: { xs: "92%", sm: "600px" },
          width: "100%",
          borderRadius: 3,
        },
      }}
    >
      <>
        <DialogTitle sx={{ fontWeight: 700 }}>Add Artwork Error</DialogTitle>
        <Divider />
        <DialogContent>
          <Typography>
            You're not allowed to add artwork because your account is not
            verified yet. Please wait for the admin to verify your account.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleClose}>Cancel</Button>
        </DialogActions>
      </>
    </Dialog>
  );
}

export default ArtworkErrorAdd;
