import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
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
import BlockIcon from "@mui/icons-material/Block";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CloseIcon from "@mui/icons-material/Close";
import GavelIcon from "@mui/icons-material/Gavel";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

function AccessReason({
  open,
  handleClose,
  selectedAccount,
  action,
  submitAction,
}) {
  const theme = useTheme();
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) setReason("");
  }, [open]);

  const isStrike = action === "strike";
  const isBan = action === "ban";
  const title = isStrike
    ? "Add account strike"
    : isBan
      ? "Ban account"
      : "Unban account";
  const description = isStrike
    ? "This will add one strike to the selected account."
    : isBan
      ? "This account will be blocked from accessing the platform."
      : "This will restore the account's access to the platform.";
  const severity = isStrike ? "warning" : isBan ? "error" : "info";
  const buttonColor = isStrike ? "warning" : isBan ? "error" : "success";
  const buttonLabel = isStrike ? "Add strike" : isBan ? "Ban account" : "Unban account";
  const ActionIcon = isStrike
    ? GavelIcon
    : isBan
      ? BlockIcon
      : CheckCircleOutlineIcon;

  const handleSubmit = async () => {
    if (!selectedAccount || isSubmitting) return;

    try {
      setIsSubmitting(true);
      await submitAction(reason);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={isSubmitting ? undefined : handleClose}
      TransitionComponent={Transition}
      keepMounted
      aria-labelledby="access-reason-title"
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
        id="access-reason-title"
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
        <ActionIcon sx={{ color: "#ef3340", fontSize: 20 }} />
        {title}
        <Button
          aria-label="Close access action"
          onClick={handleClose}
          disabled={isSubmitting}
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

      <DialogContent dividers sx={{ px: 3, py: 2.5 }}>
        <Stack spacing={2}>
          <Alert severity={severity}>{description}</Alert>

          <Box>
            <Typography
              variant="caption"
              sx={{ display: "block", mb: 0.75, color: "text.secondary" }}
            >
              Account
            </Typography>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Chip
                size="small"
                label={selectedAccount?.role || "Account"}
                color="primary"
                sx={{ textTransform: "capitalize" }}
              />
              <Typography
                variant="body2"
                fontWeight={700}
                sx={{ overflowWrap: "anywhere" }}
              >
                {selectedAccount?.username || "Unknown"}
              </Typography>
            </Stack>
          </Box>

          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={3}
            label="Reason (optional)"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            helperText="Add context for this access change."
            disabled={isSubmitting}
          />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button
          onClick={handleClose}
          color="inherit"
          disabled={isSubmitting}
          sx={{ textTransform: "none", color: "text.secondary" }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={isSubmitting || !selectedAccount}
          sx={{
            borderRadius: 1.5,
            px: 2.5,
            textTransform: "none",
            fontWeight: 700,
          }}
        >
          {isSubmitting && (
            <CircularProgress size={18} color="inherit" sx={{ mr: 1 }} />
          )}
          {isSubmitting ? "Saving..." : buttonLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default AccessReason;
