import { useState, useEffect, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import {
  Alert,
  Box,
  Card,
  CardContent,
  CircularProgress,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
  Snackbar,
  Slide,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ArtworkCard from "../../components/admin/Artwork/ArtworkCard";
import { fetchArtworks, verifyArtwork } from "../../api/admin/artworkAPI";
// Icons
import VerifiedUserRoundedIcon from "@mui/icons-material/VerifiedUserRounded";
import HourglassBottomRoundedIcon from "@mui/icons-material/HourglassBottomRounded";

function SlideTransition(props) {
  return <Slide {...props} direction="up" />;
}

export default function Artwork() {
  const [artworks, setArtworks] = useState([]);
  const [allArtworks, setAllArtworks] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");

  const loadArtworks = async () => {
    try {
      setLoading(true);
      const data = await fetchArtworks(statusFilter);
      setArtworks(Array.isArray(data) ? data : []);
      // Also fetch all artworks to compute totals across statuses
      const all = await fetchArtworks();
      setAllArtworks(Array.isArray(all) ? all : []);
      setErrorMessage("");
    } catch (err) {
      setArtworks([]);
      setErrorMessage(err.message || "Failed to load artworks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadArtworks();
  }, [statusFilter]);

  const normalizeStatus = (artwork) => String(artwork.request_status || artwork.status || "").toLowerCase();
  const totalPending = allArtworks.filter((artwork) => {
    const s = normalizeStatus(artwork);
    return s === "pending" || s === "pending";
  }).length;
  const totalVerified = allArtworks.filter((artwork) => {
    const s = normalizeStatus(artwork);
    return s === "verified" || s === "approved" || s === "approved";
  }).length;

  const filteredArtworks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return artworks;

    return artworks.filter((artwork) => {
      const searchableFields = [
        artwork.title,
        artwork.genre,
        artwork.art_size,
        artwork.description,
        artwork.first_name,
        artwork.last_name,
        artwork.student_number,
      ];

      return searchableFields.some((field) =>
        String(field || "")
          .toLowerCase()
          .includes(query),
      );
    });
  }, [artworks, searchQuery]);

  const handleVerify = async (artwork) => {
    try {
      await verifyArtwork(artwork.artwork_id);
      showSnackbar("Artwork verified successfully.", "success");
      await loadArtworks();
    } catch (err) {
      showSnackbar(err.message || "Failed to verify artwork.", "error");
    }
  };

  const currentRole = localStorage.getItem("admin_account_type");
  const isSuperAdmin = currentRole === "super admin";
  const isAdmin = currentRole === "admin";
  const canEdit =
    (isSuperAdmin || isAdmin) && localStorage.getItem("admin_can_add") === "1";
  const canDelete =
    (isSuperAdmin || isAdmin) &&
    localStorage.getItem("admin_can_delete") === "1";

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
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
          gap: 2,
          flexWrap: "wrap",
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: "bold" }}>
          Art Verification
        </Typography>
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

      <Paper sx={{ p: 3, mt: 3, borderRadius: 2 }} variant="outlined">
        <Typography variant="h6" sx={{ fontWeight: "bold" }}>
          Filter
        </Typography>
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
            sx={{ width: { xs: "100%", md: 300 } }}
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

          <FormControl size="small" sx={{ width: { xs: "100%", md: 200 } }}>
            <InputLabel>Status</InputLabel>
            <Select
              label="Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="verified">Verified</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>

      <Paper sx={{ p: 3, mt: 3, borderRadius: 2 }} variant="outlined">
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        ) : errorMessage ? (
          <Typography align="center" color="error" sx={{ py: 3 }}>
            {errorMessage}
          </Typography>
        ) : filteredArtworks.length > 0 ? (
          <ArtworkCard artworks={filteredArtworks} onVerify={handleVerify} />
        ) : (
          <Typography
            color="text.secondary"
            sx={{ textAlign: "center", py: 4 }}
          >
            {searchQuery
              ? "No artworks match your search."
              : "No artworks found for this status."}
          </Typography>
        )}
      </Paper>

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
            "& .MuiAlert-icon": { color: "#fff" },
          }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
