import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Container,
  IconButton,
  Skeleton,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import FavoriteIcon from "@mui/icons-material/Favorite";
import { fetchArtworks } from "../../api/buyer/artworkAPI";
import { fetchFavorites, toggleFavorite } from "../../api/buyer/favoriteAPI";
import WatermarkedArtworkImage from "../../components/buyer/Artwork/WatermarkedArtworkImage";
import ConnectionErrorPanel from "../../components/buyer/ConnectionErrorPanel";
import { isAuthenticated } from "../../../utils/auth";

const profileImageUrl = (image) => {
  if (!image) return "http://localhost:5000/uploads/seller/profile.jpg";
  return image.startsWith("http")
    ? image
    : `http://localhost:5000/uploads/seller/uploadProfile/${encodeURIComponent(image)}`;
};

const groupArtworksByArtist = (artworks) => {
  const artists = new Map();

  artworks.forEach((artwork) => {
    if (Number(artwork.is_sold_out) === 1) return;

    const artistName =
      [artwork.first_name, artwork.last_name].filter(Boolean).join(" ") ||
      artwork.artist ||
      "Independent Artist";
    const artistId = artwork.student_id || artistName;
    const shopName = artwork.shop_name || artistName;
    const artist = artists.get(artistId) || {
      id: artistId,
      name: shopName,
      artistName,
      department: artwork.course || artwork.genre || "Independent Artist",
      bio: artwork.shop_description || artwork.description || "",
      profileImage: artwork.profile_image || "",
      artworks: [],
    };

    artist.profileImage ||= artwork.profile_image || "";
    artist.bio ||= artwork.shop_description || artwork.description || "";
    artist.artworks.push(artwork);
    artists.set(artistId, artist);
  });

  return [...artists.values()].sort(
    (first, second) => second.artworks.length - first.artworks.length,
  );
};

function GalleryArtworkCard({ artwork, onOpen, isFavorite, onToggleFavorite }) {
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
        borderRadius: 2,
        backgroundColor: "background.paper",
        transition: "transform 180ms ease, box-shadow 180ms ease",
        "&:focus-within": {
          outline: "2px solid",
          outlineColor: "primary.main",
          outlineOffset: 2,
        },
        "@media (hover: hover)": {
          "&:hover": {
            transform: "translateY(-2px)",
            boxShadow: darkMode
              ? "0 8px 24px rgba(0, 0, 0, 0.42)"
              : "0 8px 20px rgba(68, 41, 15, 0.07)",
          },
        },
        "@media (prefers-reduced-motion: reduce)": {
          transition: "none",
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
          aspectRatio: "1.2 / 1",
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
            px: 1,
            py: 0.5,
            borderRadius: 999,
            backgroundColor: soldOut ? "text.secondary" : "error.main",
            color: "#fff",
            fontSize: 11,
            fontWeight: 800,
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {badge}
        </Typography>
      </Box>

      <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
        <Stack
          direction="row"
          alignItems="flex-start"
          justifyContent="space-between"
          gap={1}
        >
          <Typography
            component="button"
            type="button"
            onClick={() => onOpen(artworkId)}
            title={artwork.title || "Untitled artwork"}
            sx={{
              minWidth: 0,
              border: 0,
              p: 0,
              background: "none",
              color: "text.primary",
              font: "inherit",
              fontSize: { xs: 14, sm: 15 },
              fontWeight: 800,
              lineHeight: 1.35,
              textAlign: "left",
              display: "-webkit-box",
              WebkitBoxOrient: "vertical",
              WebkitLineClamp: 2,
              overflow: "hidden",
              cursor: "pointer",
              "&:focus-visible": {
                outline: "2px solid",
                outlineColor: "primary.main",
                outlineOffset: 3,
              },
            }}
          >
            {artwork.title || "Untitled artwork"}
          </Typography>
          {Number.isFinite(rating) && rating > 0 && (
            <Typography
              variant="caption"
              sx={{ flexShrink: 0, color: "text.secondary", fontSize: 11 }}
            >
              ★ {rating.toFixed(2)}{Number.isFinite(ratingCount) && ratingCount > 0 ? ` (${ratingCount})` : ""}
            </Typography>
          )}
        </Stack>
        <Typography
          variant="caption"
          display="block"
          noWrap
          sx={{ mt: 0.75, color: "text.secondary", fontSize: 12 }}
        >
          {[artwork.artist || "Independent Artist", artwork.genre]
            .filter(Boolean)
            .join(" · ")}
        </Typography>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ mt: 1, pt: 0.5 }}
        >
          <Typography
            sx={{ color: "error.main", fontSize: 16, fontWeight: 800 }}
            noWrap
          >
            ₱{Number(artwork.price || 0).toLocaleString()}
          </Typography>
          <IconButton
            aria-label={
              isFavorite ? "Remove from favorites" : "Add to favorites"
            }
            title={isFavorite ? "Remove from favorites" : "Add to favorites"}
            onClick={() => onToggleFavorite(artworkId)}
            sx={{
              width: 44,
              height: 44,
              flexShrink: 0,
              color: isFavorite ? "error.main" : "text.primary",
              backgroundColor: darkMode ? "#1e293b" : "#fff2dc",
              "&:hover": {
                backgroundColor: darkMode ? "#334155" : "#ffebcc",
              },
            }}
          >
            {isFavorite ? (
              <FavoriteIcon />
            ) : (
              <FavoriteBorderIcon />
            )}
          </IconButton>
        </Stack>
      </Box>
    </Box>
  );
}

