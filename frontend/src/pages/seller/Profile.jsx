import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  Avatar,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Grid,
  IconButton,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import FavoriteBorderOutlinedIcon from "@mui/icons-material/FavoriteBorderOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import ShareOutlinedIcon from "@mui/icons-material/ShareOutlined";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

const getProfileFallback = (name = "Artist") =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6f1d1b&color=fff&size=200`;

const buildArtworkDefaults = (profileName) => [
  {
    id: 1,
    title: "Golden Hour Reflections",
    subtitle: "Oil Painting | 2025",
    price: 2450,
    rating: 5.0,
    badge: "Best Seller",
    image:
      "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: 2,
    title: "Bijou Autumn Breeze",
    subtitle: "Oil Painting | 2025",
    price: 1850,
    rating: 4.9,
    badge: "For Sale",
    image:
      "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: 3,
    title: "Solitude of Form",
    subtitle: "Oil Painting | 2025",
    price: 3100,
    rating: 4.8,
    badge: "Featured",
    image:
      "https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: 4,
    title: "Crimson Balance Study",
    subtitle: "Oil Painting | 2025",
    price: 1200,
    rating: 4.7,
    badge: "For Sale",
    image:
      "https://images.unsplash.com/photo-1515405295579-ba7b45403062?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: 5,
    title: "The Silent Alley",
    subtitle: "Oil Painting | 2025",
    price: 2100,
    rating: 4.9,
    badge: "For Sale",
    image:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: 6,
    title: "Urban Rhythm",
    subtitle: "Oil Painting | 2025",
    price: 2800,
    rating: 5.0,
    badge: "New",
    image:
      "https://images.unsplash.com/photo-1515405295579-ba7b45403062?auto=format&fit=crop&w=900&q=80",
  },
].map((artwork) => ({
  ...artwork,
  artist: profileName,
}));

const formatPrice = (value) =>
  `₱${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

const getProfileImage = (profileImage) => {
  if (!profileImage) return getProfileFallback("Artist");
  if (profileImage.startsWith("http")) return profileImage;
  return `http://localhost:5000/uploads/seller/profile/${encodeURIComponent(profileImage)}`;
};

export default function Profile() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [course, setCourse] = useState("");
  const [yearLevel, setYearLevel] = useState("");
  const [profileImage, setProfileImage] = useState("");
  const [registeredDate, setRegisteredDate] = useState("");
  const [aboutMe, setAboutMe] = useState("");
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSellerData = () => {
      const sellerFirstName = localStorage.getItem("seller_first_name") || "Malia";
      const sellerLastName = localStorage.getItem("seller_last_name") || "";
      const sellerMiddleName = localStorage.getItem("seller_middle_name") || "";
      const sellerCourse = localStorage.getItem("seller_course") || "Fine Arts";
      const sellerYearLevel = localStorage.getItem("seller_year_level") || "4th Year";
      const sellerProfileImage = localStorage.getItem("seller_profile_image") || "";
      const sellerRegisteredDate = localStorage.getItem("seller_registered_date") || "2024-09-01";
      const sellerStoreDescription =
        localStorage.getItem("seller_store_description") ||
        "Combining traditional Chinese asthmopheric values with modern oil impressionism. Focusing on light, reflection, and quiet urban environments of Beijing.";

      setFirstName(sellerFirstName);
      setLastName(sellerLastName);
      setMiddleName(sellerMiddleName);
      setCourse(sellerCourse);
      setYearLevel(sellerYearLevel);
      setProfileImage(sellerProfileImage);
      setRegisteredDate(sellerRegisteredDate);
      setAboutMe(sellerStoreDescription);
      setLoading(false);
    };

    loadSellerData();
  }, []);

  const fullName = [firstName, middleName, lastName].filter(Boolean).join(" ");
  const profileName = fullName || "Malia";

  const artworks = useMemo(() => {
    if (!profileName) return [];
    return buildArtworkDefaults(profileName);
  }, [profileName]);

  const stats = [
    { label: "Followers", value: "234" },
    { label: "Followings", value: "47" },
    { label: "Artworks", value: "89" },
    { label: "Sales", value: "4.8" },
  ];

  const specialties = ["Oil Painting", "Modern Impressionist", "Landscape", "Impression"];

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
    <Box sx={{ minHeight: "100vh", background: "#efeae7", color: "#1f1f1f" }}>
      <Helmet>
        <title>Seller Profile</title>
      </Helmet>

      <Box
        sx={{
          background: "linear-gradient(180deg, rgba(146, 26, 26, 0.2), rgba(54, 11, 11, 0.5)), url('https://images.unsplash.com/photo-1515405295579-ba7b45403062?auto=format&fit=crop&w=1600&q=80') center/cover no-repeat",
          minHeight: 420,
          position: "relative",
        }}
      >
        <Box sx={{ background: "rgba(26, 23, 23, 0.08)", py: 2 }}>
          <Container maxWidth="lg">
            <Stack
              direction="row"
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
                  maxWidth: 420,
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  background: "rgba(255,255,255,0.9)",
                  borderRadius: 999,
                  px: 2,
                  py: 1,
                  color: "#444",
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
          <Box sx={{ display: "flex", gap: 2, mb: 2, color: "#fff", fontSize: 14 }}>
            <Box component="span" sx={{ opacity: 0.9 }}>All Categories</Box>
            <Box component="span" sx={{ opacity: 0.9 }}>Shop</Box>
            <Box component="span" sx={{ opacity: 0.9 }}>Artist Gallery</Box>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ mt: -8, pb: 7 }}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2.5, md: 3 },
            borderRadius: 3,
            background: "rgba(249,245,242,0.96)",
            border: "1px solid rgba(130,99,88,0.15)",
            boxShadow: "0 20px 30px rgba(50, 25, 22, 0.08)",
          }}
        >
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={1.2}>
              <Avatar
                src={getProfileImage(profileImage)}
                alt={profileName}
                sx={{ width: 92, height: 92, border: "4px solid #fff" }}
              />
            </Grid>

            <Grid item xs={12} md={7.5}>
              <Stack spacing={1}>
                <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "flex-start", sm: "center" }} spacing={1.5}>
                  <Typography variant="h4" fontWeight={800} sx={{ lineHeight: 1.1 }}>
                    {profileName}
                  </Typography>
                  <Chip
                    label={course || "Fine Arts"}
                    size="small"
                    sx={{
                      background: "#f2ece8",
                      color: "#5b3b35",
                      fontWeight: 700,
                      borderRadius: 999,
                    }}
                  />
                </Stack>

                <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 690 }}>
                  {aboutMe}
                </Typography>

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

                <Stack direction="row" spacing={1.5} sx={{ mt: 1 }}>
                  <Button
                    variant="contained"
                    sx={{
                      borderRadius: 999,
                      background: "linear-gradient(135deg, #d93d3d, #b81d1d)",
                      boxShadow: "none",
                      px: 2.5,
                      py: 1,
                      fontWeight: 700,
                      textTransform: "none",
                    }}
                  >
                    Follow
                  </Button>
                  <Button
                    variant="outlined"
                    sx={{
                      borderRadius: 999,
                      borderColor: "rgba(112, 81, 71, 0.35)",
                      color: "#3e2d2b",
                      px: 2.5,
                      py: 1,
                      fontWeight: 700,
                      textTransform: "none",
                    }}
                  >
                    Contact Artist
                  </Button>
                </Stack>
              </Stack>
            </Grid>

            <Grid item xs={12} md={3}>
              <Paper
                elevation={0}
                sx={{
                  background: "rgba(255,255,255,0.5)",
                  borderRadius: 3,
                  p: 2,
                  border: "1px solid rgba(124,94,86,0.16)",
                }}
              >
                <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>
                  Artist Achievements
                </Typography>

                <Stack spacing={1.5}>
                  <Stack direction="row" spacing={1.3} alignItems="center">
                    <VerifiedRoundedIcon sx={{ color: "#d53636", fontSize: 18 }} />
                    <Box>
                      <Typography variant="body2" fontWeight={700}>Top Seller</Typography>
                      <Typography variant="caption" color="text.secondary">Top 5% in selling artworks</Typography>
                    </Box>
                  </Stack>

                  <Stack direction="row" spacing={1.3} alignItems="center">
                    <VerifiedRoundedIcon sx={{ color: "#d53636", fontSize: 18 }} />
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

        <Grid container spacing={3} sx={{ mt: 0.5 }}>
          <Grid item xs={12} lg={8.5}>
            <Paper
              elevation={0}
              sx={{
                borderRadius: 3,
                p: { xs: 2, md: 2.5 },
                background: "#f8f4f2",
                border: "1px solid rgba(130,99,88,0.15)",
              }}
            >
              <Tabs
                value={activeTab}
                onChange={(event, newValue) => setActiveTab(newValue)}
                textColor="inherit"
                indicatorColor="primary"
                sx={{
                  mb: 3,
                  borderBottom: "1px solid rgba(130,99,88,0.15)",
                  ".MuiTab-root": { textTransform: "none", fontWeight: 700, color: "#533b36" },
                }}
              >
                <Tab label="Artwork for Sale" />
                <Tab label="Gallery Portfolio" />
                <Tab label="About" />
                <Tab label="Reviews [128]" />
              </Tabs>

              <Grid container spacing={2.5}>
                {artworks.slice(0, 6).map((artwork) => (
                  <Grid item xs={12} sm={6} md={4} key={artwork.id}>
                    <Card
                      elevation={0}
                      sx={{
                        borderRadius: 3,
                        overflow: "hidden",
                        background: "#fff",
                        border: "1px solid rgba(130,99,88,0.12)",
                        transition: "0.2s ease",
                        "&:hover": { transform: "translateY(-2px)", boxShadow: "0 12px 24px rgba(92,52,48,0.08)" },
                      }}
                    >
                      <Box sx={{ position: "relative" }}>
                        <Box
                          component="img"
                          src={artwork.image}
                          alt={artwork.title}
                          sx={{ width: "100%", height: 220, objectFit: "cover", display: "block" }}
                        />
                        <Chip
                          label={artwork.badge}
                          size="small"
                          sx={{
                            position: "absolute",
                            top: 10,
                            left: 10,
                            background: "rgba(255,255,255,0.9)",
                            fontWeight: 700,
                            color: "#4e2d2c",
                            borderRadius: 999,
                          }}
                        />
                      </Box>

                      <Box sx={{ p: 2 }}>
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                          <Stack direction="row" spacing={0.6} alignItems="center">
                            <StarRoundedIcon sx={{ fontSize: 16, color: "#f5b326" }} />
                            <Typography variant="body2" fontWeight={700}>{artwork.rating.toFixed(1)}</Typography>
                          </Stack>
                          <IconButton size="small" sx={{ color: "#6d4a45" }}>
                            <FavoriteBorderOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Box>

                        <Typography variant="h6" fontWeight={700} sx={{ mb: 0.4 }}>
                          {artwork.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.1 }}>
                          {artwork.subtitle}
                        </Typography>
                        <Typography variant="h6" fontWeight={800} color="primary.main">
                          {formatPrice(artwork.price)}
                        </Typography>
                      </Box>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          </Grid>

          <Grid item xs={12} lg={3.5}>
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: 3,
                background: "rgba(247,242,240,0.96)",
                border: "1px solid rgba(130,99,88,0.15)",
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
                    {specialties.map((tag) => (
                      <Chip
                        key={tag}
                        label={tag}
                        size="small"
                        sx={{
                          background: "#f0e6e3",
                          color: "#4b2d2c",
                          fontWeight: 700,
                          borderRadius: 999,
                        }}
                      />
                    ))}
                  </Stack>
                </Box>

                <Divider />

                <Stack direction="row" spacing={1} alignItems="center">
                  <ShareOutlinedIcon fontSize="small" sx={{ color: "#5b3b35" }} />
                  <Typography variant="body2" fontWeight={700}>Share profile</Typography>
                </Stack>

                <Button
                  variant="contained"
                  endIcon={<ArrowForwardIcon />}
                  sx={{
                    mt: 1,
                    background: "linear-gradient(135deg, #d93d3d, #b81d1d)",
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

      <Box sx={{ background: "linear-gradient(180deg, #b51a1a, #9c1818)", color: "#fff", py: 4, mt: 2 }}>
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="flex-start">
            <Grid item xs={12} md={4}>
              <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
                <Box sx={{ width: 18, height: 18, borderRadius: 0.8, background: "linear-gradient(135deg,#fff,#f5cfcf)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#b60d13", fontWeight: 800 }}>R</Box>
                <Typography variant="h6" fontWeight={800}>RED NEXUS</Typography>
              </Stack>
              <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.8)", maxWidth: 280 }}>
                An e-commerce marketplace powered by the Central Academy of Fine Arts student community. Curating true creative expressions and vibrant stories from the studio.
              </Typography>
            </Grid>

            <Grid item xs={12} sm={4} md={2.5}>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Acquire Art</Typography>
              <Stack spacing={0.8}>
                {['Paintings', 'Sculptures', 'Photography', 'Fine Arts'].map((link) => (
                  <Typography key={link} variant="body2" sx={{ color: "rgba(255,255,255,0.8)" }}>{link}</Typography>
                ))}
              </Stack>
            </Grid>

            <Grid item xs={12} sm={4} md={2.5}>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Programs</Typography>
              <Stack spacing={0.8}>
                {['Architecture', 'Interior Design', 'Exhibition Calendar', 'Academic Support'].map((link) => (
                  <Typography key={link} variant="body2" sx={{ color: "rgba(255,255,255,0.8)" }}>{link}</Typography>
                ))}
              </Stack>
            </Grid>

            <Grid item xs={12} sm={4} md={2.5}>
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
