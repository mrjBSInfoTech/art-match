import { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import {
  fetchRecommendations,
  fetchSellerProfileRecommendations,
} from "../../../api/buyer/recommendationAPI";
import ArtworkCard from "../Artwork/ArtworkCard";
import RelatedArtists from "../Artist/RelatedArtists";
import { mergeSellerProfileRecommendations } from "../../../utils/sellerProfileRecommendations";
//Icons
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

export default function SellerRecommendations({
  sellerId,
  sellerName,
  hasSpecialties,
}) {
  const [artworks, setArtworks] = useState([]);
  const [relatedArtists, setRelatedArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [hasBuyerActivity, setHasBuyerActivity] = useState(false);

  useEffect(() => {
    let controller;
    let refreshTimer;
    const load = async () => {
      controller?.abort();
      const request = new AbortController();
      controller = request;
      setLoading(true);
      setError(false);
      setArtworks([]);
      setRelatedArtists([]);
      try {
        const [sellerResult, buyerResult] = await Promise.allSettled([
          hasSpecialties
            ? fetchSellerProfileRecommendations(sellerId, 8, request.signal)
            : Promise.resolve({ recommendations: [], relatedArtists: [] }),
          fetchRecommendations(hasSpecialties ? 8 : 4, request.signal),
        ]);
        if (request.signal.aborted) return;
        const sellerFailed =
          hasSpecialties && sellerResult.status === "rejected";
        const buyerResponse =
          buyerResult.status === "fulfilled" ? buyerResult.value : null;
        const buyerFailed =
          buyerResult.status === "rejected" ||
          buyerResponse?.mode === "unavailable";
        const sellerResponse =
          sellerResult.status === "fulfilled" ? sellerResult.value : null;
        const sellerArtworks = sellerResponse?.recommendations || [];
        const buyerArtworks =
          !buyerFailed && Array.isArray(buyerResponse?.recommendations)
            ? buyerResponse.recommendations
            : [];
        setArtworks(
          mergeSellerProfileRecommendations(sellerArtworks, buyerArtworks),
        );
        setRelatedArtists(sellerResponse?.relatedArtists || []);
        setError(sellerFailed || buyerFailed);
        setHasBuyerActivity(
          buyerResponse?.has_activity === true ||
            (buyerResponse?.mode !== "no_activity" &&
              buyerResponse?.mode !== "personalization_disabled" &&
              buyerResponse?.mode !== "fallback_recent_popular" &&
              (Number(buyerResponse?.history_length) > 0 ||
                [
                  "recent_activity_events",
                  "search_filter_events",
                  "preferred_artists",
                  "followed_artists",
                  "specialty_preferences",
                ].some((key) => Number(buyerResponse?.signals?.[key]) > 0))),
        );
      } catch {
        if (!request.signal.aborted) setError(true);
      } finally {
        if (!request.signal.aborted) setLoading(false);
      }
    };
    const refresh = () => {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(load, 350);
    };
    load();
    const events = ["recommendation-updated", "artist-follow-updated", "cart-updated", "focus"];
    events.forEach((event) => window.addEventListener(event, refresh));
    return () => {
      clearTimeout(refreshTimer);
      controller?.abort();
      events.forEach((event) => window.removeEventListener(event, refresh));
    };
  }, [sellerId, hasSpecialties, retry]);

  const showRecommendationsSection = hasSpecialties
    ? loading || error || artworks.length > 0
    : error || artworks.length > 0;

  if (!loading && !error && artworks.length === 0 && relatedArtists.length === 0) return null;

  return (
    <>
      {!loading && (
        <RelatedArtists artists={relatedArtists} sellerName={sellerName} />
      )}
      {showRecommendationsSection && (
      <Box
        component="section"
        aria-labelledby="seller-recommendations-title"
        aria-busy={loading}
        id="recommended"
        sx={{ mt: 5, width: "100%", minWidth: 0 }}
      >
        <Box sx={{ mb: 3 }}>
          <Typography
            variant="overline"
            sx={{ color: "error.main", fontWeight: 800, letterSpacing: 1.5 }}
          >
            {hasSpecialties ? "Related artworks" : "Personalized"}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ maxWidth: 650 }}
          >
            {hasSpecialties
              ? `Artworks related to ${sellerName || "this seller"}'s specialties appear first.${hasBuyerActivity ? " Recommendations based on your activity and followed artists follow." : ""}`
              : "Based on your browsing, searches, filters, and followed artists."}
          </Typography>
          <SectionHeader
            title="Recommended for You"
            to="/buyer/shop?recommendations=1"
          />
        </Box>
        {loading ? (
          <Box
            role="status"
            aria-label="Loading recommended artworks"
            sx={{ display: "flex", justifyContent: "center", py: 5 }}
          >
            <CircularProgress />
          </Box>
        ) : (
          <>
            {error && (
              <Alert
                severity="warning"
                sx={{ mb: 2 }}
                action={
                  <Button
                    color="inherit"
                    size="small"
                    onClick={() => setRetry((value) => value + 1)}
                  >
                    Retry
                  </Button>
                }
              >
                {artworks.length
                  ? "Some recommendations could not be loaded. You can still browse the available results."
                  : "Unable to load recommendations right now."}
              </Alert>
            )}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "minmax(0, 1fr)",
                  sm: "repeat(2, minmax(0, 1fr))",
                  md: "repeat(4, minmax(0, 1fr))",
                },
                gap: 3,
                "& > *": { minWidth: 0 },
              }}
            >
              {artworks.map((artwork) => (
                <ArtworkCard
                  key={artwork.artwork_id || artwork.id}
                  artwork={artwork}
                />
              ))}
            </Box>
          </>
        )}
      </Box>
      )}
    </>
  );
}
function SectionHeader({ title, to }) {
  return (
    <Stack
      direction="row"
      sx={{ alignItems: "flex-end", justifyContent: "space-between", mb: 3 }}
    >
      <Box>
        <Typography
          id="seller-recommendations-title"
          component="h2"
          variant="h4"
          sx={{
            mt: 0.5,
            fontSize: {
              xs: 22,
              sm: 26,
              md: 30,
            },
            fontWeight: 800,
          }}
        >
          {title}
        </Typography>
      </Box>
      {to && (
        <Button
          component={RouterLink}
          to={to}
          endIcon={<ArrowForwardIcon />}
          sx={{
            color: "text.primary",
            fontSize: { xs: 10, sm: 14, md: 16 },
            fontWeight: 600,
            maxWidth: 200,
            p: 0,
          }}
        >
          View all
        </Button>
      )}
    </Stack>
  );
}
