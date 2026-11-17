import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Grid,
  Paper,
  Rating,
  Skeleton,
  Stack,
  Tab,
  Tabs,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useTheme,
} from "@mui/material";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import PaletteOutlinedIcon from "@mui/icons-material/PaletteOutlined";
import SellerRecommendations from "../../components/buyer/Profile/SellerRecommendations";
import SellerArtworkCard from "../../components/buyer/Seller/SellerArtworkCard";
import {
  fetchArtworks,
  fetchPublicSellerProfile,
  fetchPublicSellerReviews,
} from "../../api/buyer/artworkAPI";
import ConnectionErrorPanel from "../../components/buyer/ConnectionErrorPanel";
import ProfileAvatar from "../../components/common/ProfileAvatar";
import { resolveProfileImageUrl } from "../../utils/profileImage.js";

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

const getProfileImage = (artist) =>
  resolveProfileImageUrl(artist?.profile_image || artist?.image, "seller");

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

export default function SellerProfile() {
  const navigate = useNavigate();
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
  const [reviewRetry, setReviewRetry] = useState(0);
  const [activeTab, setActiveTab] = useState(0);
  const [availabilityFilter, setAvailabilityFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const loadSellers = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await fetchArtworks();
        if (!active) return;
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
            console.error(
              "Unable to load public seller profile:",
              profileError,
            );
          }
          if (!active) return;
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
            sales: publicProfile
              ? Number(publicProfile.sales_count || 0)
              : null,
            registeredDate: publicProfile?.registered_date || null,
            specialtiesLoadError,
            hasStorefrontSpecialties:
              Boolean(publicProfile) &&
              Object.hasOwn(publicProfile || {}, "specialties"),
            specialties: publicProfile
              ? parseArray(publicProfile.specialties)
              : [],
            pinnedArtworkIds: parseArray(publicProfile?.pinned_artwork_ids).map(
              String,
            ),
            featuredArtwork:
              artworkSummary?.featuredArtwork || filteredArtworks[0] || null,
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
        if (!active) return;
        setError(err.message || "Failed to load seller profile data.");
        setSellerArtworks([]);
        setSelectedSeller(null);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadSellers();
    return () => {
      active = false;
    };
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
        if (active)
          setReviewsError(error.message || "Unable to load seller reviews.");
      })
      .finally(() => {
        if (active) setReviewsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id, reviewRetry]);

  if (loading) {
    return (
      <Container
        maxWidth="lg"
        sx={{
          py: { xs: 3, md: 5 },
        }}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "minmax(0, 1fr) 280px" },
            gap: 3,
          }}
        >
          <Skeleton variant="rounded" height={260} />
          <Skeleton variant="rounded" height={260} />
        </Box>
        <Skeleton variant="rounded" height={48} sx={{ mt: 3 }} />
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" }, gap: 2, mt: 2 }}>
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} variant="rounded" height={280} />
          ))}
        </Box>
      </Container>
    );
  }

  if (error || !selectedSeller) {
    if (error) {
      return (
        <Box sx={{ minWidth: 0 }}>
          <Helmet titleTemplate="%s - ArtMatch">
            <title>Seller Profile</title>
          </Helmet>
          <ConnectionErrorPanel title="Seller Profile Unavailable" />
        </Box>
      );
    }
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Alert severity="error">This seller could not be found.</Alert>
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
    ? sellerReviews.reduce(
        (sum, review) => sum + Number(review.rating || 0),
        0,
      ) / sellerReviews.length
    : null;
  const memberSince = selectedSeller.registeredDate
    ? new Date(selectedSeller.registeredDate).toLocaleDateString("en", {
        month: "long",
        year: "numeric",
      })
    : "Not available";
  const availableArtworks = sellerArtworks.filter(
      (artwork) => Number(artwork.is_sold_out) !== 1,
  );
  const soldOutArtworks = sellerArtworks.filter(
      (artwork) => Number(artwork.is_sold_out) === 1,
  );
  const displayedArtworks =
      availabilityFilter === "available"
        ? availableArtworks
        : availabilityFilter === "sold_out"
          ? soldOutArtworks
          : sellerArtworks;

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: colors.page,
        color: colors.text,
        pb: 6,
      }}
    >
      <Helmet titleTemplate="%s - ArtMatch">
        <title>Seller Profile</title>
      </Helmet>
      <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3, md: 4 }, px: { xs: 2, sm: 3, lg: 5 } }}>
        <Box
          component="section"
          aria-label={`${selectedSeller.shopName || selectedSeller.name} artist profile`}
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "minmax(0, 1fr)",
              sm: "160px minmax(0, 1fr)",
              md: "200px minmax(0, 1fr)",
              lg: "220px minmax(0, 1fr) 270px",
            },
            overflow: "hidden",
            border: `1px solid ${colors.border}`,
            borderRadius: { xs: 3, md: 4 },
            background: colors.card,
            boxShadow: isDark
              ? "0 20px 55px rgba(0, 0, 0, 0.24)"
              : "0 20px 55px rgba(68, 41, 15, 0.09)",
          }}
        >
          <Box
            sx={{
              minHeight: { xs: 220, sm: 300, lg: 340 },
              p: { xs: 2.5, sm: 2, md: 3 },
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
              background: isDark
                ? "radial-gradient(circle at 50% 35%, rgba(248, 113, 113, 0.18), transparent 55%), #172033"
                : "radial-gradient(circle at 50% 35%, rgba(217, 84, 84, 0.16), transparent 55%), #f1e2d5",
            }}
          >
            <Typography
              variant="overline"
              sx={{
                color: colors.accent,
                fontWeight: 800,
                letterSpacing: "0.14em",
                alignSelf: "flex-start",
              }}
            >
              ARTIST PROFILE
            </Typography>
            <ProfileAvatar
              src={selectedSeller.image}
              role="seller"
              alt={selectedSeller.name}
              sx={{
                width: { xs: 132, sm: 116, md: 148, lg: 164 },
                height: { xs: 132, sm: 116, md: 148, lg: 164 },
                border: `6px solid ${colors.card}`,
                boxShadow: `0 0 0 1px ${colors.border}, 0 16px 32px rgba(0, 0, 0, 0.16)`,
                backgroundColor: colors.cardAlt,
                color: colors.text,
                fontSize: "2rem",
                fontWeight: 800,
              }}
            />
            <Typography
              variant="caption"
              sx={{
                color: colors.muted,
                fontWeight: 700,
                letterSpacing: "0.04em",
                textAlign: "center",
                overflowWrap: "anywhere",
              }}
            >
              {selectedSeller.department || "Independent artist"}
            </Typography>
          </Box>

          <Box
            sx={{
              minWidth: 0,
              p: { xs: 2.5, sm: 2.5, md: 3.5, lg: 4 },
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <Typography
              variant="overline"
              sx={{
                color: colors.accent,
                fontWeight: 800,
                letterSpacing: "0.12em",
                mb: 0.5,
              }}
            >
              THE PERSON BEHIND THE WORK
            </Typography>
            <Typography
              component="h1"
              sx={{
                color: colors.text,
                fontSize: {
                  xs: "2rem",
                  sm: "2.1rem",
                  md: "2.65rem",
                  xl: "3.2rem",
                },
                fontWeight: 850,
                letterSpacing: "-0.055em",
                lineHeight: 1.03,
                overflowWrap: "anywhere",
              }}
            >
              {selectedSeller.shopName || selectedSeller.name}
            </Typography>

            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{ mt: 1.5, minHeight: 24, flexWrap: "wrap", rowGap: 0.5 }}
              aria-label={
                averageRating === null
                  ? "Seller rating"
                  : `Average seller rating: ${averageRating.toFixed(1)} out of 5`
              }
            >
              {reviewsLoading ? (
                <CircularProgress size={16} />
              ) : reviewsError ? (
                <Typography variant="body2" sx={{ color: colors.subtle }}>
                  Rating unavailable
                </Typography>
              ) : averageRating === null ? (
                <Typography variant="body2" sx={{ color: colors.subtle }}>
                  No reviews yet
                </Typography>
              ) : (
                <>
                  <Rating
                    value={averageRating}
                    precision={0.1}
                    readOnly
                    size="small"
                  />
                  <Typography
                    variant="body2"
                    sx={{ color: colors.text, fontWeight: 800 }}
                  >
                    {averageRating.toFixed(1)}
                  </Typography>
                  <Typography variant="body2" sx={{ color: colors.subtle }}>
                    {sellerReviews.length}{" "}
                    {sellerReviews.length === 1 ? "review" : "reviews"}
                  </Typography>
                </>
              )}
            </Stack>

            <Box
              sx={{
                mt: 2.5,
                p: { xs: 1.75, sm: 2 },
                borderLeft: `3px solid ${colors.accent}`,
                borderRadius: "0 12px 12px 0",
                backgroundColor: colors.cardAlt,
              }}
            >
              <Typography
                variant="body1"
                sx={{
                  color: colors.muted,
                  lineHeight: 1.75,
                  fontSize: { xs: "0.95rem", sm: "1rem" },
                  whiteSpace: "pre-line",
                  overflowWrap: "anywhere",
                }}
              >
                {selectedSeller.bio ||
                  "This seller hasn’t added an About description yet."}
              </Typography>
            </Box>

            <Stack
              direction={{ xs: "column", md: "row" }}
              alignItems={{ xs: "stretch", md: "center" }}
              justifyContent="space-between"
              spacing={2}
              sx={{
                mt: 2.5,
                pt: 2.5,
                borderTop: `1px solid ${colors.border}`,
              }}
            >
              <Stack
                direction="row"
                alignItems="center"
                spacing={{ xs: 2, sm: 3 }}
                divider={
                  <Box
                    sx={{
                      width: "1px",
                      height: 38,
                      backgroundColor: colors.border,
                    }}
                  />
                }
              >
                <Box>
                  <Typography
                    sx={{
                      color: colors.text,
                      fontSize: { xs: "1.5rem", sm: "1.8rem" },
                      fontWeight: 850,
                      lineHeight: 1,
                    }}
                  >
                    {sellerArtworks.length}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ color: colors.subtle, fontWeight: 700 }}
                  >
                    ARTWORKS
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    sx={{
                      color: colors.text,
                      fontSize: { xs: "1.5rem", sm: "1.8rem" },
                      fontWeight: 850,
                      lineHeight: 1,
                    }}
                  >
                    {selectedSeller.sales == null ? "—" : selectedSeller.sales}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ color: colors.subtle, fontWeight: 700 }}
                  >
                    SALES
                  </Typography>
                </Box>
              </Stack>

              <Button
                variant="contained"
                startIcon={<ChatBubbleOutlineIcon />}
                onClick={() =>
                  navigate(
                    `/buyer/messages?seller=${encodeURIComponent(selectedSeller.student_id)}`,
                  )
                }
                sx={{
                  minHeight: 48,
                  px: 2.5,
                  borderRadius: 999,
                  textTransform: "none",
                  fontWeight: 750,
                  color: "#fff",
                  backgroundColor: isDark ? colors.accent : "#b93838",
                  boxShadow: "none",
                  "&:hover": {
                    backgroundColor: isDark ? colors.accent : "#a63232",
                    boxShadow: "none",
                  },
                }}
              >
                Message Artist
              </Button>
            </Stack>
          </Box>

          <Box
            component="aside"
            aria-label="Artist details"
            sx={{
              gridColumn: { xs: "auto", sm: "1 / -1", lg: "auto" },
              p: { xs: 2.5, sm: 2.5, md: 3 },
              display: "grid",
              gridTemplateColumns: {
                xs: "minmax(0, 1fr)",
                sm: "repeat(2, minmax(0, 1fr))",
                lg: "minmax(0, 1fr)",
              },
              alignContent: "center",
              gap: { xs: 2.5, sm: 0, lg: 3 },
              borderTop: {
                xs: `1px solid ${colors.border}`,
                sm: `1px solid ${colors.border}`,
                lg: "none",
              },
              borderLeft: { lg: `1px solid ${colors.border}` },
              backgroundColor: colors.sideCard,
            }}
          >
            <Box sx={{ pr: { sm: 3, lg: 0 } }}>
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{ mb: 1.25 }}
              >
                <CalendarMonthOutlinedIcon
                  sx={{ color: colors.accent, fontSize: 20 }}
                />
                <Typography
                  component="h2"
                  variant="overline"
                  sx={{
                    color: colors.subtle,
                    fontWeight: 800,
                    letterSpacing: "0.1em",
                  }}
                >
                  MEMBER SINCE
                </Typography>
              </Stack>
              <Typography
                sx={{
                  color: colors.text,
                  fontSize: { xs: "1.15rem", sm: "1.25rem" },
                  fontWeight: 800,
                }}
              >
                {memberSince}
              </Typography>
            </Box>

            <Box
              sx={{
                pt: { xs: 2.5, sm: 0, lg: 3 },
                pl: { sm: 3, lg: 0 },
                borderTop: {
                  xs: `1px solid ${colors.border}`,
                  sm: "none",
                  lg: `1px solid ${colors.border}`,
                },
              }}
            >
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{ mb: 1.25 }}
              >
                <PaletteOutlinedIcon
                  sx={{ color: colors.accent, fontSize: 20 }}
                />
                <Typography
                  component="h2"
                  variant="overline"
                  sx={{
                    color: colors.subtle,
                    fontWeight: 800,
                    letterSpacing: "0.1em",
                  }}
                >
                  SPECIALTIES
                </Typography>
              </Stack>
              {specialtiesLoadError ? (
                <Typography variant="body2" color="error">
                  {specialtiesLoadError}
                </Typography>
              ) : specialties.length > 0 ? (
                <Stack
                  direction="row"
                  spacing={0.75}
                  sx={{ flexWrap: "wrap", rowGap: 0.75 }}
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
                        fontWeight: 650,
                        border: `1px solid ${colors.chipBorder}`,
                      }}
                    />
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" sx={{ color: colors.subtle }}>
                  No specialties selected yet.
                </Typography>
              )}
            </Box>
          </Box>
        </Box>

        {/* Tabs & Content Section */}
        <Box sx={{ minWidth: 0, width: "100%" }}>
          <Tabs
            value={activeTab}
            onChange={(event, value) => setActiveTab(value)}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            aria-label="Seller profile sections"
            sx={{
              mt: { xs: 2.5, md: 3 },
              borderBottom: `1px solid ${colors.border}`,
              "& .MuiTab-root": {
                color: colors.muted,
                minHeight: 52,
                px: { xs: 1.5, sm: 2.5 },
                fontSize: { xs: "0.8rem", sm: "0.9rem" },
              },
              "& .MuiTab-root.Mui-selected": { color: colors.accent },
              "& .MuiTabs-indicator": { backgroundColor: colors.accent },
            }}
          >
            <Tab
              id="seller-profile-tab-0"
              aria-controls="seller-profile-panel-0"
              label={`Artworks (${sellerArtworks.length})`}
            />
            <Tab
              id="seller-profile-tab-1"
              aria-controls="seller-profile-panel-1"
              label="About"
            />
            <Tab
              id="seller-profile-tab-2"
              aria-controls="seller-profile-panel-2"
              label={`Reviews (${sellerReviews.length})`}
            />
          </Tabs>

          {activeTab === 0 && (
            <Box
              role="tabpanel"
              id="seller-profile-panel-0"
              aria-labelledby="seller-profile-tab-0"
              tabIndex={0}
              sx={{ minWidth: 0 }}
            >
              <Box
                component="section"
                aria-label="Artwork availability filters"
                sx={{
                  mt: 2,
                  mb: 2,
                  py: { xs: 1.5, sm: 2 },
                  display: "flex",
                  flexDirection: { xs: "column", sm: "row" },
                  alignItems: { xs: "stretch", sm: "center" },
                  justifyContent: "space-between",
                  gap: 1.5,
                  borderBottom: `1px solid ${colors.border}`,
                }}
              >
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  spacing={2}
                >
                  <Typography
                    component="h2"
                    sx={{ color: colors.text, fontWeight: 700, fontSize: "0.95rem" }}
                  >
                    Filter artworks
                  </Typography>
                  <Typography
                    variant="caption"
                    aria-live="polite"
                    sx={{ color: colors.subtle, whiteSpace: "nowrap" }}
                  >
                    Showing {displayedArtworks.length} of {sellerArtworks.length}
                  </Typography>
                </Stack>

                <ToggleButtonGroup
                  exclusive
                  value={availabilityFilter}
                  onChange={(event, value) => {
                    if (value) setAvailabilityFilter(value);
                  }}
                  aria-label="Filter artworks by availability"
                  sx={{
                    width: { xs: "100%", sm: "auto" },
                    display: "grid",
                    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                    gap: 0,
                    p: 0.5,
                    border: `1px solid ${colors.border}`,
                    borderRadius: 999,
                    backgroundColor: colors.cardAlt,
                    "& .MuiToggleButtonGroup-grouped": {
                      m: 0,
                      minWidth: 0,
                      minHeight: 40,
                      px: { xs: 1, sm: 1.5 },
                      border: 0,
                      borderRadius: "999px !important",
                      color: colors.muted,
                      textTransform: "none",
                      fontSize: { xs: "0.72rem", sm: "0.82rem" },
                      fontWeight: 700,
                      "&:not(:first-of-type)": {
                        borderLeft: 0,
                      },
                      "&.Mui-selected": {
                        color: "#fff",
                        backgroundColor: theme.palette.error.dark,
                        "&:hover": {
                          backgroundColor: theme.palette.error.dark,
                        },
                      },
                    },
                  }}
                >
                  {[
                    { value: "all", label: "All", count: sellerArtworks.length },
                    {
                      value: "available",
                      label: "Available",
                      count: availableArtworks.length,
                    },
                    {
                      value: "sold_out",
                      label: "Sold out",
                      count: soldOutArtworks.length,
                    },
                  ].map((option) => {
                    const selected = availabilityFilter === option.value;
                    return (
                      <ToggleButton
                        key={option.value}
                        value={option.value}
                        aria-label={`${option.label} artworks, ${option.count}`}
                      >
                        <Box
                          component="span"
                          sx={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {option.label}{" "}
                          <Box
                            component="span"
                            sx={{ opacity: selected ? 0.85 : 0.65 }}
                          >
                            {option.count}
                          </Box>
                        </Box>
                      </ToggleButton>
                    );
                  })}
                </ToggleButtonGroup>
              </Box>
              <Grid
                container
                spacing={{ xs: 1.25, sm: 2 }}
                sx={{ mt: 0.5, alignItems: "stretch" }}
              >
              {displayedArtworks.length === 0 ? (
                <Grid size={12}>
                  <Paper
                    sx={{
                      p: { xs: 2.5, sm: 4 },
                      borderRadius: 3,
                      textAlign: "center",
                      border: `1px solid ${colors.border}`,
                      bgcolor: colors.card,
                    }}
                  >
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      {sellerArtworks.length === 0
                        ? "No artworks yet"
                        : `No ${availabilityFilter === "sold_out" ? "sold out" : "available"} artworks`}
                    </Typography>
                    <Typography color="text.secondary" sx={{ mt: 1 }}>
                      {sellerArtworks.length === 0
                        ? "This seller has not uploaded any work yet."
                        : "Try another availability filter to see this seller’s other artworks."}
                    </Typography>
                  </Paper>
                </Grid>
              ) : (
                displayedArtworks.map((artwork) => (
                  <Grid
                    size={{ xs: 6, sm: 6, md: 3 }}
                    key={artwork.artwork_id}
                    sx={{ minWidth: 0 }}
                  >
                    <SellerArtworkCard
                      artwork={artwork}
                      artistName={selectedSeller.artistName}
                      isPinned={selectedSeller.pinnedArtworkIds.includes(
                        String(artwork.artwork_id),
                      )}
                      colors={colors}
                    />
                  </Grid>
                ))
              )}
              </Grid>
            </Box>
          )}
          {activeTab === 1 && (
            <Paper
              role="tabpanel"
              id="seller-profile-panel-1"
              aria-labelledby="seller-profile-tab-1"
              tabIndex={0}
              elevation={0}
              sx={{
                mt: 2.5,
                p: { xs: 2.5, md: 3.5 },
                border: `1px solid ${colors.border}`,
                borderRadius: 3,
                bgcolor: colors.cardAlt,
                minHeight: 180,
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
                About {selectedSeller.artistName || selectedSeller.name}
              </Typography>
              <Typography
                color={
                  selectedSeller.shopDescription
                    ? "text.primary"
                    : "text.secondary"
                }
                sx={{ whiteSpace: "pre-wrap", lineHeight: 1.8 }}
              >
                {selectedSeller.shopDescription ||
                  "This seller hasn’t added an About description yet."}
              </Typography>
            </Paper>
          )}
          {activeTab === 2 && (
            <Stack
              role="tabpanel"
              id="seller-profile-panel-2"
              aria-labelledby="seller-profile-tab-2"
              tabIndex={0}
              spacing={2}
              sx={{ mt: 2.5 }}
            >
              {reviewsLoading ? (
                <Box sx={{ display: "grid", placeItems: "center", py: 5 }}>
                  <CircularProgress size={28} />
                </Box>
              ) : reviewsError ? (
                <Alert
                  severity="error"
                  action={
                    <Button
                      color="inherit"
                      size="small"
                      onClick={() => setReviewRetry((current) => current + 1)}
                    >
                      Try again
                    </Button>
                  }
                >
                  {reviewsError}
                </Alert>
              ) : sellerReviews.length === 0 ? (
                <Paper
                  elevation={0}
                  sx={{
                    p: 4,
                    textAlign: "center",
                    border: `1px solid ${colors.border}`,
                    borderRadius: 3,
                    bgcolor: colors.card,
                  }}
                >
                  <Typography color="text.secondary">
                    No reviews yet.
                  </Typography>
                </Paper>
              ) : (
                sellerReviews.map((review) => (
                  <Paper
                    key={review.id}
                    elevation={0}
                    sx={{
                      p: 2.5,
                      border: `1px solid ${colors.border}`,
                      borderRadius: 3,
                      bgcolor: colors.cardAlt,
                    }}
                  >
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="flex-start"
                      spacing={2}
                    >
                      <Box>
                        <Typography fontWeight={700}>
                          {review.reviewer_name || "Buyer"}
                        </Typography>
                        <Rating
                          value={Number(review.rating)}
                          precision={0.5}
                          readOnly
                          size="small"
                        />
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(review.created_at).toLocaleDateString()}
                      </Typography>
                    </Stack>
                    <Typography sx={{ mt: 1.5, whiteSpace: "pre-wrap" }}>
                      {review.comment}
                    </Typography>
                    {review.artwork_title && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: "block", mt: 1.5 }}
                      >
                        Review for {review.artwork_title}
                      </Typography>
                    )}
                    {review.seller_response?.trim() && (
                      <Box
                        sx={{
                          mt: 2,
                          p: 1.5,
                          borderRadius: 2,
                          bgcolor: colors.card,
                          borderLeft: "3px solid",
                          borderColor: "primary.main",
                        }}
                      >
                        <Stack
                          direction={{ xs: "column", sm: "row" }}
                          justifyContent="space-between"
                          gap={0.5}
                        >
                          <Typography fontWeight={700} variant="body2">
                            Seller response
                          </Typography>
                          {review.seller_response_at && (
                            <Typography
                              component="time"
                              dateTime={new Date(review.seller_response_at).toISOString()}
                              variant="caption"
                              color="text.secondary"
                            >
                              {new Date(review.seller_response_at).toLocaleDateString()}
                            </Typography>
                          )}
                        </Stack>
                        <Typography
                          variant="body2"
                          sx={{ mt: 0.5, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
                        >
                          {review.seller_response}
                        </Typography>
                      </Box>
                    )}
                  </Paper>
                ))
              )}
            </Stack>
          )}
        </Box>
        <SellerRecommendations
          key={selectedSeller.student_id}
          sellerId={selectedSeller.student_id}
          sellerName={selectedSeller.shopName || selectedSeller.name}
          hasSpecialties={specialties.some(
            (specialty) => typeof specialty === "string" && specialty.trim(),
          )}
        />
      </Container>
    </Box>
  );
}