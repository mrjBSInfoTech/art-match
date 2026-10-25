import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  IconButton,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import ShareOutlinedIcon from "@mui/icons-material/ShareOutlined";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchFavorites, toggleFavorite } from "../../api/buyer/favoriteAPI";
import WatermarkedArtworkImage from "../../components/buyer/Artwork/WatermarkedArtworkImage";

const tabs = ["All hearts", "Paintings", "Sculpture", "Photography"];

const normalizeGenre = (genre) => {
  if (!genre) return "";
  const value = String(genre).trim();
  if (value.toLowerCase() === "painting" || value.toLowerCase() === "paintings") {
    return "Paintings";
  }
  if (value.toLowerCase() === "sculpture" || value.toLowerCase() === "sculptures") {
    return "Sculpture";
  }
  if (value.toLowerCase() === "photography") {
    return "Photography";
  }
  return value;
};

function ShopArtworkCard({ artwork, onOpen, isFavorite, onToggleFavorite }) {
  const theme = useTheme();
  const darkMode = theme.palette.mode === "dark";
  const hasImage = Boolean(artwork.image);
  const status = String(artwork.status || "").toLowerCase();
  const soldOut = Number(artwork.is_sold_out) === 1;
  const badge = soldOut
    ? "Sold out"
    : status === "available" || status === "for sale"
      ? "For Sale"
      : artwork.genre || "Artwork";
  const rating = Number(artwork.average_rating ?? artwork.rating);
  const ratingCount = Number(artwork.rating_count ?? artwork.total_reviews);
  const artworkId = artwork.artwork_id || artwork.id;

  return (
    <Box
      sx={{
        minWidth: 0,
        overflow: "hidden",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1.5,
        backgroundColor: "background.paper",
        transition: "transform 180ms ease, box-shadow 180ms ease",
        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow: darkMode
            ? "0 8px 24px rgba(0, 0, 0, 0.42)"
            : "0 8px 20px rgba(68, 41, 15, 0.07)",
        },
      }}
    >
      <Box
        component="button"
        type="button"
        onClick={() => onOpen(artworkId)}
        aria-label={`View ${artwork.title || "artwork"}`}
        sx={{
          position: "relative",
          display: "flex",
          width: "100%",
          aspectRatio: "1.35 / 1",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          border: 0,
          p: 0,
          backgroundColor: darkMode ? "#1e293b" : "#eeeae4",
          backgroundPosition: "center",
          backgroundSize: "cover",
          cursor: "pointer",
        }}
      >
        <WatermarkedArtworkImage
          image={artwork.image}
          alt={artwork.title || "Artwork"}
          sx={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            pointerEvents: "none",
          }}
        />
        {!hasImage && (
          <ImageOutlinedIcon
            sx={{
              color: darkMode ? "text.secondary" : "#d2c8bb",
              fontSize: 38,
            }}
          />
        )}
        <Typography
          component="span"
          sx={{
            position: "absolute",
            top: 7,
            left: 7,
            maxWidth: "calc(100% - 52px)",
            overflow: "hidden",
            px: 0.8,
            py: 0.25,
            borderRadius: 0.5,
            backgroundColor: soldOut ? "text.secondary" : "error.main",
            color: "#fff",
            fontSize: 9,
            fontWeight: 800,
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {badge}
        </Typography>
      </Box>

      <Box sx={{ p: { xs: 1, sm: 1.25 } }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          gap={0.5}
        >
          <Typography
            component="button"
            onClick={() => onOpen(artworkId)}
            title={artwork.title || "Untitled artwork"}
            sx={{
              minWidth: 0,
              overflow: "hidden",
              border: 0,
              p: 0,
              background: "none",
              color: "text.primary",
              font: "inherit",
              fontSize: 12,
              fontWeight: 800,
              textAlign: "left",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              cursor: "pointer",
            }}
          >
            {artwork.title || "Untitled artwork"}
          </Typography>
          {Number.isFinite(rating) && rating > 0 && (
            <Typography
              variant="caption"
              sx={{ flexShrink: 0, color: "text.secondary", fontSize: 9 }}
            >
              ★ {rating.toFixed(2)}{Number.isFinite(ratingCount) && ratingCount > 0 ? ` (${ratingCount})` : ""}
            </Typography>
          )}
        </Stack>
        <Typography
          variant="caption"
          display="block"
          noWrap
          sx={{ mt: 0.25, color: "text.secondary", fontSize: 10 }}
        >
          {[artwork.artist || "Independent Artist", artwork.genre]
            .filter(Boolean)
            .join(" · ")}
        </Typography>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ mt: 0.5 }}
        >
          <Typography
            sx={{ color: "error.main", fontSize: 13, fontWeight: 800 }}
            noWrap
          >
            ₱{Number(artwork.price || 0).toLocaleString()}
          </Typography>
          <IconButton
            aria-label={
              isFavorite ? "Remove from favorites" : "Add to favorites"
            }
            title={isFavorite ? "Remove from favorites" : "Add to favorites"}
            size="small"
            onClick={() => onToggleFavorite(artworkId)}
            sx={{
              width: 28,
              height: 28,
              color: isFavorite ? "error.main" : "text.primary",
              backgroundColor: darkMode ? "#1e293b" : "#fff2dc",
              "&:hover": {
                backgroundColor: darkMode ? "#334155" : "#ffebcc",
              },
            }}
          >
            {isFavorite ? (
              <FavoriteIcon sx={{ fontSize: 15 }} />
            ) : (
              <FavoriteBorderIcon sx={{ fontSize: 15 }} />
            )}
          </IconButton>
        </Stack>
      </Box>
    </Box>
  );
}

