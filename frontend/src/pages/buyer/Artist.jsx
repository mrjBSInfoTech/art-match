import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Container,
  Skeleton,
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
import { formatArtistRating } from "../../utils/artistEngagement.js";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";

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
    if (Number(artwork.is_sold_out) === 1) return;

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
  const [sortMode, setSortMode] = useState("works");

  const loadArtists = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [artworkResponse, artistSummaries] = await Promise.all([
        fetchArtworks(),
        fetchArtistSummaries(),
      ]);
      const list = Array.isArray(artworkResponse)
        ? artworkResponse
        : artworkResponse?.data;
      if (!Array.isArray(list)) {
        throw new Error("Artist listings were returned in an unexpected format.");
      }
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
  }, []);

  useEffect(() => {
    loadArtists();
  }, [loadArtists]);

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
  const sortedArtists = useMemo(
    () => [...artists].sort((first, second) =>
      sortMode === "rating"
        ? Number(second.averageRating || 0) - Number(first.averageRating || 0) ||
          second.works - first.works
        : second.works - first.works ||
          Number(second.averageRating || 0) - Number(first.averageRating || 0),
    ),
    [artists, sortMode],
  );

  return (
    <Box
      sx={{
        minHeight: "100%",
        py: { xs: 3, sm: 4, lg: 6 },
        backgroundColor: "background.default",
      }}
    >
      <Container maxWidth="lg">
        <Stack spacing={{ xs: 3, sm: 4 }}>
          <Box
            component="header"
            sx={{
              display: "flex",
              alignItems: { xs: "flex-start", sm: "flex-end" },
              justifyContent: "space-between",
              gap: 2,
              flexDirection: { xs: "column", sm: "row" },
            }}
          >
            <Box sx={{ maxWidth: 680 }}>
              <Typography
                component="p"
                variant="overline"
                sx={{ color: "error.main", fontWeight: 800, letterSpacing: 1.5 }}
              >
                The CAFA creative community
              </Typography>
              <Typography
                component="h1"
                variant="h3"
                sx={{
                  mt: 0.5,
                  fontSize: { xs: "2rem", sm: "2.5rem", md: "3rem" },
                  fontWeight: 800,
                  lineHeight: 1.1,
                }}
              >
                Meet the artists
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 1.25, maxWidth: 580 }}>
                Discover the people behind the work, explore their collections,
                and find your next favorite creator.
              </Typography>
            </Box>
            <Box
              aria-live="polite"
              sx={{
                px: 2,
                py: 1,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
                backgroundColor: "background.paper",
              }}
            >
              {loading ? (
                <Skeleton width={90} />
              ) : error ? (
                <Typography color="text.secondary">Unavailable</Typography>
              ) : (
                <Typography sx={{ fontWeight: 700 }}>{artistCountLabel}</Typography>
              )}
            </Box>
          </Box>

          {error && (
            <Alert
              severity="error"
              action={
                <Button
                  color="inherit"
                  startIcon={<RefreshRoundedIcon />}
                  onClick={loadArtists}
                  disabled={loading}
                >
                  Retry
                </Button>
              }
            >
              {error}
            </Alert>
          )}
          {followError && <Alert severity="error">{followError}</Alert>}
          {!loading && !error && artists.length > 0 && (
            <Box
              component="section"
            aria-labelledby="featured-artists-title"
            sx={{
              p: { xs: 1.5, sm: 2 },
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 3,
              backgroundColor: "background.paper",
            }}
          >
            <Typography
              id="featured-artists-title"
              component="h2"
              variant="h6"
              sx={{ fontWeight: 800, mb: 1.5 }}
            >
              Artist highlights
            </Typography>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                overflowX: "auto",
                py: 0.5,
                scrollSnapType: "x mandatory",
                overscrollBehaviorX: "contain",
                "& > *": { scrollSnapAlign: "start" },
              }}
            >
            {sortedArtists.slice(0, 8).map((artist) => (
              <Button
                key={artist.student_id}
                onClick={() => navigate(`/buyer/seller/${artist.student_id}`)}
                aria-label={`View ${artist.name}'s profile, rated ${formatArtistRating(artist.averageRating)} out of 5`}
                sx={{
                  minHeight: 48,
                  minWidth: 0,
                  flex: "0 0 auto",
                  px: 1.25,
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 999,
                  color: "text.primary",
                  backgroundColor: "background.default",
                  "&:hover": { backgroundColor: "action.hover" },
                }}
              >
                <Avatar src={artist.image} alt="" sx={{ width: 32, height: 32, mr: 1 }} />
                <Box
                  component="span"
                  sx={{
                    maxWidth: { xs: 120, sm: 180 },
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {artist.name}
                </Box>
                <Box component="span" sx={{ color: "warning.dark", ml: 0.75 }}>
                  ★ {formatArtistRating(artist.averageRating)}
                </Box>
              </Button>
            ))}
            </Box>
            </Box>
          )}

          <Typography component="h2" variant="h5" sx={{ fontWeight: 800 }}>
            Artist directory
          </Typography>
          {!error && (
            <Stack
              direction={{ xs: "column", sm: "row" }}
              alignItems={{ xs: "stretch", sm: "center" }}
              spacing={1}
            >
              <Typography component="span" sx={{ color: "text.secondary", fontSize: "0.875rem", mr: "auto" }}>
                Sort artists by
              </Typography>
              <Stack
                direction="row"
                spacing={1}
                role="group"
                aria-label="Sort artists"
              >
                {["Most works", "Top rated"].map((label, index) => (
                  <Button
                    key={label}
                    variant={sortMode === (index === 0 ? "works" : "rating") ? "contained" : "outlined"}
                    aria-pressed={sortMode === (index === 0 ? "works" : "rating")}
                    onClick={() => setSortMode(index === 0 ? "works" : "rating")}
                    sx={{ minHeight: 44, minWidth: 112, px: 1.5 }}
                  >
                    {label}
                  </Button>
                ))}
              </Stack>
            </Stack>
          )}

          {loading ? (
            <Box
              aria-label="Loading artists"
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "minmax(0, 1fr)",
                  sm: "repeat(2, minmax(0, 1fr))",
                  lg: "repeat(3, minmax(0, 1fr))",
                },
                gap: { xs: 2, md: 2.5 },
              }}
            >
              {Array.from({ length: 6 }, (_, index) => (
                <Box
                  key={index}
                  sx={{
                    p: 2.5,
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 3,
                    backgroundColor: "background.paper",
                  }}
                >
                  <Skeleton variant="circular" width={56} height={56} />
                  <Skeleton width="70%" sx={{ mt: 2 }} />
                  <Skeleton width="100%" />
                  <Skeleton variant="rounded" height={104} sx={{ mt: 2 }} />
                  <Skeleton variant="rounded" height={44} sx={{ mt: 2 }} />
                </Box>
              ))}
            </Box>
          ) : error ? null : artists.length ? (
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(3, minmax(0, 1fr))" }, alignItems: "stretch", gap: { xs: 2, md: 2.5 } }}>
              {sortedArtists.map((artist) => (
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
