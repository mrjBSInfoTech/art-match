import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Container,
  Stack,
  Typography,
} from "@mui/material";
import {
  fetchArtworks,
  fetchArtistSummaries,
  followArtist,
  unfollowArtist,
} from "../../api/buyer/artworkAPI";
import ArtistCard from "../../components/buyer/Artist/ArtistCard";
import ConnectionErrorPanel from "../../components/buyer/ConnectionErrorPanel";
import { formatArtistRating } from "../../utils/artistEngagement.js";

const API_URL = "http://localhost:5000";

const getProfileFallback = () => `${API_URL}/uploads/seller/profile.jpg`;

const getProfileImage = (artist) => {
  const imageName = artist?.profile_image || artist?.image;
  if (!imageName) return getProfileFallback(artist?.name || "Artist");
  if (imageName.startsWith("http")) return imageName;
  return `${API_URL}/uploads/seller/profile/${encodeURIComponent(imageName)}`;
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

const buildArtistSummaries = (artworks = [], engagementByArtist = new Map()) => {
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
      averageRating: 0,
      followerCount: 0,
      isFollowing: false,
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
      ...(engagementByArtist.get(String(artist.student_id)) || {}),
      image: getProfileImage(artist),
      artworks: artist.artworks.slice(0, 3),
      specialties: artist.specialties.slice(0, 3),
    }))
    .sort((a, b) => b.works - a.works || a.name.localeCompare(b.name));
};

export default function Artist() {
  const navigate = useNavigate();
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [followError, setFollowError] = useState("");

  useEffect(() => {
    const loadArtists = async () => {
      try {
        setLoading(true);
        setError("");
        const [artworkResponse, artistSummaries] = await Promise.all([
          fetchArtworks(),
          fetchArtistSummaries(),
        ]);
        const list = Array.isArray(artworkResponse)
          ? artworkResponse
          : artworkResponse?.data || [];
        const engagementByArtist = new Map(
          (Array.isArray(artistSummaries) ? artistSummaries : []).map((summary) => [
            String(summary.student_id),
            {
              averageRating: Number(summary.averageRating) || 0,
              followerCount: Number(summary.followerCount) || 0,
              isFollowing: Boolean(summary.isFollowing),
            },
          ]),
        );
        setArtists(buildArtistSummaries(list, engagementByArtist));
      } catch (err) {
        setError(err.message || "Failed to load artist listings.");
        setArtists([]);
      } finally {
        setLoading(false);
      }
    };
    loadArtists();
  }, []);

  const toggleArtistFollow = async (artist) => {
    if (artist.followPending) return;
    setFollowError("");
    setArtists((current) => current.map((item) =>
      item.student_id === artist.student_id ? { ...item, followPending: true } : item));

    try {
      const result = artist.isFollowing
        ? await unfollowArtist(artist.student_id)
        : await followArtist(artist.student_id);
      setArtists((current) => current.map((item) =>
        item.student_id === artist.student_id
          ? {
              ...item,
              followerCount: Number(result.followerCount),
              isFollowing: Boolean(result.isFollowing),
              followPending: false,
            }
          : item));
    } catch (followRequestError) {
      setArtists((current) => current.map((item) =>
        item.student_id === artist.student_id ? { ...item, followPending: false } : item));
      setFollowError(followRequestError.message || "Unable to update artist follow.");
    }
  };

  const artistCountLabel = useMemo(
    () => `${artists.length} ${artists.length === 1 ? "artist" : "artists"}`,
    [artists.length],
  );

  if (loading) {
    return <Container sx={{ py: 10, display: "flex", justifyContent: "center" }}><CircularProgress /></Container>;
  }
  if (error) {
    return <ConnectionErrorPanel title="Artists Unavailable" />;
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
                <Box component="span" sx={{ color: "#e22847", ml: 0.4 }}>
                  ★ {formatArtistRating(artist.averageRating)}
                </Box>
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

          {followError && <Alert severity="error">{followError}</Alert>}

          {artists.length ? (
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(3, minmax(0, 1fr))" }, gap: { xs: 1.5, md: 1.75 } }}>
              {artists.map((artist) => (
                <ArtistCard
                  key={artist.student_id}
                  artist={artist}
                  onToggleFollow={toggleArtistFollow}
                  onViewProfile={(id) => navigate(`/buyer/seller/${id}`)}
                />
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
