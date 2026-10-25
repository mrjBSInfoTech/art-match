import { useEffect, useRef, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  LinearProgress,
  Pagination,
  Paper,
  Rating,
  Snackbar,
  Slide,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  fetchArtworkReviewEligibility,
  fetchArtworkReviews,
  submitBuyerReview,
} from "../../../api/buyer/reviewsAPI";

// Slide Transition for Snackbar
function SlideTransition(props) {
  return <Slide {...props} direction="up" />;
}

const requiresSignIn = (error) => error?.status === 401 || (
  error?.status === 403 && /(?:invalid|expired).*token|token.*(?:invalid|expired)/i.test(error.message || "")
);

function ArtworkReviewsContent({ artworkId }) {
  const [summary, setSummary] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [eligibility, setEligibility] = useState(null);
  const [eligibilityError, setEligibilityError] = useState(null);
  const [eligibilityLoading, setEligibilityLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");
  const savingRef = useRef(false);
  const submitController = useRef(null);
  const mounted = useRef(false);
  const token = localStorage.getItem("buyer_token");
  const signedIn = Boolean(token);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      submitController.current?.abort();
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const loadReviews = async () => {
      setLoading(true);
      setLoadError("");
      try {
        const result = await fetchArtworkReviews(artworkId, { page, signal: controller.signal });
        if (controller.signal.aborted) return;
        setSummary(result?.summary || null);
        setReviews(Array.isArray(result?.reviews) ? result.reviews : []);
        setPages(Number(result?.pagination?.pages) || 0);
      } catch (error) {
        if (!controller.signal.aborted) setLoadError(error.message || "Unable to load artwork comments.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    const loadEligibility = async () => {
      setEligibilityLoading(signedIn);
      setEligibilityError(null);
      if (!signedIn) {
        setEligibility(null);
        return;
      }
      try {
        const result = await fetchArtworkReviewEligibility(artworkId, { signal: controller.signal });
        if (!controller.signal.aborted) setEligibility(result);
      } catch (error) {
        if (controller.signal.aborted) return;
        setEligibility(null);
        setEligibilityError(error);
      } finally {
        if (!controller.signal.aborted) setEligibilityLoading(false);
      }
    };
    loadReviews();
    loadEligibility();
    return () => controller.abort();
  }, [artworkId, page, refresh, signedIn, token]);

  const canReview = signedIn && !eligibilityLoading && eligibility?.can_review === true;
  const validRating = Number.isInteger(rating) && rating >= 1 && rating <= 5;
  const needsSignIn = !signedIn || requiresSignIn(eligibilityError);
  const total = Number(summary?.total_reviews) || 0;
  const average = Number(summary?.average_rating);
  const hasRatings = total > 0 && Number.isFinite(average);
  const retry = () => setRefresh((value) => value + 1);

  const showSnackbar = (message, severity = "success") => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const closeSnackbar = (event, reason) => {
    if (reason === "clickaway") return;
    setSnackbarOpen(false);
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case "success":
        return "success.light";
      case "error":
        return "error.light";
      default:
        return "primary.light";
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (savingRef.current || !canReview || !validRating || comment.length > 600) return;
    savingRef.current = true;
    const controller = new AbortController();
    submitController.current = controller;
    setSaving(true);
    setSubmitError("");
    setSnackbarOpen(false);
    try {
      await submitBuyerReview({
        artworkId,
        rating,
        comment: comment.trim(),
      }, { signal: controller.signal });
      if (!mounted.current || controller.signal.aborted) return;
      showSnackbar("Review posted successfully", "success");
      setRating(0);
      setComment("");
      setPage(1);
      retry();
    } catch (error) {
      if (!mounted.current || controller.signal.aborted) return;
      setSubmitError(error.message || "Unable to submit your review.");
      if (requiresSignIn(error)) {
        setEligibility(null);
        setEligibilityError(error);
      } else if (error.status === 403 || error.status === 409) {
        setEligibility(null);
        retry();
      }
    } finally {
      savingRef.current = false;
      if (mounted.current && !controller.signal.aborted) setSaving(false);
    }
  };

  return (
    <Paper
      component="section"
      variant="outlined"
      aria-labelledby="artwork-reviews-title"
      sx={{ mt: 4, p: { xs: 2, sm: 3 }, borderRadius: 3, minWidth: 0 }}
    >
      <Typography id="artwork-reviews-title" component="h2" variant="h5" fontWeight={700}>
        Ratings and comments
      </Typography>
      {loadError && (
        <Alert severity="error" sx={{ mt: 2 }} action={<Button color="inherit" onClick={retry}>Retry</Button>}>
          {loadError}
        </Alert>
      )}
      {loading ? (
        <Box role="status" aria-label="Loading artwork reviews" sx={{ display: "grid", placeItems: "center", py: 4 }}>
          <CircularProgress size={30} />
        </Box>
      ) : !loadError && (
        <>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "180px minmax(0, 1fr)" }, gap: 3, mt: 3 }}>
            <Stack spacing={0.5} alignItems={{ xs: "flex-start", sm: "center" }}>
              <Typography variant="h3" component="p" fontWeight={800}>{hasRatings ? average.toFixed(2) : "—"}</Typography>
              <Rating
                value={hasRatings ? average : 0}
                precision={0.1}
                readOnly
                aria-label={hasRatings ? `Average rating: ${average.toFixed(2)} out of 5` : "No ratings yet"}
              />
              <Typography variant="body2" color="text.secondary">{total} {total === 1 ? "rating" : "ratings"}</Typography>
            </Stack>
            <Stack spacing={1} sx={{ minWidth: 0 }} aria-label="Rating distribution">
              {[5, 4, 3, 2, 1].map((stars) => {
                const count = Number(summary?.rating_counts?.[stars]) || 0;
                const percentage = total ? Math.round(count / total * 100) : 0;
                return (
                  <Box key={stars} sx={{ display: "grid", gridTemplateColumns: "48px minmax(0, 1fr) 40px", gap: 1.5, alignItems: "center" }}>
                    <Typography variant="body2">{stars} star</Typography>
                    <LinearProgress
                      variant="determinate"
                      value={percentage}
                      aria-label={`${stars} star ratings`}
                      aria-valuetext={`${count} reviews, ${percentage}%`}
                      sx={{ height: 8, borderRadius: 1 }}
                    />
                    <Typography variant="body2" color="text.secondary" textAlign="right">{percentage}%</Typography>
                  </Box>
                );
              })}
            </Stack>
          </Box>
        </>
      )}

      <Divider sx={{ my: 3 }} />
      <Typography component="h3" variant="h6" fontWeight={700}>Leave a rating and comment</Typography>
      {needsSignIn ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          <Button component={RouterLink} to="/buyer/login" sx={{ p: 0, minWidth: 0, mr: 0.5, verticalAlign: "baseline" }}>Sign in</Button>
          to rate this artwork and join the conversation.
        </Typography>
      ) : eligibilityLoading ? (
        <Typography role="status" variant="body2" color="text.secondary" sx={{ mt: 1 }}>Loading the comment form...</Typography>
      ) : eligibilityError ? (
        <Alert severity="warning" sx={{ mt: 2 }} action={<Button color="inherit" onClick={retry}>Retry</Button>}>{eligibilityError.message || "Unable to check review eligibility."}</Alert>
      ) : !canReview && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Comments are unavailable for this artwork.
        </Typography>
      )}
      {submitError && <Alert severity="error" sx={{ mt: 2 }}>{submitError}</Alert>}
      {!needsSignIn && <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 2 }}>
        <Typography component="p" variant="body2" sx={{ mb: 0.5 }}>Your rating (required)</Typography>
        <Rating
          name={`artwork-rating-${artworkId}`}
          value={rating}
          precision={1}
          onChange={(_event, value) => setRating(value || 0)}
          disabled={!canReview || saving}
          aria-label="Your rating, from 1 to 5 stars"
          size="large"
        />
        <TextField
          fullWidth
          multiline
          minRows={3}
          label="Comment (optional)"
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          disabled={!canReview || saving}
          slotProps={{ htmlInput: { maxLength: 600 } }}
          helperText={`${comment.length}/600 characters`}
          sx={{ mt: 2 }}
        />
        <Button type="submit" variant="contained" disabled={!canReview || !validRating || comment.length > 600 || saving} sx={{ mt: 2, color: "#fff" }}>
          {saving ? "Posting..." : "Post comment"}
        </Button>
      </Box>}
      {!loading && !loadError && (
        <>
          <Divider sx={{ my: 3 }} />
          <Typography component="h3" variant="h6" fontWeight={700}>Comments</Typography>
          <Stack spacing={2.5} divider={<Divider />} sx={{ mt: 2 }}>
            {reviews.map((review) => {
              const date = new Date(review.created_at);
              const hasDate = Number.isFinite(date.getTime());
              return (
                <Box key={review.id} component="article" sx={{ minWidth: 0 }}>
                  <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={0.5}>
                    <Typography fontWeight={700} sx={{ overflowWrap: "anywhere", minWidth: 0 }}>{review.reviewer_name || "Buyer"}</Typography>
                    {hasDate && <Typography component="time" dateTime={date.toISOString()} variant="caption" color="text.secondary">{date.toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</Typography>}
                  </Stack>
                  <Rating value={Number(review.rating)} readOnly size="small" aria-label={`${review.rating} out of 5 stars`} />
                  {review.comment?.trim() && <Typography variant="body2" sx={{ mt: 1, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{review.comment}</Typography>}
                </Box>
              );
            })}
          </Stack>
          {reviews.length === 0 && <Typography color="text.secondary" sx={{ mt: 2 }}>No comments yet. Share your thoughts about this artwork.</Typography>}
          {pages > 1 && <Pagination page={page} count={pages} onChange={(_event, value) => setPage(value)} disabled={saving} size="small" aria-label="Comment pages" sx={{ mt: 3 }} />}
        </>
      )}
      {/* Snackbar Notification */}
      <Snackbar
        open={snackbarOpen}
        severity={snackbarSeverity}
        variant="filled"
        autoHideDuration={3000}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        TransitionComponent={SlideTransition}
      >
        <Alert
          onClose={closeSnackbar}
          severity={snackbarSeverity}
          sx={{
            width: "100%",
            backgroundColor: getSeverityColor(snackbarSeverity),
            color: "#fff",
            "& .MuiAlert-icon": {
              color: "#fff",
            },
          }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Paper>
  );
}

export default function ArtworkReviews({ artworkId }) {
  return <ArtworkReviewsContent key={String(artworkId)} artworkId={artworkId} />;
}
