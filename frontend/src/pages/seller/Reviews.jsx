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
  InputAdornment,
  Paper,
  Rating,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import ConnectionErrorPanel from "../../components/seller/ConnectionErrorPanel";
import SellerLoadingPanel from "../../components/seller/SellerLoadingPanel";
import { adminSearchInputSx } from "../../components/admin/adminFilterStyles";
import ReviewCard from "../../components/seller/Review/ReviewCard";
import ReviewTable from "../../components/seller/Review/ReviewTable";
import { fetchSellerReviews } from "../../api/seller/reviewsAPI";
import StarRateRoundedIcon from "@mui/icons-material/StarRateRounded";
import RateReviewRoundedIcon from "@mui/icons-material/RateReviewRounded";
import QuestionAnswerRoundedIcon from "@mui/icons-material/QuestionAnswerRounded";
import SearchIcon from "@mui/icons-material/Search";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import ViewListIcon from "@mui/icons-material/ViewList";

export default function SellerReviews() {
  const theme = useTheme();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [selectedArtwork, setSelectedArtwork] = useState("all");
  const [viewMode, setViewMode] = useState("card");

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

  if (loading && !reviews.length) {
    return (
      <SellerLoadingPanel
        title="Reviews & Ratings"
        subtitle="Buyer feedback for your artwork and seller experience."
      />
    );
  }

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
            gridTemplateColumns: {
              xs: "minmax(0, 1fr)",
              sm: "repeat(2, minmax(0, 1fr))",
              lg: "repeat(3, minmax(0, 1fr))",
            },
            gap: 2,
            mb: 2.5,
            minWidth: 0,
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
                  minWidth: 0,
                  overflow: "hidden",
                  height: "100%",
                }}
              >
                <CardContent sx={{ p: { xs: 1.75, sm: 2.25 }, "&:last-child": { pb: { xs: 1.75, sm: 2.25 } }, height: "100%" }}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: { xs: 1.25, sm: 2 },
                      minWidth: 0,
                      height: "100%",
                    }}
                  >
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography
                        sx={{
                          color: theme.palette.text.secondary,
                          fontSize: 11,
                          fontWeight: 800,
                          letterSpacing: 1.2,
                          overflowWrap: "break-word",
                        }}
                      >
                        {label}
                      </Typography>
                      <Typography
                        sx={{
                          mt: 1,
                          color: theme.palette.text.primary,
                          fontSize: { xs: 24, sm: 26, xl: 30 },
                          fontWeight: 800,
                          lineHeight: 1.1,
                          overflowWrap: "anywhere",
                        }}
                      >
                        {value}
                      </Typography>
                      <Typography
                        sx={{
                          mt: 1,
                          color: theme.palette.text.secondary,
                          fontSize: 12,
                          overflowWrap: "break-word",
                        }}
                      >
                        {caption}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        width: { xs: 46, sm: 52 },
                        height: { xs: 46, sm: 52 },
                        flexShrink: 0,
                        display: "grid",
                        placeItems: "center",
                        borderRadius: 2.5,
                        backgroundColor: tint,
                        color: accent,
                      }}
                    >
                      {createElement(SummaryIcon, { sx: { fontSize: { xs: 22, sm: 26 } } })}
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
                  p: { xs: 1.5, sm: 2, md: 2.5 },
                  borderRadius: 2.5,
                  backgroundColor: theme.palette.background.paper,
                  borderColor: theme.palette.divider,
                  minWidth: 0,
                  overflow: "hidden",
                }}
              >
                <Box sx={{ width: "100%", minWidth: 0 }}>
                  <Autocomplete
                    fullWidth
                    id="seller-review-artwork-filter"
                    sx={{
                      width: "100%",
                      maxWidth: { xs: "100%", lg: 520 },
                      minWidth: 0,
                    }}
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
                          sx={adminSearchInputSx(theme, { minWidth: 0 })}
                        />
                      )}
                    />
                </Box>
              </Paper>
            )}

            {/* View Mode Switcher & Summary Count */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 1.5,
                mt: 2,
                mb: 1,
              }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                aria-live="polite"
                sx={{ fontWeight: 600 }}
              >
                Showing {visibleReviews.length} of {reviews.length} reviews
              </Typography>
              <ToggleButtonGroup
                value={viewMode}
                exclusive
                onChange={(_event, next) => {
                  if (next) setViewMode(next);
                }}
                size="small"
                aria-label="Reviews presentation mode"
                sx={{
                  backgroundColor: theme.palette.background.paper,
                  borderRadius: 2.5,
                  border: `1px solid ${theme.palette.divider}`,
                  p: 0.3,
                  "& .MuiToggleButton-root": {
                    border: "none",
                    borderRadius: 2,
                    px: 1.5,
                    py: 0.5,
                    fontSize: 12,
                    fontWeight: 700,
                    textTransform: "none",
                    color: theme.palette.text.secondary,
                    gap: 0.75,
                    transition: "all 150ms ease",
                  },
                  "& .MuiToggleButton-root.Mui-selected": {
                    backgroundColor: theme.palette.error.main,
                    color: "#fff",
                    "&:hover": { backgroundColor: theme.palette.error.dark },
                  },
                }}
              >
                <ToggleButton value="card" aria-label="Card view">
                  <ViewModuleIcon sx={{ fontSize: 18 }} />
                  Cards
                </ToggleButton>
                <ToggleButton value="table" aria-label="Table view">
                  <ViewListIcon sx={{ fontSize: 18 }} />
                  Table
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {visibleReviews.length === 0 ? (
              <Paper
                variant="outlined"
                sx={{
                  p: { xs: 2, md: 2.5 },
                  borderRadius: 2.5,
                  backgroundColor: theme.palette.background.paper,
                  borderColor: theme.palette.divider,
                }}
              >
                <Box sx={{ py: 5, textAlign: "center" }}>
                  <Typography variant="h6" fontWeight={600}>
                    No reviews yet
                  </Typography>
                  <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                    Ratings and comments for your artwork will appear here.
                  </Typography>
                </Box>
              </Paper>
            ) : viewMode === "table" ? (
              <ReviewTable
                reviews={visibleReviews}
                averageRating={averageRating}
                onResponseSaved={handleResponseSaved}
              />
            ) : (
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
                      <ReviewCard
                        review={review}
                        onResponseSaved={handleResponseSaved}
                      />
                    </Box>
                  ))}
                </Box>
              </Paper>
            )}
          </>
        )
      )}
    </Box>
  );
}
