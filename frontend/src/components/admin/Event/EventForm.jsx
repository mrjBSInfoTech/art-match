import React, { useEffect, useState, useRef } from "react";

import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Slide,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import { styled, useTheme } from "@mui/material/styles";

import CloseIcon from "@mui/icons-material/Close";
import EventOutlinedIcon from "@mui/icons-material/EventOutlined";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";

const createEmptyEventForm = () => ({
  title: "",
  description: "",
  location: "",
  start_at: "",
  end_at: "",
  status: "Draft",

  image_key: "",
  image_url: "",

  file: null,
});

const formatDateTimeInput = (value) => {
  if (!value) return "";

  const stringValue = String(value);

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(stringValue)) {
    return stringValue.slice(0, 16);
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const pad = (number) => String(number).padStart(2, "0");

  return [
    date.getFullYear(),
    "-",
    pad(date.getMonth() + 1),
    "-",
    pad(date.getDate()),
    "T",
    pad(date.getHours()),
    ":",
    pad(date.getMinutes()),
  ].join("");
};

const DropZone = styled(Box, {
  shouldForwardProp: (prop) => prop !== "isDragActive" && prop !== "hasError",
})(({ theme, isDragActive, hasError }) => ({
  width: "100%",
  minHeight: 200,
  border: `2px dashed ${
    hasError
      ? theme.palette.error.main
      : isDragActive
        ? theme.palette.primary.main
        : theme.palette.divider
  }`,
  borderRadius: theme.shape.borderRadius,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: theme.spacing(3),
  cursor: "pointer",
  backgroundColor: isDragActive ? theme.palette.action.hover : "transparent",
  transition: "all 0.3s ease-in-out",
  overflow: "hidden",
  "&:hover": {
    backgroundColor: theme.palette.action.hover,
  },
}));

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

