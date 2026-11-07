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
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Slide,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
// Icons
import CloseIcon from "@mui/icons-material/Close";
import CampaignOutlinedIcon from "@mui/icons-material/CampaignOutlined";
import { dispatchBreachNotification } from "../../../api/admin/systemSettingsAPI";

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

export default function DispatchAlert({
  open,
  handleClose,
  onSubmit,
  onSuccess,
}) {
  const theme = useTheme();

  const [audience, setAudience] = useState("all");
  const [summary, setSummary] = useState("");
  const [protectiveSteps, setProtectiveSteps] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setAudience("all");
    setSummary("");
    setProtectiveSteps("");
    setError("");
    setIsSubmitting(false);
  }, [open]);

  const handleSubmit = async (event) => {
    if (event?.preventDefault) event.preventDefault();

    if (!summary.trim() || summary.trim().length < 15) {
      setError("Please provide an incident summary of at least 15 characters.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");

      const payload = {
        audience,
        summary: summary.trim(),
        protective_steps: protectiveSteps.trim(),
      };

      if (onSubmit) {
        await onSubmit(payload);
      } else {
        const result = await dispatchBreachNotification(payload);
        if (onSuccess) {
          onSuccess(
            result?.message || "Security notification dispatched successfully.",
          );
        }
      }

      handleClose();
    } catch (err) {
      setError(err.message || "Unable to dispatch security notification.");
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
        Dispatch Security &amp; Privacy Advisory
        <Button
          aria-label="Close advisory dialog"
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
        <Stack spacing={2.5} sx={{ pt: 0.5 }}>
          <Alert severity="info" sx={{ borderRadius: 2 }}>
            This advisory will be delivered immediately to the selected
            accounts&apos; notification center and permanently logged in the
            system Security Audit Logs under NPC Circular 16-03.
          </Alert>

          {error && (
            <Alert severity="error" sx={{ borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          <FormControl fullWidth size="small">
            <InputLabel id="breach-audience-label">
              Target Data Subjects
            </InputLabel>
            <Select
              labelId="breach-audience-label"
              label="Target Data Subjects"
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              disabled={isSubmitting}
            >
              <MenuItem value="all">
                All Users (Buyers &amp; Student Sellers)
              </MenuItem>
              <MenuItem value="buyers">Buyers Only</MenuItem>
              <MenuItem value="sellers">Student Sellers Only</MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            required
            multiline
            minRows={3}
            size="small"
            label="Incident Summary & Categories of Data Involved"
            placeholder="Describe the security event, affected data categories, and containment measures taken..."
            value={summary}
            onChange={(e) => {
              setSummary(e.target.value);
              if (error) setError("");
            }}
            disabled={isSubmitting}
          />

          <TextField
            fullWidth
            multiline
            minRows={2}
            size="small"
            label="Recommended Protective Steps for Users (Optional)"
            placeholder="e.g., Please update your password in Account Settings and review recent account activity."
            value={protectiveSteps}
            onChange={(e) => setProtectiveSteps(e.target.value)}
            disabled={isSubmitting}
          />
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
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
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
          {isSubmitting ? "Dispatching..." : "Log & Dispatch Advisory"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

