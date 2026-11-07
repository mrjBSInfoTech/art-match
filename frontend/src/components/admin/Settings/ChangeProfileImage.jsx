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
import { styled, useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";

const DropZone = styled(Box, {
  shouldForwardProp: (prop) => prop !== "isDragActive" && prop !== "hasError",
})(({ theme, isDragActive, hasError }) => ({
  minHeight: 180,
  border: `2px dashed ${
    hasError
      ? theme.palette.error.main
      : isDragActive
        ? "#ef3340"
        : theme.palette.mode === "dark"
          ? "rgba(255, 255, 255, 0.2)"
          : "rgba(15, 23, 42, 0.2)"
  }`,
  borderRadius: 12,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: theme.spacing(3),
  cursor: "pointer",
  transition: "all 0.2s ease-in-out",
  backgroundColor: isDragActive
    ? theme.palette.mode === "dark"
      ? "rgba(239, 51, 64, 0.08)"
      : "rgba(239, 51, 64, 0.04)"
    : "transparent",
  "&:hover": {
    borderColor: "#ef3340",
    backgroundColor:
      theme.palette.mode === "dark"
        ? "rgba(239, 51, 64, 0.08)"
        : "rgba(239, 51, 64, 0.04)",
  },
}));

// Transition matching ArtworkForm.jsx
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

export default function ChangeProfileImage({ open, handleClose, onSubmit }) {
  const theme = useTheme();

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
      setError("Please choose an image file (PNG, JPG, or WEBP).");
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
    <Dialog
      open={Boolean(open)}
      onClose={isSubmitting ? undefined : handleClose}
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
        <CloudUploadIcon sx={{ color: "#ef3340", fontSize: 20 }} />
        Change Profile Image
        <Button
          aria-label="Close"
          onClick={handleClose}
          disabled={isSubmitting}
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
        <Stack spacing={2} sx={{ pt: 1 }}>
          {error && (
            <Alert severity="error" sx={{ borderRadius: 2 }}>
              {error}
            </Alert>
          )}
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
            onClick={() =>
              document.getElementById("profile-image-input")?.click()
            }
          >
            {imagePreview ? (
              <Box
                component="img"
                src={imagePreview}
                alt="Profile preview"
                sx={{
                  maxWidth: "100%",
                  maxHeight: 160,
                  borderRadius: "50%",
                  objectFit: "cover",
                  width: 120,
                  height: 120,
                }}
              />
            ) : (
              <>
                <Typography variant="subtitle1" fontWeight={700}>
                  Drag an image here
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  PNG, JPG, or WEBP up to 2MB
                </Typography>
              </>
            )}
            <input
              id="profile-image-input"
              hidden
              accept="image/*"
              type="file"
              onChange={(event) =>
                handleFileChange(event.target.files?.[0])
              }
            />
          </DropZone>
          <Button
            variant="outlined"
            component="label"
            sx={{
              borderRadius: 2,
              textTransform: "none",
              fontWeight: 600,
            }}
          >
            {file ? file.name : "Choose image file"}
            <input
              hidden
              accept="image/*"
              type="file"
              onChange={(event) =>
                handleFileChange(event.target.files?.[0])
              }
            />
          </Button>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button
          onClick={handleClose}
          disabled={isSubmitting}
          color="inherit"
          sx={{ textTransform: "none", color: "text.secondary" }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={isSubmitting || !file}
          sx={{
            borderRadius: 1.5,
            px: 2.5,
            textTransform: "none",
            fontWeight: 700,
            color: "#fff",
            backgroundColor: "#ef3340",
            boxShadow: "0 2px 10px rgba(239, 51, 64, 0.3)",
            "&:hover": { backgroundColor: "#d62835" },
          }}
        >
          {isSubmitting && (
            <CircularProgress size={18} color="inherit" sx={{ mr: 1 }} />
          )}
          {isSubmitting ? "Uploading..." : "Save Image"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
