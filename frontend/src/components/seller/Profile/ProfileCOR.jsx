import React, { useEffect } from "react";
import {
  Box,
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

function ProfileCOR({ open, handleClose, selectedStudent }) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Enter" && open) {
        event.preventDefault();
        handleBulkVerify();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Enter" && open) {
        event.preventDefault();
        handleBulkVerify();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const getCorUrl = (student) => {
    if (!student?.cor) return "";
    if (/^https?:\/\//i.test(student.cor)) return student.cor;
    return `http://localhost:5000/uploads/seller/uploadCOR/${encodeURIComponent(student.cor)}`;
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      TransitionComponent={Transition}
      keepMounted
    >
      <DialogTitle sx={{ fontWeight: "bold" }}>View COR</DialogTitle>
      <DialogContent dividers>
        <Box
          component="img"
          src={getCorUrl(selectedStudent)}
          alt="Student COR"
          sx={{
            width: "100%",
            maxHeight: 500,
            objectFit: "contain",
            borderRadius: 1,
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="secondary">
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ProfileCOR;
