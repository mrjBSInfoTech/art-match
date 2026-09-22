import { useState, useEffect } from "react";
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

// Slide Transition for Snackbar
function SlideTransition(props) {
  return <Slide {...props} direction="up" />;
}

export default function Main() {
  const [artworks, setArtworks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [artworkErrorMessage, setArtworkErrorMessage] = useState("");
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const theme = useTheme();

  const loadArtworks = async () => {
    try {
      setLoading(true);
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
      setLoading(false);
    }
  };
  useEffect(() => {
    loadArtworks();
  }, []);

  const genres = artGenres;
  const popularArtists = [
    {
      rank: 1,
      name: "Sheng Yang",
      department: "Sculpture Dept.",
      sales: 34,
      rating: "5.0",
      image: "https://i.pravatar.cc/100?img=47",
    },
    {
      rank: 2,
      name: "He Ruo",
      department: "Oil Painting",
      sales: 28,
      rating: "4.9",
      image: "https://i.pravatar.cc/100?img=12",
    },
    {
      rank: 3,
      name: "Lin Jinshu",
      department: "Digital Art Dept.",
      sales: 27,
      rating: "4.8",
      image: "https://i.pravatar.cc/100?img=32",
    },
    {
      rank: 4,
      name: "Wang Xinyi",
      department: "Architecture Dept.",
      sales: 24,
      rating: "5.0",
      image: "https://i.pravatar.cc/100?img=44",
    },
    {
      rank: 5,
      name: "Guo Dan",
      department: "Ink Wash",
      sales: 21,
      rating: "4.7",
      image: "https://i.pravatar.cc/100?img=49",
    },
    {
      rank: 6,
      name: "Zhang Wei",
      department: "Sculpture Dept.",
      sales: 19,
      rating: "4.9",
      image: "https://i.pravatar.cc/100?img=11",
    },
    {
      rank: 7,
      name: "Elena Chen",
      department: "Digital Art",
      sales: 18,
      rating: "4.8",
      image: "https://i.pravatar.cc/100?img=25",
    },
    {
      rank: 8,
      name: "Li Ran",
      department: "Photography Dept.",
      sales: 15,
      rating: "4.7",
      image: "https://i.pravatar.cc/100?img=5",
    },
  ];

  const getArtworkImage = (artwork) => {
    if (!artwork?.image) return "";
    return artwork.image.startsWith("http")
      ? artwork.image
      : `http://localhost:5000/uploads/seller/uploadArtwork/${encodeURIComponent(
          artwork.image,
        )}`;
  };

  const heroImage = artworks.slice(0, 1).map(getArtworkImage);
  const warmSurface =
    theme.palette.mode === "light" ? "#fff9ef" : theme.palette.background.paper;

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
                  to="/buyer/artwork"
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
                  onClick={() => {
                    document
                      .getElementById("featured")
                      ?.scrollIntoView({ behavior: "smooth" });
                  }}
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
                  borderRadius: 4,
                  overflow: "hidden",
                  border: "1px solid",
                  borderColor: "divider",
                  aspectRatio: "4 / 5",
                  backgroundImage: heroImage ? `url(${heroImage})` : "none",
                  backgroundColor: "#e0e0e0",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              />
            </Grid>
          </Grid>
        </Container>
      </Box>

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
                    ? "/buyer/artwork"
                    : `/buyer/artwork/${encodeURIComponent(genre)}`,
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
      {!loading && !artworkErrorMessage && (
        <Box
          sx={{
            px: { xs: 3, sm: 5, lg: 7 },
            py: { xs: 5, md: 7 },
            backgroundColor: warmSurface,
          }}
        >
          <SectionHeader title="Recently Added Artworks" to="/buyer/artwork" />
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
            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(4, 1fr)" },
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
            <Stack key={title} direction="row" spacing={1.25} alignItems="flex-start">
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
            onClick={() => navigate("/buyer/artwork")}
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
              height: { xs: 220, md: 240 },
              borderRadius: 2,
              backgroundImage: `url(${getArtworkImage(artworks[0]) || popularArtists[0].image})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              border: `1px solid ${theme.palette.divider}`,
              boxShadow: theme.shadows[2],
            }}
          />
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
              Wang Yue
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 0.5 }}>
              Oil Painting School, Class of 2026
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 2, maxWidth: 620 }}>
              Awarded the Academy Grand Prix for her series “Reborn Petals”. Her
              work explores the friction between traditional oil application
              techniques and pixelated generative representations.
            </Typography>
            <Stack direction="row" spacing={{ xs: 2, sm: 5 }} sx={{ mt: 2.5 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  ARTWORKS
                </Typography>
                <Typography fontWeight={800}>18 works</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  SALES
                </Typography>
                <Typography fontWeight={800}>42 items sold</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  RATING
                </Typography>
                <Typography fontWeight={800}>
                  <Box component="span" sx={{ color: "#eab308" }}>
                    ★
                  </Box>{" "}
                  5.0
                </Typography>
              </Box>
            </Stack>
            <Button
              onClick={() => navigate("/buyer/artwork")}
              variant="contained"
              endIcon={<ArrowForwardIcon />}
              sx={{
                mt: 2,
                borderRadius: 999,
                backgroundColor: theme.palette.text.primary,
                color: theme.palette.background.paper,
              }}
            >
              View Wang's Gallery
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
          {popularArtists.slice(1).map((artist) => (
            <Box
              key={artist.rank}
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
                    #{artist.rank}
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
                  {artist.sales} sold&nbsp;&nbsp;{" "}
                  <Box component="span" sx={{ color: "#eab308" }}>
                    ★
                  </Box>{" "}
                  {artist.rating}
                </Typography>
              </Box>
              <Button
                variant="outlined"
                size="small"
                onClick={() => navigate("/buyer/artwork")}
                sx={{
                  flexShrink: 0,
                  minWidth: 70,
                  borderRadius: 999,
                  borderColor: theme.palette.text.primary,
                  color: theme.palette.text.primary,
                  fontSize: 11,
                }}
              >
                Follow
              </Button>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Featured Artworks */}
      {!loading && !artworkErrorMessage && (
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
            <SectionHeader title="Featured Artworks" to="/buyer/artwork" />
            {/* Loading / Error States */}
            {loading && (
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
                  key={artwork.artwork_id || artwork.id}
                  artwork={artwork}
                />
              ))}
            </Box>
          </Box>

        </>
      )}
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
          sx={{ fontSize: { xs: 17, sm: 20, md: 24 }, fontWeight: 600 }}
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
