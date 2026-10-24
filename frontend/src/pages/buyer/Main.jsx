import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Alert,
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
  Stack,
  TextField,
  Typography,
  Snackbar,
  Slide,
  useTheme,
} from "@mui/material";
import ArtworkCard from "../../components/buyer/Artwork/ArtworkCard";
import { fetchArtworks } from "../../api/buyer/artworkAPI";
import { fetchRecommendations } from "../../api/buyer/recommendationAPI";
import { addToCart } from "../../api/buyer/cartAPI";
import UpcomingEventsSlider from "../../components/buyer/Main/UpcomingEventsSlider";
import WatermarkedArtworkImage from "../../components/buyer/Artwork/WatermarkedArtworkImage";
import artGenres from "../../data/artGenres";
import Footer from "./Footer";
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

const getProfileFallback = () =>
  "http://localhost:5000/uploads/seller/profile.jpg";

const getProfileImage = (artist) => {
  const imageName = artist?.profile_image || artist?.image;

  if (!imageName) {
    return getProfileFallback(artist?.name || "Artist");
  }

  if (imageName.startsWith("http")) {
    return imageName;
  }

  return `http://localhost:5000/uploads/seller/uploadProfile/${encodeURIComponent(imageName)}`;
};

const buildArtistSummaries = (artworks = []) => {
  const artistMap = new Map();

  artworks.forEach((artwork) => {
    const studentId = artwork.student_id;
    if (!studentId) return;

    const shopName = artwork.shop_name || "";
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
      rating: 4.8,
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

// Slide Transition for Snackbar
function SlideTransition(props) {
  return <Slide {...props} direction="up" />;
}

export default function Main() {
  const [artworks, setArtworks] = useState([]);
  const [artworksLoading, setArtworksLoading] = useState(false);
  const [artworkErrorMessage, setArtworkErrorMessage] = useState("");
  const [recommendedArtworks, setRecommendedArtworks] = useState([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(true);
  const [recommendationMode, setRecommendationMode] = useState("");
  const [recommendationSignals, setRecommendationSignals] = useState({
    search_filter_events: 0,
    preferred_artists: 0,
    sasrec_candidates: 0,
    available_unseen: 0,
  });
  const [recommendationHistoryLength, setRecommendationHistoryLength] =
    useState(0);
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const theme = useTheme();
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");
  
  const handleAddToCart = async (artworkId) => {
    try {
      const result = await addToCart(artworkId);
      showSnackbar(result?.message || "Artwork added to cart", "success");
      return result;
    } catch (error) {
      showSnackbar(
        error.message || "Unable to add artwork to cart",
        error.status === 409 ? "warning" : "error",
      );
      throw error;
    }
  };

  const loadArtworks = async () => {
    try {
      setArtworksLoading(true);
      setArtworkErrorMessage("");
      const response = await fetchArtworks();
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

  const recommendationRequest = useRef(0);
  const loadRecommendations = useCallback(async () => {
    const requestId = ++recommendationRequest.current;
    try {
      setRecommendationsLoading(true);

      const response = await fetchRecommendations(4);
      if (requestId !== recommendationRequest.current) return;

      const list = Array.isArray(response?.recommendations)
        ? response.recommendations
        : [];

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
      if (requestId === recommendationRequest.current)
        setRecommendationsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadArtworks();
  }, []);

  useEffect(() => {
    let refreshTimer;
    const refresh = () => {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(loadRecommendations, 350);
    };
    loadRecommendations();
    window.addEventListener("recommendation-updated", refresh);
    window.addEventListener("cart-updated", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      clearTimeout(refreshTimer);
      recommendationRequest.current += 1;
      window.removeEventListener("recommendation-updated", refresh);
      window.removeEventListener("cart-updated", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [loadRecommendations]);

  const genres = artGenres;
  const popularArtists = useMemo(
    () => buildArtistSummaries(artworks),
    [artworks],
  );
  const featuredArtist = popularArtists[0];
  const galleryArtists = popularArtists.slice(1, 9);
  const heroArtwork = artworks[0];
  const warmSurface =
    theme.palette.mode === "light" ? "#fff9ef" : theme.palette.background.paper;

  const isPersonalizedRecommendation = [
    "sasrec",
    "sasrec_reranked",
    "hybrid",
    "preference_fallback",
  ].includes(recommendationMode);

  const getRecommendationMessage = () => {
    const isGuest = !localStorage.getItem("buyer_token");

    const hasHistory = recommendationHistoryLength > 0;

    const hasSearchOrFilters = recommendationSignals.search_filter_events > 0;

    const hasArtistPreference = recommendationSignals.preferred_artists > 0;

    // -------------------------
    // GUEST
    // -------------------------

    if (isGuest) {
      if (hasHistory && hasSearchOrFilters && hasArtistPreference) {
        return "Based on your guest browsing, searches, filters, and artist preferences.";
      }

      if (hasHistory && hasSearchOrFilters) {
        return "Based on your guest browsing, searches, and filters.";
      }

      if (hasHistory && hasArtistPreference) {
        return "Based on your guest browsing and artist preferences.";
      }

      if (hasHistory) {
        return "Based on your recent guest browsing.";
      }

      if (hasSearchOrFilters) {
        return "Based on your recent guest searches and filters.";
      }

      return "Discover recent and popular artworks while we learn what you like.";
    }

    // -------------------------
    // LOGGED-IN BUYER
    // -------------------------

    if (hasHistory && hasSearchOrFilters && hasArtistPreference) {
      return "Based on your browsing, searches, filters, and artist preferences.";
    }

    if (hasHistory && hasSearchOrFilters) {
      return "Based on your browsing, searches, and filters.";
    }

    if (hasHistory && hasArtistPreference) {
      return "Based on your browsing and artist preferences.";
    }

    if (hasHistory) {
      return "Based on your recent artwork browsing.";
    }

    if (hasSearchOrFilters) {
      return "Based on your recent searches and filters.";
    }

    return "Discover recent and popular artworks while we learn your preferences.";
  };

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

  const getSeverityColor = (severity) => {
    switch (severity) {
      case "success":
        return "success.light";
      case "warning":
        return "warning.light";
      case "error":
        return "error.light";
      default:
        return "primary.light";
    }
  };

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
      {/* Hero */}
      <Box
        sx={{
          width: "100%",
          overflow: "hidden",
          mt: { xs: 0, md: -1 },
          backgroundColor: warmSurface,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Container
          maxWidth="lg"
          sx={{ py: { xs: 6, md: 8 }, px: { xs: 3, sm: 5 } }}
        >
          <Grid
            container
            spacing={{ xs: 5, md: 7 }}
            sx={{ alignItems: "center" }}
          >
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography
                variant="h2"
                sx={{
                  fontSize: { xs: 34, sm: 44, md: 52 },
                  lineHeight: 1.02,
                  letterSpacing: "-0.03em",
                  fontWeight: 800,
                  maxWidth: 590,
                }}
              >
                Discover Original Art by Emerging CAFA Artists
              </Typography>
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{ mt: 3, maxWidth: 500, lineHeight: 1.65 }}
              >
                Acquire hand-crafted paintings, fine art printworks, digital
                assets and miniature architectural mockups straight from the
                studios of Beijing's premier Fine Arts academy.
              </Typography>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
                sx={{ mt: 4 }}
              >
                <Button
                  size="large"
                  variant="contained"
                  component={RouterLink}
                  to="/buyer/shop"
                  endIcon={<ArrowForwardIcon />}
                  sx={{
                    borderRadius: 99999,
                    color: "#fff",
                    backgroundColor: theme.palette.error.main,
                    px: 2.5,
                    "&:hover": { backgroundColor: theme.palette.error.dark },
                  }}
                >
                  Shop Now
                </Button>
                <Button
                  size="large"
                  variant="outlined"
                  component={RouterLink}
                  to="/buyer/gallery"
                  endIcon={<ArrowForwardIcon />}
                  sx={{
                    borderRadius: 99999,
                    color: "text.primary",
                    borderColor: "text.primary",
                    px: 2.5,
                  }}
                >
                  Explore Gallery
                </Button>
              </Stack>
            </Grid>
            <Grid
              size={{ xs: 12, md: 5 }}
              sx={{ display: { xs: "none", md: "block" } }}
            >
              <Box
                sx={{
                  position: "relative",
                  borderRadius: 4,
                  overflow: "hidden",
                  border: "1px solid",
                  borderColor: "divider",
                  aspectRatio: "4 / 5",
                  backgroundColor: "#e0e0e0",
                }}
              >
                <WatermarkedArtworkImage
                  image={heroArtwork?.image}
                  alt={heroArtwork?.title || "Featured artwork"}
                  sx={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>
      <UpcomingEventsSlider />            
      {/* Genres */}
      <Box
        sx={{
          px: { xs: 2, sm: 5, lg: 6 },
          py: 2,
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
                minHeight: 34,
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
      {!artworksLoading && !artworkErrorMessage && (
        <Box
          sx={{
            px: { xs: 3, sm: 5, lg: 7 },
            py: { xs: 5, md: 7 },
            backgroundColor: warmSurface,
          }}
        >
          <SectionHeader title="Recently Added Artworks" to="/buyer/shop" />
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "repeat(1,1fr)",
                sm: "repeat(3,1fr)",
                md: "repeat(4,1fr)",
                lg: "repeat(4,1fr)",
              },
              gap: 3,
            }}
          >
            {artworks.slice(0, 4).map((artwork) => (
              <ArtworkCard
                onAddToCart={handleAddToCart}
                key={artwork.artwork_id || artwork.id}
                artwork={artwork}
              />
            ))}
          </Box>
        </Box>
      )}

      {/* Buyer guarantees */}
      <Box
        sx={{
          px: { xs: 3, sm: 5, lg: 7 },
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
          px: { xs: 3, sm: 5, lg: 7 },
          py: { xs: 5, md: 7 },
          backgroundColor: theme.palette.background.public,
        }}
      >
        <Stack
          direction="row"
          alignItems="flex-end"
          justifyContent="space-between"
          sx={{ mb: 3 }}
        >
          <Box>
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
              variant="h4"
              sx={{ mt: 1, fontSize: { xs: 25, md: 31 }, fontWeight: 800 }}
            >
              Top Listed Artists This Month
            </Typography>
          </Box>
          <Button
            onClick={() => navigate("/buyer/gallery")}
            endIcon={<ArrowForwardIcon />}
            sx={{
              display: { xs: "none", sm: "inline-flex" },
              color: theme.palette.error.main,
              fontWeight: 700,
            }}
          >
            View Gallery
          </Button>
        </Stack>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md: "minmax(260px, 0.85fr) 1.5fr",
            },
            gap: { xs: 3, md: 5 },
            alignItems: "center",
            p: { xs: 2, sm: 3 },
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
              height: { xs: 220, md: 240 },
              borderRadius: 2,
              backgroundImage: !featuredArtist?.featuredArtwork?.image && featuredArtist?.image
                ? `url(${featuredArtist.image})`
                : "none",
              backgroundSize: "cover",
              backgroundPosition: "center",
              border: `1px solid ${theme.palette.divider}`,
              boxShadow: theme.shadows[2],
            }}
          >
            <WatermarkedArtworkImage
              image={
                featuredArtist?.featuredArtwork?.image ||
                artworks[0]?.image
              }
              alt={
                featuredArtist?.featuredArtwork?.title ||
                artworks[0]?.title ||
                "Featured artwork"
              }
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
                  {featuredArtist?.rating || "4.8"}
                </Typography>
              </Box>
            </Stack>
            <Button
              onClick={() => navigate("/buyer/artist")}
              variant="contained"
              endIcon={<ArrowForwardIcon />}
              sx={{
                mt: 2,
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
                px: 2,
                py: 1.25,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2,
                backgroundColor: theme.palette.background.paper,
              }}
            >
              <Box
                component="img"
                src={artist.image}
                alt={artist.name}
                sx={{
                  width: 48,
                  height: 48,
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
                  {artist.rating}
                </Typography>
              </Box>
              <Button
                variant="outlined"
                size="small"
                onClick={() => navigate(`/buyer/seller/${artist.student_id}`)}
                sx={{
                  flexShrink: 0,
                  minWidth: 70,
                  borderRadius: 999,
                  borderColor: theme.palette.text.primary,
                  color: theme.palette.text.primary,
                  fontSize: 11,
                }}
              >
                Open
              </Button>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Featured Artworks */}
      {!artworksLoading && !artworkErrorMessage && (
        <>
          <Box
            sx={{
              width: "100%",
              overflow: "hidden",
              mt: { xs: 0, md: -1 },
              backgroundColor: warmSurface,
              px: { xs: 7, sm: 10 },
              p: 4,
            }}
            id="featured"
          >
            <SectionHeader title="Featured Artworks" to="/buyer/shop" />
            {/* Loading / Error States */}
            {artworksLoading && (
              <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
                <CircularProgress />
              </Box>
            )}

            {artworkErrorMessage && (
              <Typography align="center" color="error" sx={{ py: 3 }}>
                {artworkErrorMessage}
              </Typography>
            )}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "repeat(1,1fr)",
                  sm: "repeat(3,1fr)",
                  md: "repeat(4,1fr)",
                  lg: "repeat(4,1fr)",
                },
                gap: 3,
              }}
            >
              {artworks.slice(0, 12).map((artwork) => (
                <ArtworkCard
                  onAddToCart={handleAddToCart}
                  key={artwork.artwork_id || artwork.id}
                  artwork={artwork}
                />
              ))}
            </Box>
          </Box>
        </>
      )}
      {/* Recommended Artworks */}
      {(recommendationsLoading || recommendedArtworks.length > 0) && (
        <Box
          sx={{
            px: { xs: 7, sm: 10 },
            p: 4,
            width: "100%",
            overflow: "hidden",
            mt: { xs: 0, md: -1 },
            backgroundColor: theme.palette.background.default,
          }}
          id="recommended"
        >
          <Box sx={{ mb: 3 }}>
            <Typography
              variant="overline"
              sx={{
                color: theme.palette.error.main,
                fontWeight: 800,
                letterSpacing: 1.5,
              }}
            >
              PERSONALIZED
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                maxWidth: 650,
              }}
            >
              {getRecommendationMessage()}
            </Typography>

            <SectionHeader
              title="Recommended for You"
              to="/buyer/shop?recommendations=1"
            />
          </Box>

          {recommendationsLoading ? (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                py: 5,
              }}
            >
              <CircularProgress />
            </Box>
          ) : (
            <Box
              sx={{
                display: "grid",

                gridTemplateColumns: {
                  xs: "repeat(1, 1fr)",
                  sm: "repeat(2, 1fr)",
                  md: "repeat(4, 1fr)",
                },

                gap: 3,
              }}
            >
              {recommendedArtworks.map((artwork) => (
                <ArtworkCard
                  onAddToCart={handleAddToCart}
                  key={artwork.artwork_id || artwork.id}
                  artwork={artwork}
                />
              ))}
            </Box>
          )}
        </Box>
      )}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        TransitionComponent={SlideTransition}
      >
        <Alert
          onClose={closeSnackbar}
          severity={snackbarSeverity}
          sx={{
            width: "100%",
            backgroundColor: getSeverityColor(snackbarSeverity),
            color: "#fff",
            "& .MuiAlert-icon": { color: "#fff" },
          }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
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
