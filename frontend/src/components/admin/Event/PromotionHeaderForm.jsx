import React, { useState, useEffect } from "react";
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
  TextField,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import CampaignOutlinedIcon from "@mui/icons-material/CampaignOutlined";

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

export default function PromotionHeaderForm({
  open,
  onClose,
  onSubmit,
  initialData = { message: "", button_label: "", button_url: "" },
  saving = false,
}) {
  const theme = useTheme();
  const [formData, setFormData] = useState(initialData);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setFormData({
        message: initialData?.message || "",
        button_label: initialData?.button_label || "",
        button_url: initialData?.button_url || "",
      });
      setError("");
    }
  }, [open, initialData]);

  const handleChange = (field) => (event) => {
    setFormData((prev) => ({ ...prev, [field]: event.target.value }));
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const message = formData.message.trim();
    const button_label = formData.button_label.trim();
    const button_url = formData.button_url.trim();

    if (!message) {
      setError("Announcement message is required.");
      return;
    }
    if (!button_label) {
      setError("Button label is required.");
      return;
    }
    if (!button_url) {
      setError("Button destination URL is required.");
      return;
    }

    try {
      await onSubmit({ message, button_label, button_url });
    } catch (err) {
      setError(err.message || "Unable to save promotion header.");
    }
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
          width: "min(100% - 24px, 520px)",
          maxWidth: "520px",
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
        <CampaignOutlinedIcon sx={{ color: "#ef3340", fontSize: 20 }} />
        Edit Promo Header
        <Button
          aria-label="Close promo header form"
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

      <DialogContent dividers sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Stack spacing={2.5}>
          {/* Live Preview Box */}
          <Box>
            <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: "block", mb: 0.75, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Live Strip Preview
            </Typography>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1.5,
                px: 2,
                py: 1.25,
                borderRadius: 2,
                bgcolor: "#ef3340",
                color: "#fff",
                boxShadow: "0 2px 8px rgba(239, 51, 64, 0.25)",
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 600,
                  fontSize: 13,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {formData.message || "Your announcement message will appear here..."}
              </Typography>
              <Button
                type="button"
                size="small"
                sx={{
                  color: "#fff",
                  bgcolor: "rgba(255, 255, 255, 0.2)",
                  textTransform: "none",
                  fontWeight: 700,
                  fontSize: 12,
                  px: 1.5,
                  py: 0.25,
                  borderRadius: 1.5,
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  "&:hover": {
                    bgcolor: "rgba(255, 255, 255, 0.3)",
                  },
                }}
                endIcon={<span aria-hidden="true">›</span>}
              >
                {formData.button_label || "Action"}
              </Button>
            </Box>
          </Box>

          <TextField
            label="Announcement Message"
            name="message"
            value={formData.message}
            onChange={handleChange("message")}
            required
            fullWidth
            multiline
            minRows={2}
            maxRows={4}
            inputProps={{ maxLength: 200 }}
            helperText={`${formData.message.length}/200 characters • Shown prominently above buyer navigation.`}
            disabled={saving}
          />

          <TextField
            label="Button Label"
            name="button_label"
            value={formData.button_label}
            onChange={handleChange("button_label")}
            required
            fullWidth
            inputProps={{ maxLength: 60 }}
            helperText="Text shown on the action button (e.g. 'Shop Now', 'Explore Exhibitions')."
            disabled={saving}
          />

          <TextField
            label="Button Destination URL"
            name="button_url"
            value={formData.button_url}
            onChange={handleChange("button_url")}
            required
            fullWidth
            placeholder="/buyer/shop"
            helperText="Enter internal path (e.g. /buyer/shop, /buyer/exhibitions) or external link."
            disabled={saving}
          />
        </Stack>
      </DialogContent>

      {error && (
        <Box sx={{ px: 2.5, pt: 1.5 }}>
          <Alert severity="error">{error}</Alert>
        </Box>
      )}

      <DialogActions sx={{ px: 2.5, py: 1.75, borderTop: `1px solid ${theme.palette.divider}` }}>
        <Button onClick={onClose} disabled={saving} sx={{ color: "text.secondary", textTransform: "none", fontWeight: 600 }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          sx={{
            borderRadius: 1.5,
            px: 2.5,
            textTransform: "none",
            fontWeight: 700,
            bgcolor: "#ef3340",
            color: "#fff",
            "&:hover": {
              bgcolor: "#d6202e",
            },
          }}
        >
          {saving && <CircularProgress size={16} color="inherit" sx={{ mr: 1 }} />}
          {saving ? "Saving..." : "Save Header"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

