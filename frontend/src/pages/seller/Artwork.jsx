import { useState, useEffect, useMemo } from "react";
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
import VerifiedUserRoundedIcon from "@mui/icons-material/VerifiedUserRounded";
import HourglassBottomRoundedIcon from "@mui/icons-material/HourglassBottomRounded";

// Slide Transition for Snackbar
function SlideTransition(props) {
  return <Slide {...props} direction="up" />;
}

export default function Artwork() {
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
    localStorage.getItem("seller_register_status") 
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
    <Box sx={{ p: 3 }}>
      <Helmet titleTemplate="%s - ArtMatch">
        <title>Artwork</title>
      </Helmet>
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "space-between",
          mb: 2,
        }}
      >
        <Typography
          variant="h4"
          gutterBottom
          sx={{ fontWeight: "bold", fontSize: { xs: 24, sm: 32 } }}
        >
          Artwork
        </Typography>
        <Button
          variant="contained"
          color="error"
          onClick={handleOpenArtworkAdd}
          sx={{
            width: { xs: "100%", sm: 150 },
            height: { xs: 35, sm: 45 },
            minWidth: { xs: 45, sm: 50 },
            fontSize: { xs: 12, sm: 16 },
            padding: 0,
          }}
        >
          Add Artwork
        </Button>
      </Box>
      <Box
        sx={{
          mt: 3,
          display: "flex",
          gap: 3,
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        <Card
          variant="outlined"
          sx={{
            flex: "1 1 350px",
            maxWidth: 600,
            height: 150,
            padding: 2,
            borderRadius: 2,
            bgcolor: "background.paper",
          }}
        >
          <CardContent>
            <Typography
              gutterBottom
              variant="h5"
              sx={{ fontWeight: "bold", color: "#b73636" }}
            >
              Pending Arts
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 2 }}>
              <HourglassBottomRoundedIcon color="error" sx={{ fontSize: 30 }} />
              <Typography
                sx={{ fontWeight: "bold", color: "#b73636", fontSize: 30 }}
              >
                {totalPending}
              </Typography>
            </Box>
          </CardContent>
        </Card>

        <Card
          variant="outlined"
          sx={{
            flex: "1 1 350px",
            maxWidth: 600,
            height: 150,
            padding: 2,
            borderRadius: 2,
            bgcolor: "background.paper",
          }}
        >
          <CardContent>
            <Typography
              gutterBottom
              variant="h5"
              sx={{ fontWeight: "bold", color: "#b73636" }}
            >
              Verified Arts
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 2 }}>
              <VerifiedUserRoundedIcon color="error" sx={{ fontSize: 30 }} />
              <Typography
                variant="h4"
                sx={{ fontWeight: "bold", color: "#b73636" }}
              >
                {totalVerified}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>
      {/* Filter Section */}
      <Paper sx={{ p: 3, mt: 3, borderRadius: 2 }} variant="outlined">
        <Typography variant="h6">Filter</Typography>
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            justifyContent: "space-between",
            alignItems: { xs: "stretch", md: "center" },
            gap: 2,
            mb: 2,
            mt: 2,
          }}
        >
          <TextField
            variant="outlined"
            placeholder="Search artworks..."
            size="small"
            sx={{
              width: { xs: "100%", sm: 300 },
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
              flexDirection: { xs: "column", sm: "row" },
              gap: 2,
              width: { xs: "100%", md: "auto" },
            }}
          >
            <FormControl size="small" sx={{ width: { xs: "100%", md: 180 } }}>
              <InputLabel>Sort</InputLabel>
              <Select
                name="sort"
                label="Sort"
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
              >
                <MenuItem value="az">A to Z</MenuItem>
                <MenuItem value="za">Z to A</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ width: { xs: "100%", md: 180 } }}>
              <InputLabel>Price</InputLabel>
              <Select
                name="price"
                label="Price"
                value={priceOption}
                onChange={(e) => setPriceOption(e.target.value)}
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
      <Paper sx={{ p: 3, mt: 3, borderRadius: 2 }} variant="outlined">
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
