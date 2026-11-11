import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Container,
  Divider,
  MenuItem,
  Select,
  Skeleton,
  Stack,
  Typography,
  useTheme,
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
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import StarRateRoundedIcon from "@mui/icons-material/StarRateRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import { getProfileInitials } from "../../utils/profileInitials.js";
import { isAuthenticated } from "../../../utils/auth";

const API_URL = "http://localhost:5000";

const getProfileFallback = () => "";

const getProfileImage = (artist) => {
  const imageName = artist?.profile_image || artist?.image;
  if (!imageName) return getProfileFallback(artist?.name || "Artist");
  if (imageName.startsWith("http")) return imageName;
  if (imageName.startsWith("/uploads/")) return `${API_URL}${imageName}`;
  return `${API_URL}/uploads/seller/uploadProfile/${encodeURIComponent(imageName)}`;
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

    const shopName = artwork.shop_name?.trim() || "";
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
      artistName: artist.shopName ? "" : artist.artistName,
      ...(engagementByArtist.get(String(artist.student_id)) || {}),
      image: getProfileImage(artist),
      artworks: artist.artworks.slice(0, 3),
      specialties: artist.specialties.slice(0, 3),
    }))
    .sort((a, b) => b.works - a.works || a.name.localeCompare(b.name));
};

