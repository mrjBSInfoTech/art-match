import React, { useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Slide,
  Typography,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

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

function AddressDelete({
  open,
  handleClose,
  onSubmit,
  selectedAddress,
}) {
  // Handle Enter key for delete
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Enter" && open) {
        event.preventDefault();
        handleDelete();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

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

  const handleDelete = () => {
    onSubmit(selectedAddress?.address_id || selectedAddress?.id || selectedAddress);
    handleClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      TransitionComponent={Transition}
      keepMounted
      aria-labelledby="delete-address-dialog-title"
      aria-describedby="delete-address-dialog-description"
      PaperProps={{
        sx: {
          width: "min(100% - 24px, 470px)",
          maxWidth: "470px",
          m: 1.5,
          borderRadius: 3,
          overflow: "hidden",
          bgcolor: "background.paper",
        },
      }}
    >
      <>
        <DialogTitle id="delete-address-dialog-title" sx={{
          display: "flex", alignItems: "center", gap: 0.75,
          px: 2.5, py: 1.75, color: "text.primary", fontSize: 16, fontWeight: 700,
          borderBottom: "1px solid", borderColor: "divider",
        }}>
          <DeleteOutlineIcon sx={{ color: "#ef3340", fontSize: 20 }} />
          Delete Address
          <IconButton aria-label="Close delete address confirmation" onClick={handleClose} sx={{
            width: 28, height: 28, ml: "auto", p: 0, color: "text.secondary",
          }}>
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Typography id="delete-address-dialog-description" variant="body2" sx={{ lineHeight: 1.7 }}>
            Are you sure you want to delete this address? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleClose} sx={{ color: "text.secondary" }}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained" sx={{
            borderRadius: 1.5, px: 2.5, textTransform: "none", fontWeight: 700,
            color: "error.contrastText",
          }}>
            Delete
          </Button>
        </DialogActions>
      </>
    </Dialog>
  );
}

export default AddressDelete;
