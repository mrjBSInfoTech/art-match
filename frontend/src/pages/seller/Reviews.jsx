import { createElement, useEffect, useState, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import {
  Autocomplete,
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Rating,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import ConnectionErrorPanel from "../../components/seller/ConnectionErrorPanel";
import {
  fetchSellerReviews,
  saveSellerReviewResponse,
} from "../../api/seller/reviewsAPI";
import StarRateRoundedIcon from "@mui/icons-material/StarRateRounded";
import RateReviewRoundedIcon from "@mui/icons-material/RateReviewRounded";
import QuestionAnswerRoundedIcon from "@mui/icons-material/QuestionAnswerRounded";
import SearchIcon from "@mui/icons-material/Search";

const QUICK_RESPONSES = [
  "Thank you for your feedback and support!",
  "Thank you for taking the time to share your experience.",
  "We're glad you enjoyed the artwork. Thank you!",
];

const formatReviewDate = (value) => {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "";
};

function SellerReviewCard({ review, onResponseSaved }) {
  const [editing, setEditing] = useState(false);
  const [mode, setMode] = useState("quick");
  const [quickResponse, setQuickResponse] = useState("");
  const [customResponse, setCustomResponse] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const response = mode === "quick" ? quickResponse : customResponse;

  const startEditing = () => {
    setMode("custom");
    setCustomResponse(review.sellerResponse || "");
    setError("");
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setError("");
    setQuickResponse("");
    setCustomResponse("");
  };

  const handleSave = async (event) => {
    event.preventDefault();
    const trimmedResponse = response.trim();
    if (!trimmedResponse || trimmedResponse.length > 600 || saving) return;

    setSaving(true);
    setError("");
    try {
      const result = await saveSellerReviewResponse(review.id, trimmedResponse);
      onResponseSaved(review.id, result.response, result.respondedAt);
      setEditing(false);
      setQuickResponse("");
      setCustomResponse("");
    } catch (saveError) {
      setError(saveError.message || "Unable to save your response.");
    } finally {
      setSaving(false);
    }
  };

  const dateLabel = formatReviewDate(review.createdAt);
  const responseDateLabel = formatReviewDate(review.sellerResponseAt);

  return (
    <Card component="article" variant="outlined" sx={{ borderRadius: 3 }}>
      <CardContent>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          spacing={1}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="subtitle1"
              fontWeight={700}
              sx={{ overflowWrap: "anywhere" }}
            >
              {review.artworkTitle || "Artwork"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Reviewed by {review.reviewerName || "Buyer"}
            </Typography>
          </Box>
          {dateLabel && (
            <Typography
              component="time"
              dateTime={new Date(review.createdAt).toISOString()}
              variant="caption"
              color="text.secondary"
            >
              {dateLabel}
            </Typography>
          )}
        </Stack>
        <Rating
          value={Number(review.rating) || 0}
          readOnly
          size="small"
          aria-label={`${review.rating} out of 5 stars`}
          sx={{ mt: 1 }}
        />
        <Divider sx={{ my: 1.5 }} />
        <Typography
          variant="body2"
          sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
        >
          {review.comment?.trim() || "No written comment provided."}
        </Typography>

        {review.sellerResponse && !editing && (
          <Box
            sx={{
              mt: 2,
              p: 1.5,
              borderRadius: 2,
              bgcolor: "action.hover",
              borderLeft: "3px solid",
              borderColor: "primary.main",
            }}
          >
            <Stack direction="row" justifyContent="space-between" spacing={1}>
              <Typography variant="subtitle2" fontWeight={700}>
                Your response
              </Typography>
              {responseDateLabel && (
                <Typography
                  component="time"
                  dateTime={new Date(review.sellerResponseAt).toISOString()}
                  variant="caption"
                  color="text.secondary"
                >
                  {responseDateLabel}
                </Typography>
              )}
            </Stack>
            <Typography
              variant="body2"
              sx={{ mt: 0.5, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
            >
              {review.sellerResponse}
            </Typography>
          </Box>
        )}

        {editing ? (
          <Box component="form" onSubmit={handleSave} sx={{ mt: 2 }}>
            <FormControl fullWidth size="small">
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
              <FormControl fullWidth size="small" sx={{ mt: 1.5 }}>
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
              <Button onClick={cancelEditing} disabled={saving}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={
                  !response.trim() || response.trim().length > 600 || saving
                }
              >
                {saving
                  ? "Saving..."
                  : review.sellerResponse
                    ? "Update response"
                    : "Post response"}
              </Button>
            </Stack>
          </Box>
        ) : (
          <Button size="small" onClick={startEditing} sx={{ mt: 1.5 }}>
            {review.sellerResponse ? "Edit response" : "Respond to review"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default function SellerReviews() {
  const theme = useTheme();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [selectedArtwork, setSelectedArtwork] = useState("all");

  const loadReviews = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await fetchSellerReviews();
      setReviews(Array.isArray(result) ? result : []);
    } catch (loadError) {
      setError(loadError.message || "Unable to load reviews and ratings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReviews();
  }, [loadReviews, refresh]);

  const artworkCategories = Array.from(
    new Map(
      reviews.map((review) => {
        const title = review.artworkTitle?.trim() || "Artwork";
        const key =
          review.artworkId == null
            ? `title:${title}`
            : `id:${review.artworkId}`;
        return [key, { key, title }];
      }),
    ).values(),
  );
  const artworkOptions = [
    { key: "all", title: "All artwork", count: reviews.length },
    ...artworkCategories.map((category) => ({
      ...category,
      count: reviews.filter((review) => {
        const key =
          review.artworkId == null
            ? `title:${review.artworkTitle?.trim() || "Artwork"}`
            : `id:${review.artworkId}`;
        return key === category.key;
      }).length,
    })),
  ];
  const visibleReviews =
    selectedArtwork === "all"
      ? reviews
      : reviews.filter((review) => {
          const key =
            review.artworkId == null
              ? `title:${review.artworkTitle?.trim() || "Artwork"}`
              : `id:${review.artworkId}`;
          return key === selectedArtwork;
        });
  const averageRating = visibleReviews.length
    ? visibleReviews.reduce(
        (total, review) => total + Number(review.rating || 0),
        0,
      ) / visibleReviews.length
    : 0;
  const handleResponseSaved = (reviewId, response, respondedAt) => {
    setReviews((current) =>
      current.map((review) =>
        review.id === reviewId
          ? {
              ...review,
              sellerResponse: response,
              sellerResponseAt: respondedAt,
            }
          : review,
      ),
    );
  };

  const totalNeedResponse = reviews.filter(
    (review) => !review.sellerResponse,
  ).length;
  const reviewSummaryCards = [
    {
      label: "TOTAL REVIEWS",
      value: reviews.length,
      caption: "Customer feedback received",
      icon: RateReviewRoundedIcon,
      tint: alpha(
        theme.palette.primary.main,
        theme.palette.mode === "dark" ? 0.18 : 0.1,
      ),
      accent: theme.palette.primary.main,
    },
    {
      label: "AVERAGE RATING",
      value: reviews.length ? averageRating.toFixed(1) : "—",
      caption: "Across visible reviews",
      icon: StarRateRoundedIcon,
      tint: alpha(
        theme.palette.warning.main,
        theme.palette.mode === "dark" ? 0.18 : 0.1,
      ),
      accent: theme.palette.warning.main,
    },
    {
      label: "NEED RESPONSE",
      value: totalNeedResponse,
      caption: "Awaiting seller reply",
      icon: QuestionAnswerRoundedIcon,
      tint: alpha(
        theme.palette.success.main,
        theme.palette.mode === "dark" ? 0.18 : 0.1,
      ),
      accent: theme.palette.success.main,
    },
  ];

  if (error && !reviews.length) {
    return (
      <Box sx={{ minWidth: 0 }}>
        <Helmet titleTemplate="%s - ArtMatch">
          <title>Reviews & Ratings</title>
        </Helmet>
        <ConnectionErrorPanel
          title="Reviews Unavailable"
          message={error}
          onRetry={loadReviews}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2.5 }, minWidth: 0 }}>
      <Helmet titleTemplate="%s - ArtMatch">
        <title>Reviews & Ratings</title>
      </Helmet>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        gap={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography
            sx={{
              fontSize: { xs: 28, sm: 38 },
              fontWeight: 800,
              lineHeight: 1.1,
              color: theme.palette.text.primary,
            }}
          >
            Reviews & Ratings
          </Typography>
          <Typography
            sx={{
              mt: 0.75,
              color: theme.palette.text.secondary,
              fontSize: 13,
            }}
          >
            Buyer feedback for your artwork and seller experience.
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" aria-live="polite">
          {loading
            ? "Loading review count..."
            : error
              ? "Review count unavailable"
              : `${visibleReviews.length} ${
                  visibleReviews.length === 1 ? "review" : "reviews"
                }${
                  selectedArtwork === "all"
                    ? ` · ${artworkCategories.length} ${
                        artworkCategories.length === 1 ? "artwork" : "artworks"
                      }`
                    : ""
                }`}
        </Typography>
      </Stack>

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          action={
            <Button
              color="inherit"
              onClick={() => setRefresh((value) => value + 1)}
            >
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {!error && !loading && (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
            gap: 2,
            mb: 2.5,
          }}
        >
          {reviewSummaryCards.map(
            ({ label, value, caption, icon: SummaryIcon, tint, accent }) => (
              <Card
                key={label}
                sx={{
                  borderRadius: 3,
                  backgroundColor: theme.palette.background.paper,
                  border: `1px solid ${theme.palette.divider}`,
                  boxShadow: "none",
                }}
              >
                <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 2,
                    }}
                  >
                    <Box>
                      <Typography
                        sx={{
                          color: theme.palette.text.secondary,
                          fontSize: 11,
                          fontWeight: 800,
                          letterSpacing: 1.2,
                        }}
                      >
                        {label}
                      </Typography>
                      <Typography
                        sx={{
                          mt: 1,
                          color: theme.palette.text.primary,
                          fontSize: 30,
                          fontWeight: 800,
                          lineHeight: 1,
                        }}
                      >
                        {value}
                      </Typography>
                      <Typography
                        sx={{
                          mt: 1,
                          color: theme.palette.text.secondary,
                          fontSize: 12,
                        }}
                      >
                        {caption}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        width: 54,
                        height: 54,
                        display: "grid",
                        placeItems: "center",
                        borderRadius: 2.5,
                        backgroundColor: tint,
                        color: accent,
                      }}
                    >
                      {createElement(SummaryIcon, { sx: { fontSize: 26 } })}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ),
          )}
        </Box>
      )}

      {loading ? (
        <Box
          role="status"
          aria-label="Loading reviews"
          sx={{ display: "grid", placeItems: "center", py: 6 }}
        >
          <CircularProgress size={32} />
        </Box>
      ) : (
        !error && (
          <>
            {reviews.length > 0 && (
              <Paper
                variant="outlined"
                sx={{
                  p: { xs: 2, md: 2.5 },
                  borderRadius: 2.5,
                  backgroundColor: theme.palette.background.paper,
                  borderColor: theme.palette.divider,
                  containerType: "inline-size",
                  containerName: "seller-review-filters",
                  minWidth: 0,
                  mb: 2.5,
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: { xs: "column", md: "row" },
                    justifyContent: "space-between",
                    alignItems: { xs: "stretch", md: "center" },
                    gap: 2,
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: { xs: "column", sm: "row" },
                      gap: 2,
                      width: { xs: "100%", md: "auto" },
                      minWidth: 0,
                    }}
                  >
                    <Autocomplete
                      fullWidth
                      id="seller-review-artwork-filter"
                      sx={{ width: { xs: "100%", sm: 520 }, maxWidth: "100%" }}
                      options={artworkOptions}
                      value={
                        artworkOptions.find(
                          (option) => option.key === selectedArtwork,
                        ) || artworkOptions[0]
                      }
                      getOptionLabel={(option) => option.title}
                      isOptionEqualToValue={(option, value) =>
                        option.key === value.key
                      }
                      noOptionsText="No matching artwork"
                      onChange={(_, option) =>
                        setSelectedArtwork(option?.key || "all")
                      }
                      renderOption={(props, option) => (
                        <Box component="li" {...props} key={option.key}>
                          <Stack
                            direction="row"
                            justifyContent="space-between"
                            alignItems="center"
                            spacing={2}
                            sx={{ width: "100%", minWidth: 0 }}
                          >
                            <Typography noWrap>{option.title}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {option.count}{" "}
                              {option.count === 1 ? "review" : "reviews"}
                            </Typography>
                          </Stack>
                        </Box>
                      )}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          variant="outlined"
                          size="small"
                          placeholder="Search artworks..."
                          inputProps={{
                            ...params.inputProps,
                            "aria-label": "Search reviews by artwork",
                          }}
                          InputProps={{
                            ...params.InputProps,
                            startAdornment: (
                              <>
                                <InputAdornment position="start">
                                  <SearchIcon />
                                </InputAdornment>
                                {params.InputProps.startAdornment}
                              </>
                            ),
                          }}
                          sx={{
                            minWidth: 0,
                            "& .MuiInputBase-input::placeholder": {
                              color: theme.palette.text.secondary,
                              opacity: 1,
                            },
                          }}
                        />
                      )}
                    />
                  </Box>
                </Box>
              </Paper>
            )}

            <Paper
              variant="outlined"
              sx={{
                p: { xs: 2, md: 2.5 },
                borderRadius: 2.5,
                backgroundColor: theme.palette.background.paper,
                borderColor: theme.palette.divider,
              }}
            >
              <Box sx={{ mb: 2.5 }}>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  alignItems={{ xs: "flex-start", sm: "center" }}
                  spacing={{ xs: 1, sm: 2 }}
                >
                  <Rating
                    value={averageRating}
                    precision={0.1}
                    readOnly
                    aria-label={
                      visibleReviews.length
                        ? `Average rating: ${averageRating.toFixed(1)} out of 5`
                        : "No ratings yet"
                    }
                  />
                  <Typography variant="h5" fontWeight={700}>
                    {visibleReviews.length ? averageRating.toFixed(1) : "—"}
                  </Typography>
                  <Typography color="text.secondary">
                    Based on {visibleReviews.length}{" "}
                    {visibleReviews.length === 1 ? "rating" : "ratings"}
                  </Typography>
                </Stack>
              </Box>

              {visibleReviews.length === 0 ? (
                <Box sx={{ py: 5, textAlign: "center" }}>
                  <Typography variant="h6" fontWeight={600}>
                    No reviews yet
                  </Typography>
                  <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                    Ratings and comments for your artwork will appear here.
                  </Typography>
                </Box>
              ) : (
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "minmax(0, 1fr)",
                      md: "repeat(2, minmax(0, 1fr))",
                      xl: "repeat(3, minmax(0, 1fr))",
                    },
                    gap: { xs: 1.5, sm: 2 },
                    alignItems: "stretch",
                  }}
                >
                  {visibleReviews.map((review) => (
                    <Box key={review.id} sx={{ minWidth: 0 }}>
                      <SellerReviewCard
                        review={review}
                        onResponseSaved={handleResponseSaved}
                      />
                    </Box>
                  ))}
                </Box>
              )}
            </Paper>
          </>
        )
      )}
    </Box>
  );
}
