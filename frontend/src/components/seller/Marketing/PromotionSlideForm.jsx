import React, { useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Slide,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { styled, useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import ViewCarouselOutlinedIcon from "@mui/icons-material/ViewCarouselOutlined";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";

const DropZone = styled(Box, {
  shouldForwardProp: (prop) => prop !== "isDragActive" && prop !== "hasError",
})(({ theme, isDragActive, hasError }) => ({
  width: "100%",
  minHeight: 180,
  border: `2px dashed ${
    hasError
      ? theme.palette.error.main
      : isDragActive
        ? theme.palette.error.main
        : theme.palette.divider
  }`,
  borderRadius: theme.shape.borderRadius,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: theme.spacing(2.5),
  cursor: "pointer",
  backgroundColor: isDragActive ? theme.palette.action.hover : "transparent",
  transition: "background-color 180ms ease, border-color 180ms ease",
  overflow: "hidden",
  "&:hover": { backgroundColor: theme.palette.action.hover },
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

export default function PromotionSlideForm({
  open,
  onClose,
  onSubmit,
  selectedSlide,
  form,
  setForm,
  preview,
  formError,
  saving,
  onImageChange,
}) {
  const theme = useTheme();
  const fileInputRef = useRef(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const isEditing = Boolean(selectedSlide);

  const handleChange = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleFiles = (files) => {
    const file = files?.[0];
    if (file) onImageChange(file);
  };

  return (
    <Dialog
      open={open}
      onClose={saving ? undefined : onClose}
      TransitionComponent={Transition}
      keepMounted
      fullWidth
      maxWidth={false}
      PaperProps={{
        sx: {
          width: "min(100% - 24px, 490px)",
          maxWidth: "490px",
          maxHeight: "calc(100% - 32px)",
          display: "flex",
          flexDirection: "column",
          borderRadius: 3,
          overflow: "hidden",
          backgroundColor: theme.palette.background.paper,
        },
      }}
      aria-labelledby="seller-promotion-slide-form-title"
    >
      <DialogTitle
        id="seller-promotion-slide-form-title"
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
        <ViewCarouselOutlinedIcon sx={{ color: theme.palette.error.main, fontSize: 20 }} />
        {isEditing ? "Edit Promotion Slide" : "Add Promotion Slide"}
        <Button
          type="button"
          aria-label="Close promotion slide dialog"
          onClick={onClose}
          disabled={saving}
          sx={{
            minWidth: 44,
            width: 44,
            height: 44,
            ml: "auto",
            p: 0,
            color: theme.palette.text.secondary,
          }}
        >
          <CloseIcon sx={{ fontSize: 18 }} />
        </Button>
      </DialogTitle>

      <Box
        component="form"
        onSubmit={onSubmit}
        sx={{ display: "flex", flexDirection: "column", minHeight: 0 }}
      >
        <DialogContent
          dividers
          sx={{ p: { xs: 2, sm: 2.5 }, minHeight: 0, overflowY: "auto" }}
        >
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}

          <Stack spacing={2.25}>
            <TextField
              label="Headline"
              value={form.title}
              onChange={handleChange("title")}
              required
              fullWidth
              size="small"
              inputProps={{ maxLength: 200 }}
              placeholder="e.g., Annual Fine Arts Gala"
              disabled={saving}
            />
            <TextField
              label="Description"
              value={form.description}
              onChange={handleChange("description")}
              multiline
              minRows={3}
              fullWidth
              size="small"
              placeholder="Provide context or a brief overview for buyers..."
              disabled={saving}
            />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <TextField
                label="Button label (optional)"
                value={form.button_label}
                onChange={handleChange("button_label")}
                fullWidth
                size="small"
                inputProps={{ maxLength: 60 }}
                placeholder="e.g., Explore Exhibition"
                disabled={saving}
              />
              <TextField
                label="Button link (optional)"
                value={form.button_url}
                onChange={handleChange("button_url")}
                fullWidth
                size="small"
                placeholder="/buyer/shop"
                disabled={saving}
              />
            </Stack>

            <Box>
              <Typography
                variant="caption"
                fontWeight={700}
                color="text.secondary"
                sx={{ display: "block", mb: 0.75 }}
              >
                Slide Cover Image
              </Typography>
              <input
                ref={fileInputRef}
                hidden
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => {
                  handleFiles(event.target.files);
                  event.target.value = "";
                }}
              />
              <DropZone
                role="button"
                tabIndex={saving ? -1 : 0}
                aria-label={isEditing ? "Replace slide cover image" : "Upload promotion cover image"}
                aria-disabled={saving}
                isDragActive={isDragActive}
                hasError={Boolean(formError)}
                onClick={() => !saving && fileInputRef.current?.click()}
                onKeyDown={(event) => {
                  if (saving || !["Enter", " "].includes(event.key)) return;
                  event.preventDefault();
                  fileInputRef.current?.click();
                }}
                onDragEnter={(event) => {
                  event.preventDefault();
                  if (!saving) setIsDragActive(true);
                }}
                onDragLeave={(event) => {
                  event.preventDefault();
                  setIsDragActive(false);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  setIsDragActive(false);
                  if (!saving) handleFiles(event.dataTransfer.files);
                }}
                onDragOver={(event) => event.preventDefault()}
              >
                {preview ? (
                  <Box sx={{ width: "100%", textAlign: "center" }}>
                    <Box
                      component="img"
                      src={preview}
                      alt="Slide preview"
                      sx={{
                        width: "100%",
                        maxHeight: 180,
                        objectFit: "cover",
                        borderRadius: 1.5,
                        mb: 1.25,
                        border: `1px solid ${theme.palette.divider}`,
                      }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      Click or drop a file to replace the image.
                    </Typography>
                  </Box>
                ) : (
                  <>
                    <CloudUploadOutlinedIcon
                      sx={{ fontSize: 36, color: "text.secondary", mb: 0.75 }}
                    />
                    <Typography variant="body2" fontWeight={700}>
                      Upload promotion cover image
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      align="center"
                      sx={{ mt: 0.5 }}
                    >
                      PNG, JPG, or WEBP up to 5MB. Recommended landscape 16:9 ratio.
                    </Typography>
                  </>
                )}
              </DropZone>
              <Button
                type="button"
                fullWidth
                variant="outlined"
                disabled={saving}
                onClick={() => fileInputRef.current?.click()}
                sx={{
                  mt: 1.5,
                  minHeight: 48,
                  borderRadius: 1,
                  textTransform: "none",
                  fontWeight: 700,
                }}
              >
                Choose file
              </Button>
              {formError && (
                <Typography
                  variant="caption"
                  color="error.main"
                  sx={{ mt: 0.5, display: "block" }}
                >
                  {formError}
                </Typography>
              )}
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 2.5, py: 1.75, flexShrink: 0 }}>
          <Button onClick={onClose} disabled={saving} color="inherit">
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={saving}
            sx={{
              fontWeight: 700,
              textTransform: "none",
              borderRadius: 2,
              px: 2.5,
              bgcolor: theme.palette.error.main,
              color: "#fff",
              "&:hover": { bgcolor: theme.palette.error.dark },
            }}
          >
            {saving ? "Saving..." : isEditing ? "Save Changes" : "Create Slide"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
