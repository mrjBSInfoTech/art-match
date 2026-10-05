import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Stack,
  Typography,
} from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { fetchArtworks } from "../../api/buyer/artworkAPI";

const getProfileFallback = (name = "Artist") =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=243b53&color=ffffff&size=200`;

const getProfileImage = (artist) => {
  const imageName = artist?.profile_image || artist?.image;
  if (!imageName) return getProfileFallback(artist?.name || "Artist");
  if (imageName.startsWith("http")) return imageName;
  return `http://localhost:5000/uploads/seller/profile/${encodeURIComponent(imageName)}`;
};

const buildArtistSummaries = (artworks = []) => {
  const grouped = new Map();

  artworks.forEach((artwork) => {
    const studentId = artwork.student_id;
    if (!studentId) return;

    const shopName = artwork.shop_name || "";
    const fallbackArtistName =
      [artwork.first_name, artwork.last_name].filter(Boolean).join(" ") ||
      artwork.artist ||
      "Unknown Artist";

    const existing = grouped.get(studentId) || {
      student_id: studentId,
      name: shopName || fallbackArtistName,
      artistName: fallbackArtistName,
      department: artwork.course || artwork.genre || "Independent Artist",
      image: artwork.profile_image || "",
      bio:
        artwork.shop_description ||
        artwork.description ||
        "The seller currently doesn't have a bio.",
      shopName,
      shopDescription: artwork.shop_description || "",
      rating: 4.8,
      works: 0,
      featuredArtwork: artwork,
    };

    existing.works += 1;
    existing.image = artwork.profile_image || existing.image || "";
    existing.department = artwork.course || existing.department;
    existing.shopName = existing.shopName || shopName || "";
    existing.shopDescription =
      existing.shopDescription || artwork.shop_description || "";
    existing.bio =
      existing.shopDescription ||
      artwork.shop_description ||
      artwork.description ||
      "The seller currently doesn't have a bio.";
    existing.name =
      existing.shopName || existing.artistName || fallbackArtistName;
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
  const [artists, setArtists] = useState([]);
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
      } catch (err) {
        setError(err.message || "Failed to load artist listings.");
        setArtists([]);
      } finally {
        setLoading(false);
      }
    };

    loadArtists();
  }, []);

  if (loading) {
    return (
      <Container
        maxWidth="lg"
        sx={{ py: 8, display: "flex", justifyContent: "center" }}
      >
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
      <Stack spacing={4}>
        <Box>
          <Typography
            variant="overline"
            sx={{ color: "text.secondary", letterSpacing: 2 }}
          >
            ARTISTS
          </Typography>
          <Typography
            variant="h3"
            sx={{ fontWeight: 800, letterSpacing: "-0.04em" }}
          >
            Showcase of Emerging Artists
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ mt: 1, maxWidth: 700 }}
          >
            Discover student artists, studio names, and unique storefronts
            across the CAFA community.
          </Typography>
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "minmax(0, 1fr)",
              sm: "repeat(auto-fill, minmax(260px, 320px))",
            },
            gap: 2.5,
            justifyContent: "start",
          }}
        >
          {artists.map((artist) => (
            <Box key={artist.student_id} sx={{ minWidth: 0 }}>
              <Card
                sx={{
                  height: "100%",
                  maxWidth: 320,
                  borderRadius: 2,
                  overflow: "hidden",
                  border: "1px solid",
                  borderColor: "divider",
                  transition: "all 0.2s ease",
                  "&:hover": { transform: "translateY(-2px)", boxShadow: 2 },
                }}
              >
                <CardContent sx={{ p: 2 }}>
                  <Stack
                    direction="row"
                    spacing={1.5}
                    alignItems="center"
                    sx={{ minWidth: 0 }}
                  >
                    <Avatar
                      src={artist.image}
                      alt={artist.name}
                      sx={{ width: 56, height: 56, flexShrink: 0 }}
                    />
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography
                        variant="h6"
                        sx={{ fontWeight: 800, lineHeight: 1.2 }}
                        noWrap
                      >
                        {artist.name}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        noWrap
                      >
                        {artist.department}
                      </Typography>
                    </Box>
                  </Stack>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      mt: 1.5,
                      minHeight: 60,
                      display: "-webkit-box",
                      WebkitBoxOrient: "vertical",
                      WebkitLineClamp: 3,
                      overflow: "hidden",
                    }}
                  >
                    {artist.bio || "The seller currently doesn't have a bio."}
                  </Typography>

                  <Box
                    sx={{
                      mt: 2,
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      {artist.worksLabel}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ color: "#d39d33", fontWeight: 700 }}
                    >
                      ★ {artist.rating || 4.8}
                    </Typography>
                  </Box>

                  <Button
                    fullWidth
                    variant="contained"
                    endIcon={<ArrowForwardIcon />}
                    onClick={() =>
                      navigate(`/buyer/seller/${artist.student_id}`)
                    }
                    sx={{
                      mt: 2,
                      borderRadius: 1,
                      backgroundColor: "#1f1f1f",
                      color: "#fff",
                      textTransform: "none",
                      fontWeight: 700,
                    }}
                  >
                    View Storefront
                  </Button>
                </CardContent>
              </Card>
            </Box>
          ))}
        </Box>
      </Stack>
    </Container>
  );
}
