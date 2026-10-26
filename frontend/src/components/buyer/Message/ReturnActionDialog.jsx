import {
  Alert,
  Button,
  DialogActions,
  DialogContent,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AssignmentReturnOutlinedIcon from "@mui/icons-material/AssignmentReturnOutlined";
import MessageDialog from "./MessageDialog.jsx";

const actionTitles = {
  approve: "Approve this return?",
  reject: "Reject this return?",
  cancel: "Cancel this return request?",
  ship: "Mark the return as shipped?",
  receive: "Confirm returned items received?",
};

export default function ReturnActionDialog({
  requestId,
  action,
  response,
  trackingUrl,
  busy,
  error,
  validResponse,
  validTracking,
  onResponseChange,
  onTrackingChange,
  onClose,
  onSubmit,
}) {
  const sellerDecision = action === "approve" || action === "reject";
  return (
    <MessageDialog
      open={Boolean(action)}
      onClose={onClose}
      busy={busy}
      title={actionTitles[action] || "Return request"}
      titleId={`return-action-${requestId}-title`}
      icon={
        <AssignmentReturnOutlinedIcon sx={{ color: "#ef3340", fontSize: 20 }} />
      }
    >
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          {sellerDecision && (
            <TextField
              label={
                action === "reject"
                  ? "Reason for rejection"
                  : "Return instructions (optional)"
              }
              required={action === "reject"}
              multiline
              minRows={3}
              value={response}
              onChange={(event) => onResponseChange(event.target.value)}
              disabled={busy}
              slotProps={{ htmlInput: { maxLength: 1000 } }}
              helperText={`${response.length}/1000 characters`}
            />
          )}
          {action === "ship" && (
            <TextField
              label="Return tracking URL (optional)"
              value={trackingUrl}
              onChange={(event) => onTrackingChange(event.target.value)}
              disabled={busy}
              error={!validTracking}
              helperText={
                !validTracking
                  ? "Enter an http:// or https:// URL"
                  : "Mark shipped only after handing the return to the courier."
              }
              slotProps={{ htmlInput: { maxLength: 2000 } }}
            />
          )}
          {action === "cancel" && (
            <Typography variant="body2">
              Are you sure you want to cancel the refund.
            </Typography>
          )}
          {action === "receive" && (
            <Typography variant="body2">
              Confirm only after receiving the returned items. This completes
              the return request. Any refund must be handled separately.
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="text.secondary" disabled={busy}>
          Back
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={onSubmit}
          disabled={
            busy || !validResponse || (action === "ship" && !validTracking)
          }
        >
          {busy ? "Updating..." : "Confirm"}
        </Button>
      </DialogActions>
    </MessageDialog>
  );
}
