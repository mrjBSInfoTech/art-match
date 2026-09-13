import { createElement, useState, useEffect, useMemo } from "react";
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
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import ArtworkCard from "../../components/seller/Artwork/ArtworkCard";
import ArtworkForm from "../../components/seller/Artwork/ArtworkForm";
import ArtworkDelete from "../../components/seller/Artwork/ArtworkDelete";
import ArtworkErrorAdd from "../../components/seller/Artwork/ArtworkErrorAdd";
import {
  fetchArtworks,
  addArtwork,
  updateArtwork,
  deleteArtwork,
} from "../../api/seller/artworkAPI";
// Icons
import SearchIcon from "@mui/icons-material/Search";
import SwapVertIcon from "@mui/icons-material/SwapVert";
import PaletteOutlinedIcon from "@mui/icons-material/PaletteOutlined";
import PendingActionsOutlinedIcon from "@mui/icons-material/PendingActionsOutlined";
import VerifiedOutlinedIcon from "@mui/icons-material/VerifiedOutlined";

// Slide Transition for Snackbar
function SlideTransition(props) {
  return <Slide {...props} direction="up" />;
}

export default function Artwork() {
  const theme = useTheme();
  const [artworks, setArtworks] = useState([]);
  const [selectedArtwork, setSelectedArtwork] = useState(null);
  const [openArtworkDelete, setOpenArtworkDelete] = useState(false);
  const [openArtworkErrorAdd, setOpenArtworkErrorAdd] = useState(false);
  const [artworkErrorMessage, setArtworkErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");
  const [openArtworkForm, setOpenArtworkForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState("az");
  const [priceOption, setPriceOption] = useState("");

  const filteredArtworks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    let list = [...artworks];

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
  }, [artworks, searchQuery, sortOption, priceOption]);

  // Fetch all artworks from API
  const loadArtworks = async () => {
    try {
      setLoading(true);
      setArtworkErrorMessage("");
      const response = await fetchArtworks();
      if (response && Array.isArray(response)) {
        setArtworks(response);
      } else if (response && response.data && Array.isArray(response.data)) {
        setArtworks(response.data);
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

  // ========== ARTWORK HANDLERS ==========
  // ➕ Open Add Artwork Modal
  const handleOpenArtworkAdd = () => {
    setSelectedArtwork(null);
    if (isVerified) {
      setOpenArtworkForm(true);
    } else {
      handleOpenArtworkErrorAdd();
    }
  };

  // ✏️ Open Edit Artwork Modal
  const handleOpenArtworkEdit = (artwork) => {
    setSelectedArtwork(artwork);
    setOpenArtworkForm(true);
  };

  // 🗑️ Open Delete Artwork Modal
  const handleOpenArtworkDelete = (artwork) => {
    setSelectedArtwork(artwork);
    setOpenArtworkDelete(true);
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
        await updateArtwork(selectedArtwork.artwork_id, formData);
        // refresh list and then close modal
        await loadArtworks();
        showSnackbar("Artwork updated successfully", "success");
      } else {
        // Add new artwork (server returns colors and id)
        const res = await addArtwork(formData);
        // Ensure artwork list includes the newly created item (with color_used)
        await loadArtworks();
        showSnackbar("Artwork added successfully", "success");
      }
      setOpenArtworkForm(false);
      setSelectedArtwork(null);
      setLoading(false);
    } catch (err) {
      console.error("Error saving artwork:", err);
      setArtworkErrorMessage(err.message || "Error saving artwork", "error");
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

  const normalizeStatus = (artwork) =>
    String(artwork.request_status || artwork.status || "").toLowerCase();

  const totalPending = artworks.filter((artwork) => {
    const s = normalizeStatus(artwork);
    return s === "pending" || s === "pending";
  }).length;

  const totalVerified = artworks.filter((artwork) => {
    const s = normalizeStatus(artwork);
    return s === "verified" || s === "approved" || s === "approved";
  }).length;

  const accountStatus = String(
    localStorage.getItem("seller_register_status"),
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
      case "success":
        return "success.light";
      case "error":
        return "error.light";
      default:
        return "primary.light";
    }
  };

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
          gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
          gap: 2,
          mb: 2.5,
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
            label: "PENDING REVIEW",
            value: totalPending,
            caption: "Awaiting verification",
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
            }}
          >
            <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 2,
                }}
              >
                <Box>
                  <Typography
                    sx={{
                      color: theme.palette.text.secondary,
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: 1,
                    }}
                  >
                    {label}
                  </Typography>
                  <Typography
                    sx={{
                      mt: 0.5,
                      color: theme.palette.text.primary,
                      fontSize: 30,
                      fontWeight: 800,
                      lineHeight: 1,
                    }}
                  >
                    {value}
                  </Typography>
                  <Typography
                    sx={{
                      mt: 1,
                      color: theme.palette.text.secondary,
                      fontSize: 12,
                    }}
                  >
                    {caption}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: 54,
                    height: 54,
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
          p: { xs: 2, md: 2.5 },
          borderRadius: 2.5,
          backgroundColor: theme.palette.background.paper,
          borderColor: theme.palette.divider,
        }}
        variant="outlined"
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", lg: "row" },
            justifyContent: "space-between",
            alignItems: { xs: "stretch", lg: "center" },
            gap: 1.25,
          }}
        >
          <TextField
            variant="outlined"
            placeholder="Search artworks..."
            size="small"
            sx={{
              width: { xs: "100%", lg: 255 },
              "& .MuiOutlinedInput-root": {
                color: theme.palette.text.primary,
                backgroundColor: theme.palette.background.default,
                "& fieldset": { borderColor: theme.palette.divider },
                "&:hover fieldset": {
                  borderColor: theme.palette.text.secondary,
                },
              },
              "& .MuiInputBase-input::placeholder": {
                color: theme.palette.text.secondary,
                opacity: 1,
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              flexWrap: "wrap",
            }}
          >
            <FormControl size="small" sx={{ minWidth: 130 }}>
              <Select
                name="sort"
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                startAdornment={
                  <SwapVertIcon
                    sx={{
                      mr: 0.5,
                      fontSize: 17,
                      color: theme.palette.text.secondary,
                    }}
                  />
                }
                sx={{
                  fontSize: 12,
                  color: theme.palette.text.primary,
                  backgroundColor: theme.palette.background.default,
                  ".MuiOutlinedInput-notchedOutline": {
                    borderColor: theme.palette.divider,
                  },
                }}
              >
                <MenuItem value="az">A to Z</MenuItem>
                <MenuItem value="za">Z to A</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 130 }}>
              <Select
                name="price"
                value={priceOption}
                onChange={(e) => setPriceOption(e.target.value)}
                sx={{
                  fontSize: 12,
                  color: theme.palette.text.primary,
                  backgroundColor: theme.palette.background.default,
                  ".MuiOutlinedInput-notchedOutline": {
                    borderColor: theme.palette.divider,
                  },
                }}
              >
                <MenuItem value="">Default</MenuItem>
                <MenuItem value="lthPrice">Lowest to Highest</MenuItem>
                <MenuItem value="htlPrice">Highest to Lowest</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>
      </Paper>
      {/* Artwork Display */}
      <Paper
        sx={{
          p: { xs: 2, md: 2.5 },
          mt: 2.5,
          borderRadius: 2.5,
          backgroundColor: theme.palette.background.paper,
          borderColor: theme.palette.divider,
        }}
        variant="outlined"
      >
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        ) : artworkErrorMessage ? (
          <Typography align="center" color="error" sx={{ py: 3 }}>
            {artworkErrorMessage}
          </Typography>
        ) : filteredArtworks.length > 0 ? (
          <ArtworkCard
            artworks={filteredArtworks}
            onEdit={handleOpenArtworkEdit}
            onDelete={handleOpenArtworkDelete}
          />
        ) : (
          <Typography
            color="text.secondary"
            sx={{ textAlign: "center", py: 4 }}
          >
            {searchQuery
              ? "No artworks match your search."
              : "No artworks found. Add your first artwork!"}
          </Typography>
        )}
      </Paper>

      <ArtworkForm
        open={openArtworkForm}
        handleClose={() => setOpenArtworkForm(false)}
        onSubmit={handleSubmitArtwork}
        selectedArtwork={selectedArtwork}
      />
      <ArtworkDelete
        open={openArtworkDelete}
        handleClose={() => setOpenArtworkDelete(false)}
        onSubmit={handleDeleteArtwork}
        selectedArtwork={selectedArtwork}
      />
      <ArtworkErrorAdd
        open={openArtworkErrorAdd}
        handleClose={() => setOpenArtworkErrorAdd(false)}
      />
      {/* Snackbar Notification */}
      <Snackbar
        open={snackbarOpen}
        severity={snackbarSeverity}
        variant="filled"
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
