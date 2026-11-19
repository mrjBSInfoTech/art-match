import { useState, useEffect, useMemo } from "react";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Container,
  FormControl,
  InputBase,
  InputLabel,
  InputAdornment,
  LinearProgress,
  Grid,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Stack,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import ArtworkCard from "../../components/buyer/Artwork/ArtworkCard";
import ConnectionErrorPanel from "../../components/buyer/ConnectionErrorPanel";
import AppSnackbar from "../../components/common/AppSnackbar";
import { fetchArtworks, fetchArtistSummaries } from "../../api/buyer/artworkAPI";
import { fetchCart } from "../../api/buyer/cartAPI";
import {
  addArtworkToBuyerCart,
  removeArtworkFromBuyerCart,
} from "../../utils/buyerCartActions";
import RecommendedSection, {
  ArtworkCardSkeleton,
  SectionHeader,
} from "../../components/buyer/Main/RecommendedSection";
import UpcomingEventsSlider from "../../components/buyer/Main/UpcomingEventsSlider";
import WatermarkedArtworkImage from "../../components/buyer/Artwork/WatermarkedArtworkImage";
import artGenres from "../../data/artGenres";
import Footer from "./Footer";
import { isAuthenticated } from "../../../utils/auth";
// Icons
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import HomeIcon from "@mui/icons-material/Home";
import PersonIcon from "@mui/icons-material/Person";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import SearchIcon from "@mui/icons-material/Search";
import VerifiedUserOutlinedIcon from "@mui/icons-material/VerifiedUserOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import SupportAgentOutlinedIcon from "@mui/icons-material/SupportAgentOutlined";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import ProfileAvatar from "../../components/common/ProfileAvatar";
import { resolveProfileImageUrl } from "../../utils/profileImage.js";
import {
  buildArtistRatingMap,
  formatArtistRating,
} from "../../utils/artistEngagement.js";

const getProfileImage = (artist) =>
  resolveProfileImageUrl(artist?.profile_image || artist?.image, "seller");

const buildArtistSummaries = (artworks = [], artistRatingMap = new Map()) => {
  const artistMap = new Map();

  artworks.forEach((artwork) => {
    const studentId = artwork.student_id;
    if (!studentId) return;

    const shopName = artwork.shop_name?.trim() || "";
    const fallbackArtistName =
      [artwork.first_name, artwork.last_name].filter(Boolean).join(" ") ||
      artwork.artist ||
      "Unknown Artist";

    const current = artistMap.get(studentId) || {
      student_id: studentId,
      name: shopName || fallbackArtistName,
      artistName: fallbackArtistName,
      course: artwork.course || artwork.genre || "Independent Artist",
      image: artwork.profile_image || "",
      featuredArtwork: artwork,
      shopName: shopName,
      shopDescription: artwork.shop_description || "",
      works: 0,
      sales: 0,
      rating: artistRatingMap.get(String(studentId)) ?? 0,
    };

    current.works += 1;
    current.sales = current.works;
    current.featuredArtwork = current.featuredArtwork || artwork;
    current.image = artwork.profile_image || current.image || "";
    current.course = artwork.course || current.course;
    current.shopName = current.shopName || artwork.shop_name || "";
    current.shopDescription =
      current.shopDescription || artwork.shop_description || "";
    current.name = current.shopName || current.artistName || fallbackArtistName;

    artistMap.set(studentId, current);
  });

  return [...artistMap.values()]
    .map((artist) => ({
      ...artist,
      artistName: artist.shopName ? "" : artist.artistName,
      department: artist.course,
      image: getProfileImage(artist),
      bio:
        artist.shopDescription ||
        artist.featuredArtwork?.description ||
        "The seller currently doesn't have a bio.",
      worksLabel: `${artist.works} works`,
    }))
    .sort((a, b) => b.works - a.works || a.name.localeCompare(b.name));
};

