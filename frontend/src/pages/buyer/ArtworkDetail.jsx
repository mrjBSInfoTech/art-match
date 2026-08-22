import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Grid,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { fetchArtworks, fetchArtworkById } from "../../api/buyer/artworkAPI";
import { addToCart } from "../../api/buyer/cartAPI";
import ArtworkCard from "../../components/buyer/Artwork/ArtworkCard";

export default function ArtworkDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [artworks, setArtworks] = useState([]);
  const [artwork, setArtwork] = useState(null);
  const [loading, setLoading] = useState(false);
  const [artworkErrorMessage, setArtworkErrorMessage] = useState("");
  const [addingToCart, setAddingToCart] = useState(false);
  const [cartMessage, setCartMessage] = useState("");

  // Fetch artwork detail and also the list for related items
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        setArtworkErrorMessage("");

        // fetch detail
        const detail = await fetchArtworkById(id);
        // fetch list for related/same-artist
        const listResp = await fetchArtworks();

        const list = Array.isArray(listResp)
          ? listResp
          : listResp && listResp.data && Array.isArray(listResp.data)
            ? listResp.data
            : [];

        if (!mounted) return;
        setArtworks(list);
        setArtwork(detail || null);
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
          .split(" ")
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
      <Grid container spacing={6} alignItems="stretch">
        <Grid item xs={12} md={7}>
          <Box
            component="img"
            src={imageUrl}
            alt={artwork.title}
            sx={{
              width: 600,
              height: 500,
              borderRadius: "24px",
              objectFit: "cover",
              display: "block",
            }}
          />
        </Grid>

        <Grid item xs={12} md={5}>
          <Box>
            <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
              <Chip
                label={artwork.genre}
                size="small"
                variant="outlined"
                sx={{ fontWeight: "bold", borderRadius: 2, px: 1 }}
              />
            </Stack>
            <Typography variant="h3" fontWeight={800} sx={{ mb: 1 }}>
              {artwork.title}
            </Typography>
            <Typography variant="subtitle2" color="text.secondary">
              By {artwork.artist || "Unknown artist"}
            </Typography>

            <Typography variant="h4" sx={{ mt: 3, mb: 3, fontWeight: 700 }}>
              ₱{Number(artwork.price || 0).toLocaleString()}
            </Typography>

            <Box sx={{ borderTop: "1px solid", borderColor: "divider", pt: 3 }}>
              <Stack spacing={1.5}>
                <Row label="Size" value={artwork.art_size || "Unknown"} />
                <Row label="Genre" value={artwork.genre || "Unknown"} />
              </Stack>
              <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  disabled={addingToCart}
                  onClick={async () => {
                    try {
                      setAddingToCart(true);
                      await addToCart(artwork.artwork_id || artwork.id);
                      setCartMessage("Added to cart");
                    } catch (error) {
                      setCartMessage(error.message || "Unable to add to cart");
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
                  }}
                >
                  {addingToCart ? "Adding..." : cartMessage || "Add to cart"}
                </Button>
              </Stack>
            </Box>
          </Box>
        </Grid>
        <Paper
          variant="outlined"
          sx={{
            mt: 3,
            p: 3,
            borderRadius: 3,
            borderColor: "divider",
            backgroundColor: "#fafafa",
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
                <Stack direction="row" flexWrap="wrap" gap={0.8} sx={{ mt: 1 }}>
                  {colorsList.map((c, i) => (
                    <Chip
                      key={`color-${formatAndCapitalize(c)}`}
                      label={formatAndCapitalize(c)}
                      size="small"
                      variant="outlined"
                      sx={{
                        borderRadius: 999,
                        fontSize: "0.75rem",
                        backgroundColor: "#fff",
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
                <Stack direction="row" flexWrap="wrap" gap={0.8} sx={{ mt: 1 }}>
                  {mediumsList.map((m, i) => (
                    <Chip
                      key={`medium-${formatAndCapitalize(m)}`}
                      label={formatAndCapitalize(m)}
                      size="small"
                      variant="outlined"
                      sx={{
                        borderRadius: 999,
                        fontSize: "0.75rem",
                        backgroundColor: "#fff",
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
                <Stack direction="row" flexWrap="wrap" gap={0.8} sx={{ mt: 1 }}>
                  {featuresList.map((f, i) => (
                    <Chip
                      key={`feature-${formatAndCapitalize(f)}`}
                      label={formatAndCapitalize(f)}
                      size="small"
                      sx={{
                        borderRadius: 999,
                        fontSize: "0.75rem",
                        backgroundColor: "#fff",
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
    <Stack direction="row" justifyContent="space-between" alignItems="center">
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>

      <Typography variant="body2" fontWeight={500}>
        {value || "-"}
      </Typography>
    </Stack>
  );
}
