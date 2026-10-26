import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Paper,
  Slide,
  Snackbar,
  Stack,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { fetchArtworks, fetchArtworkById } from "../../api/buyer/artworkAPI";
import { addToCart } from "../../api/buyer/cartAPI";
import ArtworkCard from "../../components/buyer/Artwork/ArtworkCard";
import RelatedArtists from "../../components/buyer/Artist/RelatedArtists";
import {
  fetchRecentlyViewedArtworks,
  getRecommendationSessionId,
  recordRecommendationEvent,
} from "../../api/buyer/recommendationAPI";
import WatermarkedArtworkImage from "../../components/buyer/Artwork/WatermarkedArtworkImage";
import ArtworkReviews from "../../components/buyer/Artwork/ArtworkReviews";
import ArtworkAdditionalDetails from "../../components/buyer/Artwork/ArtworkAdditionalDetails";
import { getArtworkDetailCategory } from "../../utils/artworkDetails";
import { isArtworkSoldOut } from "../../utils/artworkAvailability";
import { getSimilarArtworks } from "../../utils/artworkSimilarity";
import { getArtworkRelatedArtists } from "../../utils/artworkRelatedArtists";

// Animation transition
const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

function getColorChipStyles(value) {
  const hex = String(value).match(/#(?:[a-f\d]{6}|[a-f\d]{3})\b/i)?.[0];
  if (!hex) {
    return { backgroundColor: "background.default", color: "text.primary" };
  }

  const raw = hex.slice(1);
  const full = raw.length === 3 ? [...raw].map((c) => c + c).join("") : raw;
  const channels = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
  const isNearWhite = channels.every((channel) => channel >= 220);

  return {
    backgroundColor: hex,
    color: isNearWhite ? "#000" : "#fff",
  };
}

export default function ArtworkDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [artworks, setArtworks] = useState([]);
  const [artwork, setArtwork] = useState(null);
  const relatedArtists = useMemo(
    () => getArtworkRelatedArtists(artwork, artworks),
    [artwork, artworks],
  );
  const [loading, setLoading] = useState(false);
  const [artworkErrorMessage, setArtworkErrorMessage] = useState("");
  const [addingToCart, setAddingToCart] = useState(false);
  const [cartMessage, setCartMessage] = useState("");
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [, setRecentHistory] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");

  useEffect(() => {
    if (!cartMessage) return;
    const timeoutId = setTimeout(() => setCartMessage(""), 1000);
    return () => clearTimeout(timeoutId);
  }, [cartMessage]);

  // Fetch artwork detail and also the list for related items
  useEffect(() => {
    let mounted = true;
    const loadRecentlyViewed = async () => {
      try {
        const customerId =
          localStorage.getItem("buyer_token") &&
          localStorage.getItem("buyer_customer_id");
        const viewer = customerId
          ? `buyer-${customerId}`
          : `guest-${getRecommendationSessionId()}`;
        const viewKey = `recommendation_view_${viewer}_${id}`;
        const now = Date.now();
        const lastView = Number(sessionStorage.getItem(viewKey) || 0);
        if (now - lastView >= 30000) {
          const result = await recordRecommendationEvent({
            event_type: "view",
            artwork_id: Number(id),
            source_page: "artwork_detail",
          });
          if (
            result?.duplicate ||
            (result?.recorded && result.interaction_id != null)
          ) {
            sessionStorage.setItem(viewKey, String(now));
          }
        }
      } catch {
        // Storage restrictions should not prevent loading server-side history.
      }
      if (!mounted) return;
      try {
        const items = await fetchRecentlyViewedArtworks(id);
        if (mounted)
          setRecentHistory({ artworkId: id, artworks: items, error: "" });
      } catch {
        if (mounted)
          setRecentHistory({
            artworkId: id,
            artworks: [],
            error: "Recently viewed artworks could not be loaded.",
          });
      }
    };
    const load = async () => {
      try {
        setLoading(true);
        setArtworkErrorMessage("");

        const [detail, listResp] = await Promise.all([
          fetchArtworkById(id),
          // Related items are optional and must not hide the detail or history.
          fetchArtworks().catch(() => []),
        ]);

        const list = Array.isArray(listResp)
          ? listResp
          : listResp && listResp.data && Array.isArray(listResp.data)
            ? listResp.data
            : [];

        if (!mounted) return;
        setArtworks(list);
        setArtwork(detail || null);
        if (detail) void loadRecentlyViewed();
      } catch (err) {
        if (!mounted) return;
        setArtworks([]);
        setArtworkErrorMessage(
          "Failed to load artwork details: " + err.message,
        );
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [id]);

  const formatAndCapitalize = (data) => {
    if (!data) return "N/A";

    const list = Array.isArray(data)
      ? data
      : typeof data === "string"
        ? data.split(",")
        : [];

    if (list.length === 0) return "N/A";

    const formatted = list
      .map((item) => {
        if (typeof item !== "string") return "";
        const trimmed = item.trim();
        if (!trimmed) return "";

        return trimmed
          .replace(/_/g, " ")
          .split(/\s+/)
          .map(
            (word) =>
              word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
          )
          .join(" ");
      })
      .filter(Boolean); // Remove empty strings

    return formatted.length > 0 ? formatted.join(", ") : "N/A";
  };

  const toList = (data) => {
    if (!data) return [];
    if (Array.isArray(data))
      return data.map((d) => String(d).trim()).filter(Boolean);
    if (typeof data === "string")
      return data
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    return [];
  };

  const mediumsList = artwork ? toList(artwork.mediums_used) : [];
  const featuresList = artwork ? toList(artwork.feature_scanned) : [];
  const colorsList = artwork ? toList(artwork.color_used) : [];

  if (loading) {
    return (
      <Container sx={{ py: 8 }}>
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (artworkErrorMessage) {
    return (
      <Container sx={{ py: 8 }}>
        <Button sx={{ mt: 2 }} onClick={() => navigate(-1)}>
          Back
        </Button>
        <Typography align="center" color="error" sx={{ mt: 2 }}>
          {artworkErrorMessage}
        </Typography>
      </Container>
    );
  }

  if (!artwork) {
    return (
      <Container sx={{ py: 8 }}>
        <Button sx={{ mt: 2 }} onClick={() => navigate(-1)}>
          Back
        </Button>
        <Typography textAlign="center" sx={{ mt: 2 }}>
          Artwork not found.
        </Typography>
      </Container>
    );
  }

  // Raw upload paths are private and no longer served; the signed image
  // component resolves the stored filename itself.
  const imageUrl = artwork.image
    ? artwork.image.startsWith("http")
      ? artwork.image
      : artwork.image
    : "https://via.placeholder.com/600x800?text=No+Image";
  const isSoldOut = isArtworkSoldOut(artwork);
  const detailCategory = getArtworkDetailCategory(artwork.art_type, artwork.product);

  const similarArtworks = getSimilarArtworks(artwork, artworks);

  const handleAddToCart = async (artworkId) => {
    try {
      setAddingToCart(true);
      const result = await addToCart(artworkId);
      setCartMessage("Added to cart");
      showSnackbar(result?.message || "Artwork added to cart", "success");
      return result;
    } catch (error) {
      const soldOut = error.status === 409 && /sold out/i.test(error.message);
      if (soldOut) {
        setArtwork((current) =>
          current ? { ...current, is_sold_out: 1 } : current,
        );
      }
      setCartMessage(
        error.status === 409
          ? soldOut
            ? "Sold out"
            : "Already in cart"
          : "",
      );
      showSnackbar(
        error.message || "Unable to add artwork to cart",
        error.status === 409 ? "warning" : "error",
      );
      throw error;
    } finally {
      setAddingToCart(false);
    }
  };

  // Snackbar handlers
  const showSnackbar = (message, severity = "success") => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const closeSnackbar = (event, reason) => {
    if (reason === "clickaway") return;
    setSnackbarOpen(false);
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case "success":
        return "success.light";
      case "warning":
        return "warning.light";
      case "error":
        return "error.light";
      default:
        return "primary.light";
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 8 } }}>
      <Grid container spacing={{ xs: 4, md: 6 }} alignItems="stretch">
        <Grid size={{ xs: 12, md: 7 }}>
          <WatermarkedArtworkImage
            image={artwork.image || imageUrl}
            alt={artwork.title}
            variant="web"
            hideWhenBlurred
            sx={{
              width: { xs: "100%", md: 600 },
              height: { xs: 460, sm: 620, md: 730 },
              maxWidth: "100%",
              mx: "auto",
              borderRadius: 3,
              objectFit: "cover",
              display: "block",
              cursor: "zoom-in",
            }}
            onClick={() => setImageViewerOpen(true)}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                setImageViewerOpen(true);
              }
            }}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Box
            sx={{
              width: "100%",
              maxWidth: 520,
              mx: { xs: "auto", md: 0 },
            }}
          >
            <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
              <Chip
                label={artwork.genre}
                size="small"
                variant="outlined"
                sx={{ fontWeight: "bold", borderRadius: 2, px: 1 }}
              />
              <Chip
                label={isSoldOut ? "Sold out" : "Available"}
                size="small"
                color={isSoldOut ? "default" : "success"}
                sx={{ fontWeight: "bold", color: isSoldOut ? undefined : "#fff" }}
              />
            </Stack>
            <Typography
              variant="h3"
              fontWeight={800}
              sx={{
                mt: 3,
                mb: 1,
                wordSpacing: "0.12em",
                lineHeight: 1.1,
                fontSize: { xs: "2rem", sm: "2.5rem", md: "3rem" },
                overflowWrap: "anywhere",
              }}
            >
              {artwork.title}
            </Typography>
            <Typography variant="subtitle2" color="text.secondary">
              By {artwork.artist || "Unknown artist"}
            </Typography>

            <Typography
              variant="h4"
              sx={{
                mt: 3,
                mb: 3,
                fontWeight: 700,
                fontSize: { xs: "1.75rem", sm: "2rem", md: "2.125rem" },
              }}
            >
              ₱{Number(artwork.price || 0).toLocaleString()}
            </Typography>

            <Box sx={{ borderTop: "1px solid", borderColor: "divider", pt: 3 }}>
              <Stack spacing={1.5}>
                <Row
                  label="Medium"
                  value={formatAndCapitalize(artwork.mediums_used)}
                />
                <Row label="Size" value={artwork.art_size || "Unknown"} />
                <Row label="Style" value={artwork.genre || "Unknown"} />
              </Stack>
              <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  fullWidth
                  disabled={addingToCart || isSoldOut}
                  onClick={() =>
                    handleAddToCart(artwork.artwork_id || artwork.id).catch(
                      () => {},
                    )
                  }
                  sx={{
                    padding: 1,
                    px: 3,
                    borderRadius: 999,
                    fontSize: 10,
                    fontWeight: 600,
                    color: "white",
                  }}
                >
                  {isSoldOut
                    ? "Sold out"
                    : addingToCart
                      ? "Adding..."
                      : cartMessage || "Add to cart"}
                </Button>
              </Stack>
            </Box>
          </Box>
        </Grid>
        <Grid size={12}>
          <Paper
            variant="outlined"
            sx={{
              mt: 0,
              p: 3,
              borderRadius: 3,
              borderColor: "divider",
              backgroundColor: "background.paper",
            }}
          >
            <Stack spacing={2.5} divider={<Divider flexItem />}>
              {/* Description Section */}
              <Box>
                <Typography
                  variant="caption"
                  fontWeight={700}
                  color="text.secondary"
                  sx={{
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    display: "block",
                  }}
                >
                  Description
                </Typography>
                <Typography
                  variant="body2"
                  color="text.primary"
                  sx={{ mt: 0.5, lineHeight: 1.6 }}
                >
                  {artwork.description || "No description provided."}
                </Typography>
              </Box>

              <Box>
                <Typography
                  variant="caption"
                  fontWeight={700}
                  color="text.secondary"
                  sx={{
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    display: "block",
                  }}
                >
                  How to Handle with Care
                </Typography>
                <Typography
                  variant="body2"
                  color="text.primary"
                  sx={{ mt: 0.5, lineHeight: 1.6, whiteSpace: "pre-line" }}
                >
                  {artwork.care_instructions?.trim()
                    ? artwork.care_instructions
                    : "No handling instructions provided."}
                </Typography>
              </Box>

              {detailCategory && (
                <ArtworkAdditionalDetails artwork={artwork} category={detailCategory} />
              )}

              {/* Colors Section */}
              <Box>
                <Typography
                  variant="caption"
                  fontWeight={700}
                  color="text.secondary"
                  sx={{
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    display: "block",
                  }}
                >
                  Colors Used
                </Typography>
                {colorsList.length > 0 ? (
                  <Stack
                    direction="row"
                    flexWrap="wrap"
                    gap={0.8}
                    sx={{ mt: 1 }}
                  >
                    {colorsList.map((c) => (
                      <Chip
                        key={`color-${formatAndCapitalize(c)}`}
                        label={formatAndCapitalize(c)}
                        size="small"
                        variant="outlined"
                        sx={{
                          borderRadius: 999,
                          fontSize: "0.75rem",
                          ...getColorChipStyles(c),
                          fontWeight: "bold",
                        }}
                      />
                    ))}
                  </Stack>
                ) : (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 0.5 }}
                  >
                    N/A
                  </Typography>
                )}
              </Box>

              {/* Mediums Section */}
              <Box>
                <Typography
                  variant="caption"
                  fontWeight={700}
                  color="text.secondary"
                  sx={{
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    display: "block",
                  }}
                >
                  Mediums Used
                </Typography>
                {mediumsList.length > 0 ? (
                  <Stack
                    direction="row"
                    flexWrap="wrap"
                    gap={0.8}
                    sx={{ mt: 1 }}
                  >
                    {mediumsList.map((m) => (
                      <Chip
                        key={`medium-${formatAndCapitalize(m)}`}
                        label={formatAndCapitalize(m)}
                        size="small"
                        variant="outlined"
                        sx={{
                          borderRadius: 999,
                          fontSize: "0.75rem",
                          backgroundColor: "theme.palette.background.chip",
                          fontWeight: "bold",
                        }}
                      />
                    ))}
                  </Stack>
                ) : (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 0.5 }}
                  >
                    N/A
                  </Typography>
                )}
              </Box>

              {/* Detected Features Section */}
              <Box>
                <Typography
                  variant="caption"
                  fontWeight={700}
                  color="text.secondary"
                  sx={{
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    display: "block",
                  }}
                >
                  Detected Features
                </Typography>
                {featuresList.length > 0 ? (
                  <Stack
                    direction="row"
                    flexWrap="wrap"
                    gap={0.8}
                    sx={{ mt: 1 }}
                  >
                    {featuresList.map((f) => (
                      <Chip
                        key={`feature-${formatAndCapitalize(f)}`}
                        label={formatAndCapitalize(f)}
                        size="small"
                        variant="outlined"
                        sx={{
                          borderRadius: 999,
                          fontSize: "0.75rem",
                          backgroundColor: "theme.palette.background.chip",
                          fontWeight: "bold",
                        }}
                      />
                    ))}
                  </Stack>
                ) : (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 0.5 }}
                  >
                    N/A
                  </Typography>
                )}
              </Box>
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      <ArtworkReviews artworkId={artwork.artwork_id || artwork.id} />

      <Dialog
        TransitionComponent={Transition}
        open={imageViewerOpen}
        onClose={() => setImageViewerOpen(false)}
        maxWidth="lg"
        fullWidth
        aria-labelledby="artwork-image-dialog-title"
      >
        <DialogTitle
          id="artwork-image-dialog-title"
          sx={{
            position: "relative",
            px: { xs: 2, sm: 3 },
            py: 2.5,
            color: "text.primary",
            fontSize: { xs: 15, sm: 16 },
            fontWeight: 700,
          }}
        >
          <IconButton
            onClick={() => setImageViewerOpen(false)}
            aria-label="Close artwork image"
            sx={{
              position: "absolute",
              top: "50%",
              right: 8,
              transform: "translateY(-50%)",
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            p: { xs: 1, sm: 2 },
            overflow: "hidden",
          }}
        >
          <WatermarkedArtworkImage
            image={artwork.image || imageUrl}
            alt={artwork.title}
            variant="web"
            hideWhenBlurred
            sx={{
              display: "block",
              maxWidth: "100%",
              maxHeight: "calc(100vh - 140px)",
              objectFit: "contain",
            }}
          />
        </DialogContent>
      </Dialog>

      {similarArtworks.length > 0 && (
        <Box
          component="section"
          aria-labelledby="similar-artworks-title"
          sx={{ mt: 10 }}
        >
          <Typography
            id="similar-artworks-title"
            variant="h5"
            fontWeight={700}
            mb={3}
          >
            Similar artworks
          </Typography>

          <Grid container spacing={3}>
            {similarArtworks.map((item) => (
              <Grid
                size={{ xs: 12, sm: 6, md: 3 }}
                key={item.id || item.artwork_id}
              >
                <ArtworkCard artwork={item} onAddToCart={handleAddToCart} />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
      <RelatedArtists
        artists={relatedArtists}
        eyebrow="Similar style and medium"
        description="Discover artists whose artworks share this artwork’s style or medium. Artists matching both appear first."
      />
      {/* Snackbar Notification */}
      <Snackbar
        open={snackbarOpen}
        severity={snackbarSeverity}
        variant="filled"
        autoHideDuration={3000}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        TransitionComponent={Transition}
      >
        <Alert
          onClose={closeSnackbar}
          severity={snackbarSeverity}
          sx={{
            width: "100%",
            backgroundColor: getSeverityColor(snackbarSeverity),
            color: "#fff",
            "& .MuiAlert-icon": { color: "#fff" },
          }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
}

function Row({ label, value }) {
  return (
    <Stack
      direction="row"
      justifyContent="space-between"
      alignItems="center"
      columnGap={{ xs: 2, sm: 3 }}
    >
      <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>
        {label}
      </Typography>

      <Typography variant="body2" fontWeight={500} sx={{ textAlign: "right", minWidth: 0, overflowWrap: "anywhere" }}>
        {value || "-"}
      </Typography>
    </Stack>
  );
}
