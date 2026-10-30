import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Rating,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

export default function OrderReviewDialog({
  open,
  reviewTarget,
  rating,
  setRating,
  reviewText,
  setReviewText,
  reviewSubmitted,
  reviewSaving,
  reviewError,
  onClose,
  onSubmit,
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      {reviewTarget && (
        <>
          <DialogTitle>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="overline" color="error.main" fontWeight={800}>
                  {reviewTarget.order.id}
                </Typography>
                <Typography variant="h5" fontWeight={800}>
                  {reviewSubmitted ? "Review received" : "Review your artwork"}
                </Typography>
              </Box>
              <IconButton aria-label="Close review" onClick={onClose}>
                <CloseIcon />
              </IconButton>
            </Stack>
          </DialogTitle>
          <DialogContent>
            {reviewSubmitted ? (
              <Alert severity="success">
                Thanks. Your rating and feedback are saved and will appear on the seller profile.
              </Alert>
            ) : (
              <Stack spacing={2}>
                {reviewError && <Alert severity="error">{reviewError}</Alert>}
                <Typography fontWeight={700}>
                  {reviewTarget.item.title} · {reviewTarget.item.artist}
                </Typography>
                <Box sx={{ textAlign: "center" }}>
                  <Rating
                    value={rating}
                    onChange={(_, value) => setRating(value || 0)}
                    size="large"
                  />
                  <Typography variant="body2" color="text.secondary">
                    {rating ? `${rating} out of 5` : "Select a star rating"}
                  </Typography>
                </Box>
                <TextField
                  label="Share your experience (optional)"
                  multiline
                  minRows={4}
                  value={reviewText}
                  onChange={(event) => setReviewText(event.target.value)}
                  inputProps={{ maxLength: 600 }}
                  helperText={`${reviewText.length}/600 characters`}
                />
              </Stack>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}>
            {reviewSubmitted ? (
              <Button variant="contained" onClick={onClose}>
                Done
              </Button>
            ) : (
              <>
                <Button onClick={onClose}>Cancel</Button>
                <Button
                  variant="contained"
                  disabled={!rating || reviewText.length > 600 || reviewSaving}
                  onClick={onSubmit}
                >
                  {reviewSaving ? "Submitting..." : "Submit review"}
                </Button>
              </>
            )}
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}

