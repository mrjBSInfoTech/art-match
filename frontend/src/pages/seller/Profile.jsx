import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  Avatar,
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Grid,
  IconButton,
  Paper,
  Rating,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import FavoriteBorderOutlinedIcon from "@mui/icons-material/FavoriteBorderOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import ShareOutlinedIcon from "@mui/icons-material/ShareOutlined";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { fetchSellerReviews } from "../../api/seller/reviewsAPI";
import { fetchArtworks } from "../../api/seller/artworkAPI";
import { fetchStorefront } from "../../api/seller/storefrontAPI";
import ProfileCard from "../../components/seller/Profile/ProfileCard";

const getProfileFallback = () =>
  "http://localhost:5000/uploads/seller/profile.jpg";

const getProfileImage = (profileImage) => {
  if (!profileImage) return getProfileFallback("Artist");
  if (profileImage.startsWith("http")) return profileImage;
  return `http://localhost:5000/uploads/seller/uploadProfile/${encodeURIComponent(profileImage)}`;
};

const getArtworkImage = (image) => {
  if (!image) return "";
  if (image.startsWith("http")) return image;
  if (image.startsWith("/")) return `http://localhost:5000${image}`;
  return `http://localhost:5000/uploads/seller/uploadArtwork/${encodeURIComponent(image)}`;
};

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

