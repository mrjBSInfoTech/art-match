import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Slide,
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
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !selectedStudent?.cor) {
      setImageUrl("");
      setError("");
      return;
    }

    let active = true;
    let objectUrl = null;
    const rawCor = selectedStudent.cor;

    if (/^blob:/i.test(rawCor)) {
      setImageUrl(rawCor);
      return;
    }

    const url = /^https?:\/\//i.test(rawCor)
      ? rawCor
      : `http://localhost:5000/uploads/seller/uploadCOR/${encodeURIComponent(rawCor)}`;

    setLoading(true);
    setError("");

    fetch(url, { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(
            res.status === 403
              ? "Access denied. You do not have permission to view this document."
              : res.status === 404
              ? "Certificate of Registration document not found."
              : "Unable to load registration document.",
          );
        }
        return res.blob();
      })
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setImageUrl(objectUrl);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || "Failed to load COR document.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [open, selectedStudent]);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      TransitionComponent={Transition}
      keepMounted={false}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle sx={{ fontWeight: "bold" }}>View Certificate of Registration (COR)</DialogTitle>
      <DialogContent dividers sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 250 }}>
        {loading && <CircularProgress size={36} />}
        {error && !loading && (
          <Alert severity="error" sx={{ width: "100%" }}>
            {error}
          </Alert>
        )}
        {imageUrl && !loading && !error && (
          <Box
            component="img"
            src={imageUrl}
            alt="Student COR"
            sx={{
              width: "100%",
              maxHeight: 500,
              objectFit: "contain",
              borderRadius: 1,
            }}
          />
        )}
        {!imageUrl && !loading && !error && (
          <Alert severity="info" sx={{ width: "100%" }}>
            No Certificate of Registration available.
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="secondary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ProfileCOR;
