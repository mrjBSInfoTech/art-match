import React from "react";
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
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import CampaignOutlinedIcon from "@mui/icons-material/CampaignOutlined";
import PublishOutlinedIcon from "@mui/icons-material/PublishOutlined";
import PromotionHeaderPreview from "../../common/PromotionHeaderPreview";

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
  form,
  setForm,
  error,
  setError,
  saving,
}) {
  const theme = useTheme();

  const handleChange = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    setError("");
  };

  return (
    <Dialog
      open={open}
      onClose={saving ? undefined : onClose}
      TransitionComponent={Transition}
      keepMounted
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          width: "min(100% - 24px, 520px)",
          maxWidth: "520px",
          maxHeight: "calc(100% - 32px)",
          borderRadius: 3,
          overflow: "hidden",
          backgroundColor: theme.palette.background.paper,
        },
      }}
      aria-labelledby="seller-promo-header-form-title"
    >
      <Box
        component="form"
        onSubmit={onSubmit}
        sx={{ display: "flex", flexDirection: "column", minHeight: 0 }}
      >
        <DialogTitle
          id="seller-promo-header-form-title"
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
        >s
          <CampaignOutlinedIcon
            sx={{ color: theme.palette.error.main, fontSize: 20 }}
          />
          Compose your announcement
          <Button
            type="button"
            aria-label="Close promo header request form"
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

        <DialogContent
          dividers
          sx={{ p: { xs: 2, sm: 2.5 }, minHeight: 0, overflowY: "auto" }}
        >
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            <Box>
              <PromotionHeaderPreview
                message={form.message}
                buttonLabel={form.button_label}
              />
              <Alert severity="info" sx={{ mt: 1 }}>
                Your custom promo header goes live after admin approval.
              </Alert>
            </Box>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              label="Announcement message"
              value={form.message}
              onChange={handleChange("message")}
              required
              fullWidth
              multiline
              minRows={2}
              maxRows={4}
              inputProps={{ maxLength: 200 }}
              helperText={`${form.message.length}/200 characters • Shown prominently above buyer navigation.`}
              disabled={saving}
            />
            <TextField
              label="Button label"
              value={form.button_label}
              onChange={handleChange("button_label")}
              required
              fullWidth
              inputProps={{ maxLength: 60 }}
              helperText="Text shown on the buyer call-to-action button."
              disabled={saving}
            />
            <TextField
              label="Button destination"
              value={form.button_url}
              onChange={handleChange("button_url")}
              required
              fullWidth
              placeholder="/buyer/shop"
              helperText="Enter a site path, such as /buyer/shop."
              disabled={saving}
            />
          </Stack>
        </DialogContent>

        <DialogActions
          sx={{
            px: 2.5,
            py: 1.5,
            borderTop: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Button
            type="button"
            onClick={onClose}
            disabled={saving}
            sx={{ minHeight: 44, color: theme.palette.text.secondary }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={saving}
            startIcon={
              saving ? (
                <CircularProgress size={18} color="inherit" />
              ) : (
                <PublishOutlinedIcon />
              )
            }
            sx={{
              minHeight: 44,
              borderRadius: 1.5,
              px: 2.5,
              textTransform: "none",
              fontWeight: 700,
              color: "#fff",
              backgroundColor: theme.palette.error.main,
              "&:hover": { backgroundColor: theme.palette.error.dark },
            }}
          >
            {saving ? "Requesting..." : "Request"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
