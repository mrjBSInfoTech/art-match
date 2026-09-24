import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  Chip,
  CircularProgress,
  Grid,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { fetchArtworks } from "../../api/seller/artworkAPI";
import ArtworkInfo from "../../components/seller/Artwork/ArtworkInfo";

const defaultSettings = {
  shopName: "Nexus Studio",
  shopDescription:
    "Contemporary works shaped by memory, texture, and experimentation.",
  shopStatus: true,
  autoAcceptOrders: true,
  orderAlertEmail: true,
  orderAlertSms: false,
  payoutMethod: "GCash",
  shippingDefault: "Standard",
  pickupEnabled: true,
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

export default function Storefront() {
  const theme = useTheme();
  const [settings, setSettings] = useState(defaultSettings);
  const [artworks, setArtworks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pinnedArtworkIds, setPinnedArtworkIds] = useState([]);
  const [selectedArtwork, setSelectedArtwork] = useState(null);

  useEffect(() => {
    const savedSettings = localStorage.getItem("seller_settings");
    if (savedSettings) {
      try {
        setSettings({ ...defaultSettings, ...JSON.parse(savedSettings) });
      } catch {
        setSettings(defaultSettings);
      }
    } else {
      const storedName = localStorage.getItem("seller_shop_name");
      const storedDescription = localStorage.getItem("seller_shop_description");
      setSettings((current) => ({
        ...current,
        shopName: storedName || defaultSettings.shopName,
        shopDescription: storedDescription || defaultSettings.shopDescription,
      }));
    }

    const storedPinned = localStorage.getItem("seller_pinned_artworks");
    if (storedPinned) {
      try {
        setPinnedArtworkIds(JSON.parse(storedPinned));
      } catch {
        setPinnedArtworkIds([]);
      }
    }
  }, []);

  useEffect(() => {
    const loadArtworks = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await fetchArtworks();
        const data = Array.isArray(response)
          ? response
          : response?.data && Array.isArray(response.data)
            ? response.data
            : [];
        setArtworks(data);
      } catch (err) {
        setArtworks([]);
        setError(err?.message || "Failed to load artworks.");
      } finally {
        setLoading(false);
      }
    };

    loadArtworks();
  }, []);

  const handleToggle = (field) => {
    setSettings((current) => ({ ...current, [field]: !current[field] }));
  };

  const saveSettings = () => {
    localStorage.setItem("seller_settings", JSON.stringify(settings));
    localStorage.setItem("seller_shop_name", settings.shopName);
    localStorage.setItem("seller_shop_description", settings.shopDescription);
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
    localStorage.removeItem("seller_settings");
    localStorage.setItem("seller_shop_name", defaultSettings.shopName);
    localStorage.setItem(
      "seller_shop_description",
      defaultSettings.shopDescription,
    );
  };

  const handlePinToggle = (artworkId) => {
    setPinnedArtworkIds((current) => {
      const next = current.includes(artworkId)
        ? current.filter((id) => id !== artworkId)
        : [...current, artworkId];

      localStorage.setItem("seller_pinned_artworks", JSON.stringify(next));
      return next;
    });
  };

  const getArtworkImageUrl = (artwork) => {
    const imageName = artwork?.image || artwork?.image_url;

    if (!imageName) {
      return "https://placehold.co/1200x900/111827/ffffff?text=Artwork";
    }

    if (imageName.startsWith("http://") || imageName.startsWith("https://")) {
      return imageName;
    }

    return `http://localhost:5000/uploads/seller/uploadArtwork/${encodeURIComponent(imageName)}`;
  };

  return (
    <Box
      sx={{
        p: { xs: 1.5, sm: 2.5 },
        minHeight: "100vh",
        backgroundColor: theme.palette.background.default,
      }}
    >
      <Helmet titleTemplate="%s - ArtMatch">
        <title>Storefront</title>
      </Helmet>

      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            Storefront
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage your shop profile and choose which artworks to pin on your
            storefront.
          </Typography>
        </Box>

        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, md: 3 },
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 3,
          }}
        >
          <Stack spacing={3}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                Shop profile
              </Typography>

              <Stack spacing={2} sx={{ maxWidth: 520 }}>
                <TextField
                  fullWidth
                  label="Shop name"
                  value={settings.shopName}
                  onChange={(e) =>
                    setSettings((current) => ({
                      ...current,
                      shopName: e.target.value,
                    }))
                  }
                />

                <TextField
                  fullWidth
                  multiline
                  minRows={3}
                  label="Shop description"
                  value={settings.shopDescription}
                  onChange={(e) =>
                    setSettings((current) => ({
                      ...current,
                      shopDescription: e.target.value,
                    }))
                  }
                />
              </Stack>
            </Box>

            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
              <Button
                variant="contained"
                sx={{
                  color: "#fff",
                  bgcolor: "#1e1f87",
                  textTransform: "none",
                  fontWeight: "bold",
                  boxShadow: "none",
                  "&:hover": { bgcolor: "#151663" },
                }}
                onClick={saveSettings}
              >
                Save changes
              </Button>

              <Button
                color="text.secondary"
                sx={{ px: 3, textTransform: "none" }}
                onClick={resetSettings}
              >
                Reset
              </Button>
            </Box>
          </Stack>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, md: 3 },
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 3,
          }}
        >
          <Stack spacing={2.5}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 2,
                flexWrap: "wrap",
              }}
            >
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Your artworks
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Pin the pieces you want to feature most prominently.
                </Typography>
              </Box>
              <Chip
                label={`${pinnedArtworkIds.length} pinned`}
                color={pinnedArtworkIds.length > 0 ? "primary" : "default"}
                variant={pinnedArtworkIds.length > 0 ? "filled" : "outlined"}
              />
            </Box>

            {error && (
              <Alert severity="error" sx={{ borderRadius: 2 }}>
                {error}
              </Alert>
            )}

            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                <CircularProgress />
              </Box>
            ) : artworks.length > 0 ? (
              <Grid container spacing={2}>
                {artworks.map((artwork) => {
                  const artworkId = artwork.artwork_id || artwork.id;
                  const isPinned = pinnedArtworkIds.includes(artworkId);

                  return (
                    <Grid item xs={12} sm={6} md={4} key={artworkId}>
                      <Card
                        variant="outlined"
                        sx={{
                          height: "100%",
                          borderRadius: 3,
                          overflow: "hidden",
                          borderColor: isPinned ? "primary.main" : "divider",
                          boxShadow: isPinned ? 2 : 0,
                        }}
                      >
                        <CardMedia
                          component="img"
                          image={getArtworkImageUrl(artwork)}
                          alt={artwork.title || "Artwork"}
                          onError={(event) => {
                            event.currentTarget.src =
                              "https://placehold.co/1200x900/111827/ffffff?text=Artwork";
                          }}
                          sx={{ height: 220, objectFit: "cover" }}
                        />

                        <CardContent sx={{ pb: 1.5 }}>
                          <Stack
                            direction="row"
                            justifyContent="space-between"
                            alignItems="center"
                            spacing={1}
                          >
                            <Typography variant="h6" sx={{ fontWeight: 700 }}>
                              {artwork.title || "Untitled artwork"}
                            </Typography>
                            {isPinned && (
                              <Chip
                                label="Pinned"
                                size="small"
                                color="primary"
                              />
                            )}
                          </Stack>

                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ mt: 1 }}
                          >
                            {artwork.genre || "General"}
                          </Typography>

                          <Typography
                            variant="h6"
                            sx={{ mt: 1.5, fontWeight: 800 }}
                          >
                            {formatCurrency(artwork.price)}
                          </Typography>

                          <Stack spacing={1} sx={{ mt: 2 }}>
                            <Button
                              fullWidth
                              variant="outlined"
                              sx={{
                                textTransform: "none",
                                fontWeight: 700,
                              }}
                              onClick={() => setSelectedArtwork(artwork)}
                            >
                              View info
                            </Button>

                            <Button
                              fullWidth
                              variant={isPinned ? "contained" : "outlined"}
                              color={isPinned ? "primary" : "inherit"}
                              sx={{
                                textTransform: "none",
                                fontWeight: 700,
                              }}
                              onClick={() => handlePinToggle(artworkId)}
                            >
                              {isPinned ? "Unpin artwork" : "Pin to storefront"}
                            </Button>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            ) : (
              <Box
                sx={{
                  border: "1px dashed",
                  borderColor: "divider",
                  borderRadius: 3,
                  p: 4,
                  textAlign: "center",
                }}
              >
                <Typography variant="h6">No artwork found</Typography>
                <Typography color="text.secondary">
                  Upload an artwork to start building your storefront.
                </Typography>
              </Box>
            )}
          </Stack>
        </Paper>
      </Stack>

      <ArtworkInfo
        open={Boolean(selectedArtwork)}
        handleClose={() => setSelectedArtwork(null)}
        selectedArtwork={selectedArtwork}
        canEdit={false}
      />
    </Box>
  );
}
