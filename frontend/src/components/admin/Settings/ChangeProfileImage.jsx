import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Slide,
  Stack,
  Typography,
} from "@mui/material";
import { styled } from "@mui/material/styles";

const DropZone = styled(Box, {
  shouldForwardProp: (prop) => prop !== "isDragActive" && prop !== "hasError",
})(({ theme, isDragActive, hasError }) => ({
  minHeight: 200,
  border: `2px dashed ${hasError ? theme.palette.error.main : isDragActive ? theme.palette.primary.main : theme.palette.grey[400]}`,
  borderRadius: theme.shape.borderRadius,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: theme.spacing(3),
  cursor: "pointer",
  transition: "all 0.2s ease-in-out",
  backgroundColor: isDragActive ? theme.palette.action.hover : "transparent",
  "&:hover": { backgroundColor: theme.palette.action.hover },
}));

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export default function ChangeProfileImage({ open, handleClose, onSubmit }) {
  const [file, setFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFile(null);
    setImagePreview(null);
    setIsDragActive(false);
    setError("");
    setIsSubmitting(false);
  }, [open]);

  const handleFileChange = (selectedFile) => {
    if (!selectedFile) return;
    if (!selectedFile.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (selectedFile.size > 2 * 1024 * 1024) {
      setError("Image must be 2MB or smaller.");
      return;
    }

    setFile(selectedFile);
    setImagePreview(URL.createObjectURL(selectedFile));
    setError("");
  };

  const handleSubmit = async () => {
    if (!file) {
      setError("Please choose an image first.");
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit(file);
      handleClose();
    } catch (submitError) {
      setError(submitError.message || "Unable to update profile image.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={isSubmitting ? undefined : handleClose} TransitionComponent={Transition} keepMounted maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: "bold" }}>Change Profile Image</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <DropZone
            isDragActive={isDragActive}
            hasError={Boolean(error)}
            onDragEnter={() => setIsDragActive(true)}
            onDragLeave={() => setIsDragActive(false)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              setIsDragActive(false);
              handleFileChange(event.dataTransfer.files?.[0]);
            }}
            onClick={() => document.getElementById("profile-image-input")?.click()}
          >
            {imagePreview ? (
              <Box component="img" src={imagePreview} alt="Profile preview" sx={{ maxWidth: "100%", maxHeight: 160, objectFit: "contain" }} />
            ) : (
              <>
                <Typography variant="h6" fontWeight={700}>Drag an image here</Typography>
                <Typography color="text.secondary">PNG, JPG, or WEBP up to 2MB</Typography>
              </>
            )}
            <input id="profile-image-input" hidden accept="image/*" type="file" onChange={(event) => handleFileChange(event.target.files?.[0])} />
          </DropZone>
          <Button variant="outlined" component="label">
            {file ? file.name : "Choose image"}
            <input hidden accept="image/*" type="file" onChange={(event) => handleFileChange(event.target.files?.[0])} />
          </Button>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isSubmitting}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={isSubmitting || !file}>
          {isSubmitting && <CircularProgress size={18} color="inherit" sx={{ mr: 1 }} />}
          {isSubmitting ? "Uploading" : "Save image"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
