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

  const heroImage = artworks[0]?.image
    ? artworks[0].image.startsWith("http")
      ? artworks[0].image
      : `http://localhost:5000/uploads/seller/uploadArtwork/${encodeURIComponent(
          artworks[0].image,
        )}`
    : "";

  return (
    <Box
      sx={{
        p: 3,
        backgroundColor: "#f5f5f5",
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
          mt: { xs: 0, md: -2 },
        }}
      >
        <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }}>
          <Grid container spacing={6} sx={{ alignItems: "center" }}>
            <Grid size={{ xs: 12, md: 7 }}>
              <Typography
                variant="overline"
                color="primary"
                sx={{ fontWeight: 600, letterSpacing: 2 }}
              >
                Student Art Gallery
              </Typography>
              <Typography
                variant="h2"
                sx={{
                  mt: 2,
                  fontSize: { xs: 40, md: 64 },
                  lineHeight: 1.05,
                  fontWeight: "bold",
                }}
              >
                Discover Original
                <br />
                Student Artworks
              </Typography>
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{ mt: 3, maxWidth: 520 }}
              >
                A quiet art gallery for original paintings, sketches and digital
                works by emerging student artists from around the world.
              </Typography>
              <Paper
                component="form"
                onSubmit={(e) => {
                  e.preventDefault();

                  navigate(`/buyer/artwork?q=${encodeURIComponent(q)}`);
                }}
                elevation={0}
                sx={{
                  mt: 4,
                  display: "flex",
                  alignItems: "center",
                  px: 2,
                  py: 0.5,
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 999,
                  maxWidth: 520,
                }}
              >
                <SearchIcon sx={{ color: "text.secondary", mr: 1 }} />
                <InputBase
                  fullWidth
                  placeholder="Search artworks, artists, genres…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  sx={{ py: 1 }}
                />
                <Button
                  type="submit"
                  variant="contained"
                  sx={{
                    padding: 1,
                    px: 3,
                    borderRadius: 999,
                    fontSize: 10,
                    fontWeight: 600,
                  }}
                >
                  Search
                </Button>
              </Paper>
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
                  sx={{ borderRadius: 99999 }}
                >
                  Shop Now
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
      <Box sx={{ px: { xs: 7, sm: 10 }, py: 3, mt: 3, p: 1 }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "repeat(2, minmax(0, 1fr))",
              sm: "repeat(3, minmax(0, 1fr))",
              md: "repeat(4, minmax(0, 1fr))",
              lg: "repeat(5, minmax(0, 1fr))",
            },
            gap: { xs: 1.5, sm: 2 },
          }}
        >
          {genres.map((genre) => (
            <Box
              key={genre}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
                minHeight: { xs: 72, sm: 88, md: 96 },
                px: { xs: 1.5, sm: 2 },
                py: 1.5,
                borderRadius: 2,
                border: "1px solid #ccc",
                cursor: "pointer",
                textAlign: "center",
                fontSize: { xs: "0.9rem", sm: "1rem" },
                overflow: "hidden",
                fontWeight: "bold",
                borderColor: "divider",
                color: "text.primary",
                backgroundColor: "#fff",
                transition: "all 180ms ease",
                "&:hover": {
                  borderColor: "error.main",
                  color: "error.main",
                  backgroundColor: "rgba(175, 79, 79, 0.08)",
                  transform: "translateY(-2px)",
                },
              }}
              onClick={() =>
                navigate(`/buyer/artwork/${encodeURIComponent(genre)}`)
              }
            >
              {genre}
            </Box>
          ))}
        </Box>
      </Box>

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

      {/* Featured Artworks */}
      {!loading && !artworkErrorMessage && (
        <>
          <Box sx={{ px: { xs: 7, sm: 10 }, mt: 4, p: 4 }}>
            <SectionHeader title="Featured Artworks" to="/buyer/artwork" />
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

          {/* Recently Added Artworks */}
          <Box sx={{ px: { xs: 7, sm: 10 }, mt: 4, p: 4 }}>
            <Box>
              <Typography
                variant="h4"
                sx={{
                  fontSize: { xs: 17, sm: 20, md: 24 },
                  fontWeight: 600,
                  mb: 3,
                }}
              >
                Recently Added Artworks
              </Typography>
            </Box>
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
              {[...artworks]
                .reverse()
                .slice(0, 12)
                .map((artwork) => (
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
