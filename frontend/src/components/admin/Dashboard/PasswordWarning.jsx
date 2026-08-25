import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Slide,
} from "@mui/material";

// Animation transition
const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

function PasswordWarning({ open, handleClose, navigate }) {
  return (
    <Dialog
      open={open}
      TransitionComponent={Transition}
      keepMounted
      disableEscapeKeyDown
    >
      <DialogTitle sx={{ color: "error.main", fontWeight: "bold" }}>
        Security Action Required
      </DialogTitle>

      <DialogContent>
        <DialogContentText>
          Hi there, you are currently using a temporary, system-generated initial
          password. For security reasons, you must change your password
          immediately before continuing to access system management features.
        </DialogContentText>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          variant="contained"
          color="error"
          onClick={() => {
            handleClose();
            navigate("/admin/settings");
          }}
        >
          Change Password Now
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default PasswordWarning;