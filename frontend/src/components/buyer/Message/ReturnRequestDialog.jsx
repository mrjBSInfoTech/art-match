import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  DialogActions,
  DialogContent,
  FormControlLabel,
  FormHelperText,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import MessageDialog from "./MessageDialog.jsx";
import AssignmentReturnOutlinedIcon from "@mui/icons-material/AssignmentReturnOutlined";
import PhotoCameraOutlinedIcon from "@mui/icons-material/PhotoCameraOutlined";
import CloseIcon from "@mui/icons-material/Close";
import { createReturnRequest } from "../../../api/buyer/returnAPI.js";

const reasons = [
  "Damaged artwork",
  "Wrong artwork received",
  "Artwork not as described",
  "Missing item / component",
  "Shipping damage",
  "Other",
];

const MAX_PHOTOS = 5;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const photoTypes = ["image/jpeg", "image/png", "image/webp"];

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleString("en-PH", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Unavailable";

export default function ReturnRequestDialog({ order, onClose, onSubmitted }) {
  const eligibleItems = (order?.items || []).filter(
    (item) => item.returnEligible,
  );
  const [selectedIds, setSelectedIds] = useState(() =>
    eligibleItems.length === 1 ? [eligibleItems[0].id] : [],
  );
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [photos, setPhotos] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const submitting = useRef(false);
  const trimmedDetails = details.trim();
  const valid = Boolean(
    order?.returnEligible &&
      selectedIds.length &&
      reasons.includes(reason) &&
      trimmedDetails.length >= 10 &&
      trimmedDetails.length <= 1000,
  );

  useEffect(() => {
    const previews = photos.map((file) => URL.createObjectURL(file));
    setPhotoPreviews(previews);
    return () => previews.forEach((preview) => URL.revokeObjectURL(preview));
  }, [photos]);

  const handlePhotoSelection = (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;
    if (photos.length + files.length > MAX_PHOTOS) {
      setError(`Choose no more than ${MAX_PHOTOS} photos in total.`);
      return;
    }
    if (files.some((file) => !photoTypes.includes(file.type))) {
      setError("Photos must be JPEG, PNG, or WebP images.");
      return;
    }
    if (files.some((file) => file.size > MAX_PHOTO_BYTES)) {
      setError("Each photo must be 5 MB or smaller.");
      return;
    }
    setError("");
    setPhotos((current) => [...current, ...files]);
  };

  const removePhoto = (index) =>
    setPhotos((current) => current.filter((_, position) => position !== index));

  const submit = async () => {
    if (!valid || submitting.current) return;
    submitting.current = true;
    setSaving(true);
    setError("");
    try {
      const payload = {
        order_id: order.orderId,
        order_item_ids: selectedIds,
        reason,
        details: trimmedDetails,
      };
      let body = payload;
      if (photos.length) {
        // Multipart only when photos are attached; plain JSON otherwise.
        body = new FormData();
        body.append("order_id", String(payload.order_id));
        body.append("order_item_ids", JSON.stringify(payload.order_item_ids));
        body.append("reason", payload.reason);
        body.append("details", payload.details);
        photos.forEach((file) => body.append("evidence_photos", file));
      }
      const result = await createReturnRequest(body);
      onSubmitted(result);
    } catch (submitError) {
      setError(submitError.message || "Unable to submit your return request");
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  };

  return (
    <MessageDialog
      open={Boolean(order)}
      onClose={onClose}
      busy={saving}
      title="Request a Return"
      titleId="return-request-title"
      icon={
        <AssignmentReturnOutlinedIcon sx={{ color: "#ef3340", fontSize: 20 }} />
      }
    >
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <Box>
            <Typography fontWeight={700}>{order?.id}</Typography>
            <Typography variant="body2" color="text.secondary">
              Delivered {formatDate(order?.deliveredAt)}. Submit your request by{" "}
              {formatDate(order?.returnDeadline)}.
            </Typography>
          </Box>
          <Alert severity="info">
            You can request a return within 7 days of delivery. Continue with
            the seller in Messages after submitting.
          </Alert>
          <Box
            component="fieldset"
            sx={{
              m: 0,
              p: 1.5,
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2,
            }}
          >
            <Typography
              component="legend"
              variant="body2"
              fontWeight={700}
              sx={{ px: 0.5 }}
            >
              Select the items to return
            </Typography>
            <Stack>
              {eligibleItems.map((item) => (
                <FormControlLabel
                  key={item.id}
                  control={
                    <Checkbox
                      checked={selectedIds.includes(item.id)}
                      disabled={saving}
                      onChange={(_, checked) =>
                        setSelectedIds((current) =>
                          checked
                            ? [...current, item.id]
                            : current.filter((id) => id !== item.id),
                        )
                      }
                    />
                  }
                  label={`${item.title} (Qty ${item.qty})`}
                />
              ))}
            </Stack>
            {!eligibleItems.length && (
              <Typography variant="body2" color="text.secondary">
                No items are currently eligible for a new request.
              </Typography>
            )}
          </Box>
          <TextField
            select
            required
            fullWidth
            label="Reason for return"
            value={reason}
            disabled={saving}
            onChange={(event) => setReason(event.target.value)}
          >
            {reasons.map((value) => (
              <MenuItem key={value} value={value}>
                {value}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            required
            fullWidth
            multiline
            minRows={4}
            label="Describe the issue"
            value={details}
            disabled={saving}
            onChange={(event) => setDetails(event.target.value)}
            inputProps={{ maxLength: 1000 }}
            helperText={`${trimmedDetails.length}/1000 characters. Include at least 10 characters.`}
          />
          <Box
            sx={{
              p: 1.5,
              border: "1px dashed",
              borderColor: "divider",
              borderRadius: 2,
              bgcolor: "action.hover",
            }}
          >
            <Stack spacing={1.25}>
              <Typography variant="body2" fontWeight={700}>
                Photos of the issue (optional)
              </Typography>
              {photoPreviews.length > 0 && (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.25, pt: 0.5 }}>
                  {photoPreviews.map((preview, index) => (
                    <Box key={preview} sx={{ position: "relative" }}>
                      <Box
                        component="img"
                        src={preview}
                        alt={`Return photo ${index + 1}`}
                        sx={{
                          width: 76,
                          height: 76,
                          objectFit: "cover",
                          borderRadius: 1.5,
                          border: "1px solid",
                          borderColor: "divider",
                          display: "block",
                        }}
                      />
                      <IconButton
                        size="small"
                        aria-label={`Remove return photo ${index + 1}`}
                        disabled={saving}
                        onClick={() => removePhoto(index)}
                        sx={{
                          position: "absolute",
                          top: -8,
                          right: -8,
                          width: 22,
                          height: 22,
                          bgcolor: "background.paper",
                          border: "1px solid",
                          borderColor: "divider",
                          "&:hover": { bgcolor: "background.paper" },
                        }}
                      >
                        <CloseIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Box>
                  ))}
                </Box>
              )}
              <Button
                component="label"
                variant="outlined"
                startIcon={<PhotoCameraOutlinedIcon />}
                disabled={saving || photos.length >= MAX_PHOTOS}
                sx={{ textTransform: "none", alignSelf: "flex-start" }}
              >
                {photos.length ? "Add more photos" : "Upload photos"}
                <input
                  hidden
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handlePhotoSelection}
                />
              </Button>
              <FormHelperText sx={{ mt: 0 }}>
                {photos.length} of {MAX_PHOTOS} photos selected. JPEG, PNG, or WebP, up to 5 MB each.
              </FormHelperText>
            </Stack>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="text.secondary" disabled={saving}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={submit}
          disabled={!valid || saving}
        >
          {saving ? "Submitting..." : "Submit return request"}
        </Button>
      </DialogActions>
    </MessageDialog>
  );
}
