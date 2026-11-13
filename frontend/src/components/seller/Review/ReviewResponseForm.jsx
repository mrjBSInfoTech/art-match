import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from "@mui/material";
import { saveSellerReviewResponse } from "../../../api/seller/reviewsAPI";
import { QUICK_RESPONSES } from "./reviewPresentation";

export default function ReviewResponseForm({
  review,
  onResponseSaved,
  onCancel,
}) {
  const [mode, setMode] = useState(review?.sellerResponse ? "custom" : "quick");
  const [quickResponse, setQuickResponse] = useState("");
  const [customResponse, setCustomResponse] = useState(
    review?.sellerResponse || "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const response = mode === "quick" ? quickResponse : customResponse;

  const handleSave = async (event) => {
    event.preventDefault();
    const trimmedResponse = response.trim();
    if (!trimmedResponse || trimmedResponse.length > 600 || saving) return;

    setSaving(true);
    setError("");
    try {
      const result = await saveSellerReviewResponse(review.id, trimmedResponse);
      onResponseSaved(review.id, result.response, result.respondedAt);
      onCancel?.();
    } catch (saveError) {
      setError(saveError.message || "Unable to save your response.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSave}>
      <FormControl fullWidth size="small" disabled={saving}>
        <InputLabel id={`response-mode-label-${review.id}`}>
          Response type
        </InputLabel>
        <Select
          labelId={`response-mode-label-${review.id}`}
          value={mode}
          label="Response type"
          onChange={(event) => {
            setMode(event.target.value);
            setError("");
          }}
        >
          <MenuItem value="quick">Choose a premade response</MenuItem>
          <MenuItem value="custom">Write your own response</MenuItem>
        </Select>
      </FormControl>

      {mode === "quick" ? (
        <FormControl fullWidth size="small" sx={{ mt: 1.5 }} disabled={saving}>
          <InputLabel id={`quick-response-label-${review.id}`}>
            Premade response
          </InputLabel>
          <Select
            labelId={`quick-response-label-${review.id}`}
            value={quickResponse}
            label="Premade response"
            onChange={(event) => setQuickResponse(event.target.value)}
          >
            {QUICK_RESPONSES.map((item) => (
              <MenuItem key={item} value={item}>
                {item}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      ) : (
        <TextField
          fullWidth
          multiline
          minRows={3}
          label="Your response"
          value={customResponse}
          onChange={(event) => setCustomResponse(event.target.value)}
          slotProps={{ htmlInput: { maxLength: 600 } }}
          helperText={`${customResponse.length}/600 characters`}
          disabled={saving}
          sx={{ mt: 1.5 }}
        />
      )}

      {error && (
        <Alert severity="error" sx={{ mt: 1.5 }}>
          {error}
        </Alert>
      )}

      <Stack
        direction="row"
        spacing={1}
        justifyContent="flex-end"
        sx={{ mt: 1.5 }}
      >
        <Button onClick={onCancel} disabled={saving} sx={{ textTransform: "none", fontWeight: 600 }}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={!response.trim() || response.trim().length > 600 || saving}
          sx={{ textTransform: "none", fontWeight: 700, color: "#fff" }}
        >
          {saving
            ? "Saving..."
            : review.sellerResponse
              ? "Update response"
              : "Post response"}
        </Button>
      </Stack>
    </Box>
  );
}
