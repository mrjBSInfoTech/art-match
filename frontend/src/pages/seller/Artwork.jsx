import {
  createElement,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  FormControl,
  InputLabel,
  InputAdornment,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
  Snackbar,
  Slide,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import ArtworkCard from "../../components/seller/Artwork/ArtworkCard";
import ArtworkTable from "../../components/seller/Artwork/ArtworkTable";
import ArtworkForm from "../../components/seller/Artwork/ArtworkForm";
import ArtworkDelete from "../../components/seller/Artwork/ArtworkDelete";
import ArtworkVerify from "../../components/seller/Artwork/ArtworkVerify";
import ArtworkConfirm from "../../components/seller/Artwork/ArtworkConfirm";
import ArtworkWarning from "../../components/seller/Artwork/ArtworkWarning";
import { getSellerProfile } from "../../api/seller/sellerAPI";
import { getMissingSellerProfileFields } from "../../utils/sellerProfile";
import ConnectionErrorPanel from "../../components/seller/ConnectionErrorPanel";
import SellerLoadingPanel from "../../components/seller/SellerLoadingPanel";
import {
  adminSearchInputSx,
  adminSelectInputSx,
} from "../../components/admin/adminFilterStyles";
import {
  fetchArtworks,
  addArtwork,
  updateArtwork,
  deleteArtwork,
  verifyArtwork,
} from "../../api/seller/artworkAPI";
// Icons
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import SwapVertIcon from "@mui/icons-material/SwapVert";
import PaletteOutlinedIcon from "@mui/icons-material/PaletteOutlined";
import PendingActionsOutlinedIcon from "@mui/icons-material/PendingActionsOutlined";
import VerifiedOutlinedIcon from "@mui/icons-material/VerifiedOutlined";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import ViewListIcon from "@mui/icons-material/ViewList";

// Slide Transition for Snackbar
function SlideTransition(props) {
  return <Slide {...props} direction="up" />;
}

export default function Artwork() {
  const theme = useTheme();
  const navigate = useNavigate();
  const [artworks, setArtworks] = useState([]);
  const [selectedArtwork, setSelectedArtwork] = useState(null);
  const [pendingArtwork, setPendingArtwork] = useState(null);
  const [openArtworkConfirm, setOpenArtworkConfirm] = useState(false);
  const [openArtworkDelete, setOpenArtworkDelete] = useState(false);
  const [openArtworkVerify, setOpenArtworkVerify] = useState(false);
  const [openArtworkErrorAdd, setOpenArtworkErrorAdd] = useState(false);
  const [artworkWarningReason, setArtworkWarningReason] =
    useState("unverified");
  const [sellerProfile, setSellerProfile] = useState(null);
  const [sellerProfileLoading, setSellerProfileLoading] = useState(true);
  const [sellerProfileError, setSellerProfileError] = useState("");
  const [artworkErrorMessage, setArtworkErrorMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");
  const [openArtworkForm, setOpenArtworkForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState("az");
  const [priceOption, setPriceOption] = useState("lthPrice");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState("card");

  const loadSellerProfile = useCallback(async () => {
    setSellerProfileLoading(true);
    setSellerProfileError("");
    try {
      setSellerProfile(await getSellerProfile());
    } catch (error) {
      setSellerProfile(null);
      setSellerProfileError(
        error.message || "Unable to load your seller account information.",
      );
    } finally {
      setSellerProfileLoading(false);
    }
  }, []);

  const filteredArtworks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    let list = [...artworks];

    if (statusFilter !== "all") {
      list = list.filter((artwork) => {
        const raw = artwork.request_status || "";
        const status =
          !raw || raw.toLowerCase() === "available"
            ? "unverified"
            : raw.trim().toLowerCase();
        if (statusFilter === "approved")
          return ["verified", "approved"].includes(status);
        if (statusFilter === "pending")
          return ["pending", "requested"].includes(status);
        if (statusFilter === "unverified") return status === "unverified";
        return status === statusFilter;
      });
    }

    if (query) {
      list = list.filter((artwork) => {
        const searchableFields = [
          artwork.title,
          artwork.genre,
          artwork.art_size,
          artwork.description,
        ];
        return searchableFields.some((field) =>
          String(field || "")
            .toLowerCase()
            .includes(query),
        );
      });
    }

    if (sortOption === "za") {
      list = [...list].sort((a, b) =>
        String(b.title || "").localeCompare(String(a.title || "")),
      );
    } else {
      list = [...list].sort((a, b) =>
        String(a.title || "").localeCompare(String(b.title || "")),
      );
    }

    if (priceOption === "lthPrice") {
      list = [...list].sort(
        (a, b) => Number(a.price || 0) - Number(b.price || 0),
      );
    } else if (priceOption === "htlPrice") {
      list = [...list].sort(
        (a, b) => Number(b.price || 0) - Number(a.price || 0),
      );
    }

    return list;
  }, [artworks, searchQuery, sortOption, priceOption, statusFilter]);

  // Fetch all artworks from API
  const loadArtworks = async () => {
    try {
      setLoading(true);
      setArtworkErrorMessage("");
      const response = await fetchArtworks();
      const rawList = Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
          ? response.data
          : null;
      if (rawList) {
        setArtworks(
          rawList.map((art) => ({
            ...art,
            request_status:
              !art.request_status ||
              String(art.request_status).trim().toLowerCase() === "available"
                ? "Unverified"
                : String(art.request_status).trim(),
          })),
        );
      } else {
        setArtworks([]);
        setArtworkErrorMessage("No data received from server.");
      }
    } catch (err) {
      setArtworks([]);
      setArtworkErrorMessage("Failed to load artworks: " + err.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    loadArtworks();
  }, []);

  useEffect(() => {
    loadSellerProfile();
    window.addEventListener("seller-profile-updated", loadSellerProfile);
    return () =>
      window.removeEventListener("seller-profile-updated", loadSellerProfile);
  }, [loadSellerProfile]);

  // ========== ARTWORK HANDLERS ==========
  // ➕ Open Add Artwork Modal
  const handleOpenArtworkAdd = () => {
    setSelectedArtwork(null);
    setPendingArtwork(null);
    if (sellerProfileLoading) {
      setArtworkWarningReason("loading");
      handleOpenArtworkErrorAdd();
      return;
    }
    if (sellerProfileError || !sellerProfile) {
      setArtworkWarningReason("profile-error");
      handleOpenArtworkErrorAdd();
      return;
    }
    if (getMissingSellerProfileFields(sellerProfile).length) {
      setArtworkWarningReason("incomplete");
      handleOpenArtworkErrorAdd();
      return;
    }
    if (!isVerified) {
      setArtworkWarningReason("unverified");
      handleOpenArtworkErrorAdd();
      return;
    }
    setOpenArtworkForm(true);
  };

  // ✅ Open Confirm Artwork Modal
  const handleOpenArtworkConfirm = (formData) => {
    setPendingArtwork(formData);
    setOpenArtworkForm(false);
    setOpenArtworkConfirm(true);
  };

  const handleCancelArtworkConfirm = () => {
    setOpenArtworkConfirm(false);
    setOpenArtworkForm(true);
  };

  // ✏️ Open Edit Artwork Modal
  const handleOpenArtworkEdit = (artwork) => {
    setSelectedArtwork(artwork);
    setPendingArtwork(null);
    setOpenArtworkForm(true);
  };

  // 🗑️ Open Delete Artwork Modal
  const handleOpenArtworkDelete = (artwork) => {
    setSelectedArtwork(artwork);
    setOpenArtworkDelete(true);
  };

  // Open Verify Artwork Modal
  const handleOpenArtworkVerify = (artwork) => {
    setSelectedArtwork(artwork);
    setOpenArtworkVerify(true);
  };

  // Open Error Modal for Adding Artwork
  const handleOpenArtworkErrorAdd = () => {
    setOpenArtworkErrorAdd(true);
  };

  // Submit (Add or Edit) Artwork
  const handleSubmitArtwork = async (formData) => {
    try {
      setLoading(true);
      if (selectedArtwork) {
        // Update existing artwork
        await updateArtwork(
          selectedArtwork.artwork_id ?? selectedArtwork.id,
          formData,
        );
        // refresh list and then close modal
        await loadArtworks();
        showSnackbar("Artwork updated successfully", "success");
      } else {
        // Add new artwork (server returns colors and id)
        await addArtwork(formData);
        // Ensure artwork list includes the newly created item (with color_used)
        await loadArtworks();
        showSnackbar("Artwork added successfully", "success");
      }
      setOpenArtworkForm(false);
      setOpenArtworkConfirm(false);
      setPendingArtwork(null);
      setSelectedArtwork(null);
    } catch (err) {
      console.error("Error saving artwork:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };
  // Verify Artwork
  const handleVerifyArtwork = async (id) => {
    try {
      setLoading(true);
      await verifyArtwork(id);
      await loadArtworks();
      setOpenArtworkVerify(false);
      showSnackbar(
        "Artwork will be verified. Please wait for confirmation.",
        "success",
      );
      setLoading(false);
    } catch (err) {
      console.error("Error verifying artwork:", err, "error");
      setArtworkErrorMessage(err.message || "Error verifying artwork", "error");
    } finally {
      setLoading(false);
    }
  };
  // Delete Artwork
  const handleDeleteArtwork = async (id) => {
    try {
      setLoading(true);
      await deleteArtwork(id);
      await loadArtworks();
      setOpenArtworkDelete(false);
      showSnackbar("Artwork deleted successfully", "success");
      setLoading(false);
    } catch (err) {
      console.error("Error deleting artwork:", err, "error");
      setArtworkErrorMessage(err.message || "Error deleting artwork", "error");
    }
  };

  const normalizeStatus = (artwork) => {
    const raw = artwork.request_status || "";
    return !raw || raw.toLowerCase() === "available"
      ? "unverified"
      : raw.trim().toLowerCase();
  };

  const totalUnverified = artworks.filter((artwork) => {
    const s = normalizeStatus(artwork);
    return s === "unverified";
  }).length;

  const totalPending = artworks.filter((artwork) => {
    const s = normalizeStatus(artwork);
    return s === "pending" || s === "requested";
  }).length;

  const totalVerified = artworks.filter((artwork) => {
    const s = normalizeStatus(artwork);
    return s === "verified" || s === "approved";
  }).length;

  const accountStatus = String(
    sellerProfile?.register_status || "",
  ).toLowerCase();
  const isVerified = accountStatus === "verified" || accountStatus === "";

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

  if (loading && artworks.length === 0) {
    return (
      <SellerLoadingPanel
        title="Artwork"
        subtitle="Add, edit, and submit your artwork for verification."
      />
    );
  }

  if (artworkErrorMessage) {
    return (
      <Box sx={{ minWidth: 0 }}>
        <Helmet titleTemplate="%s - ArtMatch">
          <title>Artwork</title>
        </Helmet>
        <ConnectionErrorPanel
          title="Artwork Unavailable"
          message={artworkErrorMessage}
          onRetry={loadArtworks}
        />
      </Box>
    );
  }

  const artworkDisplay = loading ? (
    <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
      <CircularProgress />
    </Box>
  ) : filteredArtworks.length > 0 ? (
    viewMode === "table" ? (
      <ArtworkTable
        artworks={filteredArtworks}
        onEdit={handleOpenArtworkEdit}
        onVerify={handleOpenArtworkVerify}
        onDelete={handleOpenArtworkDelete}
      />
    ) : (
      <ArtworkCard
        artworks={filteredArtworks}
        onEdit={handleOpenArtworkEdit}
        onVerify={handleOpenArtworkVerify}
        onDelete={handleOpenArtworkDelete}
      />
    )
  ) : (
    <Typography color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
      {searchQuery || statusFilter !== "all"
        ? "No artworks match your search and filters."
        : "No artworks found. Add your first artwork!"}
    </Typography>
  );

  return (
    <Box
      sx={{
        p: { xs: 1.5, sm: 2.5 },
        minHeight: "100vh",
        backgroundColor: theme.palette.background.default,
        color: theme.palette.text.primary,
      }}
    >
      <Helmet titleTemplate="%s - ArtMatch">
        <title>Artwork</title>
      </Helmet>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" },
          gap: 2,
          mb: 2.5,
          flexWrap: "wrap",
        }}
      >
        <Box>
          <Typography
            sx={{
              fontSize: { xs: 28, sm: 38 },
              fontWeight: 800,
              lineHeight: 1.1,
              color: theme.palette.text.primary,
            }}
          >
            Artwork
          </Typography>
          <Typography
            sx={{
              mt: 0.75,
              color: theme.palette.text.secondary,
              fontSize: 13,
            }}
          >
            Manage the artwork
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="error"
          startIcon={<AddIcon />}
          onClick={handleOpenArtworkAdd}
          sx={{
            width: { xs: "100%", sm: 150 },
            height: { xs: 38, sm: 44 },
            minWidth: { xs: 45, sm: 50 },
            fontSize: { xs: 12, sm: 16 },
            padding: 0,
            borderRadius: 1.5,
            textTransform: "none",
            fontWeight: 700,
          }}
        >
          Add Artwork
        </Button>
      </Box>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "minmax(0, 1fr)",
            sm: "repeat(2, minmax(0, 1fr))",
            lg: "repeat(4, minmax(0, 1fr))",
          },
          gap: 2,
          mb: 2.5,
          minWidth: 0,
        }}
      >
        {[
          {
            label: "TOTAL ARTWORKS",
            value: artworks.length,
            caption: "Complete catalog",
            icon: PaletteOutlinedIcon,
          },
          {
            label: "UNVERIFIED",
            value: totalUnverified,
            caption: "Awaiting submission",
            icon: PendingActionsOutlinedIcon,
          },
          {
            label: "PENDING REVIEW",
            value: totalPending,
            caption: "Under admin review",
            icon: PendingActionsOutlinedIcon,
          },
          {
            label: "APPROVED",
            value: totalVerified,
            caption: "Verified artworks",
            icon: VerifiedOutlinedIcon,
          },
        ].map(({ label, value, caption, icon: MetricIcon }) => (
          <Card
            key={label}
            sx={{
              backgroundColor: theme.palette.background.paper,
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 2.5,
              boxShadow: "none",
              minWidth: 0,
              overflow: "hidden",
              height: "100%",
            }}
          >
            <CardContent sx={{ p: { xs: 2, sm: 2.25 }, "&:last-child": { pb: { xs: 2, sm: 2.25 } }, height: "100%" }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: { xs: 1.5, sm: 2 },
                  minWidth: 0,
                  height: "100%",
                }}
              >
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography
                    sx={{
                      color: theme.palette.text.secondary,
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: 1,
                      overflowWrap: "break-word",
                    }}
                  >
                    {label}
                  </Typography>
                  <Typography
                    sx={{
                      mt: 0.5,
                      color: theme.palette.text.primary,
                      fontSize: { xs: 24, sm: 26, xl: 30 },
                      fontWeight: 800,
                      lineHeight: 1.1,
                      fontVariantNumeric: "tabular-nums",
                      overflowWrap: "anywhere",
                    }}
                  >
                    {value}
                  </Typography>
                  <Typography
                    sx={{
                      mt: 1,
                      color: theme.palette.text.secondary,
                      fontSize: 12,
                      overflowWrap: "break-word",
                    }}
                  >
                    {caption}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: { xs: 44, sm: 50 },
                    height: { xs: 44, sm: 50 },
                    flexShrink: 0,
                    display: "grid",
                    placeItems: "center",
                    borderRadius: 2,
                    backgroundColor:
                      theme.palette.mode === "dark"
                        ? "rgba(239, 68, 68, 0.14)"
                        : "#fff5f5",
                    color: theme.palette.error.main,
                  }}
                >
                  {createElement(MetricIcon)}
                </Box>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>
      {/* Filter Section */}
      <Paper
        sx={{
          p: { xs: 1.5, sm: 2, md: 2.5 },
          borderRadius: 2.5,
          backgroundColor: theme.palette.background.paper,
          borderColor: theme.palette.divider,
          minWidth: 0,
          overflow: "hidden",
        }}
        variant="outlined"
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "minmax(0, 1fr)",
              lg: "minmax(220px, 1fr) auto",
            },
            alignItems: "center",
            gap: { xs: 1.5, sm: 2 },
            minWidth: 0,
          }}
        >
          <TextField
            variant="outlined"
            placeholder="Search artworks..."
            size="small"
            fullWidth
            sx={adminSearchInputSx(theme, { minWidth: 0 })}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            inputProps={{ "aria-label": "Search artworks" }}
          />

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "minmax(0, 1fr)",
                sm: "repeat(auto-fit, minmax(145px, 1fr))",
                lg: "repeat(3, minmax(136px, 160px))",
                xl: "repeat(3, minmax(150px, 175px))",
              },
              gap: { xs: 1.5, sm: 2 },
              minWidth: 0,
            }}
          >
            <FormControl size="small" fullWidth sx={{ minWidth: 0 }}>
              <InputLabel
                id="seller-artwork-status-label"
                sx={{ color: theme.palette.text.secondary, fontSize: 12 }}
              >
                Status
              </InputLabel>
              <Select
                labelId="seller-artwork-status-label"
                id="seller-artwork-status"
                name="status"
                label="Status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                sx={adminSelectInputSx(theme)}
              >
                <MenuItem value="all">All statuses</MenuItem>
                <MenuItem value="unverified">Unverified</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="rejected">Rejected</MenuItem>
                <MenuItem value="approved">Approved</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth sx={{ minWidth: 0 }}>
              <InputLabel
                id="seller-artwork-title-sort-label"
                sx={{ color: theme.palette.text.secondary, fontSize: 12 }}
              >
                Title
              </InputLabel>
              <Select
                labelId="seller-artwork-title-sort-label"
                id="seller-artwork-title-sort"
                name="sort"
                label="Title"
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                startAdornment={
                  <SwapVertIcon
                    sx={{ mr: 0.5, fontSize: 17, color: "text.secondary" }}
                  />
                }
                sx={adminSelectInputSx(theme)}
              >
                <MenuItem value="az">A to Z</MenuItem>
                <MenuItem value="za">Z to A</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth sx={{ minWidth: 0 }}>
              <InputLabel
                id="seller-artwork-price-sort-label"
                sx={{ color: theme.palette.text.secondary, fontSize: 12 }}
              >
                Price
              </InputLabel>
              <Select
                labelId="seller-artwork-price-sort-label"
                id="seller-artwork-price-sort"
                name="price"
                label="Price"
                value={priceOption}
                onChange={(e) => setPriceOption(e.target.value)}
                sx={adminSelectInputSx(theme)}
              >
                <MenuItem value="lthPrice">Lowest to Highest</MenuItem>
                <MenuItem value="htlPrice">Highest to Lowest</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>
      </Paper>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 1.5,
          mt: 2,
          mb: 1,
        }}
      >
        <Typography
          variant="caption"
          color="text.secondary"
          aria-live="polite"
          sx={{ fontWeight: 600 }}
        >
          Showing {filteredArtworks.length} of {artworks.length} artworks
        </Typography>
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(_, next) => next && setViewMode(next)}
          size="small"
          aria-label="Artwork presentation mode"
          sx={{
            backgroundColor: theme.palette.background.paper,
            borderRadius: 2.5,
            border: `1px solid ${theme.palette.divider}`,
            p: 0.3,
            "& .MuiToggleButton-root": {
              border: "none",
              borderRadius: 2,
              px: 1.5,
              py: 0.5,
              fontSize: 12,
              fontWeight: 700,
              textTransform: "none",
              color: theme.palette.text.secondary,
              gap: 0.75,
              transition: "all 150ms ease",
            },
            "& .MuiToggleButton-root.Mui-selected": {
              backgroundColor: theme.palette.error.main,
              color: "#fff",
              "&:hover": { backgroundColor: theme.palette.error.dark },
            },
          }}
        >
          <ToggleButton value="card" aria-label="Card view">
            <ViewModuleIcon sx={{ fontSize: 18 }} />
            Cards
          </ToggleButton>
          <ToggleButton value="table" aria-label="Table view">
            <ViewListIcon sx={{ fontSize: 18 }} />
            Table
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Artwork Display */}
      {viewMode === "table" ? (
        <Box>{artworkDisplay}</Box>
      ) : (
        <Paper
          sx={{
            p: { xs: 2, md: 2.5 },
            borderRadius: 2.5,
            backgroundColor: theme.palette.background.paper,
            borderColor: theme.palette.divider,
          }}
          variant="outlined"
        >
          {artworkDisplay}
        </Paper>
      )}

      <ArtworkForm
        open={openArtworkForm}
        handleClose={() => setOpenArtworkForm(false)}
        onSubmit={handleOpenArtworkConfirm}
        selectedArtwork={selectedArtwork}
        initialDraft={pendingArtwork}
      />
      <ArtworkConfirm
        open={openArtworkConfirm}
        handleClose={handleCancelArtworkConfirm}
        onSubmit={handleSubmitArtwork}
        formData={pendingArtwork}
        isEditing={Boolean(selectedArtwork)}
      />
      <ArtworkDelete
        open={openArtworkDelete}
        handleClose={() => setOpenArtworkDelete(false)}
        onSubmit={handleDeleteArtwork}
        selectedArtwork={selectedArtwork}
      />
      <ArtworkVerify
        open={openArtworkVerify}
        handleClose={() => setOpenArtworkVerify(false)}
        onSubmit={handleVerifyArtwork}
        selectedArtwork={selectedArtwork}
      />
      <ArtworkWarning
        open={openArtworkErrorAdd}
        handleClose={() => setOpenArtworkErrorAdd(false)}
        navigate={navigate}
        reason={artworkWarningReason}
        missingFields={getMissingSellerProfileFields(sellerProfile || {})}
        profileError={sellerProfileError}
      />
      {/* Snackbar Notification */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        TransitionComponent={SlideTransition}
        sx={{
          "& .MuiSnackbar-root": {
            width: "auto",
          },
        }}
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
