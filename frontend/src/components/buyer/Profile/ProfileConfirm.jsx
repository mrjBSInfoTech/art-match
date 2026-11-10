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
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";

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

export default function ProfileConfirm({
  open,
  handleClose,
  onConfirm,
  confirming = false,
}) {
  const theme = useTheme();
  const closeDialog = () => {
    if (!confirming) handleClose();
  };

  return (
    <Dialog
      open={open}
      onClose={closeDialog}
      disableEscapeKeyDown={confirming}
      aria-labelledby="profile-confirm-title"
      aria-describedby="profile-confirm-description"
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
          id="profile-confirm-title"
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
          <EditOutlinedIcon sx={{ color: "error.main", fontSize: 20 }} />
          Confirm profile update
          <Button
            aria-label="Close profile update confirmation"
            onClick={closeDialog}
            disabled={confirming}
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
          <Typography id="profile-confirm-description">
            Are you sure you want to update your personal information?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={closeDialog} disabled={confirming} sx={{ color: "text.secondary" }}>
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={confirming}
            color="error"
            variant="contained"
            startIcon={<EditOutlinedIcon />}
            sx={{
              borderRadius: 1.5,
              px: 2.5,
              textTransform: "none",
              fontWeight: 700,
              color: "#fff",
            }}
          >
            {confirming ? "Updating..." : "Confirm update"}
          </Button>
        </DialogActions>
      </>
    </Dialog>
  );
}
