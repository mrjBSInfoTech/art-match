import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Box,
  Button,
  Skeleton,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ArtworkCard from "../Artwork/ArtworkCard";
import { fetchRecommendations } from "../../../api/buyer/recommendationAPI";
import {
  PERSONALIZED_RECOMMENDATION_MODES,
  getRecommendationMessage,
} from "../../../utils/recommendationDisplay";

export function ArtworkCardSkeleton() {
  const theme = useTheme();
  const darkMode = theme.palette.mode === "dark";

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
        overflow: "hidden",
        border: "1px solid",
        borderColor: darkMode
          ? "rgba(255, 255, 255, 0.08)"
          : "rgba(15, 23, 42, 0.08)",
        borderRadius: 3,
        backgroundColor: "background.paper",
        boxShadow: darkMode
          ? "0 4px 16px rgba(0, 0, 0, 0.28)"
          : "0 4px 16px rgba(15, 23, 42, 0.04)",
      }}
    >
      <Skeleton
        variant="rectangular"
        animation="wave"
        sx={{
          width: "100%",
          aspectRatio: { xs: "1.12 / 1", sm: "1.05 / 1" },
          transform: "none",
        }}
      />
      <Box
        sx={{
          p: { xs: 1, sm: 2 },
          display: "flex",
          flex: 1,
          flexDirection: "column",
          gap: { xs: 0.4, sm: 0.75 },
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={1}
        >
          <Skeleton
            variant="text"
            animation="wave"
            sx={{ width: "65%", height: 24, borderRadius: 1 }}
          />
          <Skeleton
            variant="rounded"
            animation="wave"
            sx={{ width: 36, height: 20, borderRadius: 1 }}
          />
        </Stack>
        <Skeleton
          variant="text"
          animation="wave"
          sx={{ width: "45%", height: 18, borderRadius: 1 }}
        />
        <Box sx={{ flex: 1, minHeight: 12 }} />
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ pt: 1 }}
        >
          <Skeleton
            variant="text"
            animation="wave"
            sx={{ width: "35%", height: 26, borderRadius: 1 }}
          />
          <Skeleton
            variant="rounded"
            animation="wave"
            sx={{ width: 40, height: 40, borderRadius: 2.5 }}
          />
        </Stack>
      </Box>
    </Box>
  );
}

export function SectionHeader({
  title,
  to,
  titleId,
  titleComponent = "h2",
}) {
  return (
    <Stack
      direction="row"
      gap={{ xs: 1.25, sm: 2 }}
      sx={{
        alignItems: { xs: "center", sm: "flex-end" },
        justifyContent: "space-between",
        mb: { xs: 2, sm: 3 },
        minWidth: 0,
      }}
    >
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography
          id={titleId}
          component={titleComponent}
          variant="h4"
          sx={{
            mt: 0.5,
            maxWidth: 760,
            fontSize: {
              xs: 18,
              sm: 24,
              md: 30,
            },
            fontWeight: 800,
            lineHeight: 1.2,
            overflowWrap: "break-word",
          }}
        >
          {title}
        </Typography>
      </Box>
      {to && (
        <Button
          component={RouterLink}
          to={to}
          endIcon={
            <ArrowForwardIcon
              sx={{
                fontSize: {
                  xs: "16px !important",
                  sm: "18px !important",
                  md: "20px !important",
                },
              }}
            />
          }
          sx={{
            color: "text.primary",
            fontSize: { xs: 12.5, sm: 14, md: 16 },
            fontWeight: 600,
            whiteSpace: "nowrap",
            minHeight: { xs: 36, sm: 44 },
            minWidth: "auto",
            px: { xs: 0.75, sm: 1.5 },
            py: 0.5,
            textTransform: "none",
            flexShrink: 0,
            "& .MuiButton-endIcon": {
              ml: { xs: 0.5, sm: 0.75 },
            },
          }}
        >
          View all
        </Button>
      )}
    </Stack>
  );
}

