import React, { useState, useEffect } from "react";
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
  Stack,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { fetchArtworks, fetchArtworkById } from "../../api/buyer/artworkAPI";
import { addToCart } from "../../api/buyer/cartAPI";
import ArtworkCard from "../../components/buyer/Artwork/ArtworkCard";
import {
  fetchRecentlyViewedArtworks,
  getRecommendationSessionId,
  recordRecommendationEvent,
} from "../../api/buyer/recommendationAPI";

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
  const [loading, setLoading] = useState(false);
  const [artworkErrorMessage, setArtworkErrorMessage] = useState("");
  const [addingToCart, setAddingToCart] = useState(false);
  const [cartMessage, setCartMessage] = useState("");
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [recentHistory, setRecentHistory] = useState(null);
  const currentRecentHistory = recentHistory && recentHistory.artworkId === id ? recentHistory : null;
  const recentlyViewed = currentRecentHistory?.artworks || [];
  const recentHistoryError = currentRecentHistory?.error || "";

  // Fetch artwork detail and also the list for related items
  useEffect(() => {
    let mounted = true;
    const loadRecentlyViewed = async () => {
      // Tracking and history are optional and must not interrupt the detail page.
      try {
        const customerId = localStorage.getItem("buyer_token") && localStorage.getItem("buyer_customer_id");
        const viewer = customerId ? `buyer-${customerId}` : `guest-${getRecommendationSessionId()}`;
        const viewKey = `recommendation_view_${viewer}_${id}`;
        const now = Date.now();
        const lastView = Number(sessionStorage.getItem(viewKey) || 0);
        if (now - lastView >= 30000) {
          const result = await recordRecommendationEvent({
            event_type: "view",
            artwork_id: Number(id),
            source_page: "artwork_detail",
          });
          if (result?.duplicate || (result?.recorded && result.interaction_id != null)) {
            sessionStorage.setItem(viewKey, String(now));
          }
        }
      } catch {
        // Storage restrictions should not prevent loading server-side history.
      }
      if (!mounted) return;
      try {
        const items = await fetchRecentlyViewedArtworks(id);
        if (mounted) setRecentHistory({ artworkId: id, artworks: items, error: "" });
      } catch {
        if (mounted) setRecentHistory({ artworkId: id, artworks: [], error: "Recently viewed artworks could not be loaded." });
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

  const imageUrl = artwork.image
    ? artwork.image.startsWith("http")
      ? artwork.image
      : `http://localhost:5000/uploads/seller/uploadArtwork/${encodeURIComponent(artwork.image)}`
    : "https://via.placeholder.com/600x800?text=No+Image";

  const related = artworks
    .filter(
      (a) =>
        a.genre === artwork.genre &&
        (a.id || a.artwork_id) !== (artwork.id || artwork.artwork_id),
    )
    .slice(0, 4);

  const sameArtist = artworks
    .filter(
      (a) =>
        a.artist === artwork.artist &&
        (a.id || a.artwork_id) !== (artwork.id || artwork.artwork_id),
    )
    .slice(0, 4);

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 8 } }}>
      <Grid container spacing={{ xs: 4, md: 6 }} alignItems="stretch">
        <Grid item xs={12} md={7}>
          <Box
            component="img"
            src={imageUrl}
            alt={artwork.title}
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

        <Grid item xs={12} md={5}>
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
                <Row label="Genre" value={artwork.genre || "Unknown"} />
              </Stack>
              <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  fullWidth
                  disabled={addingToCart}
                  onClick={async () => {
                    try {
                      setAddingToCart(true);
                      await addToCart(artwork.artwork_id || artwork.id);
                      setCartMessage("Added to cart");
                    } catch {
                      setCartMessage("Unable to add to cart");
                      setTimeout(() => {
                        setCartMessage("");
                      }, 3000);
                    } finally {
                      setAddingToCart(false);
                    }
                  }}
                  sx={{
                    padding: 1,
                    px: 3,
                    borderRadius: 999,
                    fontSize: 10,
                    fontWeight: 600,
                    color: "white",
                  }}
                >
                  {addingToCart ? "Adding..." : cartMessage || "Add to cart"}
                </Button>
              </Stack>
            </Box>
          </Box>
        </Grid>
        <Grid item xs={12}>
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
          <Box
            component="img"
            src={imageUrl}
            alt={artwork.title}
            sx={{
              display: "block",
              maxWidth: "100%",
              maxHeight: "calc(100vh - 140px)",
              objectFit: "contain",
            }}
          />
        </DialogContent>
      </Dialog>

      <Box component="section" aria-labelledby="recently-viewed-title" sx={{ mt: { xs: 5, md: 8 } }}>
        <Typography id="recently-viewed-title" variant="h5" fontWeight={700} mb={3}>
          Recently viewed artworks
        </Typography>
        {!currentRecentHistory ? (
          <Stack direction="row" alignItems="center" spacing={1.5} role="status" sx={{ py: 3 }}>
            <CircularProgress size={22} aria-label="Loading recent history" />
            <Typography color="text.secondary">Loading your recent history...</Typography>
          </Stack>
        ) : recentHistoryError ? (
          <Alert severity="error">{recentHistoryError}</Alert>
        ) : recentlyViewed.length > 0 ? (
          <Grid container spacing={3}>
            {recentlyViewed.map((item) => (
              <Grid size={{ xs: 12, sm: 6, md: 3 }} key={item.artwork_id}>
                <ArtworkCard artwork={item} showAddToCart={false} />
              </Grid>
            ))}
          </Grid>
        ) : (
          <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2 }}>
            <Typography color="text.secondary">
              No other recently viewed artworks yet. Open another artwork to start your history.
            </Typography>
            <Button onClick={() => navigate("/buyer/shop")} sx={{ mt: 1 }}>Browse artworks</Button>
          </Paper>
        )}
      </Box>

      {related.length > 0 && (
        <Box sx={{ mt: 10 }}>
          <Typography variant="h5" fontWeight={700} mb={3}>
            Related Artworks
          </Typography>

          <Grid container spacing={3}>
            {related.map((item) => (
              <Grid
                item
                size={{ xs: 12, sm: 6, md: 3 }}
                key={item.id || item.artwork_id}
              >
                <ArtworkCard artwork={item} />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {sameArtist.length > 0 && (
        <Box sx={{ mt: 10 }}>
          <Typography variant="h5" fontWeight={700} mb={3}>
            More from {artwork.artist}
          </Typography>

          <Grid container spacing={3}>
            {sameArtist.map((item) => (
              <Grid
                item
                size={{ xs: 12, sm: 6, md: 3 }}
                key={item.id || item.artwork_id}
              >
                <ArtworkCard artwork={item} />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}


    </Container>
  );
}

function Row({ label, value }) {
  return (
    <Stack
      direction="row"
      justifyContent="space-between"
      alignItems="center"
      columnGap={{ xs: 25, sm: 50, md: 25, lg: 45, xl: 45 }}
    >
      <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>
        {label}
      </Typography>

      <Typography variant="body2" fontWeight={500} sx={{ textAlign: "right" }}>
        {value || "-"}
      </Typography>
    </Stack>
  );
}
