import { createElement, useState, useEffect, useMemo } from "react";
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
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import SwapVertIcon from "@mui/icons-material/SwapVert";
import PaletteOutlinedIcon from "@mui/icons-material/PaletteOutlined";
import PendingActionsOutlinedIcon from "@mui/icons-material/PendingActionsOutlined";
import VerifiedOutlinedIcon from "@mui/icons-material/VerifiedOutlined";
import ArtworkCard from "../../components/admin/Artwork/ArtworkCard";
import { fetchArtworks, verifyArtwork } from "../../api/admin/artworkAPI";

function SlideTransition(props) {
  return <Slide {...props} direction="up" />;
}

export default function Artwork() {
  const [artworks, setArtworks] = useState([]);
  const [allArtworks, setAllArtworks] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortOption, setSortOption] = useState("newest");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");

  const loadArtworks = async () => {
    try {
      setLoading(true);
      const apiStatus = statusFilter === "approved" ? "verified" : statusFilter;
      const data = await fetchArtworks(apiStatus === "all" ? "" : apiStatus);
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

  const normalizeStatus = (artwork) =>
    String(artwork.request_status || artwork.status || "").toLowerCase();
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
    const filtered = artworks.filter((artwork) => {
      if (statusFilter === "rejected") return false;
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

    return [...filtered].sort((first, second) => {
      if (sortOption === "oldest") {
        return Number(first.artwork_id || 0) - Number(second.artwork_id || 0);
      }
      return Number(second.artwork_id || 0) - Number(first.artwork_id || 0);
    });
  }, [artworks, searchQuery, sortOption, statusFilter]);

  const statusCount =
    statusFilter === "pending"
      ? totalPending
      : statusFilter === "approved"
        ? totalVerified
        : statusFilter === "rejected"
          ? 0
          : allArtworks.length;

  const handleVerify = async (artwork) => {
    try {
      await verifyArtwork(artwork.artwork_id);
      showSnackbar("Artwork verified successfully.", "success");
      await loadArtworks();
    } catch (err) {
      showSnackbar(err.message || "Failed to verify artwork.", "error");
    }
  };

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
        backgroundColor: "#0f172a",
        color: "#f8fafc",
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
            }}
          >
            Art Verification
          </Typography>
          <Typography sx={{ mt: 0.75, color: "#94a3b8", fontSize: 13 }}>
            Review and manage the artwork catalog
          </Typography>
        </Box>
        <Box
          sx={{
            px: 1.5,
            py: 0.75,
            border: "1px solid #475569",
            borderRadius: 1.5,
            color: "#cbd5e1",
            fontSize: 12,
          }}
        >
          {statusCount} artworks shown
        </Box>
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
            value: allArtworks.length,
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
              backgroundColor: "#1e293b",
              border: "1px solid #cbd5e1",
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
                      color: "#94a3b8",
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
                      color: "#f8fafc",
                      fontSize: 30,
                      fontWeight: 800,
                      lineHeight: 1,
                    }}
                  >
                    {value}
                  </Typography>
                  <Typography sx={{ mt: 1, color: "#a9bad0", fontSize: 12 }}>
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
                    backgroundColor: "#fff5f5",
                    color: "#ef3340",
                  }}
                >
                  {createElement(MetricIcon)}
                </Box>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Paper
        sx={{
          p: { xs: 1, sm: 1.25 },
          borderRadius: 2,
          backgroundColor: "#1e293b",
          borderColor: "#cbd5e1",
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
                color: "#f8fafc",
                "& fieldset": { borderColor: "#64748b" },
                "&:hover fieldset": { borderColor: "#cbd5e1" },
              },
              "& .MuiInputBase-input::placeholder": {
                color: "#94a3b8",
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
            <Typography
              variant="caption"
              sx={{ color: "#94a3b8", whiteSpace: "nowrap" }}
            >
              Status: <strong>{statusCount}</strong>
            </Typography>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={statusFilter}
              onChange={(_, value) => value && setStatusFilter(value)}
              sx={{
                "& .MuiToggleButton-root": {
                  px: 1,
                  py: 0.5,
                  fontSize: 11,
                  color: "#cbd5e1",
                  borderColor: "#64748b",
                },
                "& .MuiToggleButton-root.Mui-selected": {
                  color: "#fff",
                  backgroundColor: "#ef3340",
                  borderColor: "#ef3340",
                },
                "& .MuiToggleButton-root.Mui-selected:hover": {
                  backgroundColor: "#d92d39",
                },
              }}
            >
              <ToggleButton value="pending">Pending</ToggleButton>
              <ToggleButton value="rejected">Rejected</ToggleButton>
              <ToggleButton value="approved">Approved</ToggleButton>
              <ToggleButton value="all">All</ToggleButton>
            </ToggleButtonGroup>
            <FormControl size="small" sx={{ minWidth: 130 }}>
              <Select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                startAdornment={
                  <SwapVertIcon
                    sx={{ mr: 0.5, fontSize: 17, color: "#94a3b8" }}
                  />
                }
                sx={{
                  fontSize: 12,
                  color: "#f8fafc",
                  ".MuiOutlinedInput-notchedOutline": {
                    borderColor: "#64748b",
                  },
                }}
              >
                <MenuItem value="newest">Newest First</MenuItem>
                <MenuItem value="oldest">Oldest First</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>
      </Paper>

      <Paper
        sx={{
          p: { xs: 0, sm: 0.5 },
          mt: 2,
          borderRadius: 2,
          backgroundColor: "#1e293b",
          borderColor: "#cbd5e1",
        }}
        variant="outlined"
      >
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