export default function RecommendedSection({
  cartArtworkIds,
  onAddToCart,
  onRemoveFromCart,
  refreshKey = 0,
}) {
  const theme = useTheme();
  const [recommendedArtworks, setRecommendedArtworks] = useState([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(true);
  const [recommendationMode, setRecommendationMode] = useState("");
  const [recommendationSignals, setRecommendationSignals] = useState({
    search_filter_events: 0,
    preferred_artists: 0,
    sasrec_candidates: 0,
    available_unseen: 0,
  });
  const [recommendationHistoryLength, setRecommendationHistoryLength] = useState(0);

  const recommendationRequest = useRef(0);
  const loadRecommendations = useCallback(async () => {
    const requestId = ++recommendationRequest.current;
    try {
      setRecommendationsLoading(true);
      const response = await fetchRecommendations(4);
      if (requestId !== recommendationRequest.current) return;

      const list = Array.isArray(response?.recommendations) ? response.recommendations : [];
      setRecommendedArtworks(list);
      setRecommendationMode(response?.mode || "");
      setRecommendationHistoryLength(Number(response?.history_length || 0));
      setRecommendationSignals(
        response?.signals || {
          search_filter_events: 0,
          preferred_artists: 0,
          sasrec_candidates: 0,
          available_unseen: 0,
        },
      );
    } catch (error) {
      if (requestId !== recommendationRequest.current) return;
      console.warn("Recommendation section error:", error);
      setRecommendedArtworks([]);
      setRecommendationMode("unavailable");
    } finally {
      if (requestId === recommendationRequest.current) {
        setRecommendationsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    let refreshTimer;
    const refresh = () => {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(loadRecommendations, 350);
    };
    loadRecommendations();
    window.addEventListener("recommendation-updated", refresh);
    window.addEventListener("artist-follow-updated", refresh);
    window.addEventListener("cart-updated", refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      clearTimeout(refreshTimer);
      recommendationRequest.current += 1;
      window.removeEventListener("recommendation-updated", refresh);
      window.removeEventListener("artist-follow-updated", refresh);
      window.removeEventListener("cart-updated", refresh);
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [loadRecommendations, refreshKey]);

  const visibleRecommendedArtworks = useMemo(
    () => recommendedArtworks.filter((artwork) => Number(artwork.is_sold_out) !== 1),
    [recommendedArtworks],
  );

  if (!recommendationsLoading && visibleRecommendedArtworks.length === 0) {
    return null;
  }

  return (
    <Box
      id="recommended"
      sx={{
        px: { xs: 2, sm: 4, lg: 6 },
        py: { xs: 4, md: 6 },
        width: "100%",
        overflow: "hidden",
        mt: { xs: 0, md: -1 },
        backgroundColor: theme.palette.background.default,
      }}
    >
      <Box sx={{ mb: 3 }}>
        {recommendationsLoading ? (
          <Stack spacing={1} sx={{ mb: 3 }}>
            <Skeleton variant="text" animation="wave" width={100} height={18} />
            <Skeleton variant="text" animation="wave" sx={{ width: { xs: "85%", sm: 380 } }} height={20} />
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Skeleton variant="text" animation="wave" sx={{ width: { xs: 190, sm: 280 } }} height={38} />
              <Skeleton variant="rounded" animation="wave" width={88} height={36} sx={{ borderRadius: 2 }} />
            </Stack>
          </Stack>
        ) : (
          <>
            <Typography
              variant="overline"
              sx={{
                color: theme.palette.error.main,
                fontWeight: 800,
                letterSpacing: 1.5,
              }}
            >
              {PERSONALIZED_RECOMMENDATION_MODES.has(recommendationMode) ? "PERSONALIZED" : "DISCOVER"}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ maxWidth: 650 }}
            >
              {getRecommendationMessage(recommendationSignals, recommendationHistoryLength)}
            </Typography>

            <SectionHeader
              title="Recommended for You"
              to="/buyer/shop?recommendations=1"
            />
          </>
        )}
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "repeat(2, minmax(0, 1fr))",
            sm: "repeat(2, minmax(0, 1fr))",
            md: "repeat(4, minmax(0, 1fr))",
          },
          gap: { xs: 1.25, sm: 2, md: 2.5 },
        }}
      >
        {recommendationsLoading
          ? Array.from({ length: 4 }).map((_, index) => (
              <ArtworkCardSkeleton key={`recommended-skeleton-${index}`} />
            ))
          : visibleRecommendedArtworks.map((artwork) => (
              <ArtworkCard
                key={artwork.artwork_id || artwork.id}
                artwork={artwork}
                isInCart={cartArtworkIds.has(String(artwork.artwork_id || artwork.id))}
                onAddToCart={onAddToCart}
                onRemoveFromCart={onRemoveFromCart}
              />
            ))}
      </Box>
    </Box>
  );
}
