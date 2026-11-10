import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
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
import PaletteOutlinedIcon from "@mui/icons-material/PaletteOutlined";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import StorefrontSpecialty from "../../components/seller/Storefront/StorefrontSpecialty";
import { fetchArtworks } from "../../api/seller/artworkAPI";
import { getSellerProfile } from "../../api/seller/sellerAPI";
import { fetchSellerReviews } from "../../api/seller/reviewsAPI";
import {
  fetchStorefront,
  saveStorefront,
} from "../../api/seller/storefrontAPI";
import StorefrontCard from "../../components/seller/Storefront/StorefrontCard";
import { ART_2D_MATERIALS, ART_STYLES } from "../../constants/artworkOptions";
import ConnectionErrorPanel from "../../components/seller/ConnectionErrorPanel";
import SellerLoadingPanel from "../../components/seller/SellerLoadingPanel";

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
    first_name: "",
    middle_name: "",
    last_name: "",
    course: "",
    profile_image: "",
    registered_date: "",
  });
  const [profileError, setProfileError] = useState("");
  const [sellerReviews, setSellerReviews] = useState([]);
  const [reviewsError, setReviewsError] = useState("");
  const [loading, setLoading] = useState(true);
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
      case "error":
        return theme.palette.error.main;
      case "warning":
        return theme.palette.warning.main;
      case "info":
        return theme.palette.info.main;
      default:
        return theme.palette.success.main;
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
      try {
        const [storefront, profile] = await Promise.all([
          fetchStorefront(),
          getSellerProfile(),
        ]);
        setSellerProfile(profile || {});
        const specialties =
          storefront?.specialties != null
            ? parseArray(storefront.specialties)
            : [];
        const savedPinnedArtworkIds =
          storefront?.pinned_artwork_ids != null
            ? parseArray(storefront.pinned_artwork_ids).map(String)
            : [];
        const shopName = storefront?.shop_name || "";
        const shopDescription = storefront?.shop_description || "";

        setSettings((current) => ({
          ...current,
          shopName,
          shopDescription,
          specialties,
        }));
        setPinnedArtworkIds(savedPinnedArtworkIds);

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
      localStorage.removeItem("seller_pinned_artworks");
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

  if (loading && !artworks.length && !settings.shopName) {
    return (
      <SellerLoadingPanel
        title="Storefront"
        subtitle="Customize your shop identity, featured artworks, and artist specialties."
        showMetrics={false}
        showFilters={false}
      />
    );
  }

  if (error && !artworks.length) {
    return (
      <Box sx={{ minWidth: 0 }}>
        <Helmet titleTemplate="%s - ArtMatch">
          <title>Storefront</title>
        </Helmet>
        <ConnectionErrorPanel
          title="Storefront Unavailable"
          message={error}
          onRetry={() => window.location.reload()}
        />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: "100%",
        minWidth: 0,
      }}
    >
      <Helmet titleTemplate="%s - ArtMatch">
        <title>Storefront</title>
      </Helmet>

      <Stack spacing={2.5}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            p: { xs: 2, sm: 2.5 },
            borderRadius: 3,
            color: "#fff",
            background: `linear-gradient(115deg, ${theme.palette.error.dark} 0%, ${theme.palette.error.main} 68%, ${theme.palette.warning.dark} 145%)`,
          }}
        >
          <Box
            sx={{
              width: 48,
              height: 48,
              flexShrink: 0,
              display: "grid",
              placeItems: "center",
              borderRadius: 2,
              color: "#fff",
              backgroundColor: "rgba(255,255,255,0.16)",
            }}
          >
            <StorefrontOutlinedIcon />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.1, opacity: 0.82 }}>
              CREATOR STUDIO / 01
            </Typography>
            <Typography variant="h5" sx={{ mt: 0.25, fontWeight: 800, lineHeight: 1.15 }}>
              Shape your storefront
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5, color: "rgba(255,255,255,0.82)" }}>
              Tune your artist identity and choose the work buyers see first.
            </Typography>
          </Box>
        </Box>

        <Paper
          elevation={0}
          sx={{
            overflow: "hidden",
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 3,
            backgroundColor: theme.palette.background.paper,
          }}
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              alignItems: { xs: "stretch", sm: "center" },
              justifyContent: "space-between",
              gap: 1.5,
              p: { xs: 2, sm: 2.5 },
              borderBottom: `1px solid ${theme.palette.divider}`,
              backgroundColor:
                theme.palette.mode === "dark"
                  ? "rgba(255,255,255,0.025)"
                  : "rgba(15,23,42,0.025)",
            }}
          >
            <Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <PaletteOutlinedIcon sx={{ color: theme.palette.error.main, fontSize: 20 }} />
                <Typography sx={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, color: "text.secondary" }}>
                  YOUR PUBLIC CANVAS
                </Typography>
              </Stack>
              <Typography variant="h6" sx={{ mt: 0.5, fontWeight: 800 }}>
                Profile preview
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Updates as you edit your name, description, and specialties.
              </Typography>
            </Box>
            <Button
              color="error"
              onClick={resetSettings}
              sx={{
                minHeight: 44,
                alignSelf: { xs: "flex-start", sm: "center" },
                px: 1.5,
                borderRadius: 1.75,
                textTransform: "none",
                fontWeight: 700,
                whiteSpace: "nowrap",
              }}
            >
              Reset Store Profile
            </Button>
          </Box>

          <Stack spacing={2.5} sx={{ p: { xs: 1.5, sm: 2.5 } }}>
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
                  borderColor: theme.palette.divider,
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
                    color="error"
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
                    color="error"
                    onClick={() => navigate("/seller/settings")}
                    sx={{ px: 0, minHeight: 44, textTransform: "none", fontWeight: 700 }}
                  >
                    Edit photo and account details
                  </Button>
                </Paper>

                <Paper
                  variant="outlined"
                  sx={{
                    p: 2.5,
                    borderRadius: 3,
                    borderColor: theme.palette.divider,
                  }}
                >
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
                      color="error"
                      onClick={openSpecialtyDialog}
                      sx={{ minHeight: 44, textTransform: "none", fontWeight: 700 }}
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

        <StorefrontSpecialty
          open={specialtyDialogOpen}
          onClose={() => {
            if (!savingSpecialties) setSpecialtyDialogOpen(false);
          }}
          specialtyOptions={specialtyOptions}
          draftSpecialties={draftSpecialties}
          customSpecialty={customSpecialty}
          saving={savingSpecialties}
          onToggleSpecialty={toggleDraftSpecialty}
          onCustomSpecialtyChange={setCustomSpecialty}
          onAddSpecialty={addDraftSpecialty}
          onSave={async () => {
            const saved = await saveSpecialties(draftSpecialties);
            if (saved) setSpecialtyDialogOpen(false);
          }}
        />

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
                sx={{ color: "text.primary", fontWeight: 700, borderRadius: 999 }}
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
          variant="filled"
          sx={{
            width: { xs: 280, sm: 360 },
            minHeight: 48,
            borderRadius: 2,
            boxShadow: "0 10px 28px rgba(15, 23, 42, 0.18)",
            backgroundColor: getSeverityColor(snackbarSeverity),
            color: "#fff",
            alignItems: "center",
            "& .MuiAlert-icon": {
              color: "#fff",
              mr: 1,
            },
            "& .MuiAlert-message": {
              fontWeight: 600,
              fontSize: 14,
              display: "flex",
              alignItems: "center",
            },
            "& .MuiAlert-action": {
              alignItems: "center",
              paddingLeft: 1,
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
