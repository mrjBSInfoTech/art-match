import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CircularProgress,
  Container,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import { fetchArtworks } from "../../api/buyer/artworkAPI";

const API_URL = "http://localhost:5000";
const BIO_FALLBACK = "The seller currently doesn't have a bio.";

const getProfileFallback = (name = "Artist") =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=243b53&color=ffffff&size=200`;

const getProfileImage = (artist) => {
  const imageName = artist?.profile_image || artist?.image;
  if (!imageName) return getProfileFallback(artist?.name || "Artist");
  if (imageName.startsWith("http")) return imageName;
  return `${API_URL}/uploads/seller/profile/${encodeURIComponent(imageName)}`;
};

const getArtworkImage = (artwork) => {
  if (!artwork?.image) return "";
  if (artwork.image.startsWith("http")) return artwork.image;
  return `${API_URL}/uploads/seller/uploadArtwork/${encodeURIComponent(artwork.image)}`;
};

const parseSpecialties = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }
};

const buildArtistSummaries = (artworks = []) => {
  const grouped = new Map();

  artworks.forEach((artwork) => {
    const studentId = artwork.student_id;
    if (!studentId) return;

    const shopName = artwork.shop_name || "";
    const artistName =
      [artwork.first_name, artwork.last_name].filter(Boolean).join(" ") ||
      artwork.artist ||
      "Unknown Artist";
    const existing = grouped.get(studentId) || {
      student_id: studentId,
      name: shopName || artistName,
      artistName,
      department: artwork.course || "Independent Artist",
      image: artwork.profile_image || "",
      bio: artwork.shop_description || "",
      shopName,
      shopDescription: artwork.shop_description || "",
      works: 0,
      artworks: [],
      specialties: parseSpecialties(artwork.specialties),
    };

    existing.works += 1;
    if (artwork.image && existing.artworks.length < 3) {
      existing.artworks.push(artwork);
    }
    if (!existing.specialties.length && artwork.genre) {
      existing.specialties.push(artwork.genre);
    }
    existing.image = artwork.profile_image || existing.image;
    existing.department = artwork.course || existing.department;
    existing.shopName = existing.shopName || shopName;
    existing.shopDescription =
      existing.shopDescription || artwork.shop_description || "";
    existing.bio = existing.shopDescription || "";
    if (!existing.specialties.length) {
      existing.specialties.push(...parseSpecialties(artwork.specialties));
    }
    existing.name = existing.shopName || existing.artistName || artistName;
    grouped.set(studentId, existing);
  });

  return [...grouped.values()]
    .map((artist) => ({
      ...artist,
      image: getProfileImage(artist),
      artworks: artist.artworks.slice(0, 3),
      specialties: artist.specialties.slice(0, 3),
    }))
    .sort((a, b) => b.works - a.works || a.name.localeCompare(b.name));
};

function ArtistCard({ artist, onViewProfile }) {
  const tags = artist.specialties.length
    ? artist.specialties
    : [artist.department || "Contemporary Art"];

  return (
    <Card
      sx={{
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
        minHeight: { xs: 0, sm: 340 },
        p: { xs: 2, sm: 2.5 },
        borderRadius: 2.5,
        backgroundColor: "background.paper",
        borderColor: "rgba(35, 31, 28, 0.12)",
        boxShadow: "0 2px 8px rgba(35, 31, 28, 0.04)",
        transition: "transform 180ms ease, box-shadow 180ms ease",
        "&:hover": {
          transform: "translateY(-3px)",
          boxShadow: "0 10px 24px rgba(35, 31, 28, 0.12)",
        },
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Avatar
          src={artist.image}
          alt={artist.name}
          sx={{ width: 52, height: 52, border: "2px solid #f2eee8" }}
        />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={{ fontSize: "1rem", fontWeight: 800, lineHeight: 1.2 }} noWrap>
            {artist.name}
          </Typography>
          <Typography sx={{ color: "text.secondary", fontSize: "0.72rem", mt: 0.45 }} noWrap>
            {artist.artistName} · {artist.department}
          </Typography>
        </Box>
        <Typography
          sx={{
            alignSelf: "flex-start",
            px: 1,
            py: 0.4,
            borderRadius: 1,
            color: "#d91f3d",
            backgroundColor: "#fff0f1",
            fontSize: "0.66rem",
            fontWeight: 800,
            whiteSpace: "nowrap",
          }}
        >
          {tags[0]}
        </Typography>
      </Stack>

      <Typography
        sx={{
          color: "text.secondary",
          fontSize: "0.8rem",
          lineHeight: 1.5,
          minHeight: 60,
          mt: 1.75,
          display: "-webkit-box",
          WebkitBoxOrient: "vertical",
          WebkitLineClamp: 3,
          overflow: "hidden",
        }}
      >
        {artist.bio?.trim() || BIO_FALLBACK}
      </Typography>

      <Typography
        sx={{
          color: "text.secondary",
          fontSize: "0.62rem",
          fontWeight: 800,
          letterSpacing: "0.07em",
          textTransform: "uppercase",
          mt: 1.5,
          mb: 0.75,
        }}
      >
        Exhibition studies
      </Typography>
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0.75, mt: 1.25 }}>
        {artist.artworks.map((artwork) => (
          <Box
            key={artwork.artwork_id || artwork.id || artwork.image}
            sx={{
              width: "100%",
              height: { xs: 82, sm: 112 },
              borderRadius: 0.8,
              overflow: "hidden",
              background: "linear-gradient(135deg, #eee9e3 0%, #f8f5f1 100%)",
            }}
          >
            <Box
              component="img"
              src={getArtworkImage(artwork)}
              alt={artwork.title || "Artwork"}
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
              sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          </Box>
        ))}
        {Array.from({ length: Math.max(0, 3 - artist.artworks.length) }).map((_, index) => (
          <Box
            key={`placeholder-${index}`}
            sx={{
              height: { xs: 82, sm: 112 },
              borderRadius: 0.8,
              background: "linear-gradient(135deg, #eee9e3 0%, #f8f5f1 100%)",
            }}
          />
        ))}
      </Box>
      <Stack direction="row" spacing={0.6} sx={{ minHeight: 26, overflow: "hidden", mt: 0.9 }}>
        {tags.map((tag) => (
          <Box key={tag} sx={{ px: 0.8, py: 0.35, borderRadius: 0.75, backgroundColor: "#f4f0eb", color: "#5e554e", fontSize: "0.62rem", whiteSpace: "nowrap" }}>
            {tag}
          </Box>
        ))}
      </Stack>

      <Divider sx={{ my: 1.5, borderColor: "rgba(35, 31, 28, 0.1)" }} />
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography sx={{ color: "text.secondary", fontSize: "0.72rem" }}>{artist.works} works</Typography>
        <Typography sx={{ color: "#e22847", fontSize: "0.72rem", fontWeight: 800 }}>4.8 <span style={{ color: "#f3a51d" }}>★</span></Typography>
        <Typography sx={{ color: "text.secondary", fontSize: "0.72rem" }}>{Math.max(8, artist.works * 3)} followers</Typography>
      </Stack>

      <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
        <Button variant="outlined" aria-label={`Follow ${artist.name}`} sx={{ minWidth: 0, px: 1.25, borderColor: "#d8d0c8", color: "text.secondary", fontSize: "0.72rem" }}>
          <FavoriteBorderIcon sx={{ fontSize: 16, mr: 0.35 }} />
          Follow
        </Button>
        <Button
          fullWidth
          variant="contained"
          endIcon={<ArrowForwardIcon sx={{ fontSize: "16px !important" }} />}
          onClick={() => onViewProfile(artist.student_id)}
          sx={{ backgroundColor: "#1d2433", color: "#fff", fontSize: "0.78rem", fontWeight: 800, "&:hover": { backgroundColor: "#313b4e" } }}
        >
          View Profile
        </Button>
      </Stack>
    </Card>
  );
}

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
        setArtists(buildArtistSummaries(list));
      } catch (err) {
        setError(err.message || "Failed to load artist listings.");
        setArtists([]);
      } finally {
        setLoading(false);
      }
    };
    loadArtists();
  }, []);

  const artistCountLabel = useMemo(
    () => `${artists.length} ${artists.length === 1 ? "artist" : "artists"}`,
    [artists.length],
  );

  if (loading) {
    return <Container sx={{ py: 10, display: "flex", justifyContent: "center" }}><CircularProgress /></Container>;
  }
  if (error) {
    return <Container maxWidth="md" sx={{ py: 8 }}><Alert severity="error">{error}</Alert></Container>;
  }

  return (
    <Box sx={{ backgroundColor: (theme) => theme.palette.mode === "dark" ? "background.default" : "#faf9f7", minHeight: "100%", py: { xs: 3, md: 5 } }}>
      <Container maxWidth="lg">
        <Stack spacing={{ xs: 2.5, md: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, overflowX: "auto", px: { xs: 1.25, sm: 2.5 }, py: 1, border: "1px solid #e8cfd1", borderRadius: 2, backgroundColor: "#fff2f3", "&::-webkit-scrollbar": { display: "none" } }}>
            <Typography sx={{ flexShrink: 0, color: "#1d2433", fontSize: "0.6rem", fontWeight: 900, letterSpacing: "0.04em", textTransform: "uppercase", mr: 0.5 }}>
              Top popular artists
            </Typography>
            {artists.slice(0, 8).map((artist) => (
              <Button key={artist.student_id} onClick={() => navigate(`/buyer/seller/${artist.student_id}`)} sx={{ flexShrink: 0, minWidth: 0, p: 0.35, pr: 1, borderRadius: 2, color: "#1d2433", backgroundColor: "rgba(255,255,255,0.55)", fontSize: "0.56rem", fontWeight: 700 }}>
                <Avatar src={artist.image} sx={{ width: 19, height: 19, mr: 0.5 }} />
                {artist.name}
                <Box component="span" sx={{ color: "#e22847", ml: 0.4 }}>★ 4.8</Box>
              </Button>
            ))}
          </Box>

          <Stack direction="row" alignItems="center" justifyContent="flex-end" spacing={1}>
            <Typography sx={{ color: "text.secondary", fontSize: "0.58rem", mr: "auto" }}>Showing {artistCountLabel}</Typography>
            <Stack direction="row" spacing={0.65}>
              {["All types", "Most works"].map((label, index) => (
                <Button key={label} variant={index === 0 ? "contained" : "outlined"} size="small" sx={{ minWidth: 0, px: 1.15, color: index === 0 ? "#fff" : "text.secondary", backgroundColor: index === 0 ? "#1d2433" : "transparent", borderColor: "#d8d0c8", fontSize: "0.58rem", "&:hover": { backgroundColor: index === 0 ? "#313b4e" : "#f2eee9" } }}>
                  {label}
                </Button>
              ))}
            </Stack>
          </Stack>

          {artists.length ? (
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(3, minmax(0, 1fr))" }, gap: { xs: 1.5, md: 1.75 } }}>
              {artists.map((artist) => (
                <ArtistCard key={artist.student_id} artist={artist} onViewProfile={(id) => navigate(`/buyer/seller/${id}`)} />
              ))}
            </Box>
          ) : (
            <Alert severity="info">No artists are available yet.</Alert>
          )}
        </Stack>
      </Container>
    </Box>
  );
}
