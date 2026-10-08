import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Slide,
  Typography,
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

function ArtworkVerify({ open, handleClose, onSubmit, selectedArt }) {
  const [loading, setLoading] = useState(false);
  const theme = useTheme();

  const handleVerify = async () => {
    if (loading) return;

    setLoading(true);
    try {
      await onSubmit(selectedArt);
      handleClose();
    } catch {
      // The page displays the error; keep confirmation open for retry.
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
        Verify Artwork
        <Button
          aria-label="Close artwork information"
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
          Are you sure you want to verify the selected art?
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="text.secondary">
          Cancel
        </Button>
        <Button
          onClick={handleVerify}
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
          {loading ? "Verifying..." : "Verify"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ArtworkVerify;
