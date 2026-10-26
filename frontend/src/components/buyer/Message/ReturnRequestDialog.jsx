import { useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  DialogActions,
  DialogContent,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import MessageDialog from "./MessageDialog.jsx";
import AssignmentReturnOutlinedIcon from "@mui/icons-material/AssignmentReturnOutlined";
import { createReturnRequest } from "../../../api/buyer/returnAPI.js";

const reasons = [
  "Damaged artwork",
  "Wrong artwork received",
  "Artwork not as described",
  "Missing item / component",
  "Shipping damage",
  "Other",
];

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
  const submitting = useRef(false);
  const trimmedDetails = details.trim();
  const valid = Boolean(
    order?.returnEligible &&
      selectedIds.length &&
      reasons.includes(reason) &&
      trimmedDetails.length >= 10 &&
      trimmedDetails.length <= 1000,
  );

  const submit = async () => {
    if (!valid || submitting.current) return;
    submitting.current = true;
    setSaving(true);
    setError("");
    try {
      const result = await createReturnRequest({
        order_id: order.orderId,
        order_item_ids: selectedIds,
        reason,
        details: trimmedDetails,
      });
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
      title="Request a return"
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
