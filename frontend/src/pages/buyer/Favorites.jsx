import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import ShareOutlinedIcon from "@mui/icons-material/ShareOutlined";
import FavoriteOutlinedIcon from "@mui/icons-material/FavoriteOutlined";
import StarIcon from "@mui/icons-material/Star";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchFavorites, toggleFavorite } from "../../api/buyer/favoriteAPI";

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

const artworkImageUrl = (image) => {
  if (!image) return "";
  return image.startsWith("http")
    ? image
    : `http://localhost:5000/uploads/seller/uploadArtwork/${encodeURIComponent(image)}`;
};

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
                    borderColor: active ? "error.main" : "transparent",
                    color: active ? "text.primary" : "text.secondary",
                    fontSize: 14,
                    fontWeight: 600,
                    textTransform: "none",
                    background: "transparent",
                    minHeight: 0,
                    lineHeight: 1.2,
                    "&:hover": {
                      backgroundColor: "transparent",
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
                xs: "1fr",
                sm: "repeat(2, minmax(0, 1fr))",
                xl: "repeat(3, minmax(0, 1fr))",
              },
              gap: 3,
              py: 4,
            }}
          >
            {visibleArtworks.map((artwork) => (
              <Box
                key={artwork.favorite_id || artwork.artwork_id}
                sx={{
                  backgroundColor: "background.paper",
                  borderRadius: 4,
                  overflow: "hidden",
                  border: 1,
                  borderColor: "divider",
                  boxShadow: 1,
                }}
              >
                <Box
                  component="img"
                  src={artworkImageUrl(artwork.image)}
                  alt={artwork.title}
                  sx={{
                    display: "block",
                    width: "100%",
                    height: 260,
                    objectFit: "cover",
                    backgroundColor: "action.hover",
                  }}
                />

                <Box sx={{ px: 2.2, py: 1.6 }}>
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{ mb: 0.5 }}
                  >
                    <Typography
                      sx={{
                        fontWeight: 700,
                        fontSize: 19,
                        lineHeight: 1.2,
                        color: "text.primary",
                      }}
                    >
                      {artwork.title}
                    </Typography>
                    <Stack direction="row" alignItems="center" spacing={0.4}>
                      <StarIcon sx={{ fontSize: 16, color: "warning.main" }} />
                      <Typography sx={{ color: "text.primary", fontWeight: 600 }}>
                        {Number(artwork.rating || 5).toFixed(1)}
                      </Typography>
                    </Stack>
                  </Stack>

                  <Typography
                    variant="body2"
                    sx={{
                      color: "text.secondary",
                      fontWeight: 500,
                      mb: 1.5,
                    }}
                  >
                    {artwork.artist || "Independent Artist"} · {normalizeGenre(artwork.genre)}
                  </Typography>

                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <Typography
                      sx={{
                        color: "error.main",
                        fontSize: 18,
                        fontWeight: 800,
                      }}
                    >
                      ₱{Number(artwork.price || 0).toLocaleString()}
                    </Typography>

                    <IconButton
                      aria-label={`Remove ${artwork.title} from favorites`}
                      onClick={() => handleToggleFavorite(artwork.artwork_id)}
                      sx={{
                        bgcolor: "action.selected",
                        color: "error.main",
                        border: 1,
                        borderColor: "divider",
                        width: 36,
                        height: 36,
                        "&:hover": {
                          bgcolor: "action.hover",
                        },
                      }}
                    >
                      <FavoriteOutlinedIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Stack>
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Container>
    </Box>
  );
}
