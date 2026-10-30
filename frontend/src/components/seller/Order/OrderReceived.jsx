import React from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormHelperText,
  Slide,
  Stack,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import PhotoCameraOutlinedIcon from "@mui/icons-material/PhotoCameraOutlined";

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

export default function OrderReceived({
  open,
  order,
  statusError,
  setStatusError,
  receivedPhotos = [],
  setReceivedPhotos,
  photoPreviews = [],
  saving,
  onClose,
  onSubmit,
}) {
  const theme = useTheme();

  const handlePhotoSelection = (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;
    if (receivedPhotos.length + files.length > 5) {
      setStatusError("Choose no more than 5 received-item photos in total.");
      return;
    }
    const invalidFiles = files.filter(
      (file) => !["image/jpeg", "image/png", "image/webp"].includes(file.type),
    );
    if (invalidFiles.length) {
      setStatusError("Received photos must be JPEG, PNG, or WebP images.");
      return;
    }
    const oversizedFiles = files.filter((file) => file.size > 5 * 1024 * 1024);
    if (oversizedFiles.length) {
      setStatusError("Each photo must be 5 MB or smaller.");
      return;
    }
    setStatusError("");
    setReceivedPhotos((current) => [...current, ...files]);
  };

  return (
    <Dialog
      open={open}
      onClose={() => !saving && onClose()}
      TransitionComponent={Transition}
      keepMounted
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
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
        <PhotoCameraOutlinedIcon sx={{ color: "success.main", fontSize: 20 }} />
        Order Received
        <Button
          aria-label="Close received order dialog"
          onClick={onClose}
          disabled={saving}
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
        <Stack spacing={2.5}>
          {statusError && <Alert severity="error">{statusError}</Alert>}

          <Typography variant="body2" color="text.secondary">
            Confirm receipt of this order and upload up to 5 photos showing the delivered item.
            These images help document the buyer&apos;s delivery confirmation.
          </Typography>

          <Box
            sx={{
              p: 2,
              border: "1px dashed",
              borderColor: theme.palette.divider,
              borderRadius: 2,
              backgroundColor: theme.palette.action.hover,
            }}
          >
            <Stack spacing={1.5}>
              <Typography variant="subtitle2" fontWeight={700}>
                Delivery photos
              </Typography>

              {photoPreviews.length > 0 && (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                  {photoPreviews.map((preview, index) => (
                    <Box
                      key={preview}
                      component="img"
                      src={preview}
                      alt={`Delivery photo ${index + 1}`}
                      sx={{
                        width: 88,
                        height: 88,
                        objectFit: "cover",
                        borderRadius: 1.5,
                        border: "1px solid",
                        borderColor: theme.palette.divider,
                      }}
                    />
                  ))}
                </Box>
              )}

              <Button
                component="label"
                variant="outlined"
                disabled={saving || receivedPhotos.length >= 5}
                fullWidth
                sx={{ textTransform: "none", alignSelf: "flex-start" }}
              >
                {receivedPhotos.length ? "Add more delivery photos" : "Choose delivery photos"}
                <input
                  hidden
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handlePhotoSelection}
                />
              </Button>

              <FormHelperText sx={{ mt: 0 }}>
                {receivedPhotos.length} of 5 photos selected. Accepted: JPEG, PNG, or WebP.
                Each file must be 5 MB or smaller.
              </FormHelperText>
            </Stack>
          </Box>

          {order && (
            <Typography variant="body2" color="text.secondary">
              Marking this order as received for <strong>{order.orderNumber || order.id || "this order"}</strong>.
            </Typography>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={saving} sx={{ color: "text.secondary" }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="success"
          onClick={onSubmit}
          disabled={saving}
          sx={{ color: "#fff", textTransform: "none" }}
        >
          {saving ? "Saving..." : "Confirm Received"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
