import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Grid,
  Paper,
  Rating,
  Stack,
  Tab,
  Tabs,
  Typography,
  useTheme,
} from "@mui/material";
import {
  fetchArtworks,
  fetchPublicSellerProfile,
  fetchPublicSellerReviews,
} from "../../api/buyer/artworkAPI";

const getProfileFallback = (name = "Artist") =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=243b53&color=ffffff&size=200`;

const parseArray = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

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

const buildSellerSummaries = (artworks = []) => {
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
      department: artwork.course || "",
      specialties: [],
      pinnedArtworkIds: [],
      image: artwork.profile_image || "",
      bio: artwork.shop_description || "",
      shopName,
      shopDescription: artwork.shop_description || "",
      works: 0,
      featuredArtwork: artwork,
    };

    existing.works += 1;
    existing.image = artwork.profile_image || existing.image || "";
    existing.department = artwork.course || existing.department;
    if (artwork.genre && !existing.specialties.includes(artwork.genre)) {
      existing.specialties.push(artwork.genre);
    }
    existing.shopName = existing.shopName || shopName || "";
    existing.shopDescription =
      existing.shopDescription || artwork.shop_description || "";
    existing.bio = existing.shopDescription || artwork.shop_description || "";
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

const formatPrice = (value) =>
  `₱${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export default function SellerProfile() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const colors = {
    page: isDark ? "#020817" : "#f4efe9",
    card: isDark ? "#111827" : "#f8f4f0",
    cardAlt: isDark ? "#1e293b" : "#fffaf7",
    sideCard: isDark ? "#111827" : "#f7f2eb",
    border: isDark ? "#334155" : "#e6d8cd",
    text: isDark ? "#f8fafc" : "#1b1917",
    muted: isDark ? "#cbd5e1" : "#5f514b",
    subtle: isDark ? "#94a3b8" : "#6f625b",
    chip: isDark ? "#334155" : "#f3e7dc",
    chipBorder: isDark ? "#475569" : "#e3d3c2",
    accent: isDark ? "#f87171" : "#d95454",
  };
  const { id } = useParams();
  const [sellerArtworks, setSellerArtworks] = useState([]);
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [sellerReviews, setSellerReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsError, setReviewsError] = useState("");
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadSellers = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await fetchArtworks();
        const list = Array.isArray(response) ? response : response?.data || [];
        const sellerSummaries = buildSellerSummaries(list);
        if (id) {
          const filteredArtworks = list.filter(
            (artwork) => String(artwork.student_id) === String(id),
          );
          let publicProfile = null;
          let specialtiesLoadError = "";
          try {
            publicProfile = await fetchPublicSellerProfile(id);
          } catch (profileError) {
            specialtiesLoadError =
              profileError.message || "Unable to load saved specialties.";
            console.error("Unable to load public seller profile:", profileError);
          }
          const artworkSummary = buildSellerSummaries(filteredArtworks)[0];
          const artistName = publicProfile
            ? [publicProfile.first_name, publicProfile.last_name]
                .filter(Boolean)
                .join(" ")
            : artworkSummary?.artistName || "";
          const shopName =
            publicProfile?.shop_name || artworkSummary?.shopName || "";
          if (!publicProfile && !artworkSummary) {
            setSelectedSeller(null);
            setSellerArtworks([]);
            return;
          }
          const profileSeller = {
            ...artworkSummary,
            student_id: publicProfile?.student_id || artworkSummary?.student_id,
            name: shopName || artistName,
            artistName,
            department:
              publicProfile?.course || artworkSummary?.department || "",
            profile_image:
              publicProfile?.profile_image || artworkSummary?.profile_image,
            image: publicProfile
              ? getProfileImage(publicProfile)
              : artworkSummary?.image || getProfileImage({ name: artistName }),
            bio:
              publicProfile?.shop_description ||
              artworkSummary?.shopDescription ||
              artworkSummary?.bio ||
              "The seller currently doesn't have a bio.",
            shopName,
            shopDescription:
              publicProfile?.shop_description ||
              artworkSummary?.shopDescription ||
              "",
            works: filteredArtworks.length,
            sales: publicProfile ? Number(publicProfile.sales_count || 0) : null,
            registeredDate: publicProfile?.registered_date || null,
            specialtiesLoadError,
            hasStorefrontSpecialties:
              Boolean(publicProfile) &&
              Object.hasOwn(publicProfile || {}, "specialties"),
            specialties: publicProfile
              ? parseArray(publicProfile.specialties)
              : [],
            pinnedArtworkIds: parseArray(
              publicProfile?.pinned_artwork_ids,
            ).map(String),
            featuredArtwork: artworkSummary?.featuredArtwork || filteredArtworks[0] || null,
          };
          const pinOrder = new Map(
            profileSeller.pinnedArtworkIds.map((artworkId, index) => [
              artworkId,
              index,
            ]),
          );
          const prioritizedArtworks = [...filteredArtworks].sort(
            (first, second) => {
              const firstOrder = pinOrder.get(String(first.artwork_id));
              const secondOrder = pinOrder.get(String(second.artwork_id));
              if (firstOrder !== undefined && secondOrder !== undefined) {
                return firstOrder - secondOrder;
              }
              if (firstOrder !== undefined) return -1;
              if (secondOrder !== undefined) return 1;
              return 0;
            },
          );
          setSelectedSeller(profileSeller);
          setSellerArtworks(prioritizedArtworks);
        } else {
          const featuredSeller = sellerSummaries[0] || null;
          const featuredArtworks = featuredSeller
            ? list.filter(
                (artwork) =>
                  String(artwork.student_id) ===
                  String(featuredSeller.student_id),
              )
            : [];
          setSelectedSeller(featuredSeller);
          setSellerArtworks(featuredArtworks);
        }
      } catch (err) {
        setError(err.message || "Failed to load seller profile data.");
        setSellerArtworks([]);
        setSelectedSeller(null);
      } finally {
        setLoading(false);
      }
    };

    loadSellers();
  }, [id]);

  useEffect(() => {
    if (!id) {
      setSellerReviews([]);
      setReviewsLoading(false);
      return undefined;
    }

    let active = true;
    setReviewsLoading(true);
    setReviewsError("");
    fetchPublicSellerReviews(id)
      .then((response) => {
        if (active) setSellerReviews(Array.isArray(response) ? response : []);
      })
      .catch((error) => {
        if (active) setReviewsError(error.message || "Unable to load seller reviews.");
      })
      .finally(() => {
        if (active) setReviewsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

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

  if (error || !selectedSeller) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Alert severity="error">
          {error || "This seller could not be found."}
        </Alert>
      </Container>
    );
  }

  const specialties = selectedSeller.specialties || [];
  const specialtiesLoadError =
    selectedSeller.specialtiesLoadError ||
    (!selectedSeller.hasStorefrontSpecialties
      ? "Saved specialties were not returned by the server. Restart the backend to apply the storefront updates."
      : "");
  const averageRating = sellerReviews.length
    ? sellerReviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) /
      sellerReviews.length
    : null;
  const memberSince = selectedSeller.registeredDate
    ? new Date(selectedSeller.registeredDate).toLocaleDateString("en", {
        month: "long",
        year: "numeric",
      })
    : "Not available";

  return (
    <Box sx={{ minHeight: "100vh", background: colors.page, color: colors.text, pb: 6 }}>
      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 4 } }}>
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            alignItems: "flex-start",
            gap: 3,
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box
              sx={{
                background: colors.card,
                border: `1px solid ${colors.border}`,
                borderRadius: 4,
                p: { xs: 2.5, md: 3 },
                display: "flex",
                alignItems: "center",
                gap: 3,
                minHeight: 200,
                boxShadow: "none",
              }}
            >
              <Box
                component="img"
                src={selectedSeller.image}
                alt={selectedSeller.name}
                sx={{
                  width: 140,
                  height: 140,
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: `2px solid ${colors.border}`,
                  flexShrink: 0,
                  background: colors.cardAlt,
                }}
              />

              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={1.5}
                  sx={{ mb: 0.5 }}
                >
                  <Typography
                    variant="h3"
                    sx={{
                      fontWeight: 800,
                      letterSpacing: "-0.05em",
                      lineHeight: 1.1,
                      color: colors.text,
                    }}
                  >
                    {selectedSeller.shopName || selectedSeller.name}
                  </Typography>
                  {selectedSeller.department && (
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 600,
                        color: colors.muted,
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                      }}
                    >
                      {selectedSeller.department}
                    </Typography>
                  )}
                </Stack>

                <Typography
                  variant="body1"
                  sx={{
                    color: colors.muted,
                    maxWidth: 620,
                    lineHeight: 1.6,
                    mb: 2,
                  }}
                >
                  {selectedSeller.bio || "This seller hasn’t added an About description yet."}
                </Typography>

                <Stack
                  direction="row"
                  spacing={3}
                  sx={{ flexWrap: "wrap", rowGap: 1.5 }}
                >
                  <Box>
                    <Typography
                      variant="h5"
                      sx={{ fontWeight: 800, color: colors.text }}
                    >
                      {sellerArtworks.length}
                    </Typography>
                    <Typography variant="caption" sx={{ color: colors.subtle }}>
                      Artworks
                    </Typography>
                  </Box>
                  <Box>
                    <Typography
                      variant="h5"
                      sx={{ fontWeight: 800, color: colors.text }}
                    >
                      {selectedSeller.sales == null ? "—" : selectedSeller.sales}
                    </Typography>
                    <Typography variant="caption" sx={{ color: colors.subtle }}>
                      Sales
                    </Typography>
                  </Box>
                  <Box>
                    <Typography
                      variant="h5"
                      sx={{ fontWeight: 800, color: colors.text }}
                    >
                      {reviewsLoading
                        ? "..."
                        : averageRating === null
                          ? "—"
                          : averageRating.toFixed(1)}
                    </Typography>
                    <Typography variant="caption" sx={{ color: colors.subtle }}>
                      {sellerReviews.length ? `Rating (${sellerReviews.length})` : "Rating"}
                    </Typography>
                  </Box>
                </Stack>
              </Box>
            </Box>

            <Tabs
              value={activeTab}
              onChange={(event, value) => setActiveTab(value)}
              sx={{
                mt: 4,
                borderBottom: `1px solid ${colors.border}`,
                "& .MuiTab-root": { color: colors.muted },
                "& .MuiTab-root.Mui-selected": { color: colors.accent },
                "& .MuiTabs-indicator": { backgroundColor: colors.accent },
              }}
            >
              <Tab label={`Artworks for Sale (${sellerArtworks.length})`} />
              <Tab label="About" />
              <Tab label={`Reviews (${sellerReviews.length})`} />
            </Tabs>

            {activeTab === 0 && <Grid container spacing={3} sx={{ mt: 0.5 }}>
              {sellerArtworks.length === 0 ? (
                <Grid item xs={12}>
                  <Paper
                    sx={{
                      p: 4,
                      borderRadius: 3,
                      textAlign: "center",
                      border: `1px solid ${colors.border}`,
                      bgcolor: colors.card,
                    }}
                  >
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      No artworks yet
                    </Typography>
                    <Typography color="text.secondary" sx={{ mt: 1 }}>
                      This seller has not uploaded any work yet.
                    </Typography>
                  </Paper>
                </Grid>
              ) : (
                sellerArtworks.map((artwork) => {
                  const isPinned = selectedSeller.pinnedArtworkIds.includes(
                    String(artwork.artwork_id),
                  );
                  return (
                  <Grid item xs={12} sm={6} key={artwork.artwork_id}>
                    <Card
                      elevation={0}
                      sx={{
                        borderRadius: 3,
                        overflow: "hidden",
                        border: `1px solid ${colors.border}`,
                        background: colors.cardAlt,
                        height: "100%",
                        boxShadow: "none",
                      }}
                    >
                      <Box sx={{ position: "relative" }}>
                        {isPinned && (
                          <Chip
                            label="Pinned"
                            size="small"
                            color="primary"
                            sx={{
                              position: "absolute",
                              top: 12,
                              left: 12,
                              zIndex: 1,
                              fontWeight: 700,
                            }}
                          />
                        )}
                        <Box
                          component="img"
                          src={getArtworkImage(artwork)}
                          alt={artwork.title}
                          sx={{
                            width: "100%",
                            height: 260,
                            objectFit: "cover",
                            display: "block",
                          }}
                        />
                      </Box>

                      <CardContent sx={{ p: 2.25 }}>
                        <Typography
                          variant="h6"
                          sx={{ fontWeight: 800, mb: 0.5 }}
                        >
                          {artwork.title}
                        </Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mb: 1.5 }}
                        >
                          {selectedSeller.artistName}
                          {artwork.genre ? ` · ${artwork.genre}` : ""}
                        </Typography>
                        {artwork.description && (
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ mb: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
                          >
                            {artwork.description}
                          </Typography>
                        )}

                        <Stack
                          direction="row"
                          alignItems="center"
                          justifyContent="space-between"
                        >
                          <Typography
                            variant="h6"
                            sx={{ fontWeight: 800, color: colors.accent }}
                          >
                            {formatPrice(artwork.price)}
                          </Typography>
                          {artwork.art_size && (
                            <Typography variant="caption" color="text.secondary">
                              {artwork.art_size}
                            </Typography>
                          )}
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                  );
                })
              )}
            </Grid>}
            {activeTab === 1 && (
              <Paper
                elevation={0}
                sx={{ mt: 2.5, p: { xs: 2, md: 3 }, border: `1px solid ${colors.border}`, borderRadius: 3, bgcolor: colors.cardAlt, minHeight: 180 }}
              >
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
                  About {selectedSeller.artistName || selectedSeller.name}
                </Typography>
                <Typography color={selectedSeller.shopDescription ? "text.primary" : "text.secondary"} sx={{ whiteSpace: "pre-wrap", lineHeight: 1.8 }}>
                  {selectedSeller.shopDescription || "This seller hasn’t added an About description yet."}
                </Typography>
              </Paper>
            )}
            {activeTab === 2 && (
              <Stack spacing={2} sx={{ mt: 2.5 }}>
                {reviewsLoading ? (
                  <Box sx={{ display: "grid", placeItems: "center", py: 5 }}>
                    <CircularProgress size={28} />
                  </Box>
                ) : reviewsError ? (
                  <Alert severity="error">{reviewsError}</Alert>
                ) : sellerReviews.length === 0 ? (
                  <Paper elevation={0} sx={{ p: 4, textAlign: "center", border: `1px solid ${colors.border}`, borderRadius: 3, bgcolor: colors.card }}>
                    <Typography color="text.secondary">No reviews yet.</Typography>
                  </Paper>
                ) : (
                  sellerReviews.map((review) => (
                    <Paper key={review.id} elevation={0} sx={{ p: 2.5, border: `1px solid ${colors.border}`, borderRadius: 3, bgcolor: colors.cardAlt }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
                        <Box>
                          <Typography fontWeight={700}>{review.reviewer_name || "Buyer"}</Typography>
                          <Rating value={Number(review.rating)} precision={0.5} readOnly size="small" />
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(review.created_at).toLocaleDateString()}
                        </Typography>
                      </Stack>
                      <Typography sx={{ mt: 1.5, whiteSpace: "pre-wrap" }}>{review.comment}</Typography>
                      {review.artwork_title && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>
                          Review for {review.artwork_title}
                        </Typography>
                      )}
                    </Paper>
                  ))
                )}
              </Stack>
            )}
          </Box>

          <Box sx={{ width: { xs: "100%", md: 300 }, flexShrink: 0 }}>
            <Stack spacing={2.5} sx={{ height: "100%" }}>
              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  borderRadius: 3,
                  background: colors.sideCard,
                  border: `1px solid ${colors.border}`,
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 1.5 }}>
                  Member Since
                </Typography>
                <Typography variant="body2" sx={{ color: colors.muted }}>
                  {memberSince}
                </Typography>
              </Paper>

              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  borderRadius: 3,
                  background: colors.sideCard,
                  border: `1px solid ${colors.border}`,
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 1.5 }}>
                  Specialties
                </Typography>
                {specialtiesLoadError ? (
                  <Typography variant="body2" color="error">
                    {specialtiesLoadError}
                  </Typography>
                ) : specialties.length > 0 ? <Stack
                  direction="row"
                  spacing={1}
                  sx={{ flexWrap: "wrap", rowGap: 1 }}
                >
                  {specialties.map((item) => (
                    <Chip
                      key={item}
                      label={item}
                      size="small"
                      sx={{
                        background: colors.chip,
                        color: colors.muted,
                        borderRadius: 999,
                        fontWeight: 600,
                        border: `1px solid ${colors.chipBorder}`,
                      }}
                    />
                  ))}
                </Stack> : (
                  <Typography variant="body2" color="text.secondary">
                    No specialties selected yet.
                  </Typography>
                )}
              </Paper>
            </Stack>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
