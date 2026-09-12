import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Slide,
  TextField,
  Typography,
} from "@mui/material";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

function AccessReason({ open, handleClose, selectedAccount, action, submitAction }) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!open) {
      setReason("");
    }
  }, [open]);

  const handleSubmit = () => {
    if (!selectedAccount) return;
    submitAction(reason);
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      TransitionComponent={Transition}
      keepMounted
      PaperProps={{
        sx: { minWidth: "350px" },
      }}
    >
      <DialogTitle sx={{ fontWeight: "bold" }}>
        {action === "strike" ? "Add strike" : action === "ban" ? "Ban account" : "Unban account"}
      </DialogTitle>

      <DialogContent dividers sx={{ pt: 3 }}>
        <Typography sx={{ mb: 2, color: "#475569", fontWeight: 600 }}>
          {selectedAccount?.role} account: {selectedAccount?.username}
        </Typography>
        <TextField
          autoFocus
          fullWidth
          label="Reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSubmit}>
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default AccessReason;
