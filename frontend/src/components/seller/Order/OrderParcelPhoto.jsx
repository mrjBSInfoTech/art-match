import React from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  FormGroup,
  FormHelperText,
  Slide,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";

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

export default function OrderParcelPhoto({
  open,
  fulfillmentTarget,
  statusError,
  parcelPhotos,
  setParcelPhotos,
  photoPreviews,
  handlingOptions,
  trackingUrl,
  setTrackingUrl,
  handlingInstructions,
  setHandlingInstructions,
  saving,
  onClose,
  onSubmit,
}) {
  const theme = useTheme();
  const isPacked = fulfillmentTarget?.status === "Packed";

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
        <LocalShippingOutlinedIcon sx={{ color: "error.main", fontSize: 20 }} />
        {isPacked ? "Add parcel photos" : "Add tracking link"}
        <Button
          aria-label="Close fulfillment dialog"
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

          {isPacked ? (
            <>
              <Typography variant="body2" color="text.secondary">
                Upload 1 to 5 clear photos of the packed parcel. The buyer will
                be able to inspect them in Notifications.
              </Typography>

              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                  Parcel handling warnings (optional)
                </Typography>
                <FormGroup>
                  {handlingOptions.map((option) => (
                    <FormControlLabel
                      key={option.value}
                      control={
                        <Checkbox
                          checked={handlingInstructions.includes(option.value)}
                          onChange={(event) =>
                            setHandlingInstructions((current) =>
                              event.target.checked
                                ? [...current, option.value]
                                : current.filter((value) => value !== option.value),
                            )
                          }
                          disabled={saving}
                        />
                      }
                      label={option.label}
                    />
                  ))}
                </FormGroup>
                <FormHelperText>
                  Selected warnings are saved with the packed order and appear
                  on its printable parcel label.
                </FormHelperText>
              </Box>

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
                    Parcel photos
                  </Typography>
                  {photoPreviews.length > 0 && (
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                      {photoPreviews.map((preview, index) => (
                        <Box
                          key={preview}
                          component="img"
                          src={preview}
                          alt={`Parcel photo ${index + 1}`}
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
                    disabled={saving}
                    fullWidth
                    sx={{ textTransform: "none", alignSelf: "flex-start" }}
                  >
                    Choose parcel photos
                    <input
                      hidden
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      onChange={(event) =>
                        setParcelPhotos(Array.from(event.target.files || []))
                      }
                    />
                  </Button>
                  <FormHelperText sx={{ mt: 0 }}>
                    {parcelPhotos.length} of 1–5 photos selected (JPEG, PNG, or
                    WebP; maximum 5 MB each)
                  </FormHelperText>
                </Stack>
              </Box>
            </>
          ) : (
            <>
              <Typography variant="body2" color="text.secondary">
                Add the carrier tracking URL if one is available. This is
                optional and will be shown to the buyer in Notifications.
              </Typography>
              <TextField
                label="Tracking link (optional)"
                placeholder="https://..."
                value={trackingUrl}
                onChange={(event) => setTrackingUrl(event.target.value)}
                inputProps={{ maxLength: 2048 }}
                fullWidth
              />
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={saving} sx={{ color: "text.secondary" }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={onSubmit}
          disabled={saving}
          sx={{ color: "#fff", textTransform: "none" }}
        >
          {saving ? "Saving..." : `Mark ${fulfillmentTarget?.status}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}