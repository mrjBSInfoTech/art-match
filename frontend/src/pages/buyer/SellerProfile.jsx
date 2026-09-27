import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
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

  return (
    <Box sx={{ minHeight: "100vh", background: "#f4f0ed", pb: 6 }}>
      <Box
        sx={{
          background: `linear-gradient(180deg, rgba(122,18,18,0.35), rgba(94,16,16,0.52)), url(${heroImage}) center/cover no-repeat`,
          minHeight: { xs: 420, md: 380 },
          position: "relative",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.06), rgba(0,0,0,0.18))",
          }}
        />

        <Container
          maxWidth="lg"
          sx={{ position: "relative", py: { xs: 5, md: 8 } }}
        >
          <Button
            onClick={() => navigate(-1)}
            variant="contained"
            sx={{
              mb: 3,
              borderRadius: 999,
              background: "rgba(0,0,0,0.18)",
              backdropFilter: "blur(6px)",
              border: "1px solid rgba(255,255,255,0.25)",
              color: "#fff",
              px: 2.5,
              textTransform: "none",
              fontWeight: 700,
            }}
          >
            ← Back
          </Button>

          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={8}>
              <Stack
                direction="row"
                spacing={2}
                alignItems="center"
                sx={{ mb: 2 }}
              >
                <Chip
                  label="SELLER PROFILE"
                  sx={{
                    bgcolor: "rgba(255,255,255,0.12)",
                    color: "#fff",
                    borderRadius: 999,
                    fontWeight: 700,
                    letterSpacing: 0.8,
                  }}
                />
                <Chip
                  icon={<VerifiedRoundedIcon sx={{ fontSize: 16 }} />}
                  label="Verified Seller"
                  sx={{
                    bgcolor: "rgba(255,255,255,0.12)",
                    color: "#fff",
                    borderRadius: 999,
                    fontWeight: 700,
                  }}
                />
              </Stack>

              <Typography
                variant="h3"
                sx={{
                  color: "#fff",
                  fontWeight: 800,
                  letterSpacing: "-0.04em",
                  maxWidth: 700,
                  lineHeight: 1.06,
                }}
              >
                {selectedSeller.name}
              </Typography>

              <Typography
                variant="body1"
                sx={{ color: "rgba(255,255,255,0.9)", mt: 1.5, maxWidth: 640 }}
              >
                {selectedSeller.bio ||
                  "The seller currently doesn't have a bio."}
              </Typography>

              <Stack
                direction="row"
                spacing={3}
                sx={{ mt: 3, flexWrap: "wrap", rowGap: 1.5 }}
              >
                <Box>
                  <Typography
                    variant="caption"
                    sx={{ color: "rgba(255,255,255,0.75)" }}
                  >
                    ARTWORKS
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{ color: "#fff", fontWeight: 800 }}
                  >
                    {selectedSeller.worksLabel || "0 works"}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant="caption"
                    sx={{ color: "rgba(255,255,255,0.75)" }}
                  >
                    LISTED
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{ color: "#fff", fontWeight: 800 }}
                  >
                    {selectedSeller.sales || 0} pieces
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant="caption"
                    sx={{ color: "rgba(255,255,255,0.75)" }}
                  >
                    RATING
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{ color: "#fff", fontWeight: 800 }}
                  >
                    <Box component="span" sx={{ color: "#facc15" }}>
                      ★
                    </Box>{" "}
                    {selectedSeller.rating || "4.8"}
                  </Typography>
                </Box>
              </Stack>
            </Grid>

            <Grid item xs={12} md={4}>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 4,
                  background: "rgba(255,255,255,0.14)",
                  border: "1px solid rgba(255,255,255,0.22)",
                  backdropFilter: "blur(8px)",
                  color: "#fff",
                }}
              >
                <Box
                  component="img"
                  src={selectedSeller.image}
                  alt={selectedSeller.name}
                  sx={{
                    width: 120,
                    height: 120,
                    objectFit: "cover",
                    borderRadius: "50%",
                    border: "4px solid rgba(255,255,255,0.58)",
                    display: "block",
                    mx: "auto",
                    mb: 2,
                  }}
                />

                <Typography
                  align="center"
                  sx={{ fontWeight: 800, fontSize: 26 }}
                >
                  {selectedSeller.name}
                </Typography>
                <Typography
                  align="center"
                  sx={{ color: "rgba(255,255,255,0.8)", mt: 0.5 }}
                >
                  {selectedSeller.department || "Independent Artist"}
                </Typography>

                <Stack
                  direction="row"
                  spacing={1}
                  justifyContent="center"
                  sx={{ mt: 2 }}
                >
                  <IconButton
                    sx={{ bgcolor: "rgba(255,255,255,0.1)", color: "#fff" }}
                  >
                    <FavoriteBorderOutlinedIcon />
                  </IconButton>
                  <IconButton
                    sx={{ bgcolor: "rgba(255,255,255,0.1)", color: "#fff" }}
                  >
                    <ShareOutlinedIcon />
                  </IconButton>
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Grid container spacing={4}>
          <Grid item xs={12} md={8}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                mb: 2,
              }}
            >
              <Typography variant="h4" sx={{ fontWeight: 800 }}>
                Artworks by {selectedSeller.name}
              </Typography>
            </Box>

            {displayArtworks.length === 0 ? (
              <Paper sx={{ p: 4, borderRadius: 3, textAlign: "center" }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  No artworks yet
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 1 }}>
                  This seller has not uploaded any work yet.
                </Typography>
              </Paper>
            ) : (
              <Grid container spacing={3}>
                {displayArtworks.map((artwork) => (
                  <Grid item xs={12} sm={6} key={artwork.artwork_id}>
                    <Paper
                      elevation={0}
                      sx={{
                        borderRadius: 3,
                        overflow: "hidden",
                        border: "1px solid",
                        borderColor: "divider",
                        height: "100%",
                        transition: "all 0.2s ease",
                        "&:hover": { boxShadow: 3 },
                      }}
                    >
                      <Box
                        component="img"
                        src={getArtworkImage(artwork)}
                        alt={artwork.title}
                        sx={{
                          width: "100%",
                          height: 250,
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                      <Box sx={{ p: 2.5 }}>
                        <Stack
                          direction="row"
                          alignItems="center"
                          justifyContent="space-between"
                          sx={{ mb: 1 }}
                        >
                          <Chip
                            label={artwork.badge}
                            size="small"
                            sx={{
                              borderRadius: 999,
                              backgroundColor: theme.palette.primary.light,
                              color: theme.palette.primary.dark,
                              fontWeight: 700,
                            }}
                          />
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 700, color: "text.secondary" }}
                          >
                            {artwork.genre || "Art"}
                          </Typography>
                        </Stack>

                        <Typography
                          variant="h6"
                          sx={{ fontWeight: 800, mb: 0.5 }}
                        >
                          {artwork.title}
                        </Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mb: 2 }}
                        >
                          {artwork.description ||
                            "Original artwork by this seller."}
                        </Typography>

                        <Stack
                          direction="row"
                          alignItems="center"
                          justifyContent="space-between"
                        >
                          <Typography variant="h6" sx={{ fontWeight: 800 }}>
                            {formatPrice(artwork.price)}
                          </Typography>
                          <Button
                            variant="contained"
                            endIcon={<ArrowForwardIcon />}
                            onClick={() =>
                              navigate(
                                `/buyer/artwork/view/${artwork.artwork_id}`,
                              )
                            }
                            sx={{
                              borderRadius: 999,
                              backgroundColor: theme.palette.text.primary,
                              color: theme.palette.background.paper,
                              textTransform: "none",
                            }}
                          >
                            View
                          </Button>
                        </Stack>
                      </Box>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            )}
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 3,
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
                Seller details
              </Typography>

              <Stack spacing={2}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <LocationOnOutlinedIcon color="action" />
                  <Typography variant="body2" color="text.secondary">
                    {selectedSeller.department || "Independent Artist"}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <StarRoundedIcon color="warning" />
                  <Typography variant="body2" color="text.secondary">
                    Rating: {selectedSeller.rating || "4.8"}/5
                  </Typography>
                </Box>
                <Divider />
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                  Shop name
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedSeller.shopName ||
                    selectedSeller.artistName ||
                    "Shop name not set"}
                </Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                  Bio
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedSeller.bio ||
                    "The seller currently doesn't have a bio."}
                </Typography>
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
