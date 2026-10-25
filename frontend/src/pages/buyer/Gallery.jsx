import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Container,
  IconButton,
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

const profileImageUrl = (image) => {
  if (!image) return "http://localhost:5000/uploads/seller/profile.jpg";
  return image.startsWith("http")
    ? image
    : `http://localhost:5000/uploads/seller/uploadProfile/${encodeURIComponent(image)}`;
};

const groupArtworksByArtist = (artworks) => {
  const artists = new Map();

  artworks.forEach((artwork) => {
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

export default function Gallery() {
  const theme = useTheme();
  const darkMode = theme.palette.mode === "dark";
  const [artists, setArtists] = useState([]);
  const [favoriteIds, setFavoriteIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;

    const loadGallery = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await fetchArtworks();
        const artworks = Array.isArray(response)
          ? response
          : response?.data || [];
        if (active) setArtists(groupArtworksByArtist(artworks));
      } catch (loadError) {
        if (active)
          setError(loadError.message || "Failed to load the gallery.");
      } finally {
        if (active) setLoading(false);
      }
    };

    const loadFavoriteIds = async () => {
      if (!localStorage.getItem("buyer_token")) {
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
    if (!localStorage.getItem("buyer_token")) {
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

  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundColor: darkMode ? "background.default" : "#fffaf2",
        py: { xs: 3, md: 5 },
      }}
    >
      <Helmet titleTemplate="%s - ArtMatch">
        <title>Gallery</title>
      </Helmet>
      <Container maxWidth="xl" sx={{ px: { xs: 2, sm: 3, lg: 4 } }}>
        <Stack spacing={{ xs: 2, md: 2.5 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "end",
              justifyContent: "space-between",
              gap: 2,
            }}
          >
            <Box>
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
                sx={{
                  color: "text.primary",
                  fontWeight: 800,
                  lineHeight: 1.1,
                }}
              >
                The Gallery
              </Typography>
            </Box>
            <Button
              onClick={() => navigate("/buyer/shop")}
              sx={{
                color: "text.primary",
                textTransform: "none",
                fontWeight: 700,
                whiteSpace: "nowrap",
              }}
            >
              Browse all artworks
            </Button>
          </Box>

          {loading && (
            <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
              <CircularProgress />
            </Box>
          )}
          {error && <Alert severity="error">{error}</Alert>}
          {!loading && !error && artists.length === 0 && (
            <Typography
              color="text.secondary"
              sx={{ py: 6, textAlign: "center" }}
            >
              No artworks are available in the gallery yet.
            </Typography>
          )}

          {!loading &&
            !error &&
            artists.map((artist) => (
              <Box
                key={artist.id}
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    md: "minmax(205px, 0.82fr) minmax(0, 3fr)",
                  },
                  gap: { xs: 1.5, md: 1.75 },
                  alignItems: "stretch",
                }}
              >
                <Box
                  sx={{
                    minWidth: 0,
                    p: { xs: 1.7, sm: 2 },
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 1.75,
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
                      width: 42,
                      height: 42,
                      mb: 1,
                      border: "1px solid",
                      borderColor: "divider",
                      backgroundColor: darkMode ? "#1e293b" : "#fff8ec",
                      color: "text.secondary",
                    }}
                  />
                  <Typography
                    sx={{
                      color: "text.primary",
                      fontSize: 14,
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
                      fontSize: 10,
                      fontWeight: 600,
                    }}
                  >
                    {artist.department}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      mt: 1,
                      color: "text.secondary",
                      fontSize: 10,
                      lineHeight: 1.5,
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
                      sx={{ color: "text.secondary", fontSize: 9 }}
                    >
                      {artist.artworks.length} works
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ color: "text.secondary", fontSize: 9 }}
                    >
                      ★ 4.8
                    </Typography>
                  </Stack>
                  <Button
                    variant="outlined"
                    onClick={() => navigate(`/buyer/seller/${artist.id}`)}
                    sx={{
                      mt: 1,
                      minHeight: 29,
                      px: 1.5,
                      borderColor: "text.primary",
                      borderRadius: 999,
                      color: "text.primary",
                      fontSize: 10,
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
                    gap: { xs: 1, sm: 1.5 },
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