export default function BuyerFavorites() {
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = useState("All hearts");
  const [artworks, setArtworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const loadFavorites = async () => {
      try {
        setLoading(true);
        setError("");
        const favorites = await fetchFavorites();
        if (!active) return;
        setArtworks(Array.isArray(favorites) ? favorites : []);
      } catch (loadError) {
        if (!active) return;
        setError(loadError.message || "Failed to load favorites.");
      } finally {
        if (active) setLoading(false);
      }
    };

    loadFavorites();
    return () => {
      active = false;
    };
  }, []);

  const handleToggleFavorite = async (artworkId) => {
    try {
      const result = await toggleFavorite(artworkId);
      if (result?.isFavorite === false) {
        setArtworks((current) =>
          current.filter((artwork) => String(artwork.artwork_id) !== String(artworkId)),
        );
      }
    } catch (toggleError) {
      setError(toggleError.message || "Unable to update favorites.");
    }
  };

  const visibleArtworks = useMemo(() => {
    if (selectedTab === "All hearts") return artworks;
    return artworks.filter(
      (artwork) => normalizeGenre(artwork.genre) === selectedTab,
    );
  }, [artworks, selectedTab]);

  const openArtwork = (artworkId) =>
    navigate(`/buyer/artwork/view/${artworkId}`);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundColor: "background.default",
        color: "text.primary",
      }}
    >
      <Container maxWidth="xl" sx={{ px: { xs: 2, sm: 3, lg: 5 }, py: 0 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            minHeight: 72,
            borderBottom: 1,
            borderColor: "divider",
            gap: 2,
            flexWrap: "wrap",
          }}
        >
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {tabs.map((tab) => {
              const active = selectedTab === tab;
              return (
                <Button
                  key={tab}
                  onClick={() => setSelectedTab(tab)}
                  sx={{
                    minWidth: 0,
                    px: 1.5,
                    py: 0.75,
                    borderRadius: 0,
                    borderBottom: "3px solid",
                    borderColor: (theme) =>
                      active
                        ? theme.palette.error[
                            theme.palette.mode === "dark" ? "light" : "main"
                          ]
                        : "transparent",
                    color: active ? "text.primary" : "text.secondary",
                    fontSize: 14,
                    fontWeight: 600,
                    textTransform: "none",
                    background: "transparent",
                    minHeight: 0,
                    lineHeight: 1.2,
                    "&:hover": {
                      backgroundColor: "action.hover",
                    },
                  }}
                >
                  {tab}
                </Button>
              );
            })}
          </Stack>

          <Stack direction="row" spacing={1.5} alignItems="center">
            <Button
              variant="outlined"
              startIcon={<ShareOutlinedIcon sx={{ fontSize: 18 }} />}
              sx={{
                borderRadius: 999,
                borderColor: "divider",
                color: "text.primary",
                textTransform: "none",
                fontWeight: 700,
                px: 2,
                py: 0.8,
                minHeight: 40,
                backgroundColor: "background.paper",
                "&:hover": {
                  backgroundColor: "action.hover",
                  borderColor: "text.secondary",
                },
              }}
            >
              Share Favorites
            </Button>
            <Button
              variant="contained"
              onClick={() => navigate("/buyer/shop")}
              sx={{
                borderRadius: 999,
                bgcolor: "error.main",
                color: "error.contrastText",
                textTransform: "none",
                fontWeight: 700,
                px: 2.5,
                py: 0.85,
                minHeight: 40,
                boxShadow: "none",
                "&:hover": {
                  bgcolor: "error.dark",
                  boxShadow: "none",
                },
              }}
            >
              Explore Gallery
            </Button>
          </Stack>
        </Box>

        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress size={32} />
          </Box>
        )}

        {!loading && error && <Alert severity="error">{error}</Alert>}

        {!loading && !error && visibleArtworks.length === 0 && (
          <Box sx={{ py: 5, textAlign: "center" }}>
            <Typography variant="h6" sx={{ color: "text.primary", mb: 1 }}>
              No saved favorites yet.
            </Typography>
            <Button
              variant="contained"
              onClick={() => navigate("/buyer/shop")}
              sx={{
                borderRadius: 999,
                bgcolor: "error.main",
                color: "error.contrastText",
                "&:hover": { bgcolor: "error.dark" },
                textTransform: "none",
                fontWeight: 700,
              }}
            >
              Explore artwork
            </Button>
          </Box>
        )}

        {!loading && !error && visibleArtworks.length > 0 && (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "repeat(1, minmax(0, 1fr))",
                sm: "repeat(2, minmax(0, 1fr))",
                md: "repeat(4, minmax(0, 1fr))",
              },
              gap: { xs: 1.5, sm: 2 },
              py: 4,
            }}
          >
            {visibleArtworks.map((artwork) => (
              <ShopArtworkCard
                key={artwork.favorite_id || artwork.artwork_id || artwork.id}
                artwork={artwork}
                onOpen={openArtwork}
                isFavorite={true}
                onToggleFavorite={handleToggleFavorite}
              />
            ))}
          </Box>
        )}
      </Container>
    </Box>
  );
}