export default function Artist() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [followError, setFollowError] = useState("");
  const [sortMode, setSortMode] = useState("popular");
  const [selectedType, setSelectedType] = useState("all");

  const loadArtists = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [artworkResponse, artistSummaries] = await Promise.all([
        fetchArtworks(),
        fetchArtistSummaries().catch(() => []),
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
    if (!isAuthenticated("buyer")) {
      navigate("/buyer/login");
      return;
    }
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

  const topPopularArtists = useMemo(() => {
    return [...artists]
      .sort((a, b) => {
        const ratingA = Number(a.averageRating || 0);
        const ratingB = Number(b.averageRating || 0);
        if (ratingB !== ratingA) return ratingB - ratingA;
        const followersA = Number(a.followerCount || 0);
        const followersB = Number(b.followerCount || 0);
        if (followersB !== followersA) return followersB - followersA;
        return (b.works || 0) - (a.works || 0);
      })
      .slice(0, 5);
  }, [artists]);

  const availableTypes = useMemo(() => {
    const counts = new Map();
    artists.forEach((artist) => {
      const type = artist.department || artist.specialties?.[0];
      if (type && type.trim()) {
        const cleanType = type.trim();
        counts.set(cleanType, (counts.get(cleanType) || 0) + 1);
      }
    });
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [artists]);

  const filteredAndSortedArtists = useMemo(() => {
    let result = artists;
    if (selectedType !== "all") {
      result = result.filter(
        (artist) =>
          artist.department === selectedType ||
          artist.specialties?.includes(selectedType),
      );
    }

    return [...result].sort((first, second) => {
      if (sortMode === "popular") {
        const scoreFirst =
          (Number(first.averageRating) || 0) * 20 +
          (Number(first.followerCount) || 0) * 10 +
          (first.works || 0);
        const scoreSecond =
          (Number(second.averageRating) || 0) * 20 +
          (Number(second.followerCount) || 0) * 10 +
          (second.works || 0);
        return scoreSecond - scoreFirst;
      }
      if (sortMode === "rating") {
        return (
          Number(second.averageRating || 0) - Number(first.averageRating || 0) ||
          second.works - first.works
        );
      }
      if (sortMode === "followers") {
        return (
          Number(second.followerCount || 0) - Number(first.followerCount || 0) ||
          Number(second.averageRating || 0) - Number(first.averageRating || 0)
        );
      }
      if (sortMode === "name") {
        return (first.name || "").localeCompare(second.name || "");
      }
      // default "works"
      return (
        second.works - first.works ||
        Number(second.averageRating || 0) - Number(first.averageRating || 0)
      );
    });
  }, [artists, selectedType, sortMode]);

  if (error && !loading && artists.length === 0) {
    return (
      <ConnectionErrorPanel
        title="Artists Unavailable"
        onRetry={loadArtists}
      />
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundColor: isDark ? "background.default" : "#fffaf2",
        py: { xs: 2.5, md: 4 },
      }}
    >
      <Container maxWidth="xl" sx={{ px: { xs: 2, sm: 3, lg: 4 } }}>
        <Stack spacing={{ xs: 2.5, md: 3 }}>
          <Box
            component="header"
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              alignItems: { xs: "flex-start", sm: "flex-end" },
              justifyContent: "space-between",
              gap: 2,
              p: { xs: 2, sm: 3, md: 4 },
              border: "1px solid",
              borderColor: "divider",
              borderRadius: { xs: 2, sm: 3 },
              background: isDark
                ? "linear-gradient(135deg, rgba(30, 41, 59, 0.96), rgba(15, 23, 42, 0.96))"
                : "linear-gradient(135deg, #fff4e6, #fffaf2 68%)",
            }}
          >
            <Box sx={{ minWidth: 0 }}>
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
                component="h1"
                sx={{
                  color: "text.primary",
                  fontSize: { xs: "2rem", sm: "2.5rem", md: "3rem" },
                  fontWeight: 900,
                  lineHeight: 1.1,
                }}
              >
                Meet the artists
              </Typography>
              <Typography
                sx={{
                  maxWidth: 640,
                  mt: 1,
                  color: "text.secondary",
                  fontSize: { xs: 14, sm: 16 },
                  lineHeight: 1.6,
                }}
              >
                Discover the people behind the work, explore their collections, and find your next favorite creator.
              </Typography>
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
          {/* Top 5 Popular Artists Strip */}
          {!loading && !error && topPopularArtists.length > 0 && (
            <Box
              component="section"
              aria-label="Top popular artists"
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                p: { xs: 1.5, sm: 2 },
                borderRadius: 3.5,
                backgroundColor: "background.paper",
                border: "1px solid",
                borderColor: "divider",
                boxShadow: isDark
                  ? "0 4px 20px rgba(0, 0, 0, 0.3)"
                  : "0 2px 10px rgba(15, 23, 42, 0.04)",
                overflow: "hidden",
              }}
            >
              {/* Left label: Sparkle Icon + TOP POPULAR ARTISTS */}
              <Stack
                direction="row"
                alignItems="center"
                spacing={1}
                sx={{
                  flexShrink: 0,
                  pl: { xs: 0.5, sm: 1 },
                  pr: { xs: 0.5, sm: 1 },
                }}
              >
                <AutoAwesomeOutlinedIcon sx={{ fontSize: 20, color: "error.main" }} />
                <Typography
                  sx={{
                    fontSize: { xs: "0.8rem", sm: "0.85rem" },
                    fontWeight: 800,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "text.primary",
                    whiteSpace: "nowrap",
                  }}
                >
                  Top Popular Artists
                </Typography>
              </Stack>

              <Divider
                orientation="vertical"
                flexItem
                sx={{ display: { xs: "none", md: "block" }, my: 0.5 }}
              />

              {/* Top 5 Popular Artists Pills */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.25,
                  overflowX: "auto",
                  py: 0.5,
                  flex: 1,
                  minWidth: 0,
                  scrollbarWidth: "none",
                  "&::-webkit-scrollbar": { display: "none" },
                }}
              >
                {topPopularArtists.map((artist) => {
                  const ratingNum = Number(artist.averageRating || 0);
                  return (
                    <Button
                      key={artist.student_id}
                      onClick={() => navigate(`/buyer/seller/${artist.student_id}`)}
                      aria-label={`View ${artist.name}'s profile, rated ${formatArtistRating(artist.averageRating)} out of 5`}
                      sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        minHeight: 38,
                        minWidth: 0,
                        flex: "0 0 auto",
                        pl: 0.75,
                        pr: 1.5,
                        py: 0.5,
                        borderRadius: 999,
                        border: "1px solid",
                        borderColor: "divider",
                        backgroundColor: isDark
                          ? "rgba(255, 255, 255, 0.04)"
                          : "rgba(15, 23, 42, 0.02)",
                        color: "text.primary",
                        textTransform: "none",
                        transition: "all 150ms ease",
                        "&:hover": {
                          backgroundColor: isDark
                            ? "rgba(255, 255, 255, 0.08)"
                            : "#ffffff",
                          borderColor: "error.light",
                          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                          transform: "translateY(-1px)",
                        },
                      }}
                    >
                      <Avatar
                        src={artist.image || undefined}
                        alt={artist.name}
                        sx={{
                          width: 28,
                          height: 28,
                          mr: 1,
                          border: "1.5px solid",
                          borderColor: "divider",
                        }}
                      >
                        {!artist.image && getProfileInitials(artist.name)}
                      </Avatar>
                      <Typography
                        component="span"
                        sx={{
                          fontSize: "0.85rem",
                          fontWeight: 700,
                          maxWidth: { xs: 110, sm: 160 },
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          color: "text.primary",
                        }}
                      >
                        {artist.name}
                      </Typography>
                      <Stack
                        direction="row"
                        alignItems="center"
                        spacing={0.3}
                        sx={{ ml: 1, color: "error.main" }}
                      >
                        <StarRateRoundedIcon
                          sx={{ fontSize: 16, color: "#f59e0b" }}
                        />
                        <Typography
                          component="span"
                          sx={{
                            fontSize: "0.8rem",
                            fontWeight: 800,
                            color: "text.primary",
                          }}
                        >
                          {ratingNum > 0 ? ratingNum.toFixed(1) : "0.0"}
                        </Typography>
                      </Stack>
                    </Button>
                  );
                })}
              </Box>
            </Box>
          )}

          {/* Unified Filter & Toolbar */}
          {!error && !loading && artists.length > 0 && (
            <Box
              sx={{
                display: "flex",
                alignItems: { xs: "stretch", sm: "center" },
                justifyContent: "space-between",
                flexDirection: { xs: "column", sm: "row" },
                gap: 2,
                p: { xs: 1.5, sm: 2 },
                borderRadius: 3,
                backgroundColor: "background.paper",
                border: "1px solid",
                borderColor: "divider",
                boxShadow: isDark
                  ? "0 4px 20px rgba(0, 0, 0, 0.2)"
                  : "0 2px 10px rgba(15, 23, 42, 0.03)",
              }}
            >
              {/* Left side: Showing X of Y artists */}
              <Typography
                sx={{
                  color: "text.secondary",
                  fontSize: "0.9rem",
                }}
              >
                Showing{" "}
                <Box
                  component="span"
                  sx={{ fontWeight: 800, color: "text.primary" }}
                >
                  {filteredAndSortedArtists.length}
                </Box>{" "}
                of {artists.length} artists
              </Typography>

              {/* Right side: Type Filter + Sort Dropdown */}
              <Stack
                direction="row"
                alignItems="center"
                spacing={1.5}
                flexWrap="wrap"
                gap={{ xs: 1, sm: 1.5 }}
              >
                {/* Department / Type Filter Select */}
                <Select
                  size="small"
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  displayEmpty
                  sx={{
                    minWidth: 150,
                    height: 38,
                    borderRadius: 999,
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    backgroundColor: isDark
                      ? "rgba(255, 255, 255, 0.04)"
                      : "#f8fafc",
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: "divider",
                    },
                    "&:hover .MuiOutlinedInput-notchedOutline": {
                      borderColor: "text.secondary",
                    },
                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                      borderColor: "error.main",
                    },
                  }}
                >
                  <MenuItem value="all">
                    All Types ({artists.length})
                  </MenuItem>
                  {availableTypes.map((type) => (
                    <MenuItem key={type.name} value={type.name}>
                      {type.name} ({type.count})
                    </MenuItem>
                  ))}
                </Select>

                {/* Sort Dropdown */}
                <Stack direction="row" alignItems="center" spacing={0.75}>
                  <Typography
                    sx={{
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      color: "text.secondary",
                      display: { xs: "none", sm: "inline" },
                    }}
                  >
                    Sort:
                  </Typography>
                  <Select
                    size="small"
                    value={sortMode}
                    onChange={(e) => setSortMode(e.target.value)}
                    sx={{
                      minWidth: 140,
                      height: 38,
                      borderRadius: 999,
                      fontSize: "0.85rem",
                      fontWeight: 700,
                      color: "error.main",
                      backgroundColor: isDark
                        ? "rgba(239, 68, 68, 0.12)"
                        : "#fff1f2",
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: isDark
                          ? "rgba(239, 68, 68, 0.3)"
                          : "rgba(239, 68, 68, 0.2)",
                      },
                      "&:hover .MuiOutlinedInput-notchedOutline": {
                        borderColor: "error.main",
                      },
                      "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                        borderColor: "error.main",
                      },
                      "& .MuiSelect-icon": {
                        color: "error.main",
                      },
                    }}
                  >
                    <MenuItem value="popular">Most Popular</MenuItem>
                    <MenuItem value="works">Most Works</MenuItem>
                    <MenuItem value="rating">Top Rated</MenuItem>
                    <MenuItem value="followers">Most Followers</MenuItem>
                    <MenuItem value="name">Name (A–Z)</MenuItem>
                  </Select>
                </Stack>
              </Stack>
            </Box>
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
          ) : error ? null : filteredAndSortedArtists.length ? (
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(3, minmax(0, 1fr))" }, alignItems: "stretch", gap: { xs: 2, md: 2.5 } }}>
              {filteredAndSortedArtists.map((artist) => (
                <ArtistCard
                  key={artist.student_id}
                  artist={artist}
                  onToggleFollow={toggleArtistFollow}
                  onViewProfile={(id) => navigate(`/buyer/seller/${id}`)}
                />
              ))}
            </Box>
          ) : (
            <Alert severity="info">No artists match the selected criteria.</Alert>
          )}
        </Stack>
      </Container>
    </Box>
  );
}