export default function Profile() {
  const theme = useTheme();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [course, setCourse] = useState("");
  const [profileImage, setProfileImage] = useState("");
  const [registeredDate, setRegisteredDate] = useState("");
  const [aboutMe, setAboutMe] = useState("");
  const [aboutLoading, setAboutLoading] = useState(true);
  const [aboutError, setAboutError] = useState("");
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewError, setReviewError] = useState("");
  const [artworks, setArtworks] = useState([]);
  const [artworksLoading, setArtworksLoading] = useState(true);
  const [artworksError, setArtworksError] = useState("");
  const [specialties, setSpecialties] = useState([]);
  const [pinnedArtworkIds, setPinnedArtworkIds] = useState([]);

  useEffect(() => {
    const loadSellerData = () => {
      const sellerFirstName = localStorage.getItem("seller_first_name") || "Malia";
      const sellerLastName = localStorage.getItem("seller_last_name") || "";
      const sellerMiddleName = localStorage.getItem("seller_middle_name") || "";
      const sellerCourse = localStorage.getItem("seller_course") || "Fine Arts";
      const sellerProfileImage = localStorage.getItem("seller_profile_image") || "";
      const sellerRegisteredDate = localStorage.getItem("seller_registered_date") || "2024-09-01";
      const sellerStoreDescription =
        localStorage.getItem("seller_shop_description") || "";

      setFirstName(sellerFirstName);
      setLastName(sellerLastName);
      setMiddleName(sellerMiddleName);
      setCourse(sellerCourse);
      setProfileImage(sellerProfileImage);
      setRegisteredDate(sellerRegisteredDate);
      setAboutMe(sellerStoreDescription);
      setLoading(false);
    };

    loadSellerData();
  }, []);

  useEffect(() => {
    let active = true;
    fetchStorefront()
      .then((storefront) => {
        if (!active) return;
        const description = storefront?.shop_description || "";
        setAboutMe(description);
        setSpecialties(parseArray(storefront?.specialties));
        setPinnedArtworkIds(
          parseArray(storefront?.pinned_artwork_ids).map(String),
        );
        localStorage.setItem("seller_shop_description", description);
      })
      .catch((error) => {
        if (active) setAboutError(error.message || "Unable to load your About information.");
      })
      .finally(() => {
        if (active) setAboutLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    fetchSellerReviews()
      .then((response) => {
        if (active) setReviews(Array.isArray(response) ? response : []);
      })
      .catch((error) => {
        if (active) setReviewError(error.message || "Unable to load buyer reviews");
      })
      .finally(() => {
        if (active) setReviewsLoading(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    fetchArtworks()
      .then((response) => {
        if (active) setArtworks(Array.isArray(response) ? response : []);
      })
      .catch((error) => {
        if (active) setArtworksError(error.message || "Unable to load your artworks");
      })
      .finally(() => {
        if (active) setArtworksLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const fullName = [firstName, middleName, lastName].filter(Boolean).join(" ");
  const profileName = fullName || "Malia";

  const sellerReviews = reviews;
  const averageRating = sellerReviews.length
    ? sellerReviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) /
      sellerReviews.length
    : 0;

  const stats = [
    { label: "Followers", value: "234" },
    { label: "Followings", value: "47" },
    { label: "Artworks", value: artworksLoading ? "..." : artworks.length },
    { label: "Sales", value: "4.8" },
  ];

  const prioritizedArtworks = [...artworks].sort((first, second) => {
    const firstIndex = pinnedArtworkIds.indexOf(String(first.artwork_id));
    const secondIndex = pinnedArtworkIds.indexOf(String(second.artwork_id));
    if (firstIndex >= 0 && secondIndex >= 0) return firstIndex - secondIndex;
    if (firstIndex >= 0) return -1;
    if (secondIndex >= 0) return 1;
    return 0;
  });

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  const formattedMembershipDate = new Date(registeredDate).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <Box sx={{ width: "100%", minWidth: 0, bgcolor: "background.default", color: "text.primary" }}>
      <Helmet>
        <title>Seller Profile</title>
      </Helmet>

      <Box
        sx={{
          background: "linear-gradient(180deg, rgba(146, 26, 26, 0.2), rgba(54, 11, 11, 0.5)), url('https://images.unsplash.com/photo-1515405295579-ba7b45403062?auto=format&fit=crop&w=1600&q=80') center/cover no-repeat",
          minHeight: { xs: 240, sm: 280, md: 320 },
          borderRadius: 3,
          overflow: "hidden",
          position: "relative",
        }}
      >
        <Box sx={{ bgcolor: alpha(theme.palette.common.black, theme.palette.mode === "dark" ? 0.5 : 0.3), py: 2 }}>
          <Container maxWidth="lg">
            <Stack
              direction={{ xs: "column", md: "row" }}
              alignItems="center"
              justifyContent="space-between"
              spacing={2}
              sx={{ px: 1, color: "#fff" }}
            >
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box
                  component="span"
                  sx={{
                    width: 30,
                    height: 30,
                    borderRadius: 1,
                    background: "linear-gradient(135deg, #fff, #f5d1d1)",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#b60d13",
                    fontWeight: 800,
                    fontSize: 16,
                  }}
                >
                  R
                </Box>
                <Typography variant="h6" fontWeight={800} sx={{ letterSpacing: 0.5 }}>
                  RED NEXUS
                </Typography>
              </Stack>

              <Box
                sx={{
                  flex: 1,
                  width: "100%",
                  minWidth: 0,
                  maxWidth: 420,
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  bgcolor: alpha(theme.palette.background.paper, 0.95),
                  borderRadius: 999,
                  px: 2,
                  py: 1,
                  color: "text.primary",
                }}
              >
                <SearchOutlinedIcon fontSize="small" />
                <Typography variant="body2" sx={{ flex: 1, opacity: 0.7 }}>
                  Search artwork...
                </Typography>
              </Box>

              <Stack direction="row" alignItems="center" spacing={1.5}>
                <IconButton sx={{ color: "#fff" }}><FavoriteBorderOutlinedIcon /></IconButton>
                <IconButton sx={{ color: "#fff" }}><ShoppingCartOutlinedIcon /></IconButton>
                <IconButton sx={{ color: "#fff" }}><PersonOutlineOutlinedIcon /></IconButton>
              </Stack>
            </Stack>
          </Container>
        </Box>

        <Container maxWidth="lg" sx={{ py: { xs: 4, md: 5 } }}>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 2, color: "#fff", fontSize: 14 }}>
            <Box component="span" sx={{ opacity: 0.9 }}>All Categories</Box>
            <Box component="span" sx={{ opacity: 0.9 }}>Shop</Box>
            <Box component="span" sx={{ opacity: 0.9 }}>Artist Gallery</Box>
          </Box>
        </Container>

      </Box>

      <Container maxWidth="lg" sx={{ position: "relative", zIndex: 1, mt: { xs: -3, md: -6 }, pb: 4, px: { xs: 0, sm: 2, md: 3 } }}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2.5, md: 3 },
            borderRadius: 3,
            bgcolor: "background.paper",
            border: "1px solid", borderColor: "divider",
            boxShadow: theme.shadows[3],
          }}
        >
          <Grid container spacing={3} alignItems="center">
            <Grid size={{ xs: 12, md: 4 }} sx={{ minWidth: 0 }}>
              <Stack alignItems={{ xs: "center", md: "flex-start" }} spacing={1}>
                <Avatar
                  src={getProfileImage(profileImage)}
                  alt={profileName}
                  sx={{ width: 92, height: 92, border: "4px solid", borderColor: "background.paper" }}
                />
                <Typography
                  component="h1"
                  variant="subtitle1"
                  fontWeight={800}
                  textAlign={{ xs: "center", md: "left" }}
                  sx={{
                    width: "100%",
                    color: "text.primary",
                    lineHeight: 1.2,
                    overflowWrap: "anywhere",
                  }}
                >
                  {profileName}
                </Typography>
                {aboutMe && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    textAlign={{ xs: "center", md: "left" }}
                    sx={{ maxWidth: "100%", lineHeight: 1.5, overflowWrap: "anywhere" }}
                  >
                    {aboutMe}
                  </Typography>
                )}
              </Stack>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }} sx={{ minWidth: 0 }}>
              <Stack spacing={1}>
                <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "flex-start", sm: "center" }} spacing={1.5}>
                  <Chip
                    label={course || "Fine Arts"}
                    size="small"
                    sx={{
                      bgcolor: "action.selected",
                      color: "text.primary",
                      fontWeight: 700,
                      borderRadius: 999,
                      maxWidth: "100%",
                      height: "auto",
                      "& .MuiChip-label": { whiteSpace: "normal", py: 0.75 },
                    }}
                  />
                </Stack>

                <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
                  {stats.map((stat) => (
                    <Box key={stat.label}>
                      <Typography variant="h6" fontWeight={800} sx={{ lineHeight: 1.2 }}>
                        {stat.value}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {stat.label}
                      </Typography>
                    </Box>
                  ))}
                </Stack>

              </Stack>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }} sx={{ minWidth: 0 }}>
              <Paper
                elevation={0}
                sx={{
                  bgcolor: "background.default",
                  borderRadius: 3,
                  p: 2,
                  border: "1px solid", borderColor: "divider",
                }}
              >
                <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>
                  Artist Achievements
                </Typography>

                <Stack spacing={1.5}>
                  <Stack direction="row" spacing={1.3} alignItems="center">
                    <VerifiedRoundedIcon sx={{ color: "error.main", fontSize: 18 }} />
                    <Box>
                      <Typography variant="body2" fontWeight={700}>Top Seller</Typography>
                      <Typography variant="caption" color="text.secondary">Top 5% in selling artworks</Typography>
                    </Box>
                  </Stack>

                  <Stack direction="row" spacing={1.3} alignItems="center">
                    <VerifiedRoundedIcon sx={{ color: "error.main", fontSize: 18 }} />
                    <Box>
                      <Typography variant="body2" fontWeight={700}>Featured Artist</Typography>
                      <Typography variant="caption" color="text.secondary">Featured in spring 2026</Typography>
                    </Box>
                  </Stack>
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </Paper>

        <Grid container spacing={3} sx={{ mt: 3 }}>
          <Grid size={{ xs: 12, lg: 8 }} sx={{ minWidth: 0 }}>
            <Paper
              elevation={0}
              sx={{
                borderRadius: 3,
                p: { xs: 2, md: 2.5 },
                bgcolor: "background.paper",
                border: "1px solid", borderColor: "divider",
              }}
            >
              <Tabs
                value={activeTab}
                onChange={(event, newValue) => setActiveTab(newValue)}
                textColor="inherit"
                indicatorColor="primary"
                variant="scrollable"
                scrollButtons="auto"
                allowScrollButtonsMobile
                aria-label="Seller profile sections"
                sx={{
                  mb: 3,
                  borderBottom: "1px solid",
                  borderColor: "divider",
                  ".MuiTab-root": { textTransform: "none", fontWeight: 700, color: "text.secondary", "&.Mui-selected": { color: "primary.main" } },
                }}
              >
                <Tab label="Artwork for Sale" />
                <Tab label="Gallery Portfolio" />
                <Tab label="About" />
                <Tab label={`Reviews (${sellerReviews.length})`} />
              </Tabs>

              {activeTab === 2 ? (
                <Box sx={{ py: 3, minHeight: 180 }}>
                  {aboutError ? (
                    <Alert severity="error">{aboutError}</Alert>
                  ) : aboutLoading ? (
                    <Box sx={{ display: "grid", placeItems: "center", py: 4 }}>
                      <CircularProgress size={28} />
                    </Box>
                  ) : aboutMe.trim() ? (
                    <Typography sx={{ whiteSpace: "pre-wrap", lineHeight: 1.8, overflowWrap: "anywhere" }}>
                      {aboutMe}
                    </Typography>
                  ) : (
                    <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                      This seller hasn’t added an About description yet.
                    </Typography>
                  )}
                </Box>
              ) : activeTab === 3 ? (
                <Stack spacing={2}>
                  {!reviewsLoading && !reviewError && sellerReviews.length > 0 && (
                    <Paper
                      elevation={0}
                      sx={{ p: 2, borderRadius: 2, bgcolor: "background.paper", border: "1px solid", borderColor: "divider" }}
                    >
                      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
                        <Typography variant="h4" fontWeight={800}>
                          {averageRating.toFixed(1)}
                        </Typography>
                        <Box>
                          <Rating sx={{ "& .MuiRating-iconEmpty": { color: "text.disabled" } }} value={averageRating} precision={0.1} readOnly size="small" />
                          <Typography variant="body2" color="text.secondary">
                            Based on {sellerReviews.length} {sellerReviews.length === 1 ? "review" : "reviews"}
                          </Typography>
                        </Box>
                      </Stack>
                    </Paper>
                  )}

                  {reviewsLoading ? (
                    <Box sx={{ display: "grid", placeItems: "center", py: 5 }}><CircularProgress size={28} /></Box>
                  ) : reviewError ? (
                    <Alert severity="error">{reviewError}</Alert>
                  ) : sellerReviews.length === 0 ? (
                    <Box sx={{ py: 6, textAlign: "center" }}>
                      <Typography variant="h6" fontWeight={700}>
                        No reviews yet
                      </Typography>
                      <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                        Buyer reviews for your artworks will appear here.
                      </Typography>
                    </Box>
                  ) : (
                    sellerReviews.map((review) => (
                      <Paper
                        key={review.id}
                        elevation={0}
                        sx={{ p: 2.5, borderRadius: 2, bgcolor: "background.paper", border: "1px solid", borderColor: "divider" }}
                      >
                        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems="flex-start" spacing={2}>
                          <Box sx={{ minWidth: 0, overflowWrap: "anywhere" }}>
                            <Typography variant="subtitle1" fontWeight={800}>
                              {review.reviewerName}
                            </Typography>
                            <Rating sx={{ "& .MuiRating-iconEmpty": { color: "text.disabled" } }} value={Number(review.rating)} readOnly size="small" />
                          </Box>
                          <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                            {new Date(review.createdAt).toLocaleDateString()}
                          </Typography>
                        </Stack>
                        <Typography variant="body2" sx={{ mt: 1, lineHeight: 1.7, overflowWrap: "anywhere" }}>
                          {review.comment}
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 2 }}>
                          {review.artworkImage && (
                            <Box
                              component="img"
                              src={getArtworkImage(review.artworkImage)}
                              alt={review.artworkTitle}
                              sx={{ width: 38, height: 38, borderRadius: 1, objectFit: "cover" }}
                            />
                          )}
                          <Typography variant="caption" color="text.secondary" fontWeight={700}>
                            {review.orderItemId ? "Purchased" : "Artwork"}: {review.artworkTitle}
                          </Typography>
                        </Stack>
                      </Paper>
                    ))
                  )}
                </Stack>
              ) : artworksError ? (
                <Alert severity="error" sx={{ mb: 2 }}>{artworksError}</Alert>
              ) : artworksLoading ? (
                <Box sx={{ display: "grid", placeItems: "center", py: 5 }}>
                  <CircularProgress size={28} />
                </Box>
              ) : artworks.length === 0 ? (
                <Box sx={{ py: 6, textAlign: "center" }}>
                  <Typography variant="h6" fontWeight={700}>
                    No artworks for sale yet
                  </Typography>
                  <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                    Artworks you post will appear here.
                  </Typography>
                </Box>
              ) : (
              <Grid container spacing={2.5}>
                {prioritizedArtworks.map((artwork) => {
                  const isPinned = pinnedArtworkIds.includes(
                    String(artwork.artwork_id),
                  );
                  return (
                  <Grid size={{ xs: 12, sm: 6, md: 4, lg: 6 }} key={artwork.artwork_id} sx={{ minWidth: 0 }}>
                    <ProfileCard artwork={artwork} isPinned={isPinned} />
                  </Grid>
                  );
                })}
              </Grid>
              )}
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, lg: 4 }} sx={{ minWidth: 0 }}>
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: 3,
                bgcolor: "background.paper",
                border: "1px solid", borderColor: "divider",
              }}
            >
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                Artist Profile
              </Typography>

              <Stack spacing={2}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Membership</Typography>
                  <Typography variant="body1" fontWeight={700}>Member since {formattedMembershipDate}</Typography>
                </Box>

                <Divider />

                <Box>
                  <Typography variant="caption" color="text.secondary">Specialties</Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                    {specialties.length > 0 ? specialties.map((tag) => (
                      <Chip
                        key={tag}
                        label={tag}
                        size="small"
                        sx={{
                          bgcolor: "action.selected",
                          color: "text.primary",
                          fontWeight: 700,
                          borderRadius: 999,
                          maxWidth: "100%",
                          height: "auto",
                          "& .MuiChip-label": { whiteSpace: "normal", py: 0.5 },
                        }}
                      />
                    )) : (
                      <Typography variant="body2" color="text.secondary">
                        No specialties selected yet.
                      </Typography>
                    )}
                  </Stack>
                </Box>

                <Divider />

                <Stack direction="row" spacing={1} alignItems="center">
                  <ShareOutlinedIcon fontSize="small" sx={{ color: "text.primary" }} />
                  <Typography variant="body2" fontWeight={700}>Share profile</Typography>
                </Stack>

                <Button
                  variant="contained"
                  endIcon={<ArrowForwardIcon />}
                  sx={{
                    mt: 1,
                    bgcolor: "error.main",
                    color: theme.palette.getContrastText(theme.palette.error.main),
                    "&:hover": { bgcolor: "error.dark" },
                    borderRadius: 999,
                    textTransform: "none",
                    fontWeight: 700,
                    boxShadow: "none",
                  }}
                >
                  Explore Collection
                </Button>
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      </Container>

      <Box sx={{ bgcolor: "background.footer", color: "#fff", py: 4, mt: 2 }}>
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="flex-start">
            <Grid size={{ xs: 12, md: 4 }}>
              <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
                <Box sx={{ width: 18, height: 18, borderRadius: 0.8, background: "linear-gradient(135deg,#fff,#f5cfcf)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#b60d13", fontWeight: 800 }}>R</Box>
                <Typography variant="h6" fontWeight={800}>RED NEXUS</Typography>
              </Stack>
              <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.8)", maxWidth: 280 }}>
                An e-commerce marketplace powered by the Central Academy of Fine Arts student community. Curating true creative expressions and vibrant stories from the studio.
              </Typography>
            </Grid>

            <Grid size={{ xs: 12, sm: 4, md: 2.5 }}>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Acquire Art</Typography>
              <Stack spacing={0.8}>
                {['Paintings', 'Sculptures', 'Photography', 'Fine Arts'].map((link) => (
                  <Typography key={link} variant="body2" sx={{ color: "rgba(255,255,255,0.8)" }}>{link}</Typography>
                ))}
              </Stack>
            </Grid>

            <Grid size={{ xs: 12, sm: 4, md: 2.5 }}>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Programs</Typography>
              <Stack spacing={0.8}>
                {['Architecture', 'Interior Design', 'Exhibition Calendar', 'Academic Support'].map((link) => (
                  <Typography key={link} variant="body2" sx={{ color: "rgba(255,255,255,0.8)" }}>{link}</Typography>
                ))}
              </Stack>
            </Grid>

            <Grid size={{ xs: 12, sm: 4, md: 2.5 }}>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Academy</Typography>
              <Stack spacing={0.8}>
                {['About CAA', 'Support Desk', 'Vacancies', 'Contact'].map((link) => (
                  <Typography key={link} variant="body2" sx={{ color: "rgba(255,255,255,0.8)" }}>{link}</Typography>
                ))}
              </Stack>
            </Grid>
          </Grid>

          <Divider sx={{ my: 3, borderColor: "rgba(255,255,255,0.2)" }} />

          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
            <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.75)" }}>
              © 2025 CAA ArtMatch. Powered by Central Academy of Fine Arts.
            </Typography>
            <Stack direction="row" spacing={1}>
              {['F', 'X', 'I'].map((item) => (
                <Box key={item} sx={{ width: 28, height: 28, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>{item}</Box>
              ))}
            </Stack>
          </Box>
        </Container>
      </Box>
    </Box>
  );
}
