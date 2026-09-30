import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Grid,
  IconButton,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import FavoriteBorderOutlinedIcon from "@mui/icons-material/FavoriteBorderOutlined";
import ShareOutlinedIcon from "@mui/icons-material/ShareOutlined";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";
import { useTheme } from "@mui/material/styles";
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
      sales: 0,
      featuredArtwork: artwork,
    };

    existing.works += 1;
    existing.sales = existing.works;
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

const formatPrice = (value) =>
  `₱${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export default function SellerProfile() {
  const navigate = useNavigate();
  const { id } = useParams();
  const theme = useTheme();
  const [sellers, setSellers] = useState([]);
  const [sellerArtworks, setSellerArtworks] = useState([]);
  const [selectedSeller, setSelectedSeller] = useState(null);
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
        setSellers(sellerSummaries);

        if (id) {
          const currentSeller = sellerSummaries.find(
            (seller) => String(seller.student_id) === String(id),
          );
          const fallbackSeller = currentSeller || sellerSummaries[0] || null;
          const partnerId = fallbackSeller?.student_id;
          const filteredArtworks = partnerId
            ? list.filter(
                (artwork) => String(artwork.student_id) === String(partnerId),
              )
            : [];
          setSelectedSeller(fallbackSeller);
          setSellerArtworks(filteredArtworks);
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
        setSellers([]);
        setSellerArtworks([]);
        setSelectedSeller(null);
      } finally {
        setLoading(false);
      }
    };

    loadSellers();
  }, [id]);

  const displayArtworks = useMemo(() => {
    return [...sellerArtworks].slice(0, 6).map((artwork, index) => ({
      ...artwork,
      badge:
        index === 0
          ? "Best Seller"
          : index === 1
            ? "For Sale"
            : index === 2
              ? "Featured"
              : "New",
    }));
  }, [sellerArtworks]);

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

  const heroImage =
    getArtworkImage(selectedSeller.featuredArtwork) || selectedSeller.image;

  const tabs = [
    "Artworks for Sale",
    "Gallery Portfolio",
    "About",
    "Reviews (128)",
  ];
  const specialties = [
    selectedSeller.department || "Oil Painting",
    "Modern Impressionist",
    "Landscape",
    "Impasto",
  ];

  return (
    <Box sx={{ minHeight: "100vh", background: "#f4efe9", pb: 6 }}>
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
                background: "#f8f4f0",
                border: "1px solid #e5d8cd",
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
                  border: "2px solid #e6d5c0",
                  flexShrink: 0,
                  background: "#f1e7df",
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
                      color: "#1b1917",
                    }}
                  >
                    {selectedSeller.shopName || selectedSeller.name}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      color: "#5f514b",
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                    }}
                  >
                    {selectedSeller.department || "Fine Arts"}
                  </Typography>
                </Stack>

                <Typography
                  variant="body1"
                  sx={{
                    color: "#5f514b",
                    maxWidth: 620,
                    lineHeight: 1.6,
                    mb: 2,
                  }}
                >
                  {selectedSeller.bio ||
                    "The seller currently doesn't have a bio."}
                </Typography>

                <Stack
                  direction="row"
                  spacing={3}
                  sx={{ flexWrap: "wrap", rowGap: 1.5 }}
                >
                  <Box>
                    <Typography
                      variant="h5"
                      sx={{ fontWeight: 800, color: "#1f1c1a" }}
                    >
                      {selectedSeller.works || 0}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#6f625b" }}>
                      Artworks
                    </Typography>
                  </Box>
                  <Box>
                    <Typography
                      variant="h5"
                      sx={{ fontWeight: 800, color: "#1f1c1a" }}
                    >
                      {selectedSeller.sales || 0}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#6f625b" }}>
                      Sales
                    </Typography>
                  </Box>
                  <Box>
                    <Typography
                      variant="h5"
                      sx={{ fontWeight: 800, color: "#1f1c1a" }}
                    >
                      {selectedSeller.rating || 4.8}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#6f625b" }}>
                      Rating
                    </Typography>
                  </Box>
                </Stack>

                <Stack direction="row" spacing={2} sx={{ mt: 2.5 }}>
                  <Button
                    variant="contained"
                    onClick={() => {}}
                    sx={{
                      borderRadius: 999,
                      background: "#d95454",
                      color: "#fff",
                      px: 3,
                      py: 1,
                      textTransform: "none",
                      fontWeight: 700,
                      boxShadow: "none",
                      "&:hover": { background: "#c94848", boxShadow: "none" },
                    }}
                  >
                    Follow
                  </Button>
                  <Button
                    variant="outlined"
                    sx={{
                      borderRadius: 999,
                      borderColor: "#1f1c1a",
                      color: "#1f1c1a",
                      px: 2.75,
                      py: 1,
                      textTransform: "none",
                      fontWeight: 700,
                    }}
                  >
                    Contact Artist
                  </Button>
                </Stack>
              </Box>
            </Box>

            <Box sx={{ mt: 4, borderBottom: "1px solid #e6d8cd" }}>
              <Stack
                direction="row"
                spacing={3}
                sx={{ flexWrap: "wrap", rowGap: 1.5 }}
              >
                {tabs.map((tab, index) => (
                  <Box
                    key={tab}
                    sx={{
                      py: 1.25,
                      px: 0.5,
                      borderBottom:
                        index === 0
                          ? "2px solid #1d1a1a"
                          : "2px solid transparent",
                      fontWeight: index === 0 ? 700 : 500,
                      color: index === 0 ? "#1d1a1a" : "#6f625b",
                    }}
                  >
                    {tab}
                  </Box>
                ))}
              </Stack>
            </Box>

            <Grid container spacing={3} sx={{ mt: 0.5 }}>
              {displayArtworks.length === 0 ? (
                <Grid item xs={12}>
                  <Paper
                    sx={{
                      p: 4,
                      borderRadius: 3,
                      textAlign: "center",
                      border: "1px solid #eadfda",
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
                displayArtworks.map((artwork) => (
                  <Grid item xs={12} sm={6} key={artwork.artwork_id}>
                    <Card
                      elevation={0}
                      sx={{
                        borderRadius: 3,
                        overflow: "hidden",
                        border: "1px solid #e6d8cd",
                        background: "#fffaf7",
                        height: "100%",
                        boxShadow: "none",
                      }}
                    >
                      <Box sx={{ position: "relative" }}>
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
                        <Box
                          sx={{
                            position: "absolute",
                            top: 12,
                            left: 12,
                            background: "#d95454",
                            color: "#fff",
                            borderRadius: 1,
                            px: 1,
                            py: 0.4,
                            fontSize: 11,
                            fontWeight: 700,
                            textTransform: "uppercase",
                          }}
                        >
                          {artwork.badge || "For Sale"}
                        </Box>
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
                          {selectedSeller.shopName ||
                            selectedSeller.artistName ||
                            "Li Wei"}{" "}
                          ({selectedSeller.department || "Oil Painting Dept."})
                        </Typography>

                        <Stack
                          direction="row"
                          alignItems="center"
                          justifyContent="space-between"
                        >
                          <Typography
                            variant="h6"
                            sx={{ fontWeight: 800, color: "#d95454" }}
                          >
                            {formatPrice(artwork.price)}
                          </Typography>
                          <IconButton
                            size="small"
                            sx={{
                              border: "1px solid #e7dace",
                              background: "#f6efe9",
                              color: "#6f625b",
                            }}
                          >
                            <FavoriteBorderOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                ))
              )}
            </Grid>
          </Box>

          <Box sx={{ width: { xs: "100%", md: 300 }, flexShrink: 0 }}>
            <Stack spacing={2.5} sx={{ height: "100%" }}>
              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  borderRadius: 3,
                  background: "#f7f2eb",
                  border: "1px solid #e5d8cd",
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
                  Artist Achievements
                </Typography>
                <Stack
                  direction="row"
                  spacing={2}
                  alignItems="center"
                  sx={{ mb: 1.5 }}
                >
                  <Box
                    sx={{
                      width: 26,
                      height: 26,
                      borderRadius: "50%",
                      background: "#f2e5d2",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    🏆
                  </Box>
                  <Typography variant="body2" sx={{ color: "#3a332f" }}>
                    Top Seller
                  </Typography>
                </Stack>
                <Stack
                  direction="row"
                  spacing={2}
                  alignItems="center"
                  sx={{ mb: 1.5 }}
                >
                  <Box
                    sx={{
                      width: 26,
                      height: 26,
                      borderRadius: "50%",
                      background: "#f2e5d2",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    ⭐
                  </Box>
                  <Typography variant="body2" sx={{ color: "#3a332f" }}>
                    Featured Artist
                  </Typography>
                </Stack>
              </Paper>

              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  borderRadius: 3,
                  background: "#f7f2eb",
                  border: "1px solid #e5d8cd",
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 1.5 }}>
                  Member Since
                </Typography>
                <Typography variant="body2" sx={{ color: "#3a332f" }}>
                  September 2024
                </Typography>
              </Paper>

              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  borderRadius: 3,
                  background: "#f7f2eb",
                  border: "1px solid #e5d8cd",
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 1.5 }}>
                  Specialties
                </Typography>
                <Stack
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
                        background: "#f3e7dc",
                        color: "#3a332f",
                        borderRadius: 999,
                        fontWeight: 600,
                        border: "1px solid #e3d3c2",
                      }}
                    />
                  ))}
                </Stack>
              </Paper>
            </Stack>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