export default function Gallery() {
  const theme = useTheme();
  const darkMode = theme.palette.mode === "dark";
  const [artists, setArtists] = useState([]);
  const [favoriteIds, setFavoriteIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;

    const loadGallery = async () => {
      try {
        setLoading(true);
        setLoadError("");
        const response = await fetchArtworks();
        const artworks = Array.isArray(response)
          ? response
          : response?.data || [];
        const availableArtworks = artworks.filter(
          (artwork) => Number(artwork.is_sold_out) !== 1,
        );
        if (active) setArtists(groupArtworksByArtist(availableArtworks));
      } catch (loadError) {
        if (active)
          setLoadError(loadError.message || "Failed to load the gallery.");
      } finally {
        if (active) setLoading(false);
      }
    };

    const loadFavoriteIds = async () => {
      if (!isAuthenticated("buyer")) {
        if (active) setFavoriteIds(new Set());
        return;
      }

      try {
        const favorites = await fetchFavorites();
        if (!active) return;
        setFavoriteIds(
          new Set((favorites || []).map((item) => String(item.artwork_id))),
        );
      } catch {
        if (active) setFavoriteIds(new Set());
      }
    };

    loadGallery();
    loadFavoriteIds();
    return () => {
      active = false;
    };
  }, []);

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

  const openArtwork = (artworkId) =>
    navigate(`/buyer/artwork/view/${artworkId}`);
  const totalArtworkCount = artists.reduce(
    (total, artist) => total + artist.artworks.length,
    0,
  );

  if (loadError && !loading) {
    return <ConnectionErrorPanel title="Gallery unavailable" />;
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundColor: darkMode ? "background.default" : "#fffaf2",
        py: { xs: 2.5, md: 4 },
      }}
    >
      <Helmet titleTemplate="%s - ArtMatch">
        <title>Gallery</title>
      </Helmet>
      <Container maxWidth="xl" sx={{ px: { xs: 2, sm: 3, lg: 4 } }}>
        <Stack spacing={{ xs: 2.5, md: 3 }}>
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              alignItems: { xs: "flex-start", sm: "flex-end" },
              justifyContent: "space-between",
              gap: 2,
              p: { xs: 2, sm: 3, md: 4 },
              border: "1px solid",
              borderColor: "divider",
              borderRadius: { xs: 2, sm: 3 },
              background: darkMode
                ? "linear-gradient(135deg, rgba(30, 41, 59, 0.96), rgba(15, 23, 42, 0.96))"
                : "linear-gradient(135deg, #fff4e6, #fffaf2 68%)",
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant="overline"
                sx={{
                  color: "error.main",
                  fontWeight: 800,
                  letterSpacing: 1.4,
                }}
              >
                ARTISTS & THEIR WORK
              </Typography>
              <Typography
                variant="h4"
                component="h1"
                sx={{
                  color: "text.primary",
                  fontSize: { xs: "2rem", sm: "2.5rem", md: "3rem" },
                  fontWeight: 900,
                  lineHeight: 1.1,
                }}
              >
                The Gallery
              </Typography>
              <Typography
                sx={{
                  maxWidth: 640,
                  mt: 1,
                  color: "text.secondary",
                  fontSize: { xs: 14, sm: 16 },
                  lineHeight: 1.6,
                }}
              >
                Discover the artists behind the work and explore selected pieces from their collections.
              </Typography>
            </Box>
            <Button
              variant="contained"
              onClick={() => navigate("/buyer/shop")}
              sx={{
                minHeight: 44,
                px: 2.25,
                borderRadius: 999,
                textTransform: "none",
                fontWeight: 700,
                whiteSpace: "nowrap",
              }}
            >
              Browse all artworks
            </Button>
          </Box>

          {!loading && !loadError && (
            <Stack
              direction="row"
              flexWrap="wrap"
              gap={1}
              aria-live="polite"
            >
              <Box
                sx={{
                  px: 1.5,
                  py: 0.75,
                  borderRadius: 999,
                  backgroundColor: "background.paper",
                  border: "1px solid",
                  borderColor: "divider",
                  color: "text.secondary",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {artists.length} {artists.length === 1 ? "artist" : "artists"}
              </Box>
              <Box
                sx={{
                  px: 1.5,
                  py: 0.75,
                  borderRadius: 999,
                  backgroundColor: "background.paper",
                  border: "1px solid",
                  borderColor: "divider",
                  color: "text.secondary",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {totalArtworkCount} {totalArtworkCount === 1 ? "artwork" : "artworks"}
              </Box>
            </Stack>
          )}

          {loading && (
            <Box
              aria-label="Loading gallery"
              aria-busy="true"
              sx={{ display: "grid", gap: 2 }}
            >
              {Array.from({ length: 3 }, (_, index) => (
                <Box
                  key={index}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      md: "minmax(230px, 0.82fr) minmax(0, 3fr)",
                    },
                    gap: 2,
                  }}
                >
                  <Skeleton variant="rounded" height={220} />
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: {
                        xs: "repeat(2, minmax(0, 1fr))",
                        sm: "repeat(3, minmax(0, 1fr))",
                      },
                      gap: 1.5,
                    }}
                  >
                    {Array.from({ length: 3 }, (_, cardIndex) => (
                      <Skeleton
                        key={cardIndex}
                        variant="rounded"
                        sx={{ aspectRatio: "0.95 / 1" }}
                      />
                    ))}
                  </Box>
                </Box>
              ))}
            </Box>
          )}
          {error && <Alert severity="error">{error}</Alert>}
          {!loading && !loadError && artists.length === 0 && (
            <Box
              sx={{
                px: 2,
                py: { xs: 5, sm: 7 },
                border: "1px dashed",
                borderColor: "divider",
                borderRadius: 2,
                backgroundColor: "background.paper",
                textAlign: "center",
              }}
            >
              <Typography component="h2" sx={{ fontSize: 20, fontWeight: 800 }}>
                The gallery is waiting for its first artworks
              </Typography>
              <Typography sx={{ mt: 0.75, color: "text.secondary" }}>
                Browse the shop to explore all currently available pieces.
              </Typography>
              <Button
                variant="contained"
                onClick={() => navigate("/buyer/shop")}
                sx={{ minHeight: 44, mt: 2 }}
              >
                Browse the shop
              </Button>
            </Box>
          )}

          {!loading &&
            !loadError &&
            artists.map((artist) => (
              <Box
                key={artist.id}
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    md: "minmax(230px, 0.82fr) minmax(0, 3fr)",
                  },
                  gap: { xs: 1.5, md: 1.75 },
                  alignItems: "stretch",
                }}
              >
                <Box
                  sx={{
                    minWidth: 0,
                    p: { xs: 2, sm: 2.5 },
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 2,
                    backgroundColor: darkMode ? "background.paper" : "#fff2dc",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                  }}
                >
                  <Avatar
                    src={profileImageUrl(artist.profileImage)}
                    alt={artist.name}
                    sx={{
                      width: 64,
                      height: 64,
                      mb: 1.5,
                      border: "1px solid",
                      borderColor: "divider",
                      backgroundColor: darkMode ? "#1e293b" : "#fff8ec",
                      color: "text.secondary",
                    }}
                  />
                  <Typography
                    sx={{
                      color: "text.primary",
                      fontSize: { xs: 17, sm: 18 },
                      fontWeight: 800,
                      lineHeight: 1.25,
                    }}
                  >
                    {artist.name}
                  </Typography>
                  <Typography
                    sx={{
                      mt: 0.35,
                      color: "error.main",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {artist.department}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      mt: 1.5,
                      color: "text.secondary",
                      fontSize: 13,
                      lineHeight: 1.6,
                      display: "-webkit-box",
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {artist.bio ||
                      "A collection of original work by this CAFA artist."}
                  </Typography>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    sx={{ width: "100%", mt: "auto", pt: 1.25 }}
                  >
                    <Typography
                      variant="caption"
                      sx={{ color: "text.secondary", fontSize: 12 }}
                    >
                      {artist.artworks.length} works
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ color: "text.secondary", fontSize: 12 }}
                    >
                      ★ 4.8
                    </Typography>
                  </Stack>
                  <Button
                    variant="outlined"
                    onClick={() => navigate(`/buyer/seller/${artist.id}`)}
                    sx={{
                      mt: 1,
                      minHeight: 44,
                      px: 1.5,
                      borderColor: "text.primary",
                      borderRadius: 999,
                      color: "text.primary",
                      fontSize: 13,
                      fontWeight: 700,
                      textTransform: "none",
                      "&:hover": {
                        borderColor: "error.main",
                        color: "error.main",
                      },
                    }}
                  >
                    View artist
                  </Button>
                </Box>

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "repeat(2, minmax(0, 1fr))",
                      sm: "repeat(3, minmax(0, 1fr))",
                    },
                    gap: { xs: 1.5, sm: 2 },
                    minWidth: 0,
                  }}
                >
                  {artist.artworks.slice(0, 3).map((artwork) => (
                    <GalleryArtworkCard
                      key={artwork.artwork_id || artwork.id}
                      artwork={artwork}
                      onOpen={openArtwork}
                      isFavorite={favoriteIds.has(
                        String(artwork.artwork_id || artwork.id),
                      )}
                      onToggleFavorite={handleFavoriteToggle}
                    />
                  ))}
                </Box>
              </Box>
            ))}
        </Stack>
      </Container>
    </Box>
  );
}