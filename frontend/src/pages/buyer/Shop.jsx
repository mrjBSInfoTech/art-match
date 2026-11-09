import { createElement, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  Container,
  IconButton,
  Skeleton,
  Snackbar,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import ForumOutlinedIcon from "@mui/icons-material/ForumOutlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import { fetchArtworks } from "../../api/buyer/artworkAPI";
import { fetchRecommendations } from "../../api/buyer/recommendationAPI";
import { fetchFavorites, toggleFavorite } from "../../api/buyer/favoriteAPI";
import { addToCart } from "../../api/buyer/cartAPI";

import { getSearchColor } from "../../utils/artworkColors";

import { PRICE_LIMIT, readPriceRange, matchesPriceRange, formatPriceRange } from "../../utils/artworkPrice";
import { scoreArtworkSearch } from "../../utils/artworkSearch";
import { matchesArtworkCategoryFilters } from "../../utils/artworkCategoryFilters";
import { isAuthenticated } from "../../../utils/auth";
import ConnectionErrorPanel from "../../components/buyer/ConnectionErrorPanel";
import ArtworkCard from "../../components/buyer/Artwork/ArtworkCard";

const PAGE_SIZE = 8;

const shortcuts = [
  {
    title: "Orders",
    description: "Order status, cancellations, receipts",
    icon: Inventory2OutlinedIcon,
    path: "/buyer/profile/orders",
  },
  {
    title: "Message",
    description: "Contact artists or buyer support in one safe inbox",
    icon: ForumOutlinedIcon,
    path: "/buyer/messages",
  },
  {
    title: "Shipping",
    description: "Packaging, tracking, delivery timing",
    icon: LocalShippingOutlinedIcon,
    path: "/buyer/profile/orders",
  },
  {
    title: "Manage Address",
    description: "Delivery address and unit details",
    icon: LocationOnOutlinedIcon,
    path: "/buyer/profile/addresses",
  },
];

export default function Shop() {
  const theme = useTheme();
  const darkMode = theme.palette.mode === "dark";
  const navigate = useNavigate();
  const { genre } = useParams();
  const [searchParams] = useSearchParams();
  const recommendationsOnly = searchParams.get("recommendations") === "1";
  const [minimumPrice, maximumPrice] = readPriceRange(searchParams);
  const hasPriceFilter = minimumPrice > 0 || maximumPrice < PRICE_LIMIT;
  const searchQuery = (searchParams.get("q") || "").trim().toLowerCase();
  const searchColor = getSearchColor(searchQuery);
  const searchLabel = searchColor || searchParams.get("q") || "";
  const categoryFilters = useMemo(
    () => ({
      artTypes: searchParams.getAll("art_type"),
      styles: searchParams.getAll("style"),
      materials: searchParams.getAll("material"),
      colors: searchParams.getAll("color"),
    }),
    [searchParams],
  );
  const hasCategoryFilters = Object.values(categoryFilters).some(
    (values) => values.length > 0,
  );
  const selectedGenre = genre ? decodeURIComponent(genre).toLowerCase() : "";
  const [artworks, setArtworks] = useState([]);
  const [favoriteIds, setFavoriteIds] = useState(new Set());
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [cartSnackbarOpen, setCartSnackbarOpen] = useState(false);
  const [cartSnackbarMessage, setCartSnackbarMessage] = useState("");
  const [cartSnackbarSeverity, setCartSnackbarSeverity] = useState("success");

  const loadArtworks = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError("");
      const response = recommendationsOnly
        ? await fetchRecommendations("all")
        : await fetchArtworks();
      if (recommendationsOnly && response?.mode === "unavailable") {
        throw new Error("Unable to load recommendations. Please try again.");
      }
      const list = recommendationsOnly
        ? response?.recommendations || []
        : Array.isArray(response)
          ? response
          : response?.data || [];
      const availableList = (Array.isArray(list) ? list : []).filter(
        (artwork) => Number(artwork.is_sold_out) !== 1,
      );
      setArtworks(availableList);
    } catch (err) {
      setLoadError(err.message || "Failed to load artworks.");
    } finally {
      setLoading(false);
    }
  }, [recommendationsOnly]);

  const loadFavoriteIds = useCallback(async () => {
    if (!isAuthenticated("buyer")) {
      setFavoriteIds(new Set());
      return;
    }

    try {
      const favorites = await fetchFavorites();
      setFavoriteIds(new Set((favorites || []).map((item) => String(item.artwork_id))));
    } catch {
      setFavoriteIds(new Set());
    }
  }, []);

  useEffect(() => {
    loadArtworks();
    loadFavoriteIds();
  }, [loadArtworks, loadFavoriteIds]);

  const handleFavoriteToggle = async (artworkId) => {
    const artworkKey = String(artworkId);
    if (!isAuthenticated("buyer")) {
      navigate("/buyer/login");
      return;
    }

    try {
      const result = await toggleFavorite(artworkId);
      const nextValue = Boolean(result?.isFavorite);
      setFavoriteIds((current) => {
        const next = new Set(current);
        if (nextValue) next.add(artworkKey);
        else next.delete(artworkKey);
        return next;
      });
    } catch (toggleError) {
      setError(toggleError.message || "Unable to update favorites.");
    }
  };

  const visibleArtworks = useMemo(
    () =>
      artworks
        .filter((artwork) =>
          (!selectedGenre || String(artwork.genre || "").toLowerCase() === selectedGenre) &&
          matchesPriceRange(artwork.price, minimumPrice, maximumPrice) &&
          matchesArtworkCategoryFilters(artwork, categoryFilters),
        )
        .map((artwork) => ({ artwork, score: scoreArtworkSearch(artwork, searchQuery) }))
        .filter(({ score }) => score >= 0)
        .sort((a, b) => b.score - a.score)
        .map(({ artwork }) => artwork),
    [artworks, searchQuery, selectedGenre, minimumPrice, maximumPrice, categoryFilters],
  );
  const pageCount = Math.max(1, Math.ceil(visibleArtworks.length / PAGE_SIZE));
  const pageArtworks = visibleArtworks.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );
  const pageTitle = recommendationsOnly
    ? "Recommended for you"
    : selectedGenre
      ? `${genre} artwork`
      : searchQuery
        ? "Search results"
        : "Shop artwork";
  const collectionLabel = recommendationsOnly
    ? "Recommended artworks"
    : selectedGenre
      ? `Shop / ${genre}`
      : searchQuery
        ? `Results for \u201c${searchLabel}\u201d`
        : hasCategoryFilters
          ? "Filtered artworks"
          : "All artworks";

  useEffect(() => {
    setPage(1);
  }, [searchQuery, selectedGenre, minimumPrice, maximumPrice, recommendationsOnly, searchParams]);

  const openArtwork = (artwork) =>
    navigate(`/buyer/artwork/view/${artwork.artwork_id || artwork.id}`);

  const handleAddToCart = async (artwork) => {
    const artworkId = artwork.artwork_id || artwork.id;
    if (!isAuthenticated("buyer")) {
      navigate("/buyer/login");
      return;
    }
    const isCustomize =
      String(artwork?.product_type || "").trim().toLowerCase() === "customize";
    const isProduct =
      String(artwork?.art_type || "").trim().toLowerCase() === "product";
    if (isCustomize || isProduct) {
      navigate(`/buyer/artwork/view/${artworkId}`);
      return;
    }
    try {
      await addToCart(artworkId, 1);
      setCartSnackbarMessage(`"${artwork.title || "Artwork"}" added to your cart.`);
      setCartSnackbarSeverity("success");
      setCartSnackbarOpen(true);
    } catch (err) {
      setCartSnackbarMessage(err.message || "Unable to add to cart.");
      setCartSnackbarSeverity("error");
      setCartSnackbarOpen(true);
    }
  };

  if (loadError && !loading) {
    return <ConnectionErrorPanel title="Shop Unavailable" onRetry={loadArtworks} />;
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundColor: darkMode ? "background.default" : "#fffaf2",
        py: { xs: 2, md: 3 },
      }}
    >
      <Helmet titleTemplate="%s - ArtMatch">
        <title>{recommendationsOnly ? "Recommended for You" : "Shop"}</title>
      </Helmet>
      <Container maxWidth="xl" sx={{ px: { xs: 2, sm: 3, lg: 5 } }}>
        <Box
          component="header"
          sx={{
            mb: { xs: 2.5, md: 3.5 },
            p: { xs: 2, sm: 3, md: 4 },
            border: "1px solid",
            borderColor: "divider",
            borderRadius: { xs: 2, sm: 3 },
            background: darkMode
              ? "linear-gradient(135deg, rgba(30, 41, 59, 0.96), rgba(15, 23, 42, 0.96))"
              : "linear-gradient(135deg, #fff4e6, #fffaf2 68%)",
          }}
        >
          <Typography
            component="p"
            sx={{
              mb: 0.75,
              color: "error.main",
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            ArtMatch collection
          </Typography>
          <Typography
            component="h1"
            sx={{
              color: "text.primary",
              fontSize: { xs: "1.8rem", sm: "2.3rem", md: "2.75rem" },
              fontWeight: 900,
              lineHeight: 1.12,
            }}
          >
            {pageTitle}
          </Typography>
          <Typography
            sx={{
              maxWidth: 620,
              mt: 1,
              color: "text.secondary",
              fontSize: { xs: 14, sm: 16 },
              lineHeight: 1.6,
            }}
          >
            {recommendationsOnly
              ? "A selection of original works chosen for you."
              : "Explore original artwork and creative work from the CAFA artist community."}
          </Typography>
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "repeat(2, minmax(0, 1fr))",
              sm: "repeat(4, minmax(0, 1fr))",
            },
            gap: { xs: 1, sm: 1.5 },
            mb: { xs: 3, md: 4 },
          }}
        >
          {shortcuts.map(({ title, description, icon, path }) => (
            <ButtonBase
              key={title}
              onClick={() => navigate(path)}
              sx={{
                minWidth: 0,
                minHeight: { xs: 72, sm: 76 },
                display: "flex",
                justifyContent: "flex-start",
                gap: { xs: 1, sm: 1.5 },
                px: { xs: 1, sm: 1.5 },
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
                backgroundColor: "background.paper",
                textAlign: "left",
                "&:focus-visible": {
                  outline: "2px solid",
                  outlineColor: "primary.main",
                  outlineOffset: 2,
                },
                "&:hover": {
                  backgroundColor: darkMode ? "#1e293b" : "#fff6e8",
                  borderColor: darkMode ? "#475569" : "#e8cda6",
                },
              }}
            >
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  flexShrink: 0,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: "50%",
                  backgroundColor: darkMode
                    ? "rgba(239, 68, 68, 0.14)"
                    : "#fff2dc",
                  color: "error.main",
                }}
              >
                {createElement(icon, { sx: { fontSize: 20 } })}
              </Box>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography
                  sx={{
                    color: "text.primary",
                    fontSize: 13,
                    fontWeight: 800,
                    lineHeight: 1.2,
                  }}
                  noWrap
                >
                  {title}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    display: "-webkit-box",
                    overflow: "hidden",
                    color: "text.secondary",
                    fontSize: 11,
                    lineHeight: 1.35,
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                  }}
                >
                  {description}
                </Typography>
              </Box>
              <Typography
                aria-hidden="true"
                sx={{ flexShrink: 0, color: "text.primary", fontSize: 19 }}
              >
                ›
              </Typography>
            </ButtonBase>
          ))}
        </Box>

        <Stack
          direction={{ xs: "column", sm: "row" }}
          alignItems={{ xs: "flex-start", sm: "flex-end" }}
          justifyContent="space-between"
          gap={1}
          sx={{ mb: 2 }}
        >
          <Box>
            <Typography
              component="h2"
              sx={{
                color: "text.primary",
                fontSize: { xs: 20, sm: 24 },
                fontWeight: 800,
              }}
            >
              Explore artworks
            </Typography>
            <Typography sx={{ mt: 0.25, color: "text.secondary", fontSize: 13 }}>
              {collectionLabel}
              {hasPriceFilter && ` · ${formatPriceRange([minimumPrice, maximumPrice])}`}
            </Typography>
          </Box>
          {!loading && !loadError && (
            <Typography
              aria-live="polite"
              sx={{
                color: "text.secondary",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {visibleArtworks.length} {visibleArtworks.length === 1 ? "artwork" : "artworks"}
            </Typography>
          )}
        </Stack>

        {loading && (
          <Box
            aria-label="Loading artworks"
            aria-busy="true"
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "minmax(0, 1fr)",
                sm: "repeat(2, minmax(0, 1fr))",
                md: "repeat(4, minmax(0, 1fr))",
              },
              gap: { xs: 1.5, sm: 2 },
            }}
          >
            {Array.from({ length: PAGE_SIZE }, (_, index) => (
              <Box
                key={index}
                sx={{
                  overflow: "hidden",
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 2,
                  backgroundColor: "background.paper",
                }}
              >
                <Skeleton variant="rectangular" sx={{ aspectRatio: "1.25 / 1" }} />
                <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
                  <Skeleton width="72%" height={26} />
                  <Skeleton width="52%" height={20} sx={{ mt: 0.5 }} />
                  <Skeleton width="38%" height={28} sx={{ mt: 1 }} />
                </Box>
              </Box>
            ))}
          </Box>
        )}
        {error && <Alert severity="error" role="status">{error}</Alert>}
        {!loading && !loadError && !error && visibleArtworks.length === 0 && (
          <Box
            sx={{
              px: 2,
              py: { xs: 5, sm: 7 },
              border: "1px dashed",
              borderColor: "divider",
              borderRadius: 2,
              textAlign: "center",
              backgroundColor: "background.paper",
            }}
          >
            <Typography component="h3" sx={{ fontSize: 20, fontWeight: 800 }}>
              No artworks found
            </Typography>
            <Typography sx={{ mt: 0.75, color: "text.secondary" }}>
              Try a different search or browse the full collection.
            </Typography>
            <Button
              variant="contained"
              onClick={() => navigate("/buyer/shop")}
              sx={{ minHeight: 44, mt: 2 }}
            >
              Browse all artworks
            </Button>
          </Box>
        )}

        {!loading && !loadError && !error && visibleArtworks.length > 0 && (
          <>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "repeat(1, minmax(0, 1fr))",
                  sm: "repeat(2, minmax(0, 1fr))",
                  md: "repeat(4, minmax(0, 1fr))",
                },
                gap: { xs: 1.5, sm: 2 },
              }}
            >
              {pageArtworks.map((artwork) => (
                <ArtworkCard
                  key={artwork.artwork_id || artwork.id}
                  artwork={artwork}
                  onOpen={openArtwork}
                  isFavorite={favoriteIds.has(String(artwork.artwork_id || artwork.id))}
                  onToggleFavorite={handleFavoriteToggle}
                  onAddToCart={handleAddToCart}
                />
              ))}
            </Box>

            {pageCount > 1 && (
              <Stack
                direction="row"
                justifyContent="center"
                alignItems="center"
                flexWrap="wrap"
                gap={0.75}
                sx={{ mt: 2.5 }}
              >
                <ButtonBase
                  disabled={page === 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  sx={{
                    minWidth: 70,
                    height: 34,
                    px: 1.5,
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 999,
                    backgroundColor: darkMode ? "#1e293b" : "#fff2dc",
                    color: "text.primary",
                    fontSize: 11,
                    fontWeight: 700,
                    "&:disabled": { opacity: 0.45 },
                  }}
                >
                  Previous
                </ButtonBase>
                {Array.from({ length: pageCount }, (_, index) => index + 1).map(
                  (pageNumber) => (
                    <ButtonBase
                      key={pageNumber}
                      aria-label={`Page ${pageNumber}`}
                      aria-current={page === pageNumber ? "page" : undefined}
                      onClick={() => setPage(pageNumber)}
                      sx={{
                        width: 34,
                        height: 34,
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: "50%",
                        backgroundColor:
                          page === pageNumber
                            ? "error.main"
                            : "background.paper",
                        color: page === pageNumber ? "#fff" : "text.primary",
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      {pageNumber}
                    </ButtonBase>
                  ),
                )}
                <ButtonBase
                  disabled={page === pageCount}
                  onClick={() =>
                    setPage((current) => Math.min(pageCount, current + 1))
                  }
                  sx={{
                    minWidth: 70,
                    height: 34,
                    px: 1.5,
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 999,
                    backgroundColor: darkMode ? "#1e293b" : "#fff2dc",
                    color: "text.primary",
                    fontSize: 11,
                    fontWeight: 700,
                    "&:disabled": { opacity: 0.45 },
                  }}
                >
                  Next
                </ButtonBase>
              </Stack>
            )}
          </>
        )}
      </Container>
      <Snackbar
        open={cartSnackbarOpen}
        autoHideDuration={3000}
        onClose={() => setCartSnackbarOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={() => setCartSnackbarOpen(false)}
          severity={cartSnackbarSeverity}
          variant="filled"
          sx={{
            borderRadius: 2,
            boxShadow: "0 10px 28px rgba(15, 23, 42, 0.18)",
            color: "#fff",
            fontWeight: 600,
          }}
        >
          {cartSnackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