export default function EventForm({
  open,
  handleClose,
  onSubmit,
  selectedEvent = null,
}) {
  const theme = useTheme();
  const submitting = useRef(false);
  const [formData, setFormData] = useState(createEmptyEventForm);
  const [imagePreview, setImagePreview] = useState(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setError("");
    setUploadError("");

    if (selectedEvent) {
      setFormData({
        title: selectedEvent.title || "",

        description: selectedEvent.description || "",

        location: selectedEvent.location || "",

        start_at: formatDateTimeInput(selectedEvent.start_at),

        end_at: formatDateTimeInput(selectedEvent.end_at),

        status: selectedEvent.status || "Draft",

        image_key: selectedEvent.image_key || "",

        image_url: selectedEvent.image_url || "",

        file: null,
      });

      setImagePreview(selectedEvent.image_url || null);
    } else {
      setFormData(createEmptyEventForm());

      setImagePreview(null);
    }
  }, [open, selectedEvent]);

  useEffect(() => {
    return () => {
      if (imagePreview?.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const applyFile = (file) => {
    setUploadError("");

    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setUploadError("Please select a JPEG, PNG, or WebP image.");

      return;
    }

    const maxSize = 5 * 1024 * 1024;

    if (file.size > maxSize) {
      setUploadError("Event image must be 5MB or smaller.");

      return;
    }

    if (imagePreview?.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }

    const preview = URL.createObjectURL(file);

    setImagePreview(preview);

    setFormData((current) => ({
      ...current,
      file,
    }));
  };

  const handleFileChange = (event) => {
    applyFile(event.target.files?.[0]);

    event.target.value = "";
  };

  const handleSubmit = async () => {
    if (submitting.current) return;
    setError("");

    const title = formData.title.trim();

    const description = formData.description.trim();

    if (!title || title.length > 200) {
      setError("Event title is required and must be 200 characters or fewer.");

      return;
    }

    if (!description) {
      setError("Event description is required.");

      return;
    }

    if (!formData.start_at) {
      setError("Event start date and time are required.");

      return;
    }

    if (
      formData.end_at &&
      new Date(formData.end_at) < new Date(formData.start_at)
    ) {
      setError("Event end date cannot be before the start date.");

      return;
    }

    if (!selectedEvent && !formData.file) {
      setUploadError("Please upload an event image.");

      return;
    }

    try {
      submitting.current = true;
      setIsSubmitting(true);

      await onSubmit({
        ...formData,

        title,
        description,

        location: formData.location.trim(),
      });
    } catch (submitError) {
      setError(submitError.message || "Unable to save event.");
    } finally {
      submitting.current = false;
      setIsSubmitting(false);
    }
  };

  const uploadReminder =
    "For the best fit, use a landscape image so it fills the event banner without heavy cropping. Upload a clear JPEG, PNG, or WebP image up to 5MB.";

  return (
    <Dialog
      open={open}
      onClose={isSubmitting ? undefined : handleClose}
      TransitionComponent={Transition}
      fullWidth
      maxWidth={false}
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
        <EventOutlinedIcon sx={{ color: "#ef3340", fontSize: 20 }} />

        {selectedEvent ? "Edit Event" : "Add Event"}

        <Button
          aria-label="Close event form"
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

      <DialogContent
        dividers
        sx={{ p: 2.5, backgroundColor: theme.palette.background.paper }}
      >
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {uploadError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {uploadError}
          </Alert>
        )}

        <Stack spacing={2.5}>
          <DropZone
            isDragActive={isDragActive}
            hasError={Boolean(uploadError)}
            onDragEnter={() => setIsDragActive(true)}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) {
                setIsDragActive(false);
              }
            }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();

              setIsDragActive(false);

              applyFile(event.dataTransfer.files?.[0]);
            }}
          >
            {imagePreview ? (
              <Box
                component="img"
                src={imagePreview}
                alt="Event preview"
                sx={{
                  width: "100%",
                  height: 160,
                  maxWidth: "100%",
                  objectFit: "contain",
                  borderRadius: 2,
                }}
              />
            ) : (
              <>
                <CloudUploadOutlinedIcon
                  sx={{
                    fontSize: 42,
                    mb: 1,
                    color: "text.secondary",
                  }}
                />

                <Typography fontWeight={700}>Upload event image</Typography>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  textAlign="center"
                >
                  Drag and drop an image here, or use the button below.
                </Typography>
              </>
            )}
          </DropZone>

          <Button
            component="label"
            variant="outlined"
            sx={{ width: "100%" }}
          >
            Choose file
            <input
              hidden
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleFileChange}
            />
          </Button>

          {uploadReminder && (
            <Alert severity="info" aria-live="polite">
              <Typography component="span" fontWeight={700}>
                Image reminder:{" "}
              </Typography>
              {uploadReminder}
            </Alert>
          )}

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "minmax(0, 1fr)",
                sm: "repeat(2, minmax(0, 1fr))",
              },
              alignItems: "start",
              "& > *": { minWidth: 0 },
              gap: 2,
            }}
          >
            <TextField
              label="Event title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              fullWidth
              required
              sx={{ gridColumn: "1 / -1" }}
            />

            <TextField
              label="Description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              fullWidth
              required
              multiline
              minRows={4}
              sx={{ gridColumn: "1 / -1" }}
            />

            <TextField
              label="Location"
              name="location"
              value={formData.location}
              onChange={handleChange}
              fullWidth
              placeholder="Example: University Art Gallery"
              sx={{ gridColumn: "1 / -1" }}
            />

            <TextField
              label="Starts"
              name="start_at"
              type="datetime-local"
              value={formData.start_at}
              onChange={handleChange}
              fullWidth
              required
              InputLabelProps={{
                shrink: true,
              }}
            />

            <TextField
              label="Ends"
              name="end_at"
              type="datetime-local"
              value={formData.end_at}
              onChange={handleChange}
              fullWidth
              InputLabelProps={{
                shrink: true,
              }}
            />

            <FormControl fullWidth sx={{ gridColumn: "1 / -1" }}>
              <InputLabel>Status</InputLabel>

              <Select
                name="status"
                label="Status"
                value={formData.status}
                onChange={handleChange}
              >
                <MenuItem value="Draft">Draft</MenuItem>

                <MenuItem value="Published">Published</MenuItem>

                <MenuItem value="Archived">Archived</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions
        sx={{
          px: 2.5,
          py: 1.5,
          gap: 1,
          borderTop: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Button
          onClick={handleClose}
          disabled={isSubmitting}
          sx={{
            color: theme.palette.text.secondary,
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          Cancel
        </Button>

        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={isSubmitting}
          sx={{
            borderRadius: 1.5,
            px: 2.5,
            textTransform: "none",
            fontWeight: 700,
            color: "#fff",
            backgroundColor: "error.main",
            "&:hover": { backgroundColor: "error.dark" },
          }}
          startIcon={
            isSubmitting ? <CircularProgress size={16} color="inherit" /> : null
          }
        >
          {isSubmitting
            ? "Saving..."
            : selectedEvent
              ? "Save Changes"
              : "Create Event"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
