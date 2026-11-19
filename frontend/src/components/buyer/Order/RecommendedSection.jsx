import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Skeleton,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import ArtworkCard from "../Artwork/ArtworkCard";
import AppSnackbar from "../../common/AppSnackbar";
import {
  ArtworkCardSkeleton,
  SectionHeader,
} from "../Main/RecommendedSection";
import { fetchRecommendations } from "../../../api/buyer/recommendationAPI";
import { fetchCart } from "../../../api/buyer/cartAPI";
import {
  addArtworkToBuyerCart,
  removeArtworkFromBuyerCart,
} from "../../../utils/buyerCartActions";
import {
  PERSONALIZED_RECOMMENDATION_MODES,
  getRecommendationMessage,
} from "../../../utils/recommendationDisplay";
import { isAuthenticated } from "../../../../utils/auth";

export default function RecommendedSection() {
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
  const [cartArtworkIds, setCartArtworkIds] = useState(() => new Set());
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");

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
      console.warn("Order finish recommendation error:", error);
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
    window.addEventListener("focus", refresh);
    return () => {
      clearTimeout(refreshTimer);
      recommendationRequest.current += 1;
      window.removeEventListener("recommendation-updated", refresh);
      window.removeEventListener("artist-follow-updated", refresh);
      window.removeEventListener("cart-updated", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [loadRecommendations]);

  useEffect(() => {
    let active = true;
    const loadCartIds = async () => {
      if (!isAuthenticated("buyer")) {
        setCartArtworkIds(new Set());
        return;
      }
      try {
        const cart = await fetchCart();
        if (active) {
          setCartArtworkIds(
            new Set((Array.isArray(cart) ? cart : []).map((item) => String(item.artwork_id))),
          );
        }
      } catch (error) {
        console.error("Unable to load cart status for order finish recommendations:", error);
      }
    };
    loadCartIds();
    window.addEventListener("cart-updated", loadCartIds);
    window.addEventListener("focus", loadCartIds);
    return () => {
      active = false;
      window.removeEventListener("cart-updated", loadCartIds);
      window.removeEventListener("focus", loadCartIds);
    };
  }, []);

  const showSnackbar = (message, severity = "success") => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const closeSnackbar = (event, reason) => {
    if (reason === "clickaway") return;
    setSnackbarOpen(false);
  };

  const handleAddToCart = (artworkId, quantity = 1, selectedProducts, orderNote, artwork) =>
    addArtworkToBuyerCart({
      artworkId,
      quantity,
      selectedProducts,
      orderNote,
      artwork,
      onSuccessId: (id) => setCartArtworkIds((prev) => new Set(prev).add(id)),
      onNotify: showSnackbar,
    });

  const handleRemoveFromCart = (artworkId) =>
    removeArtworkFromBuyerCart({
      artworkId,
      onRemovedId: (id) =>
        setCartArtworkIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        }),
      onNotify: showSnackbar,
    });

  const visibleRecommendedArtworks = useMemo(
    () => recommendedArtworks.filter((artwork) => Number(artwork.is_sold_out) !== 1),
    [recommendedArtworks],
  );

  if (!recommendationsLoading && visibleRecommendedArtworks.length === 0) {
    return null;
  }

  return (
    <>
      <Box
        id="order-finish-recommended"
        sx={{
          px: { xs: 2, sm: 4, lg: 6 },
          py: { xs: 4, md: 6 },
          width: "100%",
          overflow: "hidden",
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
                <ArtworkCardSkeleton key={`order-finish-rec-skeleton-${index}`} />
              ))
            : visibleRecommendedArtworks.map((artwork) => (
                <ArtworkCard
                  key={artwork.artwork_id || artwork.id}
                  artwork={artwork}
                  isInCart={cartArtworkIds.has(String(artwork.artwork_id || artwork.id))}
                  onAddToCart={handleAddToCart}
                  onRemoveFromCart={handleRemoveFromCart}
                />
              ))}
        </Box>
      </Box>

      {/* Snackbar Notification */}
      <AppSnackbar
        open={snackbarOpen}
        message={snackbarMessage}
        severity={snackbarSeverity}
        onClose={closeSnackbar}
        sx={{ bottom: { xs: 80, md: 24 } }}
      />
    </>
  );
}
