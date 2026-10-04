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
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { fetchArtworks } from "../../api/seller/artworkAPI";
import {
  fetchStorefront,
  saveStorefront,
} from "../../api/seller/storefrontAPI";
import ArtworkInfo from "../../components/seller/Artwork/ArtworkInfo";

const defaultSettings = {
  shopName: "",
  shopDescription: "",
  specialties: [],
  customSpecialty: "",
  shopStatus: true,
  autoAcceptOrders: true,
  orderAlertEmail: true,
  orderAlertSms: false,
  payoutMethod: "GCash",
  shippingDefault: "Standard",
  pickupEnabled: true,
};

const specialtyOptions = [
  "Oil Painting",
  "Acrylic Painting",
  "Watercolor",
  "Landscape",
  "Portrait",
  "Abstract",
  "Impressionism",
  "Still Life",
  "Mixed Media",
  "Surrealism",
  "Digital Art",
  "Minimalism",
];

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

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

const getSavedSpecialties = (response) => {
  if (!Object.hasOwn(response || {}, "specialties")) {
    throw new Error(
      "The server did not return saved specialties. Restart the backend and try again.",
    );
  }
  return parseArray(response.specialties);
};

export default function Storefront() {
  const theme = useTheme();
  const [settings, setSettings] = useState(defaultSettings);
  const [artworks, setArtworks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [pinnedArtworkIds, setPinnedArtworkIds] = useState([]);
  const [savingPinId, setSavingPinId] = useState(null);
  const [savingSpecialties, setSavingSpecialties] = useState(false);
  const [selectedArtwork, setSelectedArtwork] = useState(null);

  const selectedSpecialties = settings.specialties || [];
  const customSpecialtyLimitReached = selectedSpecialties.length >= 3;

  const saveSpecialties = async (nextSpecialties) => {
    if (savingSpecialties) return false;
    const previousSpecialties = selectedSpecialties;

    setSavingSpecialties(true);
    setError("");
    setSettings((current) => ({ ...current, specialties: nextSpecialties }));
    try {
      const saved = await saveStorefront({ specialties: nextSpecialties });
    const savedSpecialties = getSavedSpecialties(saved);
      setSettings((current) => ({
        ...current,
        specialties: savedSpecialties,
      }));
      setSuccessMessage("Specialties updated.");
      return true;
    } catch (err) {
      setSettings((current) => ({
        ...current,
        specialties: previousSpecialties,
      }));
      setError(err.message || "Unable to save specialties.");
      return false;
    } finally {
      setSavingSpecialties(false);
    }
  };

  const handleSpecialtyToggle = (specialty) => {
    if (savingSpecialties) return;
    const alreadySelected = selectedSpecialties.includes(specialty);
    if (!alreadySelected && customSpecialtyLimitReached) return;

    const nextSpecialties = alreadySelected
      ? selectedSpecialties.filter((item) => item !== specialty)
      : [...selectedSpecialties, specialty];
    saveSpecialties(nextSpecialties);
  };

  const handleAddCustomSpecialty = () => {
    const value = settings.customSpecialty.trim();

    if (!value || customSpecialtyLimitReached) {
      return;
    }

    const normalized = value.replace(/\s+/g, " ");

    if (
      selectedSpecialties.some(
        (item) => item.toLocaleLowerCase() === normalized.toLocaleLowerCase(),
      )
    ) {
      setError("That specialty has already been selected.");
      return;
    }

    saveSpecialties([...selectedSpecialties, normalized]).then((saved) => {
      if (saved) {
        setSettings((current) => ({ ...current, customSpecialty: "" }));
      }
    });
  };

  useEffect(() => {
    const loadSavedStorefront = async () => {
      let legacySettings = defaultSettings;
      try {
        const savedSettings = localStorage.getItem("seller_settings");
        if (savedSettings) {
          legacySettings = { ...defaultSettings, ...JSON.parse(savedSettings) };
          setSettings(legacySettings);
        }
      } catch (err) {
        console.warn("Unable to read saved storefront settings:", err.message);
      }

      const legacyPinnedArtworkIds = parseArray(
        localStorage.getItem("seller_pinned_artworks"),
      ).map(String);

      try {
        const storefront = await fetchStorefront();
        const specialties =
          storefront?.specialties != null
            ? parseArray(storefront.specialties)
            : legacySettings.specialties || [];
        const savedPinnedArtworkIds =
          storefront?.pinned_artwork_ids != null
            ? parseArray(storefront.pinned_artwork_ids).map(String)
            : legacyPinnedArtworkIds;
        const shopName = storefront?.shop_name || legacySettings.shopName || "";
        const shopDescription =
          storefront?.shop_description ||
          legacySettings.shopDescription ||
          "";

        setSettings((current) => ({
          ...current,
          shopName,
          shopDescription,
          specialties,
        }));
        setPinnedArtworkIds(savedPinnedArtworkIds);

        const hasLegacyStorefrontSettings =
          storefront?.specialties == null &&
          specialties.length > 0;
        const hasLegacyPinnedArtworks =
          storefront?.pinned_artwork_ids == null &&
          savedPinnedArtworkIds.length > 0;
        if (hasLegacyStorefrontSettings || hasLegacyPinnedArtworks) {
          const migrated = await saveStorefront({
            shop_name: shopName,
            shop_description: shopDescription,
            specialties,
            pinned_artwork_ids: savedPinnedArtworkIds,
          });
          getSavedSpecialties(migrated);
        }
        localStorage.removeItem("seller_pinned_artworks");
      } catch (err) {
        setError(err.message || "Unable to load storefront profile.");
      }
    };

    loadSavedStorefront();
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

  const saveSettings = async () => {
    try {
      setError("");
      const saved = await saveStorefront({
        shop_name: settings.shopName.trim(),
        shop_description: settings.shopDescription.trim(),
        specialties: settings.specialties || [],
        pinned_artwork_ids: pinnedArtworkIds.map(Number),
      });

      const nextSettings = {
        ...settings,
        specialties: settings.specialties || [],
        customSpecialty: settings.customSpecialty || "",
      };

      localStorage.setItem("seller_settings", JSON.stringify(nextSettings));
      localStorage.setItem(
        "seller_shop_name",
        saved?.shop_name || settings.shopName,
      );
      localStorage.setItem(
        "seller_shop_description",
        saved?.shop_description || settings.shopDescription,
      );

      setSettings((current) => ({
        ...current,
        shopName: saved?.shop_name || current.shopName,
        shopDescription: saved?.shop_description || current.shopDescription,
        specialties: saved?.specialties || current.specialties,
      }));
      setPinnedArtworkIds(
        (saved?.pinned_artwork_ids || pinnedArtworkIds).map(String),
      );
      setSuccessMessage("Storefront updated successfully.");
    } catch (err) {
      setError(err.message || "Unable to save storefront details.");
    }
  };

  const resetSettings = async () => {
    try {
      setError("");
      await saveStorefront({
        shop_name: "",
        shop_description: "",
        specialties: [],
        pinned_artwork_ids: [],
      });
      setSettings(defaultSettings);
      setPinnedArtworkIds([]);
      localStorage.removeItem("seller_settings");
      localStorage.removeItem("seller_pinned_artworks");
      localStorage.removeItem("seller_shop_name");
      localStorage.removeItem("seller_shop_description");
      setSuccessMessage("Storefront reset successfully.");
    } catch (err) {
      setError(err.message || "Unable to reset storefront details.");
    }
  };

  const handlePinToggle = async (artworkId) => {
    if (savingPinId !== null) return;
    const normalizedId = String(artworkId);
    const next = pinnedArtworkIds.includes(normalizedId)
      ? pinnedArtworkIds.filter((id) => id !== normalizedId)
      : [...pinnedArtworkIds, normalizedId];

    try {
      setSavingPinId(normalizedId);
      setError("");
      const saved = await saveStorefront({
        shop_name: settings.shopName.trim(),
        shop_description: settings.shopDescription.trim(),
        specialties: settings.specialties || [],
        pinned_artwork_ids: next.map(Number),
      });
      setPinnedArtworkIds(
        (saved?.pinned_artwork_ids || next).map(String),
      );
      setSuccessMessage("Pinned artworks updated.");
    } catch (err) {
      setError(err.message || "Unable to update pinned artworks.");
    } finally {
      setSavingPinId(null);
    }
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
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Achievements
          </Typography>
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
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            Specialties
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Choose up to 3 art styles that best describe your work.
          </Typography>

          <Stack spacing={2}>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {specialtyOptions.map((tag) => {
                const isSelected = selectedSpecialties.includes(tag);

                return (
                  <Chip
                    key={tag}
                    label={tag}
                    size="small"
                    clickable
                    onClick={() => handleSpecialtyToggle(tag)}
                    color={isSelected ? "primary" : "default"}
                    variant={isSelected ? "filled" : "outlined"}
                    disabled={
                      savingSpecialties ||
                      (!isSelected && customSpecialtyLimitReached)
                    }
                    sx={{
                      fontWeight: 700,
                      borderRadius: 999,
                    }}
                  />
                );
              })}
            </Stack>

            <Box
              sx={{
                display: "flex",
                gap: 1,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <TextField
                size="small"
                value={settings.customSpecialty || ""}
                onChange={(e) =>
                  setSettings((current) => ({
                    ...current,
                    customSpecialty: e.target.value,
                  }))
                }
                placeholder="Add custom art style"
                sx={{ flex: 1, minWidth: 220 }}
                disabled={savingSpecialties}
              />

              <Button
                variant="contained"
                size="small"
                disabled={
                  savingSpecialties ||
                  !settings.customSpecialty?.trim() ||
                  customSpecialtyLimitReached
                }
                onClick={handleAddCustomSpecialty}
                sx={{
                  textTransform: "none",
                  fontWeight: 700,
                  borderRadius: 2,
                }}
              >
                Add
              </Button>
            </Box>

            {selectedSpecialties.length > 0 && (
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {selectedSpecialties.map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    onDelete={() => handleSpecialtyToggle(tag)}
                    color="primary"
                    disabled={savingSpecialties}
                    sx={{
                      fontWeight: 700,
                      borderRadius: 999,
                    }}
                  />
                ))}
              </Stack>
            )}

            <Typography variant="caption" color="text.secondary">
              {customSpecialtyLimitReached
                ? "You have reached the maximum of 3 styles."
                : `${3 - selectedSpecialties.length} style slots remaining.`}
            </Typography>
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
                  const artworkId = String(
                    artwork.artwork_id || artwork.id,
                  );
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

      <Snackbar
        open={Boolean(successMessage)}
        autoHideDuration={4000}
        onClose={() => setSuccessMessage("")}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSuccessMessage("")}
          severity="success"
          variant="filled"
          sx={{ width: "100%" }}
        >
          {successMessage}
        </Alert>
      </Snackbar>

      <ArtworkInfo
        open={Boolean(selectedArtwork)}
        handleClose={() => setSelectedArtwork(null)}
        selectedArtwork={selectedArtwork}
        canEdit={false}
      />
    </Box>
  );
}
