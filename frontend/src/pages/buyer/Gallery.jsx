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
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import FavoriteIcon from "@mui/icons-material/Favorite";
import { fetchArtworks } from "../../api/buyer/artworkAPI";

const artworkImageUrl = (artwork) => {
  if (!artwork?.image) return "";
  return artwork.image.startsWith("http")
    ? artwork.image
    : `http://localhost:5000/uploads/seller/uploadArtwork/${encodeURIComponent(artwork.image)}`;
};

const profileImageUrl = (image) => {
  if (!image) return "";
  return image.startsWith("http")
    ? image
    : `http://localhost:5000/uploads/seller/profile/${encodeURIComponent(image)}`;
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

function ArtworkTile({ artwork, index }) {
  const theme = useTheme();
  const darkMode = theme.palette.mode === "dark";
  const navigate = useNavigate();
  const [isFavorite, setIsFavorite] = useState(false);
  const artworkId = artwork.artwork_id || artwork.id;
  const image = artworkImageUrl(artwork);

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
        role="link"
        tabIndex={0}
        aria-label={`View ${artwork.title || "artwork"}`}
        onClick={() => navigate(`/buyer/artwork/view/${artworkId}`)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            navigate(`/buyer/artwork/view/${artworkId}`);
          }
        }}
        sx={{
          position: "relative",
          aspectRatio: "1.35 / 1",
          cursor: "pointer",
          backgroundColor: darkMode ? "#1e293b" : "#eee9e1",
          backgroundImage: image ? `url("${image}")` : "none",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {artwork.genre && (
          <Typography
            variant="caption"
            sx={{
              position: "absolute",
              top: 7,
              left: 7,
              maxWidth: "calc(100% - 54px)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              px: 0.8,
              py: 0.25,
              borderRadius: 0.5,
              color: "#fff",
              backgroundColor: "error.main",
              fontSize: 9,
              fontWeight: 700,
            }}
          >
            {artwork.genre}
          </Typography>
        )}
        <Tooltip
          title={isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          <IconButton
            aria-label={
              isFavorite ? "Remove from favorites" : "Add to favorites"
            }
            onClick={(event) => {
              event.stopPropagation();
              setIsFavorite((favorite) => !favorite);
            }}
            size="small"
            sx={{
              position: "absolute",
              right: 6,
              bottom: 6,
              width: 29,
              height: 29,
              backgroundColor: darkMode ? "#1e293b" : "#fff8ec",
              color: isFavorite ? "error.main" : "text.primary",
              "&:hover": {
                backgroundColor: darkMode ? "#334155" : "#fff",
              },
            }}
          >
            {isFavorite ? (
              <FavoriteIcon sx={{ fontSize: 16 }} />
            ) : (
              <FavoriteBorderIcon sx={{ fontSize: 16 }} />
            )}
          </IconButton>
        </Tooltip>
      </Box>

      <Box sx={{ p: { xs: 1, sm: 1.2 } }}>
        <Typography
          component="button"
          onClick={() => navigate(`/buyer/artwork/view/${artworkId}`)}
          title={artwork.title || "Untitled artwork"}
          sx={{
            display: "block",
            width: "100%",
            overflow: "hidden",
            border: 0,
            p: 0,
            background: "none",
            color: "text.primary",
            font: "inherit",
            fontSize: 12,
            fontWeight: 700,
            textAlign: "left",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            cursor: "pointer",
          }}
        >
          {artwork.title || "Untitled artwork"}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            display: "block",
            mt: 0.2,
            color: "text.secondary",
            fontSize: 10,
          }}
          noWrap
        >
          {artwork.artist || "Independent Artist"}
        </Typography>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mt: 0.7, gap: 0.5 }}
        >
          <Typography
            sx={{ color: "error.main", fontSize: 12, fontWeight: 800 }}
            noWrap
          >
            ₱{Number(artwork.price || 0).toLocaleString()}
          </Typography>
          {Number.isFinite(Number(artwork.rating)) && artwork.rating ? (
            <Typography
              variant="caption"
              sx={{ color: "text.secondary", fontSize: 9 }}
            >
              ★ {Number(artwork.rating).toFixed(1)}
            </Typography>
          ) : (
            <Typography
              variant="caption"
              sx={{ color: "text.secondary", fontSize: 9 }}
            >
              {index === 0 ? "Original" : "Artwork"}
            </Typography>
          )}
        </Stack>
      </Box>
    </Box>
  );
}

export default function Gallery() {
  const theme = useTheme();
  const darkMode = theme.palette.mode === "dark";
  const [artists, setArtists] = useState([]);
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

    loadGallery();
    return () => {
      active = false;
    };
  }, []);

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
                  {artist.artworks.slice(0, 3).map((artwork, index) => (
                    <ArtworkTile
                      key={artwork.artwork_id || artwork.id || index}
                      artwork={artwork}
                      index={index}
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
