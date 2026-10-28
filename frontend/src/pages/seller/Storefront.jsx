import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Rating,
  Snackbar,
  Slide,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import { fetchArtworks } from "../../api/seller/artworkAPI";
import { getSellerProfile } from "../../api/seller/sellerAPI";
import { fetchSellerReviews } from "../../api/seller/reviewsAPI";
import {
  fetchStorefront,
  saveStorefront,
} from "../../api/seller/storefrontAPI";
import StorefrontCard from "../../components/seller/Storefront/StorefrontCard";
import { ART_2D_MATERIALS, ART_STYLES } from "../../constants/artworkOptions";

function SlideTransition(props) {
  return <Slide {...props} direction="up" />;
}

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

const specialtyOptions = [...new Set([
  ...ART_2D_MATERIALS.map((material) => `${material} Painting`),
  ...ART_STYLES,
])];

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

const getProfileImage = (profileImage) => {
  if (!profileImage) return "http://localhost:5000/uploads/seller/profile.jpg";
  if (profileImage.startsWith("http")) return profileImage;
  return `http://localhost:5000/uploads/seller/uploadProfile/${encodeURIComponent(profileImage)}`;
};

export default function Storefront() {
  const theme = useTheme();
  const navigate = useNavigate();
  const [settings, setSettings] = useState(defaultSettings);
  const [artworks, setArtworks] = useState([]);
  const [sellerProfile, setSellerProfile] = useState({
    first_name: localStorage.getItem("seller_first_name") || "",
    middle_name: localStorage.getItem("seller_middle_name") || "",
    last_name: localStorage.getItem("seller_last_name") || "",
    course: localStorage.getItem("seller_course") || "",
    profile_image: localStorage.getItem("seller_profile_image") || "",
    registered_date: localStorage.getItem("seller_registered_date") || "",
  });
  const [profileError, setProfileError] = useState("");
  const [sellerReviews, setSellerReviews] = useState([]);
  const [reviewsError, setReviewsError] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");
  const [pinnedArtworkIds, setPinnedArtworkIds] = useState([]);
  const [savingPinId, setSavingPinId] = useState(null);
  const [savingSpecialties, setSavingSpecialties] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [specialtyDialogOpen, setSpecialtyDialogOpen] = useState(false);
  const [draftSpecialties, setDraftSpecialties] = useState([]);
  const [customSpecialty, setCustomSpecialty] = useState("");
  const visiblePinnedCount = artworks.filter((artwork) =>
    pinnedArtworkIds.includes(String(artwork.artwork_id ?? artwork.id)),
  ).length;
  const artistName = [
    sellerProfile.first_name,
    sellerProfile.middle_name,
    sellerProfile.last_name,
  ].filter(Boolean).join(" ") || "Your artist name";
  const averageRating = sellerReviews.length
    ? sellerReviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) /
      sellerReviews.length
    : null;
  const memberDate = sellerProfile.registered_date
    ? new Date(sellerProfile.registered_date)
    : null;
  const memberSince =
    memberDate && !Number.isNaN(memberDate.getTime())
      ? memberDate.toLocaleDateString("en", {
          month: "long",
          year: "numeric",
        })
      : "Not available";

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
      case "error":
        return "error.light";
      default:
        return "primary.light";
    }
  };

  const selectedSpecialties = settings.specialties || [];

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
      showSnackbar("Specialties updated.");
      return true;
    } catch (err) {
      setSettings((current) => ({
        ...current,
        specialties: previousSpecialties,
      }));
      showSnackbar(err.message || "Unable to save specialties.", "error");
      return false;
    } finally {
      setSavingSpecialties(false);
    }
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
        setArtworks(data.filter((artwork) =>
          ["verified", "approved"].includes(
            String(artwork.request_status ?? artwork.status ?? "").trim().toLowerCase(),
          ),
        ));
      } catch (err) {
        setArtworks([]);
        setError(err?.message || "Failed to load artworks.");
      } finally {
        setLoading(false);
      }
    };

    loadArtworks();
  }, []);

  useEffect(() => {
    let active = true;

    getSellerProfile()
      .then((profile) => {
        if (!active) return;
        setSellerProfile((current) => ({ ...current, ...profile }));
        setProfileError("");
      })
      .catch((err) => {
        if (active) {
          setProfileError(err.message || "Unable to load account profile details.");
        }
      });

    fetchSellerReviews()
      .then((reviews) => {
        if (active) {
          setSellerReviews(Array.isArray(reviews) ? reviews : []);
          setReviewsError("");
        }
      })
      .catch((err) => {
        if (active) {
          setReviewsError(err.message || "Unable to load seller ratings.");
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const saveSettings = async () => {
    if (savingProfile) return;
    try {
      setSavingProfile(true);
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
      showSnackbar("Storefront updated successfully.");
    } catch (err) {
      showSnackbar(err.message || "Unable to save storefront details.", "error");
    } finally {
      setSavingProfile(false);
    }
  };

  const openSpecialtyDialog = () => {
    setDraftSpecialties([...selectedSpecialties]);
    setCustomSpecialty("");
    setSpecialtyDialogOpen(true);
  };

  const toggleDraftSpecialty = (specialty) => {
    setDraftSpecialties((current) => {
      if (current.includes(specialty)) {
        return current.filter((item) => item !== specialty);
      }
      if (current.length >= 3) return current;
      return [...current, specialty];
    });
  };

  const addDraftSpecialty = () => {
    const normalized = customSpecialty.trim().replace(/\s+/g, " ");
    if (!normalized) return;
    if (draftSpecialties.length >= 3) {
      showSnackbar("You can select up to 3 specialties.", "error");
      return;
    }
    if (
      draftSpecialties.some(
        (item) => item.toLocaleLowerCase() === normalized.toLocaleLowerCase(),
      )
    ) {
      showSnackbar("That specialty has already been selected.", "error");
      return;
    }
    setDraftSpecialties((current) => [...current, normalized]);
    setCustomSpecialty("");
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
      showSnackbar("Storefront reset successfully.");
    } catch (err) {
      showSnackbar(err.message || "Unable to reset storefront details.", "error");
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
      showSnackbar("Pinned artworks updated.");
    } catch (err) {
      showSnackbar(err.message || "Unable to update pinned artworks.", "error");
    } finally {
      setSavingPinId(null);
    }
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
            Store Profile
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Edit how your artist profile appears to buyers and choose which
            verified artworks to feature.
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
          <Stack spacing={2.5}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              alignItems={{ xs: "stretch", sm: "flex-start" }}
              justifyContent="space-between"
              spacing={1}
            >
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Public profile preview
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Preview updates as you edit your shop name, description, and specialties.
                </Typography>
              </Box>
              <Button
                color="error"
                size="small"
                onClick={resetSettings}
                sx={{
                  alignSelf: { xs: "flex-end", sm: "flex-start" },
                  textTransform: "none",
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                }}
              >
                Reset Store Profile
              </Button>
            </Stack>

            {profileError && (
              <Alert severity="warning">
                {profileError} Showing saved account details where available.
              </Alert>
            )}

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "minmax(0, 2fr) minmax(240px, 1fr)" },
                gap: 2,
              }}
            >
              <Paper
                variant="outlined"
                sx={{
                  p: { xs: 2, sm: 3 },
                  borderRadius: 3,
                  display: "flex",
                  gap: { xs: 2, sm: 3 },
                  flexDirection: { xs: "column", sm: "row" },
                  alignItems: { xs: "center", sm: "flex-start" },
                  textAlign: { xs: "center", sm: "left" },
                  minWidth: 0,
                }}
              >
                <Avatar
                  src={getProfileImage(sellerProfile.profile_image)}
                  alt={artistName}
                  sx={{
                    width: { xs: 96, sm: 120 },
                    height: { xs: 96, sm: 120 },
                    border: "2px solid",
                    borderColor: "divider",
                    flexShrink: 0,
                  }}
                />
                <Stack spacing={1.25} sx={{ minWidth: 0, flex: 1 }}>
                  <Box>
                    <TextField
                      fullWidth
                      variant="standard"
                      label="Shop name"
                      placeholder={artistName}
                      value={settings.shopName}
                      onChange={(event) =>
                        setSettings((current) => ({
                          ...current,
                          shopName: event.target.value,
                        }))
                      }
                      inputProps={{ "aria-label": "Shop name" }}
                      sx={{
                        "& .MuiInputBase-input": {
                          fontSize: { xs: "1.5rem", sm: "2rem" },
                          fontWeight: 800,
                          lineHeight: 1.2,
                        },
                      }}
                    />
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ textTransform: "uppercase", letterSpacing: ".04em" }}
                    >
                      {sellerProfile.course || "Course not set"}
                    </Typography>
                  </Box>

                  {reviewsError ? (
                    <Typography variant="body2" color="text.secondary">
                      Rating unavailable
                    </Typography>
                  ) : averageRating === null ? (
                    <Typography variant="body2" color="text.secondary">
                      No reviews yet
                    </Typography>
                  ) : (
                    <Stack
                      direction="row"
                      alignItems="center"
                      justifyContent={{ xs: "center", sm: "flex-start" }}
                      spacing={0.75}
                    >
                      <Rating value={averageRating} precision={0.1} readOnly size="small" />
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {averageRating.toFixed(1)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        ({sellerReviews.length} {sellerReviews.length === 1 ? "review" : "reviews"})
                      </Typography>
                    </Stack>
                  )}

                  <TextField
                    fullWidth
                    multiline
                    minRows={3}
                    variant="outlined"
                    label="Description"
                    placeholder="Tell buyers about your art and your shop."
                    value={settings.shopDescription}
                    onChange={(event) =>
                      setSettings((current) => ({
                        ...current,
                        shopDescription: event.target.value,
                      }))
                    }
                    sx={{
                      "& .MuiInputBase-root": { lineHeight: 1.65 },
                    }}
                  />

                  <Stack
                    direction="row"
                    spacing={3}
                    justifyContent={{ xs: "center", sm: "flex-start" }}
                  >
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                        {artworks.length}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Verified artworks
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                        {visiblePinnedCount}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Featured
                      </Typography>
                    </Box>
                  </Stack>
                  <Button
                    variant="contained"
                    onClick={saveSettings}
                    disabled={savingProfile}
                    sx={{
                      alignSelf: { xs: "stretch", sm: "flex-start" },
                      mt: 0.5,
                      textTransform: "none",
                      fontWeight: 700,
                      boxShadow: "none",
                    }}
                  >
                    {savingProfile ? "Saving..." : "Save profile"}
                  </Button>
                </Stack>
              </Paper>

              <Stack spacing={2}>
                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                    Artist details
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Member since
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 1.5 }}>
                    {memberSince}
                  </Typography>
                  <Button
                    size="small"
                    onClick={() => navigate("/seller/settings")}
                    sx={{ px: 0, textTransform: "none", fontWeight: 700 }}
                  >
                    Edit photo and account details
                  </Button>
                </Paper>

                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    spacing={1}
                    sx={{ mb: 1.25 }}
                  >
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      Specialties
                    </Typography>
                    <Button
                      size="small"
                      onClick={openSpecialtyDialog}
                      sx={{ textTransform: "none", fontWeight: 700 }}
                    >
                      Edit
                    </Button>
                  </Stack>
                  {settings.specialties.length ? (
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {settings.specialties.map((specialty) => (
                        <Chip key={specialty} label={specialty} size="small" />
                      ))}
                    </Stack>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Your selected specialties will appear here.
                    </Typography>
                  )}
                </Paper>
              </Stack>
            </Box>
          </Stack>
        </Paper>

        <Dialog
          open={specialtyDialogOpen}
          onClose={() => {
            if (!savingSpecialties) setSpecialtyDialogOpen(false);
          }}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>Edit specialties</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Select up to 3 listed specialties, or add your own.
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
              {specialtyOptions.map((specialty) => {
                const isSelected = draftSpecialties.includes(specialty);
                return (
                  <Chip
                    key={specialty}
                    label={specialty}
                    clickable
                    color={isSelected ? "primary" : "default"}
                    variant={isSelected ? "filled" : "outlined"}
                    disabled={
                      savingSpecialties ||
                      (!isSelected && draftSpecialties.length >= 3)
                    }
                    onClick={() => toggleDraftSpecialty(specialty)}
                  />
                );
              })}
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <TextField
                fullWidth
                size="small"
                label="Custom specialty"
                value={customSpecialty}
                onChange={(event) => setCustomSpecialty(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addDraftSpecialty();
                  }
                }}
                disabled={savingSpecialties || draftSpecialties.length >= 3}
              />
              <Button
                variant="outlined"
                onClick={addDraftSpecialty}
                disabled={
                  savingSpecialties ||
                  !customSpecialty.trim() ||
                  draftSpecialties.length >= 3
                }
              >
                Add
              </Button>
            </Stack>
            {!!draftSpecialties.length && (
              <Stack
                direction="row"
                spacing={1}
                flexWrap="wrap"
                useFlexGap
                sx={{ mt: 2 }}
              >
                {draftSpecialties.map((specialty) => (
                  <Chip
                    key={specialty}
                    label={specialty}
                    color="primary"
                    onDelete={() => toggleDraftSpecialty(specialty)}
                    disabled={savingSpecialties}
                  />
                ))}
              </Stack>
            )}
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>
              {3 - draftSpecialties.length} specialty slots remaining.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={() => setSpecialtyDialogOpen(false)}
              disabled={savingSpecialties}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              disabled={savingSpecialties}
              onClick={async () => {
                const saved = await saveSpecialties(draftSpecialties);
                if (saved) setSpecialtyDialogOpen(false);
              }}
            >
              {savingSpecialties ? "Saving..." : "Save specialties"}
            </Button>
          </DialogActions>
        </Dialog>

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
                  Verified artworks
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Pin verified pieces you want to feature most prominently.
                </Typography>
              </Box>
              <Chip
                label={`${visiblePinnedCount} pinned`}
                color={visiblePinnedCount > 0 ? "primary" : "default"}
                variant={visiblePinnedCount > 0 ? "filled" : "outlined"}
                sx={{color: "text.primary", fontWeight: 700, borderRadius: 999}}
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
              <StorefrontCard
                artworks={artworks}
                pinnedArtworkIds={pinnedArtworkIds}
                savingPinId={savingPinId}
                onPinToggle={handlePinToggle}
              />
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
                <Typography variant="h6">No verified artworks yet</Typography>
                <Typography color="text.secondary">
                  Artworks will appear here after they are verified.
                </Typography>
              </Box>
            )}
          </Stack>
        </Paper>
      </Stack>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        TransitionComponent={SlideTransition}
      >
        <Alert
          onClose={closeSnackbar}
          severity={snackbarSeverity}
          sx={{
            width: "100%",
            backgroundColor: getSeverityColor(snackbarSeverity),
            color: "#fff",
            "& .MuiAlert-icon": {
              color: "#fff",
            },
          }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>


    </Box>
  );
}
