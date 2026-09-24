import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { useTheme } from "@mui/material/styles";
import ArtworkCard from "../../components/buyer/Artwork/ArtworkCard";
import { fetchArtworks } from "../../api/buyer/artworkAPI";

const getProfileFallback = (name = "Artist") =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=243b53&color=ffffff&size=200`;

const getProfileImage = (artist) => {
  const imageName = artist?.profile_image || artist?.image;
  if (!imageName) return getProfileFallback(artist?.name || "Artist");
  if (imageName.startsWith("http")) return imageName;
  return `http://localhost:5000/uploads/seller/profile/${encodeURIComponent(imageName)}`;
};

const getArtworkImage = (artwork) => {
  if (!artwork?.image) return "";
  return artwork.image.startsWith("http")
    ? artwork.image
    : `http://localhost:5000/uploads/seller/uploadArtwork/${encodeURIComponent(artwork.image)}`;
};

const buildArtistSummaries = (artworks = []) => {
  const grouped = new Map();

  artworks.forEach((artwork) => {
    const studentId = artwork.student_id;
    if (!studentId) return;

    const existing = grouped.get(studentId) || {
      student_id: studentId,
      name: artwork.artist || "Unknown Artist",
      department: artwork.course || artwork.genre || "Independent Artist",
      image: artwork.profile_image || "",
      bio: artwork.description || "Contemporary artist practice.",
      rating: 4.8,
      works: 0,
      sales: 0,
      featuredArtwork: artwork,
    };

    existing.works += 1;
    existing.sales = existing.works;
    existing.image = artwork.profile_image || existing.image || "";
    existing.department = artwork.course || existing.department;
    existing.bio = artwork.description || existing.bio;
    existing.featuredArtwork = existing.featuredArtwork || artwork;
    grouped.set(studentId, existing);
  });

  return [...grouped.values()]
    .map((artist) => ({
      ...artist,
      worksLabel: `${artist.works} works`,
      image: getProfileImage(artist),
    }))
    .sort((a, b) => b.works - a.works || a.name.localeCompare(b.name));
};

export default function Artist() {
  const navigate = useNavigate();
  const { id } = useParams();
  const theme = useTheme();
  const [artists, setArtists] = useState([]);
  const [artistArtworks, setArtistArtworks] = useState([]);
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadArtists = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await fetchArtworks();
        const list = Array.isArray(response) ? response : response?.data || [];
        const artistSummaries = buildArtistSummaries(list);
        setArtists(artistSummaries);

        if (id) {
          const currentArtist = artistSummaries.find(
            (artist) => String(artist.student_id) === String(id),
          );
          const fallbackArtist = currentArtist || artistSummaries[0] || null;
          const targetId = fallbackArtist?.student_id;
          const filteredArtworks = targetId
            ? list.filter(
                (artwork) => String(artwork.student_id) === String(targetId),
              )
            : [];
          setSelectedArtist(fallbackArtist);
          setArtistArtworks(filteredArtworks);
        } else {
          const featuredArtist = artistSummaries[0] || null;
          const featuredArtworks = featuredArtist
            ? list.filter(
                (artwork) =>
                  String(artwork.student_id) ===
                  String(featuredArtist.student_id),
              )
            : [];
          setSelectedArtist(featuredArtist);
          setArtistArtworks(featuredArtworks);
        }
      } catch (err) {
        setError(err.message || "Failed to load artist data.");
        setArtists([]);
        setArtistArtworks([]);
        setSelectedArtist(null);
      } finally {
        setLoading(false);
      }
    };

    loadArtists();
  }, [id]);

  const otherArtists = useMemo(() => {
    if (!selectedArtist) return artists;
    return artists.filter(
      (artist) =>
        String(artist.student_id) !== String(selectedArtist.student_id),
    );
  }, [artists, selectedArtist]);

  if (loading) {
    return (
      <Container
        maxWidth="lg"
        sx={{
          py: 8,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: 300,
        }}
      >
        <CircularProgress />
      </Container>
    );
  }

  if (error || !selectedArtist) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Alert severity="error">
          {error || "This artist could not be found."}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 5, md: 7 } }}>
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="overline"
          sx={{
            color: theme.palette.error.main,
            fontWeight: 800,
            letterSpacing: 1.5,
          }}
        >
          Artist profile
        </Typography>
        <Typography
          variant="h3"
          sx={{ mt: 1, fontWeight: 800, letterSpacing: "-0.04em" }}
        >
          {selectedArtist.name}
        </Typography>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            md: "minmax(260px, 0.92fr) 1.56fr",
          },
          gap: { xs: 3, md: 5 },
          alignItems: "center",
          p: { xs: 2, sm: 3 },
          mb: 4,
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
            height: { xs: 220, md: 260 },
            borderRadius: 2,
            backgroundImage: `url(${getArtworkImage(selectedArtist.featuredArtwork) || selectedArtist.image})`,
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
            STUDIO PROFILE
          </Typography>

          <Typography variant="h4" sx={{ mt: 1, fontWeight: 800 }}>
            {selectedArtist.name}
          </Typography>

          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            {selectedArtist.department}, Class of 2026
          </Typography>

          <Typography color="text.secondary" sx={{ mt: 2, maxWidth: 620 }}>
            {selectedArtist.bio}
          </Typography>

          <Stack direction="row" spacing={{ xs: 2, sm: 5 }} sx={{ mt: 2.5 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                ARTWORKS
              </Typography>
              <Typography fontWeight={800}>
                {selectedArtist.worksLabel}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                LISTED
              </Typography>
              <Typography fontWeight={800}>
                {selectedArtist.sales} pieces
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
                {selectedArtist.rating}
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
            View All Artwork
          </Button>
        </Box>
      </Box>

      {otherArtists.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 2 }}>
            More artists
          </Typography>
          <Grid container spacing={2}>
            {otherArtists.slice(0, 6).map((artist) => (
              <Grid item xs={12} md={4} key={artist.student_id}>
                <Box
                  onClick={() => navigate(`/buyer/artist/${artist.student_id}`)}
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
                    cursor: "pointer",
                    height: "100%",
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
                    }}
                  />
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="body2" noWrap sx={{ fontWeight: 800 }}>
                      {artist.name}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      display="block"
                    >
                      {artist.department}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {artist.worksLabel}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      <Box sx={{ mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 2 }}>
          {selectedArtist.name}'s artworks
        </Typography>
      </Box>

      {artistArtworks.length > 0 ? (
        <Grid container spacing={3}>
          {artistArtworks.map((artwork) => (
            <Grid item xs={12} sm={6} md={4} key={artwork.artwork_id}>
              <ArtworkCard artwork={artwork} />
            </Grid>
          ))}
        </Grid>
      ) : (
        <Alert severity="info">
          This artist has no published artworks yet.
        </Alert>
      )}
    </Container>
  );
}
