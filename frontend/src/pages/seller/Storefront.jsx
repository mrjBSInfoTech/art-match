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
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { fetchArtworks } from "../../api/seller/artworkAPI";
import ArtworkInfo from "../../components/seller/Artwork/ArtworkInfo";

const defaultSettings = {
  shopName: "Nexus Studio",
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
      setSettings((current) => ({
        ...current,
        shopName: storedName || defaultSettings.shopName,
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
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
    localStorage.removeItem("seller_settings");
    localStorage.setItem("seller_shop_name", defaultSettings.shopName);
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
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                Shop profile
              </Typography>
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
                sx={{ maxWidth: 420 }}
              />
            </Box>

            <Divider />

            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                Business availability
              </Typography>

              <Stack spacing={2}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.shopStatus}
                      onChange={() => handleToggle("shopStatus")}
                    />
                  }
                  label="Open shop for new orders"
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.autoAcceptOrders}
                      onChange={() => handleToggle("autoAcceptOrders")}
                    />
                  }
                  label="Automatically accept incoming orders"
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.pickupEnabled}
                      onChange={() => handleToggle("pickupEnabled")}
                    />
                  }
                  label="Enable pickup / meet-up option"
                />
              </Stack>
            </Box>

            <Divider />

            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                Fulfillment settings
              </Typography>

              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <FormControl sx={{ minWidth: 220 }}>
                  <InputLabel>Default payout method</InputLabel>
                  <Select
                    label="Default payout method"
                    value={settings.payoutMethod}
                    onChange={(e) =>
                      setSettings((current) => ({
                        ...current,
                        payoutMethod: e.target.value,
                      }))
                    }
                  >
                    <MenuItem value="GCash">GCash</MenuItem>
                    <MenuItem value="Bank Transfer">Bank Transfer</MenuItem>
                    <MenuItem value="PayMaya">PayMaya</MenuItem>
                    <MenuItem value="Cash on Pickup">Cash on Pickup</MenuItem>
                  </Select>
                </FormControl>

                <FormControl sx={{ minWidth: 220 }}>
                  <InputLabel>Default shipping</InputLabel>
                  <Select
                    label="Default shipping"
                    value={settings.shippingDefault}
                    onChange={(e) =>
                      setSettings((current) => ({
                        ...current,
                        shippingDefault: e.target.value,
                      }))
                    }
                  >
                    <MenuItem value="Standard">Standard</MenuItem>
                    <MenuItem value="Express">Express</MenuItem>
                    <MenuItem value="Pickup">Pickup</MenuItem>
                    <MenuItem value="Same Day">Same Day</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
            </Box>

            <Divider />

            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                Alerts & notifications
              </Typography>

              <Stack spacing={2}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.orderAlertEmail}
                      onChange={() => handleToggle("orderAlertEmail")}
                    />
                  }
                  label="Send order alerts via email"
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.orderAlertSms}
                      onChange={() => handleToggle("orderAlertSms")}
                    />
                  }
                  label="Send order alerts via SMS"
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