export default function Main() {
  const [artworks, setArtworks] = useState([]);
  const [artistRatingMap, setArtistRatingMap] = useState(() => new Map());
  const [artworksLoading, setArtworksLoading] = useState(true);
  const [artworkErrorMessage, setArtworkErrorMessage] = useState("");
  const [followedArtists, setFollowedArtists] = useState([]);
  const [cartArtworkIds, setCartArtworkIds] = useState(() => new Set());
  const [followingLoading, setFollowingLoading] = useState(true);
  const [followingError, setFollowingError] = useState("");
  const [recommendationRefreshKey, setRecommendationRefreshKey] = useState(0);
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const theme = useTheme();
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");
  const handleAddToCart = (
    artworkId,
    quantity = 1,
    selectedProducts,
    orderNote,
    artwork,
  ) =>
    addArtworkToBuyerCart({
      artworkId,
      quantity,
      selectedProducts,
      orderNote,
      artwork,
      onSuccessId: (id) => setCartArtworkIds((previous) => new Set(previous).add(id)),
      onNotify: showSnackbar,
    });

  const handleRemoveFromCart = (artworkId) =>
    removeArtworkFromBuyerCart({
      artworkId,
      onRemovedId: (id) =>
        setCartArtworkIds((previous) => {
          const next = new Set(previous);
          next.delete(id);
          return next;
        }),
      onNotify: showSnackbar,
    });

  const loadArtworks = async () => {
    try {
      setArtworksLoading(true);
      setArtworkErrorMessage("");
      const [response, summaries] = await Promise.all([
        fetchArtworks(),
        fetchArtistSummaries().catch(() => []),
      ]);
      setArtistRatingMap(buildArtistRatingMap(summaries));
      if (response && Array.isArray(response)) {
        setArtworks(response);
      } else if (response && response.data && Array.isArray(response.data)) {
        setArtworks(response.data);
      } else {
        setArtworks([]);
        setArtworkErrorMessage("No data received from server.");
      }
    } catch (err) {
      setArtworks([]);
      setArtworkErrorMessage("Failed to load artworks: " + err.message);
    } finally {
      setArtworksLoading(false);
    }
  };

  useEffect(() => {
    loadArtworks();
  }, []);

  useEffect(() => {
    let active = true;
    const loadCartArtworkIds = async () => {
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
        console.error("Unable to load cart status for artworks:", error);
      }
    };
    loadCartArtworkIds();
    window.addEventListener("cart-updated", loadCartArtworkIds);
    window.addEventListener("focus", loadCartArtworkIds);
    return () => {
      active = false;
      window.removeEventListener("cart-updated", loadCartArtworkIds);
      window.removeEventListener("focus", loadCartArtworkIds);
    };
  }, []);

  useEffect(() => {
    let request = 0;
    const loadFollowing = async () => {
      const current = ++request;
      if (!isAuthenticated("buyer")) {
        setFollowedArtists([]);
        setFollowingError("");
        setFollowingLoading(false);
        return;
      }
      setFollowingLoading(true);
      setFollowingError("");
      try {
        const summaries = await fetchArtistSummaries();
        if (current === request) {
          setArtistRatingMap(buildArtistRatingMap(summaries));
          setFollowedArtists((Array.isArray(summaries) ? summaries : [])
            .filter((artist) => artist.isFollowing)
            .map((artist) => String(artist.student_id)));
        }
      } catch {
        if (current === request) {
          setFollowedArtists([]);
          setFollowingError("Unable to load artworks from your followed artists. Please try again.");
        }
      } finally {
        if (current === request) setFollowingLoading(false);
      }
    };
    loadFollowing();
    window.addEventListener("artist-follow-updated", loadFollowing);
    window.addEventListener("focus", loadFollowing);
    return () => {
      request++;
      window.removeEventListener("artist-follow-updated", loadFollowing);
      window.removeEventListener("focus", loadFollowing);
    };
  }, []);

  const availableArtworks = useMemo(
    () => artworks.filter((artwork) => Number(artwork.is_sold_out) !== 1),
    [artworks],
  );

  const followedArtworks = useMemo(() => {
    const followedIds = new Set(followedArtists);
    return availableArtworks
      .filter((artwork) => followedIds.has(String(artwork.student_id)))
      .sort((a, b) =>
        (Date.parse(b.date_created) || 0) - (Date.parse(a.date_created) || 0) ||
        Number(b.artwork_id || b.id) - Number(a.artwork_id || a.id))
      .slice(0, 4);
  }, [availableArtworks, followedArtists]);

  const genres = artGenres;
  const popularArtists = useMemo(
    () => buildArtistSummaries(availableArtworks, artistRatingMap),
    [availableArtworks, artistRatingMap],
  );

  const featuredArtist = popularArtists[0];
  const galleryArtists = popularArtists.slice(1, 9);
  const warmSurface =
    theme.palette.mode === "light" ? "#fff9ef" : theme.palette.background.paper;

  // Snackbar handlers
  const showSnackbar = (message, severity = "success") => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const closeSnackbar = (event, reason) => {
    if (reason === "clickaway") return;
    setSnackbarOpen(false);
  };

  const handleRetry = () => {
    loadArtworks();
    setRecommendationRefreshKey((prev) => prev + 1);
  };

  if (artworkErrorMessage && !artworksLoading && artworks.length === 0) {
    return (
      <Box sx={{ minWidth: 0 }}>
        <Helmet titleTemplate="%s - ArtMatch">
          <title>Main</title>
        </Helmet>
        <ConnectionErrorPanel
          title="Home Page Unavailable"
          onRetry={handleRetry}
        />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        overflowX: "hidden",
      }}
    >
      <Helmet titleTemplate="%s - ArtMatch">
        <title>Main</title>
      </Helmet>
      <UpcomingEventsSlider heroArtwork={availableArtworks[0]} />
      {/* Styles */}
      <Box
        sx={{
          px: { xs: 2, sm: 4, lg: 6 },
          py: { xs: 1.5, sm: 2 },
          overflowX: "auto",
          backgroundColor: warmSurface,
          borderBottom: `1px solid ${theme.palette.divider}`,
          "&::-webkit-scrollbar": { display: "none" },
        }}
      >
        <Box
          sx={{
            display: "flex",
            gap: 1.25,
            minWidth: "max-content",
            maxWidth: 1440,
            mx: "auto",
          }}
        >
          {["All Style", ...genres].map((genre, index) => (
            <Button
              key={genre}
              onClick={() =>
                navigate(
                  index === 0
                    ? "/buyer/shop"
                    : `/buyer/shop/${encodeURIComponent(genre)}`,
                )
              }
              sx={{
                flexShrink: 0,
                minHeight: 44,
                px: 2,
                py: 0.5,
                borderRadius: 999,
                border: "1px solid",
                borderColor: index === 1 ? "error.main" : "divider",
                backgroundColor: index === 1 ? "error.main" : "transparent",
                color: index === 1 ? "#fff" : "text.primary",
                fontSize: 12,
                whiteSpace: "nowrap",
                "&:hover": {
                  borderColor: "error.main",
                  backgroundColor: index === 1 ? "error.dark" : "action.hover",
                },
              }}
            >
              {genre}
            </Button>
          ))}
        </Box>
      </Box>

      {/* Recently Added Artworks */}
      <Box
        sx={{
          px: { xs: 2, sm: 4, lg: 6 },
          py: { xs: 4, md: 6 },
          backgroundColor: warmSurface,
        }}
      >
        <SectionHeader title="Recently Added Artworks" to="/buyer/shop" />
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "repeat(2, minmax(0, 1fr))",
              sm: "repeat(2, minmax(0, 1fr))",
              md: "repeat(4, minmax(0, 1fr))",
              lg: "repeat(4, minmax(0, 1fr))",
            },
            gap: { xs: 1.25, sm: 2, md: 2.5 },
          }}
        >
          {artworksLoading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <ArtworkCardSkeleton key={`recent-skeleton-${index}`} />
            ))
          ) : availableArtworks.length > 0 ? (
            availableArtworks.slice(0, 4).map((artwork) => (
              <ArtworkCard
                onAddToCart={handleAddToCart}
                isInCart={cartArtworkIds.has(String(artwork.artwork_id || artwork.id))}
                onRemoveFromCart={handleRemoveFromCart}
                key={artwork.artwork_id || artwork.id}
                artwork={artwork}
              />
            ))
          ) : (
            <Typography color="text.secondary" sx={{ gridColumn: "1 / -1", py: 2 }}>
              No artworks available right now.
            </Typography>
          )}
        </Box>
      </Box>

      {/* Recently Added Artworks From the Users Followings */}
      {Boolean(isAuthenticated("buyer")) &&
        (followingLoading || followingError || followedArtists.length > 0) && (
        <Box
          sx={{
            px: { xs: 2, sm: 4, lg: 6 },
            py: { xs: 4, md: 6 },
            backgroundColor: warmSurface,
          }}
        >
          <SectionHeader
            title="Recently Added Artworks from your Followed Artists"
            to="/buyer/shop"
          />
          {followingLoading || artworksLoading ? (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "repeat(2, minmax(0, 1fr))",
                  sm: "repeat(2, minmax(0, 1fr))",
                  md: "repeat(4, minmax(0, 1fr))",
                  lg: "repeat(4, minmax(0, 1fr))",
                },
                gap: { xs: 1.25, sm: 2, md: 2.5 },
              }}
            >
              {Array.from({ length: 4 }).map((_, index) => (
                <ArtworkCardSkeleton key={`following-skeleton-${index}`} />
              ))}
            </Box>
          ) : followingError ? (
            <Alert severity="warning">{followingError}</Alert>
          ) : followedArtworks.length === 0 ? (
            <Typography color="text.secondary">
              No artworks from followed artists yet.{" "}
              <Button component={RouterLink} to="/buyer/artist">
                Explore artists
              </Button>
            </Typography>
          ) : (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "repeat(2, minmax(0, 1fr))",
                  sm: "repeat(2, minmax(0, 1fr))",
                  md: "repeat(4, minmax(0, 1fr))",
                  lg: "repeat(4, minmax(0, 1fr))",
                },
                gap: { xs: 1.25, sm: 2, md: 2.5 },
              }}
            >
              {followedArtworks.map((artwork) => (
                <ArtworkCard
                  onAddToCart={handleAddToCart}
                  isInCart={cartArtworkIds.has(String(artwork.artwork_id || artwork.id))}
                  onRemoveFromCart={handleRemoveFromCart}
                  key={artwork.artwork_id || artwork.id}
                  artwork={artwork}
                />
              ))}
            </Box>
          )}
        </Box>
      )}

      {/* Buyer guarantees */}
      <Box
        sx={{
          px: { xs: 2, sm: 4, lg: 6 },
          py: { xs: 3, md: 4 },
          backgroundColor: theme.palette.background.public,
          borderTop: `1px solid ${theme.palette.divider}`,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, 1fr)",
              md: "repeat(4, 1fr)",
            },
            gap: { xs: 2.5, md: 3 },
            maxWidth: 1440,
            mx: "auto",
          }}
        >
          {[
            {
              icon: VerifiedUserOutlinedIcon,
              title: "Authentic Art",
              description: "Verified artwork from the CAFA artist community",
            },
            {
              icon: LockOutlinedIcon,
              title: "Secure Payments",
              description: "Fully encrypted and secure payment processing",
            },
            {
              icon: DescriptionOutlinedIcon,
              title: "Certificates",
              description: "Stamped certificates signed by CAFA departments",
            },
            {
              icon: SupportAgentOutlinedIcon,
              title: "24/7 Support",
              description: "Your gallery team is here to assist you anytime",
            },
          ].map(({ icon: Icon, title, description }) => (
            <Stack
              key={title}
              direction="row"
              spacing={1.25}
              alignItems="flex-start"
            >
              <Icon sx={{ color: theme.palette.error.main, mt: 0.25 }} />
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 800 }}>
                  {title}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {description}
                </Typography>
              </Box>
            </Stack>
          ))}
        </Box>
      </Box>

      {/* Popular artists */}
      <Box
        sx={{
          px: { xs: 2, sm: 4, lg: 6 },
          py: { xs: 4, md: 6 },
          backgroundColor: theme.palette.background.public,
        }}
      >
        <Box sx={{ mb: 3 }}>
          <Typography
            variant="overline"
            sx={{
              color: theme.palette.error.main,
              fontWeight: 800,
              letterSpacing: 1.5,
              lineHeight: 1,
            }}
          >
            Popular artists
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ maxWidth: 650 }}
          >
            Discover artists and explore more of their work in the gallery.
          </Typography>
          <SectionHeader
            title="Top Listed Artists This Month"
            to="/buyer/gallery"
          />
        </Box>

        {artworksLoading ? (
          <>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  md: "minmax(260px, 0.85fr) 1.5fr",
                },
                gap: { xs: 3, md: 5 },
                alignItems: "center",
                p: { xs: 1.5, sm: 3 },
                mb: 3,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 3,
                backgroundColor:
                  theme.palette.mode === "light"
                    ? "#fff1d7"
                    : theme.palette.background.paper,
              }}
            >
              <Skeleton
                variant="rectangular"
                animation="wave"
                sx={{
                  height: { xs: 220, md: 280 },
                  borderRadius: 2,
                  transform: "none",
                }}
              />
              <Box>
                <Skeleton
                  variant="rounded"
                  animation="wave"
                  width={110}
                  height={24}
                  sx={{ borderRadius: 999, mb: 1.5 }}
                />
                <Skeleton
                  variant="text"
                  animation="wave"
                  width="65%"
                  height={36}
                  sx={{ mb: 0.5 }}
                />
                <Skeleton
                  variant="text"
                  animation="wave"
                  width="40%"
                  height={20}
                  sx={{ mb: 2 }}
                />
                <Skeleton
                  variant="text"
                  animation="wave"
                  width="95%"
                  height={16}
                />
                <Skeleton
                  variant="text"
                  animation="wave"
                  width="80%"
                  height={16}
                  sx={{ mb: 2.5 }}
                />
                <Stack direction="row" spacing={{ xs: 2, sm: 5 }} sx={{ mb: 2 }}>
                  <Skeleton
                    variant="rounded"
                    animation="wave"
                    width={80}
                    height={40}
                  />
                  <Skeleton
                    variant="rounded"
                    animation="wave"
                    width={80}
                    height={40}
                  />
                  <Skeleton
                    variant="rounded"
                    animation="wave"
                    width={80}
                    height={40}
                  />
                </Stack>
                <Skeleton
                  variant="rounded"
                  animation="wave"
                  width={130}
                  height={44}
                  sx={{ borderRadius: 999 }}
                />
              </Box>
            </Box>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  md: "repeat(2, minmax(0, 1fr))",
                },
                gap: 2,
              }}
            >
              {Array.from({ length: 6 }).map((_, idx) => (
                <Box
                  key={idx}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    minWidth: 0,
                    px: { xs: 1.5, sm: 2 },
                    py: 1.5,
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: 2,
                    backgroundColor: theme.palette.background.paper,
                  }}
                >
                  <Skeleton
                    variant="circular"
                    animation="wave"
                    width={56}
                    height={56}
                    sx={{ flexShrink: 0 }}
                  />
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Skeleton
                      variant="text"
                      animation="wave"
                      width="55%"
                      height={20}
                    />
                    <Skeleton
                      variant="text"
                      animation="wave"
                      width="40%"
                      height={16}
                    />
                    <Skeleton
                      variant="text"
                      animation="wave"
                      width="30%"
                      height={16}
                    />
                  </Box>
                  <Skeleton
                    variant="rounded"
                    animation="wave"
                    width={76}
                    height={40}
                    sx={{ borderRadius: 999 }}
                  />
                </Box>
              ))}
            </Box>
          </>
        ) : (
          <>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  md: "minmax(260px, 0.85fr) 1.5fr",
                },
                gap: { xs: 3, md: 5 },
                alignItems: "center",
                p: { xs: 1.5, sm: 3 },
                mb: 3,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 3,
                backgroundColor:
                  theme.palette.mode === "light"
                    ? "#fff1d7"
                    : theme.palette.background.paper,
              }}
            >
              <Box
                sx={{
                  position: "relative",
                  height: { xs: 220, md: 280 },
                  borderRadius: 2,
                  backgroundImage:
                    !featuredArtist?.featuredArtwork?.image && featuredArtist?.image
                      ? `url(${featuredArtist.image})`
                      : !featuredArtist?.featuredArtwork?.image && !featuredArtist?.image
                        ? theme.palette.mode === "light"
                          ? "linear-gradient(135deg, #f8dfc7, #f2c8bc 48%, #e5d7ee)"
                          : "linear-gradient(135deg, #334155, #475569 48%, #312e81)"
                        : "none",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  border: `1px solid ${theme.palette.divider}`,
                  boxShadow: theme.shadows[2],
                  backgroundColor: theme.palette.background.default,
                }}
              >
                {!featuredArtist?.featuredArtwork?.image && !featuredArtist?.image && (
                  <Box
                    sx={{
                      position: "absolute",
                      inset: 0,
                      display: "grid",
                      placeContent: "center",
                      justifyItems: "center",
                      color: theme.palette.text.primary,
                    }}
                  >
                    <ImageOutlinedIcon sx={{ fontSize: 44, opacity: 0.65 }} />
                    <Typography sx={{ mt: 1, fontWeight: 700 }}>
                      Featured studio work
                    </Typography>
                  </Box>
                )}
                <WatermarkedArtworkImage
                  image={
                    featuredArtist?.featuredArtwork?.image || availableArtworks[0]?.image
                  }
                  alt={
                    featuredArtist?.featuredArtwork?.title ||
                    availableArtworks[0]?.title ||
                    "Featured artwork"
                  }
                  variant="web"
                  hideWhenBlurred
                  sx={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              </Box>
              <Box>
                <Typography
                  variant="caption"
                  sx={{
                    display: "inline-block",
                    px: 1,
                    py: 0.35,
                    borderRadius: 999,
                    color: "#fff",
                    backgroundColor: theme.palette.error.main,
                    fontWeight: 800,
                  }}
                >
                  STUDIO CHOICE
                </Typography>
                <Typography variant="h4" sx={{ mt: 1, fontWeight: 800 }}>
                  {featuredArtist?.name || "Artist"}
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                  {featuredArtist?.department || "Independent Artist"}, Class of
                  2026
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 2, maxWidth: 620 }}>
                  {featuredArtist?.bio ||
                    "Live artist profile pulled from the gallery database."}
                </Typography>
                <Stack direction="row" spacing={{ xs: 2, sm: 5 }} sx={{ mt: 2.5 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      ARTWORKS
                    </Typography>
                    <Typography fontWeight={800}>
                      {featuredArtist?.worksLabel || "0 works"}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      LISTED
                    </Typography>
                    <Typography fontWeight={800}>
                      {featuredArtist?.sales || 0} pieces
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      RATING
                    </Typography>
                    <Typography fontWeight={800}>
                      <Box component="span" sx={{ color: "#eab308" }}>
                        ★
                      </Box>{" "}
                      {formatArtistRating(featuredArtist?.rating)}
                    </Typography>
                  </Box>
                </Stack>
                <Button
                  onClick={() => navigate("/buyer/artist")}
                  variant="contained"
                  endIcon={<ArrowForwardIcon />}
                  sx={{
                    mt: 2,
                    minHeight: 44,
                    borderRadius: 999,
                    backgroundColor: theme.palette.text.primary,
                    color: theme.palette.background.paper,
                  }}
                >
                  View Artists
                </Button>
              </Box>
            </Box>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
                gap: 2,
              }}
            >
              {galleryArtists.map((artist, index) => (
                <Box
                  key={artist.student_id || index}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    minWidth: 0,
                    px: { xs: 1.5, sm: 2 },
                    py: 1.5,
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: 2,
                    backgroundColor: theme.palette.background.paper,
                  }}
                >
                  <ProfileAvatar
                    src={artist.image}
                    role="seller"
                    alt={artist.name}
                    sx={{
                      width: 56,
                      height: 56,
                      flexShrink: 0,
                      borderRadius: "50%",
                      objectFit: "cover",
                      border: `2px solid ${theme.palette.background.default}`,
                    }}
                  />
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="body2" noWrap sx={{ fontWeight: 800 }}>
                      <Box
                        component="span"
                        sx={{ color: theme.palette.error.main, mr: 0.75 }}
                      >
                        #{index + 2}
                      </Box>
                      {artist.name}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      noWrap
                      display="block"
                    >
                      {artist.department}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {artist.works} works&nbsp;&nbsp;{" "}
                      <Box component="span" sx={{ color: "#eab308" }}>
                        ★
                      </Box>{" "}
                      {formatArtistRating(artist.rating)}
                    </Typography>
                  </Box>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => navigate(`/buyer/seller/${artist.student_id}`)}
                    sx={{
                      flexShrink: 0,
                      minWidth: 76,
                      minHeight: 44,
                      borderRadius: 999,
                      borderColor: theme.palette.text.primary,
                      color: theme.palette.text.primary,
                      fontSize: 13,
                    }}
                  >
                    Open
                  </Button>
                </Box>
              ))}
            </Box>
          </>
        )}
      </Box>

      {/* Featured Artworks */}
      <Box
        sx={{
          width: "100%",
          overflow: "hidden",
          mt: { xs: 0, md: -1 },
          backgroundColor: warmSurface,
          px: { xs: 2, sm: 4, lg: 6 },
          py: { xs: 4, md: 6 },
        }}
        id="featured"
      >
        <SectionHeader title="Featured Artworks" to="/buyer/shop" />
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "repeat(2, minmax(0, 1fr))",
              sm: "repeat(2, minmax(0, 1fr))",
              md: "repeat(4, minmax(0, 1fr))",
              lg: "repeat(4, minmax(0, 1fr))",
            },
            gap: { xs: 1.25, sm: 2, md: 2.5 },
          }}
        >
          {artworksLoading ? (
            Array.from({ length: 8 }).map((_, index) => (
              <ArtworkCardSkeleton key={`featured-skeleton-${index}`} />
            ))
          ) : availableArtworks.length > 0 ? (
            availableArtworks.slice(0, 12).map((artwork) => (
              <ArtworkCard
                onAddToCart={handleAddToCart}
                isInCart={cartArtworkIds.has(String(artwork.artwork_id || artwork.id))}
                onRemoveFromCart={handleRemoveFromCart}
                key={artwork.artwork_id || artwork.id}
                artwork={artwork}
              />
            ))
          ) : (
            <Typography color="text.secondary" sx={{ gridColumn: "1 / -1", py: 2 }}>
              No featured artworks available.
            </Typography>
          )}
        </Box>
      </Box>

      {/* Recommended Artworks */}
      <RecommendedSection
        cartArtworkIds={cartArtworkIds}
        onAddToCart={handleAddToCart}
        onRemoveFromCart={handleRemoveFromCart}
        refreshKey={recommendationRefreshKey}
      />
      {/* Snackbar Notification */}
      <AppSnackbar
        open={snackbarOpen}
        message={snackbarMessage}
        severity={snackbarSeverity}
        onClose={closeSnackbar}
        sx={{ bottom: { xs: 80, md: 24 } }}
      />
    </Box>
  );
}
